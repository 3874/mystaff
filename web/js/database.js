// database.js
// IndexedDB 기본 CRUD

const DB_NAME = 'mystaff';
const DB_VERSION = 2; // DB 버전을 4로 올립니다.

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('mydata')) {
        db.createObjectStore('mydata', { keyPath: 'myId' });
      }
      if (!db.objectStoreNames.contains('chat')) {
        db.createObjectStore('chat', { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains('LTM')) {
        db.createObjectStore('LTM', { keyPath: 'sessionId' });
      }
      
      if (db.objectStoreNames.contains('myfiles')) {
        db.deleteObjectStore('myfiles');
      }
      db.createObjectStore('myfiles', { keyPath: 'id' });

      if (!db.objectStoreNames.contains('diystaff')) {
        db.createObjectStore('diystaff', { keyPath: 'staffId' });
      }

      if (!db.objectStoreNames.contains('myinterns')) {
        db.createObjectStore('myinterns', { keyPath: 'staffId' });
      }
      
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function addData(storeName, data) {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add(data);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getDataByKey(storeName, key) {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllData(storeName) {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateData(storeName, key, newData) {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(key);
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const existingData = getReq.result; // This is undefined if not found
      
      // If newData is not a plain object, wrap it in an object with a 'contents' property.
      const dataToMerge = (newData !== null && typeof newData === 'object' && !Array.isArray(newData))
        ? newData
        : { contents: newData };

      const dataToWrite = { ...existingData, ...dataToMerge };

      if (typeof store.keyPath === 'string') {
        dataToWrite[store.keyPath] = key;
      }

      const putReq = store.put(dataToWrite);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
  });
}

export async function deleteData(storeName, key) {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
