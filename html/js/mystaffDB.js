// mystaffDB.js
const MystaffDB = (function() {
    let db;
    const dbName = 'mystaff';
    const storeName = 'owner';

    function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = function(event) {
                console.error("Database error: " + event.target.errorCode);
                reject(event.target.errorCode);
            };

            request.onupgradeneeded = function(event) {
                db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    const objectStore = db.createObjectStore(storeName, { keyPath: "email" });
                    objectStore.createIndex("nick", "nick", { unique: false });
                    objectStore.createIndex("companyName", "companyName", { unique: false });
                }
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                console.log("Database 'mystaff' opened successfully");
                resolve();
            };
        });
    }

    function getAllData() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("Database not initialized.");
                return;
            }
            const transaction = db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const getAllRequest = objectStore.getAll();

            getAllRequest.onsuccess = function() {
                resolve(getAllRequest.result);
            };

            getAllRequest.onerror = function() {
                reject("Error fetching data.");
            };
        });
    }

    function addUser(user) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("Database not initialized.");
                return;
            }
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const addRequest = objectStore.add(user);

            addRequest.onsuccess = function() {
                resolve();
            };

            addRequest.onerror = function() {
                reject("Failed to add user.");
            };
        });
    }

    function clearAllData() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("Database not initialized.");
                return;
            }
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const clearRequest = objectStore.clear();

            clearRequest.onsuccess = function() {
                resolve();
            };

            clearRequest.onerror = function() {
                reject("Failed to clear data.");
            };
        });
    }

    function updateUser(user) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject("Database not initialized.");
                return;
            }
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const putRequest = objectStore.put(user);

            putRequest.onsuccess = function() {
                resolve();
            };

            putRequest.onerror = function() {
                reject("Failed to update user.");
            };
        });
    }

    return {
        init,
        getAllData,
        addUser,
        clearAllData,
        updateUser
    };
})();
