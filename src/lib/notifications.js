import { VAPID_PUBLIC_KEY } from './config.js';

export const notificationsSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator;

export const pushSupported = () => notificationsSupported() && 'PushManager' in window;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Notificación mostrada por el service worker (funciona también con la app en segundo plano).
export async function showLocalNotification(title, options = {}) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  return reg.showNotification(title, {
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-192x192.png',
    lang: 'es-MX',
    ...options
  });
}

// Pide permiso, se suscribe a push y registra la suscripción en el servidor.
export async function enableNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, subscribed: false };

  let subscribed = false;
  if (pushSupported() && VAPID_PUBLIC_KEY) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    subscribed = res.ok;
  }

  await showLocalNotification('¡Notificaciones activadas!', {
    body: 'Te avisaremos cuando haya publicaciones nuevas en UTEQGram.',
    tag: 'confirm-notification'
  });
  return { permission, subscribed };
}

// Pide al servidor que avise a todos los suscriptores de una publicación nueva.
export function notifyNewPost(post) {
  return fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: post.title, location: post.location })
  }).catch(() => {});
}
