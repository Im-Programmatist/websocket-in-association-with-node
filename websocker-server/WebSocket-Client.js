const WebSocket = require('ws');
const path = require("node:path");
Object.assign(global, { WebSocket: require('ws') });

require('dotenv').config({ path: path.resolve(__dirname, './.env') });

console.log('calling ', `ws://localhost:${process.env.PORT}`);

//Make handshake to websocket server with HTTP upgraded connection 
var socket = new WebSocket(`ws://localhost:${process.env.PORT}`, {
    headers: {
      Origin: "http://localhost"
    }
  })
    .on('error',function(error){
        console.log('Error is', error);
    })
    /**
     * Send Data To Server
    */
    .on('open',function(){
        console.log('connection opened...\n Sending data to server...');
        dataInterval = setInterval(sendData, 3000);
    })
    /**
     * Receive Data From Server
     */
    .on('message',function(data){
        console.log('server message received', JSON.parse(data));
    })
    .on('close',function(){
        console.log('connection closed');
        clearInterval(dataInterval);
    });
    //socket.addEventListener('message', ({ data }) => { console.log(JSON.parse(data)) });
var dataInterval;
let counter = 0;
let sendData = () => {
   //console.log('Settimeout-socket.readyState : ', socket.readyState, 'counter -', counter );
   //Pass data to websocket server
   if (socket.readyState !== WebSocket.CLOSED) {
       var msg = `This is my ${counter} try to send data` ;
       // send data server
        switch(counter){
            case 0:
                socket.send(JSON.stringify({ method: 'auth', args: ['admin', 'wrong'] }));
                break;
            case 1:
                socket.send(JSON.stringify({ method: 'auth', args: ['admin', 'secret'] }));
                break;
            case 2:
                socket.send(JSON.stringify({ method: 'getUsers' }));
                break
            default:
                for(let i = 0; i < counter; i++) {
                    msg+=msg;
                } 
                socket.send(JSON.stringify({ method: 'random', args: msg }));
        }
        counter++;
    }
}




