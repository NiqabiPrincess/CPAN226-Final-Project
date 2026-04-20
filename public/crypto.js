// crypto.js
// We use a hardcoded key so ALL tabs/users can decrypt each other's messages.
// In a real app you'd exchange keys securely — but for this demo this is fine.

const RAW_KEY = [
    89, 212, 34, 167, 45, 123, 200, 78, 156, 23, 89, 234, 12, 145, 67, 190, 34,
    78, 123, 56, 189, 234, 90, 145, 23, 167, 200, 45, 112, 78, 234, 56,
];

async function generateKey() {
    // Instead of generating a random key, we always import the same fixed key
    return await window.crypto.subtle.importKey(
        "raw",
        new Uint8Array(RAW_KEY),
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"],
    );
}

async function encryptMessage(key, message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data,
    );

    return {
        ciphertext: Array.from(new Uint8Array(ciphertext)),
        iv: Array.from(iv),
    };
}

async function decryptMessage(key, encryptedData) {
    try {
        const ciphertext = new Uint8Array(encryptedData.ciphertext);
        const iv = new Uint8Array(encryptedData.iv);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext,
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (err) {
        return "[Could not decrypt message]";
    }
}
