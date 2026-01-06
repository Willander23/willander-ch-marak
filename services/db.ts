
const DB_NAME = 'GaroBibleDB';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'chapters';
const STORE_DAILY = 'daily_verse';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        db.createObjectStore(STORE_CHAPTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DAILY)) {
        db.createObjectStore(STORE_DAILY, { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveChapterToCache = async (bookId: string, chapter: number, data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
  const store = tx.objectStore(STORE_CHAPTERS);
  await store.put({ id: `${bookId}-${chapter}`, bookId, chapter, data, timestamp: Date.now() });
};

export const getChapterFromCache = async (bookId: string, chapter: number): Promise<any | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CHAPTERS, 'readonly');
    const store = tx.objectStore(STORE_CHAPTERS);
    const request = store.get(`${bookId}-${chapter}`);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => resolve(null);
  });
};

export const isChapterCached = async (bookId: string, chapter: number): Promise<boolean> => {
  const data = await getChapterFromCache(bookId, chapter);
  return !!data;
};

export const getCachedChapterCount = async (bookId: string): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CHAPTERS, 'readonly');
    const store = tx.objectStore(STORE_CHAPTERS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result;
      resolve(all.filter((item: any) => item.bookId === bookId).length);
    };
  });
};
