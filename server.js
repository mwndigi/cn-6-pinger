const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const uuid = require('uuid');

function createMessage() {
    return { uuid: uuid.v4() };
}

function messageToBuffer(message) {
    return Buffer.from(JSON.stringify(message), "utf-8");
}

let message = createMessage();

server.on('message', function (message, remote) {
    console.log(message.toString());
    server.send(message, 0, message.length, remote.port, remote.address);
});

server.bind(6790, '0.0.0.0');
