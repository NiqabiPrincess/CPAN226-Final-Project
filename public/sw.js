// sw.js — The Service Worker
// This file runs in the BACKGROUND, separate from the main page.
// Its two jobs:
//   1. Cache app files so the UI loads even with no internet
//   2. Listen for the "sync" event to flush queued messages when back online

const CACHE_NAME = "messenger-v1";

// List of files to cache for offline use
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/app.js",
    "/crypto.js",
    "/manifest.json",
];

// ─── Install event: cache all app files ───────────────────────────────────
// This runs once when the Service Worker is first registered
self.addEventListener("install", (event) => {
    console.log("[SW] Installing and caching app files...");

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE); // Download and store all listed files
        }),
    );

    self.skipWaiting(); // Activate the SW immediately (don't wait for page refresh)
});

// ─── Activate event: clean up old caches ──────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[SW] Removing old cache:", key);
                        return caches.delete(key); // Delete any caches from older versions
                    }
                }),
            );
        }),
    );
    self.clients.claim(); // Take control of open pages immediately
});

// ─── Fetch event: serve cached files when offline ─────────────────────────
// This intercepts every network request the page makes
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If we have a cached version, return it (works offline!)
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise, try fetching from the network as normal
            return fetch(event.request);
        }),
    );
});

// ─── Sync event: send queued messages when back online ────────────────────
// The browser triggers this automatically when internet is restored
// (after app.js registered a sync task with reg.sync.register('sync-messages'))
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-messages") {
        console.log("[SW] Back online! Flushing message queue...");
        event.waitUntil(syncQueuedMessages());
    }
});

async function syncQueuedMessages() {
    // Open the same IndexedDB database that app.js uses
    const db = await openDatabase();
    const messages = await getAllMessages(db);

    for (const { key, value } of messages) {
        try {
            // Try to send each queued message to the server
            const response = await fetch("/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: value,
            });

            if (response.ok) {
                await deleteMessage(db, key); // Only delete if successfully sent
                console.log("[SW] Queued message sent and removed from queue");
            }
        } catch (err) {
            console.error("[SW] Failed to send queued message:", err);
        }
    }
}

// IndexedDB helpers (same database as app.js, accessed from SW context)
function openDatabase() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("messenger-db", 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                db.createObjectStore("queue", { autoIncrement: true });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = reject;
    });
}

function getAllMessages(db) {
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains("queue")) return resolve([]);
        const tx = db.transaction("queue", "readonly");
        const results = [];
        tx.objectStore("queue").openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                results.push({ key: cursor.key, value: cursor.value });
                cursor.continue();
            } else resolve(results);
        };
        tx.onerror = reject;
    });
}

function deleteMessage(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("queue", "readwrite");
        tx.objectStore("queue").delete(key);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}
