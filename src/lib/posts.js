import { POSTS_URL } from './config.js';
import { readAllData, writeData, deleteItem, clearAllData } from './db.js';

// Convierte el objeto de Firebase { clave: post } en un arreglo ordenado (más nuevos primero).
export function toPostArray(data) {
  if (!data) return [];
  return Object.keys(data)
    .map((key) => ({ ...data[key], id: data[key].id ?? key }))
    .filter((post) => post && typeof post === 'object')
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

// Datos remotos: Firebase Realtime Database.
export async function fetchRemotePosts() {
  const res = await fetch(POSTS_URL);
  if (!res.ok) throw new Error('Error al consultar publicaciones: ' + res.status);
  const posts = toPostArray(await res.json());

  // Guardar una copia local para usarla sin conexión.
  await clearAllData('posts');
  await Promise.all(posts.map((post) => writeData('posts', post)));
  return posts;
}

// Datos locales: copia en IndexedDB.
export async function readLocalPosts() {
  const posts = await readAllData('posts');
  return posts.sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

// Publicaciones creadas sin conexión que aún no se envían.
export const readPendingPosts = () => readAllData('sync-posts');
export const savePendingPost = (post) => writeData('sync-posts', post);

// Solo los campos que aceptan las reglas de Firebase (las coordenadas GPS se quedan en el dispositivo).
export const toFirebasePost = ({ id, title, location, image }) => ({ id, title, location, image });

export async function sendPost(post) {
  const res = await fetch(POSTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(toFirebasePost(post))
  });
  if (!res.ok) throw new Error('Error al enviar: ' + res.status);
  return res.json();
}

// Envía desde la página las publicaciones pendientes
// (para navegadores sin Background Sync, como Safari en iPhone).
let sending = false;
export async function sendPendingPosts() {
  if (sending || !navigator.onLine) return 0;
  sending = true;
  try {
    const pending = await readPendingPosts();
    for (const post of pending) {
      await sendPost(post);
      await deleteItem('sync-posts', post.id);
    }
    return pending.length;
  } finally {
    sending = false;
  }
}
