// POST /api/notify  { title, location }
// Envía una notificación push a todos los dispositivos suscritos cuando hay una publicación nueva.
import webpush from 'web-push';
import { deleteSubscription, findRecentPost, listSubscriptions } from './_lib/subscriptions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(503).json({ error: 'Notificaciones push no configuradas' });
  }

  const { title, location } = req.body || {};
  if (typeof title !== 'string' || typeof location !== 'string' || title.length > 80 || location.length > 120) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  // Solo notificar publicaciones que realmente existen y son recientes (evita usos indebidos).
  const post = await findRecentPost(title, location);
  if (!post) {
    return res.status(404).json({ error: 'Publicación no encontrada' });
  }

  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({
    title: 'Nueva publicación en UTEQGram',
    body: `${post.title} · ${post.location}`,
    url: '/'
  });

  try {
    const subscriptions = await listSubscriptions();
    let sent = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          sent++;
        } catch (err) {
          // 404/410: el dispositivo canceló la suscripción; se borra.
          if (err.statusCode === 404 || err.statusCode === 410) await deleteSubscription(sub.id);
          else console.error('Error al enviar push:', err.statusCode, err.body);
        }
      })
    );
    return res.status(200).json({ ok: true, sent, total: subscriptions.length });
  } catch (err) {
    console.error('Error al enviar notificaciones:', err);
    return res.status(500).json({ error: 'No se pudieron enviar las notificaciones' });
  }
}
