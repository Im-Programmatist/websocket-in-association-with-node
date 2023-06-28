const http = require("node:http");
const { EventEmitter } = require("node:events");
const crypto = require("node:crypto");

class WebSocketServer extends EventEmitter {
  
    constructor(options = {}) 
    {
        super();       
        this.port = options.PORT || 5555;
        this.host = options.HOST || "127.0.0.1";
        this._init();
        //A GUID (globally unique identifier) is a 128-bit text string that represents an identification (ID).
        this.GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"; //Unique value
        //To denote text frame and close the connection
        this.OPCODES = { text: 0x01, close: 0x08 };

    } //ENd constructor

    /**
     * Initiate Handshake
     */
    _init(){
        console.log("Entered in initialization...");
        if (this._server) throw new Error(`Server already initialized`);

        this._server = http.createServer((req, res) => {
            console.log('Request by client ', req.method, req.url, req.body, req.origin);
            /*HTTP status code 426 refers that, server refuses to perform the request using the current protocol 
                    but might be willing to do so after the client upgrades to a different protocol.*/
            const UPGRADE_REQUIRED = "426";
            const BODY = http.STATUS_CODES[UPGRADE_REQUIRED];
            //Inform client to change request protocol and only websocket request is acceptable
            res.writeHead(UPGRADE_REQUIRED, {
                "Content-Type": "application/json",
                Upgrade: "Websocket",
            });
            res.end(BODY);
        });

        this._server.on("upgrade", (req, socket) => {
            /*
                we emit the headers event so that we are able to subscribe to this event 
                and see what headers a received upon a connection request.
                (here socket means response)
            */
            console.log((new Date()) + ' Connection from websocket origin '+ req.origin + 'method of request :', req.method);
            this.emit("headers", req, socket);

            if (req.headers?.upgrade != "websocket") {
                socket.end("HTTP/1.1 400 Bad Request");
                return;
            }

            /* Take socket keys sent by client and generate value for response header Sec-WebSocket-Accept header */
            const accept_client_websocket_key = req.headers["sec-websocket-key"];
            const gen_sec_webSocket_accept = this._generateAcceptValue(
                accept_client_websocket_key
            );

            /* 
            Prepare response header from websocket server to complete handshake
            (To acknowledge client, that handshake is done for websocket must need to send response with few headers) 
            */
            const responseHeaders = [
                "HTTP/1.1 101 Switching Protocols",
                "Upgrade: websocket",
                "Connection: Upgrade",
                `Sec-WebSocket-Accept: ${gen_sec_webSocket_accept}`,
            ];

            socket.write(responseHeaders.concat("\r\n").join("\r\n"));

            //handle the connection close event
            this.on("close", () => {
                console.log("closing....");
                socket.destroy();
            });

            //handle the data event listener, also passing the parsed data outside (using parseFrame(buffer))
            socket.on("data", (buffer) =>{
                this.emit(
                    "data",
                    this.parseFrame(buffer),
                    (data) => socket.write(this.createFrame(data)) // callback to pass a reply function to the end user, with this we are able to not only receive data, but also send data back to the client:
                )}
            );

            socket.on("error", (err) => {
                console.log("Caught flash policy server socket error: "),
                console.log(err.stack);
            });
        });
    } //END _init

    _generateAcceptValue(accessKey) {
        return crypto
        .createHash(`SHA1`)
        .update(accessKey + this.GUID, `binary`)
        .digest("base64");
    } //END _generateAcceptValue

    //Listen to client request
    listen(callbackFun) {
        this._server.listen(this.port, this.host, callbackFun);
    } //END listen

    /**
     * Retrieve Data From Client
        A client MUST mask all frames that it sends to the server. 
        A server MUST NOT mask any frames that it sends to the client.
        WebSocket frame and their sizes in bits - 
        1. FIN - first bit, if it is set then it is mean that last fragment of data-frame
        2. RSV1, RSV2, RSV3 — 1 bit each. These are reserved for WebSocket extensions usage.
        3. Opcode — 4 bits. This block is used for interpreting the Payload Data block.
            Opcode value	    Meaning
            0x00	            Denotes that this frame continues the payload from the previous frame
            0x01	            Denotes a text frame
            0x02	            Denotes a binary frame
            0x08	            Denotes that the client wants to close the connection
            0x09, 0x0a	        ping and pong frames - a heartbeat mechanism for ensuring the connection is still alive

            0x03 - 0x07,
            0x0b - 0x0f	        Reserved for future use

        4. Mask — defines whether the Payload Data block is masked. If set to 1, a 4-byte masking-key block must be present and used to unmask the Payload Data block. 

    */

