// Configuración central de la aplicación.
export const FIREBASE_DB_URL = 'https://uteq-test-e1406-default-rtdb.firebaseio.com';
export const POSTS_URL = `${FIREBASE_DB_URL}/post.json`;

// Imagen por defecto si la publicación no lleva foto.
export const DEFAULT_IMAGE_URL =
  'https://firebasestorage.googleapis.com/v0/b/uteq-test-e1406.firebasestorage.app/o/sf-boat.png?alt=media&token=d1007737-4ad7-45af-af09-619e694a8452';

// Clave pública VAPID para las notificaciones push (la privada vive solo en Vercel).
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
