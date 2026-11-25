import { openDB } from 'idb';

// Misma base de datos que usa el service worker (public/js/utility.js).
const DB_NAME = 'posts-store';
const DB_VERSION = 1;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('posts')) {
          db.createObjectStore('posts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync-posts')) {
          db.createObjectStore('sync-posts', { keyPath: 'id' });
        }
      },
      // Si el navegador cierra la conexión (p. ej. al borrar los datos del sitio),
      // la siguiente operación abre una nueva.
      terminated() {
        dbPromise = null;
      },
      blocking() {
        dbPromise = null;
      }
    });
  }
  return dbPromise;
}

async function withDb(operation) {
  try {
    return await operation(await getDb());
  } catch (err) {
    if (err && err.name === 'InvalidStateError') {
      dbPromise = null;
      return operation(await getDb());
    }
    throw err;
  }
}

export const writeData = (store, data) => withDb((db) => db.put(store, data));
export const readAllData = (store) => withDb((db) => db.getAll(store));
export const deleteItem = (store, id) => withDb((db) => db.delete(store, id));
export const clearAllData = (store) => withDb((db) => db.clear(store));
