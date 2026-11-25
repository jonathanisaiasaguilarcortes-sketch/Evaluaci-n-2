// POST /api/subscribe  { endpoint, keys: { p256dh, auth } }
// Registra un dispositivo para recibir notificaciones push.
import { saveSubscription } from './_lib/subscriptions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sub = req.body || {};
  const validEndpoint = typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://');
  const validKeys = sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
  if (!validEndpoint || !validKeys || sub.endpoint.length > 1000) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  try {
    const id = await saveSubscription(sub);
    return res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('Error al guardar la suscripción:', err);
    return res.status(500).json({ error: 'No se pudo guardar la suscripción' });
  }
}
