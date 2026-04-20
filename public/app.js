// app.js
let socket;
let encryptionKey;

// ─── STEP 1: Start everything once the page is ready ──────────────────────
window.addEventListener("DOMContentLoaded", async () => {
    encryptionKey = await generateKey();
    console.log("🔑 Encryption key generated");

    // Wire up buttons
    document
        .getElementById("sendButton")
        .addEventListener("click", sendMessage);
    document
        .getElementById("messageInput")
        .addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });

    updateOnlineStatus();
    connectWebSocket();
    registerServiceWorker();
});

// ─── STEP 2: Connect to the WebSocket server ──────────────────────────────
function connectWebSocket() {
    socket = new WebSocket(`ws://${window.location.host}`);

    socket.addEventListener("open", () => {
        console.log("✅ Connected to server via WebSocket");
        updateOnlineStatus();
        flushMessageQueue();
    });

    socket.addEventListener("close", () => {
        console.log("❌ Disconnected from server");
        updateOnlineStatus();
        setTimeout(connectWebSocket, 3000);
    });

    socket.addEventListener("message", async (event) => {
        const data = JSON.parse(event.data);
        const plaintext = await decryptMessage(encryptionKey, data.encrypted);
        displayMessage(plaintext, data.sender, false);
    });
}

// ─── STEP 3: Register the Service Worker ──────────────────────────────────
function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("/sw.js")
            .then(() => console.log("⚙️ Service Worker registered"))
            .catch((err) => console.error("Service Worker failed:", err));
    }
}

// ─── STEP 4: Send a message ────────────────────────────────────────────────
async function sendMessage() {
    const input = document.getElementById("messageInput"); // ← your ID
    const text = input.value.trim();
    if (!text) return;

    input.value = "";

    const encrypted = await encryptMessage(encryptionKey, text);
    const payload = JSON.stringify({
        encrypted: encrypted,
        sender: "Me",
        timestamp: new Date().toISOString(),
    });

    displayMessage(text, "Me", true);

    if (navigator.onLine && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
    } else {
        console.log("📦 Offline — queueing message...");
        await saveToQueue(payload);
        if ("serviceWorker" in navigator && "SyncManager" in window) {
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register("sync-messages");
            console.log("🔄 Background sync registered");
        }
    }
}

// ─── STEP 5: IndexedDB queue ───────────────────────────────────────────────
function saveToQueue(payload) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("messenger-db", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                db.createObjectStore("queue", { autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("queue", "readwrite");
            tx.objectStore("queue").add(payload);
            tx.oncomplete = resolve;
            tx.onerror = reject;
        };
        request.onerror = reject;
    });
}

async function flushMessageQueue() {
    return new Promise((resolve) => {
        const request = indexedDB.open("messenger-db", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                db.createObjectStore("queue", { autoIncrement: true });
            }
        };
        request.onsuccess = async (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                resolve();
                return;
            }
            const tx = db.transaction("queue", "readonly");
            const results = [];
            tx.objectStore("queue").openCursor().onsuccess = async (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    results.push({ key: cursor.key, value: cursor.value });
                    cursor.continue();
                } else {
                    console.log(
                        `📤 Flushing ${results.length} queued message(s)...`,
                    );
                    for (const { key, value } of results) {
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(value);
                            await deleteFromQueue(key);
                        }
                    }
                    resolve();
                }
            };
        };
        request.onerror = resolve;
    });
}

function getAllQueuedMessages() {
    return new Promise((resolve) => {
        const request = indexedDB.open("messenger-db", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                db.createObjectStore("queue", { autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) return resolve([]);
            const tx = db.transaction("queue", "readonly");
            const results = [];
            tx.objectStore("queue").openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    results.push({ key: cursor.key, value: cursor.value });
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            tx.onerror = () => resolve([]);
        };
        request.onerror = () => resolve([]);
    });
}

function deleteFromQueue(key) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("messenger-db", 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("queue", "readwrite");
            tx.objectStore("queue").delete(key);
            tx.oncomplete = resolve;
            tx.onerror = reject;
        };
        request.onerror = reject;
    });
}

// ─── STEP 6: Display a message ────────────────────────────────────────────
function displayMessage(text, sender, isMine) {
    const chatArea = document.getElementById("chatArea"); // ← your ID

    // Remove "No messages yet" placeholder on first message
    const emptyState = chatArea.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    const div = document.createElement("div");
    div.className = `message ${isMine ? "mine" : "theirs"}`;

    const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    div.innerHTML = `
        <span class="sender">${isMine ? "You" : sender}</span>
        <span class="text">${text}</span>
        <span class="time">${time}</span>
    `;

    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ─── STEP 7: Update status dot ────────────────────────────────────────────
function updateOnlineStatus() {
    const dot = document.getElementById("statusDot"); // ← your ID
    const text = document.getElementById("statusText"); // ← your ID

    const isConnected =
        navigator.onLine && socket && socket.readyState === WebSocket.OPEN;

    dot.classList.toggle("online", isConnected);
    dot.classList.toggle("offline", !isConnected);
    text.textContent = isConnected ? "Online" : "Offline";
}

window.addEventListener("online", () => {
    updateOnlineStatus();
    flushMessageQueue();
});
window.addEventListener("offline", updateOnlineStatus);
