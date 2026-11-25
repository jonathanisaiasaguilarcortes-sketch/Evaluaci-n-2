# UTEQGram

Aplicación web progresiva (PWA) en **React** para compartir fotos y lugares, incluso sin conexión.

**App publicada:** https://proyectodelcurso-ten.vercel.app

## Funcionalidades

- **Pantallas:** Home (feed de publicaciones) y Ayuda, con React Router (vistas generadas en el cliente).
- **Datos remotos:** Firebase Realtime Database.
- **Datos locales:** IndexedDB (copia del feed y publicaciones pendientes).
- **Offline:** Service Worker con app shell en caché, caché dinámica y Background Sync para enviar publicaciones al volver la conexión.
- **Cámara:** tomar una foto con `getUserMedia` o elegir una imagen.
- **GPS:** llenar la ubicación con la Geolocation API.
- **Notificaciones:** push con Web Push (VAPID) desde funciones serverless de Vercel.
- **Instalable:** manifiesto web y modo `standalone` (Android, iPhone y escritorio).

## Estructura

```
api/              Funciones serverless (suscribirse y enviar notificaciones push)
public/           Service Worker, manifiesto, iconos e imágenes
scripts/          build-sw.js: genera la lista de precaché y la versión del Service Worker
src/components/   Componentes de React (Layout, PostCard, CreatePost, ...)
src/pages/        Pantallas: Feed (Home), Help, NotFound
src/lib/          Datos (Firebase, IndexedDB), cámara/GPS y notificaciones
```

## Cómo ejecutarlo

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev       # desarrollo (sin Service Worker)
npm run build     # compilación de producción en dist/
npm run preview   # probar la compilación con Service Worker
```

## Variables de entorno

Para las notificaciones push (en Vercel → Settings → Environment Variables):

| Variable | Uso |
| --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | Clave pública VAPID para el navegador |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Par de claves VAPID del servidor |
| `VAPID_SUBJECT` | Contacto del emisor (URL de la app) |
| `FIREBASE_DB_SECRET` | Acceso del servidor al nodo `/subscriptions` de Firebase |

Generar claves VAPID: `npx web-push generate-vapid-keys`.

## Despliegue

```bash
npx vercel --prod
```
