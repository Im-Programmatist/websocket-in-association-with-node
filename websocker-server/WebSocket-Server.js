const path = require("node:path");
const crypto = require("node:crypto");
const WebSocketServer = require('./WebSocket-Class.js');
const { setTimeout: sleep } = require("node:timers/promises");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const PORT = process.env.PORT || 5555;
const HOST = process.env.HOST || "127.0.0.1";

/**
 * Create API To Serve CLient Calls
 */
const api = {
    auth: async (login, password) => {
        await sleep(300); // simulate asynchronous call
        if (login === "admin" && password === "secret") {
            return {
                token: crypto.randomBytes(20).toString("hex"),
            };
        }
        return {
            error: "Unauthorized",
        };
    },

    getUsers: () => {
        return [
            { login: "johnny", email: "johnny@example.org" },
            { login: "valentine", email: "valentine@example.org" },
        ];
    },

    random: (param) => {
        return param;
    }
}; //END API Definition

const server = new WebSocketServer({ PORT, HOST });

// //Get emitted data event
// server.on("headers", ({ headers, socket }) =>{
//     console.log("Request Headers from Client : \t", headers);
// });//server.on("headers"

server.on('message',(message)=>{
    console.log('message', message,' type', message.type);
});

//Receive data coming from client request to websocket server
server.on("data", async (message, reply) => {
    if (!message) return;
    console.log('Client data -', message);
    const data = JSON.parse(message);
    //console.log("Message received:", data);
    const { method, args = [] } = data;
    const handler = api[method];
    if (!handler) return reply({ error: "Not Found" });

    try {
        const result = await handler(...args);
        reply(result);
    } catch (error) {
        console.error(error);
        reply({ error: "Internal Server Error" });
    }
    return reply({ pong: data });

});//END server.on("data"

//Active server to listen clients request
server.listen(() => {
    console.log(
        `Available at - ws://${HOST}:${PORT}`
    );
});//END server.listen