    parseFrame(buffer) {
        // ... first byte processing ...
        const firstByte = buffer.readUInt8(0);
        const opCode = firstByte & 0b00001111; // get last 4 bits of a byte
        /*
            We read the first byte of the buffer and extract the opcode value which is the last 4 bits of the first byte. 
            If the opcode is 0x08 then we emit a close event and return null. 
            */

        if (opCode === this.OPCODES.close) {
        this.emit("close");
            return null;
        } else if (opCode !== this.OPCODES.text) {
            return;
        }

        // second byte processing next...
        const secondByte = buffer.readUInt8(1);
        let offset = 2; //offset value is 2 because we’ve already read the first and the second bytes of the buffer
        let payloadLength = secondByte & 0b01111111; // get last 7 bits of a second byte

        if (payloadLength === 126) {
            offset += 2;
        } else if (payloadLength === 127) {
            offset += 8;
        }

        //checking the mask bit (which is the first bit of the second byte) and extracting the masking-key
        const isMasked = Boolean((secondByte >>> 7) & 0b00000001); // get first bit of a second byte
        if (isMasked) {
            const maskingKey = buffer.readUInt32BE(offset); // read 4-byte (32-bit) masking key
            offset += 4;
            const payload = buffer.subarray(offset);
            const result = this._unmask(payload, maskingKey);
            return result.toString("utf-8");
        }

        return buffer.subarray(offset).toString("utf-8");
    } //END parseFrame

    /*
        1. algorithm for masking and unmasking is the same
        2. Octet i of the transformed data is the XOR of octet i of the original data with octet at index i modulo 4 of the masking key
        3.  operating on the bytes level, so we’ll need some binary arithmetic to transform each bit of the payload.
    */
    _unmask(payload, maskingKey) {
        const result = Buffer.alloc(payload.byteLength);

        for (let i = 0; i < payload.byteLength; ++i) {
        const j = i % 4;
        const maskingKeyByteShift = j === 3 ? 0 : (3 - j) << 3;
        const maskingKeyByte =
            (maskingKeyByteShift === 0
            ? maskingKey
            : maskingKey >>> maskingKeyByteShift) & 0b11111111;
        const transformedByte = maskingKeyByte ^ payload.readUInt8(i);
        result.writeUInt8(transformedByte, i);
        }

        return result;
    } //END _unmask

    /**
     * Send Data From Server To Client]
     * simplifying things a little - don’t allocate 4 bytes for a masking key. assume that the FIN bit is always set and the opcode value is always 0x01 (text frame).
     * Then we can just hardcode the first frame byte — 0b10000001: FIN (1), RSV1 (0), RSV2 (0), RSV3 (0), Opсode (0001)
     */

    createFrame(data) {
        console.log("Creating frame to reply client...");
        const payload = JSON.stringify(data);
        const payloadByteLength = Buffer.byteLength(payload);
        //console.log("payloadByteLength: - ", payloadByteLength);
        let payloadBytesOffset = 2;
        let payloadLength = payloadByteLength;
        if (payloadByteLength > 65535) {
            //length value cannot be more than 2 byte
            // length value cannot fit in 2 bytes
            payloadBytesOffset += 8;
            payloadLength = 127;
        } else if (payloadByteLength > 125) {
            payloadBytesOffset += 2;
            payloadLength = 126;
        }
        // payloadBytesOffset variable to make it match the offset from which the actual payload should start in the buffer.
        const buffer = Buffer.alloc(payloadBytesOffset + payloadByteLength);
        //console.log("1. buffer :-", buffer);
        // first byte - [FIN (1), RSV1 (0), RSV2 (0), RSV3 (0), Opсode (0x01 - text frame)]
        buffer.writeUInt8(0b10000001, 0);
        // second byte - actual payload size (if <= 125 bytes) or 126, or 127
        buffer[1] = payloadLength;
        //console.log("2. buffer :-", buffer);
        if (payloadLength === 126) {
            // write actual payload length as a 16-bit unsigned integer
            buffer.writeUInt16BE(payloadByteLength, 2);
        } else if (payloadByteLength === 127) {
            // write actual payload length as a 64-bit unsigned integer
            buffer.writeBigUInt64BE(BigInt(payloadByteLength), 2);
        }

        buffer.write(payload, payloadBytesOffset);
        return buffer;

    } //END createFrame

} //END Class WebSocketServer

module.exports = WebSocketServer;