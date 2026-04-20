# CPAN226-Final-Project

# Offline-First Secure Messenger (PWA)

A Progressive Web App that allows users to send AES-GCM encrypted messages in real time using WebSockets. Messages are queued locally when offline and automatically synced when connectivity is restored.

**Course:** CPAN226 — Network Programming  
**Project:** #9 — Offline-First Secure Messenger  
**Student:** Zainab Aamir  

---

## Features

- Real-time messaging using WebSockets over TCP
- AES-GCM 256-bit end-to-end encryption via the Web Crypto API
- Offline message queuing using IndexedDB
- Automatic message sync when connection is restored
- Service Worker for offline app caching
- Installable as a PWA on any device

---

## Prerequisites

Make sure you have the following installed before running the app:

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

To check if you have them installed, run:
```bash
node -v
npm -v
```

---

## Project Structure
messenger/
├── server.js           # Node.js backend — Express + WebSocket server
├── package.json        # Project dependencies
└── public/
├── index.html      # Main HTML page
├── style.css       # Styling
├── app.js          # Frontend logic — WebSocket, IndexedDB, UI
├── crypto.js       # AES-GCM encryption and decryption
├── sw.js           # Service Worker — offline caching and sync
├── manifest.json   # PWA manifest
├── favicon.ico     # Browser tab icon
├── icon-192.png    # PWA icon (192x192)
└── icon-512.png    # PWA icon (512x512)

---

## Setup Instructions

**1. Clone or download the project**
```bash
git clone <your-repo-url>
cd messenger
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the server**
```bash
node server.js
```

You should see: ✅ Server running at http://localhost:3000

**4. Open the app**

Open Google Chrome and go to: http://localhost:3000

> ⚠️ Must use Chrome — Service Workers and Background Sync are best supported in Chrome.

---

## Testing the App

**Test real-time messaging:**
1. Open two tabs at `http://localhost:3000`
2. Type a message in Tab 1 and hit Send
3. The message should appear in Tab 2 instantly

**Test offline queuing:**
1. Press `F12` to open Chrome DevTools
2. Go to the **Network** tab
3. Change the throttling dropdown from "No throttling" to **Offline**
4. Type a message and hit Send — it will be queued locally
5. Change back to **No throttling**
6. The message will automatically sync and appear in Tab 2

**Verify encryption:**
1. Open DevTools → **Network** tab → click **WS** filter
2. Click the localhost connection → click **Messages**
3. Send a message — the raw data should appear as an array of numbers, not readable text

---

## How It Works

1. The browser connects to the Node.js WebSocket server
2. When a message is sent, it is encrypted using AES-GCM before leaving the browser
3. The encrypted payload is sent to the server over WebSocket
4. The server broadcasts it to all connected clients
5. Each client decrypts the message using the shared key and displays it
6. If the user is offline, the message is saved to IndexedDB and sent automatically when the connection returns

---

## Dependencies

| Package | Purpose |
|---|---|
| express | Serves the frontend files over HTTP |
| ws | WebSocket server for real-time communication |