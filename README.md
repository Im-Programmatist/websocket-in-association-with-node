# WEBSOCKET

## What Is Websocket

## 

<img src="https://e7.pngegg.com/pngimages/115/523/png-clipart-product-design-brand-logo-font-demo-text-orange-thumbnail.png" width="10%" heigth="auto" alt="test"/>
### Opening Handshake -
    - The handshake from the client looks as follows:

        GET /chat HTTP/1.1
        Host: server.example.com
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
        Origin: http://example.com
        Sec-WebSocket-Protocol: chat, superchat
        Sec-WebSocket-Version: 13
    
        The requirements for this handshake are as
        - The method of the request MUST be GET, and the HTTP version MUST be at least 1.1.
        - The request MUST contain an |Upgrade| header field whose value MUST include the "websocket" keyword.
        - The request MUST contain a |Connection| header field whose value MUST include the "Upgrade" token.
        - The request MUST include a header field with the name |Sec-WebSocket-Key| 7 value would be randomly selected 16-byte value that has been base64-encoded
        - MUST include a header field with the name |Origin|
        - CLient must serialized the connection, only one connection from same IP allowed to websocket, client request validated using algorithm created for websocket.
        - There MUST be no more than one connection in a CONNECTING state.
        - Likewise all header param from server added in response as below

    - The handshake from the server looks as follows:

        HTTP/1.1 101 Switching Protocols
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
        Sec-WebSocket-Protocol: chat


### Data Transfer Over Protocol
   - In the WebSocket Protocol, data is transmitted using a sequence of frames.  
   - To avoid confusing network intermediaries (such as intercepting proxies) and for security reasons, a client MUST mask all frames that it
   sends to the server. The server MUST close the connection upon receiving a frame that is not masked from client, In this case, a server MAY send a Close
   frame with a status code of 1002 (protocol error) as define, till the end a server MUST NOT mask any frames that it sends to
   the client.  
   - Unlikely a client MUST close a connection if it detects a masked frame. In this case, it MAY use the status code 1002 (protocol
   error) 

### Send Data To Client Over websocket
   - The endpoint MUST ensure the WebSocket connection is in the OPEN state, If at any point the state of the WebSocket connection changes, the endpoint MUST encapsulate data (frames) alternately.
   - The frame(s) that have been formed MUST be transmitted over the underlying network connection.

### Receiving Data To Client Over websocket
   - endpoint listens on the underlying network connection, Incoming data MUST be parsed as WebSocket frames.

**The WebSocket Protocol can be identified in proxy auto configuration scripts from the scheme ("ws" for unencrypted connections and "wss" for encrypted connections).**

**To accept the incoming connection the server must respond with an HTTP response with status 101 Switching Protocols & The response must contain a Sec-WebSocket-Accept header with a value generated using Sec-WebSocket-Key and concatenate it with a GUID value 258EDFA5-E914–47DA-95CA-C5AB0DC85B11 with SHA1 hash**

**A GUID (globally unique identifier) is a 128-bit text string that represents an identification (ID). Organizations generate GUIDs when a unique reference number is needed to identify information on a computer or network.** 


## Reference
- https://ably.com/blog/web-app-websockets-nodejs

- https://codedamn.com/news/full-stack/how-to-build-a-websocket-in-node-js

- https://betterprogramming.pub/implementing-a-websocket-server-from-scratch-in-node-js-a1360e00a95f

- https://ably.com/topic/websockets
  
- Chat app - https://medium.com/@martin.sikora/node-js-websocket-simple-chat-tutorial-2def3a841b61


- NPM websocket package - 
      - https://www.npmjs.com/package/websocket
