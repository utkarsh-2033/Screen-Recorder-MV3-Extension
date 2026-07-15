export interface StoredChunk {
  id?: number;
  filename: string;
  chunkIndex: number;
  data: ArrayBuffer;
  timestamp: number;
}

const DB_NAME = 'ClipIQ_Chunks_DB';
const STORE_NAME = 'video_chunks';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('filename', 'filename', { unique: false });
        store.createIndex('chunkIndex', 'chunkIndex', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function storeChunk(chunk: Omit<StoredChunk, 'id'>): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(chunk);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getChunksForFile(filename: string): Promise<StoredChunk[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('filename');
    const request = index.getAll(filename);

    request.onsuccess = () => {
      const chunks = request.result as StoredChunk[];
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      resolve(chunks);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChunksForFile(filename: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('filename');
    const request = index.openCursor(IDBKeyRange.only(filename));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
