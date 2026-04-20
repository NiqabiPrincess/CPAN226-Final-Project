// server.js
// This is your Node.js backend. It does two things:
//   1. Serves your frontend files (HTML, JS, etc.)
//   2. Runs a WebSocket server so clients can send/receive messages in real-time

const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");
const path = require("path");

const app = express();

// Serve everything in the /public folder as static files
// When a browser visits http://localhost:3000, it gets public/index.html
app.use(express.static(path.join(__dirname, "public")));

// Create an HTTP server (needed so WebSocket and Express share the same port)
const server = http.createServer(app);

// Create the WebSocket server on the same HTTP server
const wss = new WebSocketServer({ server });

// This runs every time a new browser tab connects via WebSocket
wss.on("connection", (ws) => {
    console.log("A new client connected!");

    // This runs every time a connected client sends a message
    ws.on("message", (data) => {
        console.log("Message received, broadcasting to all clients...");

        // Broadcast this message to EVERY connected client (including the sender)
        wss.clients.forEach((client) => {
            // readyState === 1 means the client is still connected and ready
            if (client.readyState === 1) {
                client.send(data.toString());
            }
        });
    });

    // This runs when a client disconnects (closes their tab, etc.)
    ws.on("close", () => {
        console.log("A client disconnected.");
    });
});

// Start listening on port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
