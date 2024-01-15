// configuration of IndexedDB
const dbName = 'myDatabase';
const dbVersion = 2;
const storeName = 'files';

let db;
let request = indexedDB.open(dbName, dbVersion);

request.onupgradeneeded = function (event) {
    let db = event.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'path' });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
};

request.onerror = function (event) {
    console.error('Database error:', event.target.error);
};

// Read the contents of the specified file
function readFileFromIndexedDB(filePath) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(filePath);

        request.onsuccess = function(event) {
            const fileData = event.target.result;
            if (fileData && fileData.content) {
                resolve(new Uint8Array(fileData.content)); // 假设 content 是 ArrayBuffer
            } else {
                reject('File not found');
            }
        };

        request.onerror = function(event) {
            reject('Error reading file from IndexedDB: ' + event.target.errorCode);
        };
    });
}

// Get the size and last modified date of the specified file
function getFileProperties(filePath) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(filePath);

        request.onsuccess = function(event) {
            const fileData = event.target.result;
            if (fileData) {
                resolve({
                    size: fileData.size,
                    lastModified: fileData.lastModified
                });
            } else {
                reject('File not found');
            }
        };

        request.onerror = function(event) {
            reject('Error querying file properties from IndexedDB: ' + event.target.errorCode);
        };
    });
}

// Get all files in the specified directory
function getFilesStartingWith(dirname) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        const files = [];

        request.onsuccess = function(event) {
            const allFiles = event.target.result;
            allFiles.forEach(file => {
                if (file.path.startsWith(dirname)) {
                    files.push(file.path);
                }
            });
            resolve(files);
        };

        request.onerror = function(event) {
            reject('Error querying IndexedDB: ' + event.target.errorCode);
        };
    });
}



// Expose these functions to the global object
window.readFileFromIndexedDB = readFileFromIndexedDB;
window.getFileProperties = getFileProperties;
window.getFilesStartingWith = getFilesStartingWith;