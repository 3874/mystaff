let db;
const dbName = 'mystaff';
const ownerStoreName = 'owner';
const chatsStoreName = 'chats';

export function init() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 4); // Increment version to 4

        request.onerror = function(event) {
            console.error("Database error: " + event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains(ownerStoreName)) {
                const ownerStore = db.createObjectStore(ownerStoreName, { keyPath: "email" });
                ownerStore.createIndex("nick", "nick", { unique: false });
                ownerStore.createIndex("companyName", "companyName", { unique: false });
            }
            if (db.objectStoreNames.contains(chatsStoreName)) {
                db.deleteObjectStore(chatsStoreName);
            }
            const chatsStore = db.createObjectStore(chatsStoreName, { keyPath: "sessionId" });
            chatsStore.createIndex("staff_id", "staff_id", { unique: false });

            if (db.objectStoreNames.contains('messages')) {
                db.deleteObjectStore('messages');
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("Database 'mystaff' opened successfully");
            resolve();
        };
    });
}


export function addChatSession(session) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readwrite");
        const objectStore = transaction.objectStore(chatsStoreName);
        const newSession = { ...session, messages: [] };
        const request = objectStore.add(newSession);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function() {
            reject("Failed to add chat session.");
        };
    });
}

export function addChatMessage(sessionId, sender, text) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readwrite");
        const objectStore = transaction.objectStore(chatsStoreName);
        const request = objectStore.get(sessionId);

        request.onsuccess = function() {
            const session = request.result;
            if (session) {
                session.messages.push({ sender, text, timestamp: new Date() });
                const updateRequest = objectStore.put(session);
                updateRequest.onsuccess = function() {
                    resolve(updateRequest.result);
                };
                updateRequest.onerror = function() {
                    reject("Failed to update chat session.");
                };
            } else {
                reject("Session not found.");
            }
        };

        request.onerror = function() {
            reject("Error fetching chat session.");
        };
    });
}

export function getChatMessages(sessionId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readonly");
        const objectStore = transaction.objectStore(chatsStoreName);
        const request = objectStore.get(sessionId);

        request.onsuccess = function() {
            if (request.result) {
                resolve(request.result.messages);
            } else {
                resolve([]);
            }
        };

        request.onerror = function() {
            reject("Error fetching chat messages.");
        };
    });
}

export function deleteChatMessages(sessionId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readwrite");
        const objectStore = transaction.objectStore(chatsStoreName);
        const request = objectStore.get(sessionId);

        request.onsuccess = function() {
            const session = request.result;
            if (session) {
                session.messages = [];
                const updateRequest = objectStore.put(session);
                updateRequest.onsuccess = function() {
                    resolve();
                };
                updateRequest.onerror = function() {
                    reject("Failed to clear messages.");
                };
            } else {
                resolve(); // Session not found, but resolve anyway
            }
        };

        request.onerror = function() {
            reject("Error fetching chat session.");
        };
    });
}

export function getChatSessionByStaffId(staffId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readonly");
        const objectStore = transaction.objectStore(chatsStoreName);
        const index = objectStore.index("staff_id");
        const request = index.get(staffId);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function() {
            reject("Error fetching chat session.");
        };
    });
}

export function getChatSession(sessionId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readonly");
        const objectStore = transaction.objectStore(chatsStoreName);
        const request = objectStore.get(sessionId);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function() {
            reject("Error fetching chat session.");
        };
    });
}

export function getUserData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([ownerStoreName], "readonly");
        const objectStore = transaction.objectStore(ownerStoreName);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function() {
            resolve(getAllRequest.result);
        };

        getAllRequest.onerror = function() {
            reject("Error fetching data.");
        };
    });
}

export function getChatData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readonly");
        const objectStore = transaction.objectStore(chatsStoreName);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function() {
            resolve(getAllRequest.result);
        };

        getAllRequest.onerror = function() {
            reject("Error fetching data.");
        };
    });
}

export function getChatPartData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readonly");
        const objectStore = transaction.objectStore(chatsStoreName);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function() {
            // Map the results to include only sessionId, staff_id, and title
            const filteredData = getAllRequest.result.map(session => ({
                sessionId: session.sessionId,
                staff_id: session.staff_id,
                title: session.title
            }));
            resolve(filteredData);
        };

        getAllRequest.onerror = function() {
            reject("Error fetching data.");
        };
    });
}

export function addUser(user) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([ownerStoreName], "readwrite");
        const objectStore = transaction.objectStore(ownerStoreName);
        const addRequest = objectStore.add(user);

        addRequest.onsuccess = function() {
            resolve();
        };

        addRequest.onerror = function() {
            reject("Failed to add user.");
        };
    });
}

export function clearUserData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([ownerStoreName], "readwrite");
        const ownerStore = transaction.objectStore(ownerStoreName);
        ownerStore.clear();
        resolve();
    });
}


export function clearChatData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([chatsStoreName], "readwrite");
        const chatsStore = transaction.objectStore(chatsStoreName);
        chatsStore.clear();
        resolve();
    });
}

export function updateUser(user) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not initialized.");
            return;
        }
        const transaction = db.transaction([ownerStoreName], "readwrite");
        const objectStore = transaction.objectStore(ownerStoreName);
        const putRequest = objectStore.put(user);

        putRequest.onsuccess = function() {
            resolve();
        };

        putRequest.onerror = function() {
            reject("Failed to update user.");
        };
    });
}