const dgram = require("dgram");
const uuid = require('uuid');

// PORT og HOST for DigitalOcean droplet
const PORT = 6790;
const HOST = '134.209.234.180';

const client = dgram.createSocket("udp4");

let messages = [];

client.on("message", (messageBuffer, remote) => {
    let receivedMessage = bufferToMessage(messageBuffer);
    let message = messages.find(message => message.uuid === (receivedMessage ||{}).uuid);
    if (message) {
        message.responseTimestamp = new Date().getTime();
    }
});

client.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});  

function createMessage() {
    return { uuid: uuid.v4() };
}

function messageToBuffer(message) {
    return Buffer.from(JSON.stringify(message), "utf-8");
}

function bufferToMessage(buffer) {
    try {
        return JSON.parse(buffer.toString("utf-8"));
    } catch (error) {
        return null;
    }
}

// Wait for timeout milliseconds
function wait(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

function sendMessage(message, port, host) {
    // Save the messages to our list...
    messages.push(message);
    console.log(`Sending message #${messages.length}...`);
    // Set the time we send out message...
    message.sentTimestamp = new Date().getTime();
    let messageBuffer = messageToBuffer(message);
    return new Promise((resolve, reject) => {
        client.send(messageBuffer, 0, messageBuffer.length, port, host, (error, bytes) => {
            if (error) {
                reject(error);
            } else {
                resolve(bytes);
            }
        })
    });      
}

async function sendMessages(messageCount, port, host, timeout) {
    for(let messageIndex = 0; messageIndex < messageCount; messageIndex++) {
        let message = createMessage();
        await sendMessage(message, port, host);
        await wait(timeout);
        if (message.responseTimestamp) {
            console.log(`Response received after ${message.responseTimestamp - message.sentTimestamp} ms...`);
        } else {
            console.log(`No response received after ${timeout} ms...`);
        }
    }
    logStatistics(messages);
}

function logStatistics(messages) {
    let messagesSent = messages.length;
    let messagesReceived = messages.filter(m => m.responseTimestamp).length;
    let messagesLost = messagesSent - messagesReceived;
    console.log(`Total messages sent: ${messagesSent}`);
    console.log(`Total messages received: ${messagesReceived}`);
    console.log(`Total messages lost: ${messagesLost} / ${(100*messagesLost / (messages.length || 1) ).toFixed(2)}%`);
    if (messagesReceived > 0) {
        console.log(`Average response interval:`, messages.filter(m => m.responseTimestamp).reduce((averageTime, message) =>  {
            averageTime += (message.responseTimestamp - message.sentTimestamp) / messagesReceived;
            return averageTime;
        }, 0) + " ms");
    }
}

sendMessages(10, PORT, HOST, 1000);
