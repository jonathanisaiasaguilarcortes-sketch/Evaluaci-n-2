// Guarda y lee las suscripciones push en Firebase Realtime Database.
// FIREBASE_DB_SECRET (variable de entorno de Vercel) da acceso al nodo /subscriptions,
// que no debe ser público porque contiene los datos de envío de cada dispositivo.
import { createHash } from 'node:crypto';

const DB_URL = process.env.FIREBASE_DB_URL || 'https://uteq-test-e1406-default-rtdb.firebaseio.com';

function authQuery() {
  const secret = process.env.FIREBASE_DB_SECRET;
  return secret ? `?auth=${encodeURIComponent(secret)}` : '';
}

export const subscriptionId = (endpoint) =>
  createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

export async function saveSubscription(sub) {
  const id = subscriptionId(sub.endpoint);
  const res = await fetch(`${DB_URL}/subscriptions/${id}.json${authQuery()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys, createdAt: Date.now() })
  });
  if (!res.ok) throw new Error(`Firebase respondió ${res.status}: ${await res.text()}`);
  return id;
}

export async function listSubscriptions() {
  const res = await fetch(`${DB_URL}/subscriptions.json${authQuery()}`);
  if (!res.ok) throw new Error(`Firebase respondió ${res.status}: ${await res.text()}`);
  const data = (await res.json()) || {};
  return Object.entries(data).map(([id, sub]) => ({ id, ...sub }));
}

export async function deleteSubscription(id) {
  await fetch(`${DB_URL}/subscriptions/${id}.json${authQuery()}`, { method: 'DELETE' });
}

export async function findRecentPost(title, location, maxAgeMs = 10 * 60 * 1000) {
  const res = await fetch(`${DB_URL}/post.json`);
  if (!res.ok) return null;
  const posts = Object.values((await res.json()) || {});
  const now = Date.now();
  return (
    posts.find((p) => {
      const created = Date.parse(p && p.id);
      return p && p.title === title && p.location === location && now - created < maxAgeMs;
    }) || null
  );
}
