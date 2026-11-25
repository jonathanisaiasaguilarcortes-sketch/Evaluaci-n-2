/* Service Worker de UTEQGram
 * - Caché estática (app shell) y dinámica
 * - Datos de Firebase guardados en IndexedDB para usarlos sin conexión
 * - Background Sync para enviar publicaciones creadas sin conexión
 * - Notificaciones push
 *
 * scripts/build-sw.js reemplaza __BUILD_VERSION__ y __PRECACHE_ASSETS__ al compilar.
 */
importScripts('/js/idb.js');
importScripts('/js/utility.js');

var BUILD_VERSION = '__BUILD_VERSION__';
var PRECACHE_ASSETS = /*__PRECACHE_ASSETS__*/[];

var CACHE_STATIC_NAME = 'static-' + BUILD_VERSION;
var CACHE_DYNAMIC_NAME = 'dynamic-' + BUILD_VERSION;
var MAX_DYNAMIC_ITEMS = 60;

var POSTS_URL = 'https://uteq-test-e1406-default-rtdb.firebaseio.com/post.json';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/idb.js',
  '/js/utility.js',
  '/images/icons/icon-192x192.png',
  '/images/main-image-lg.png',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
].concat(PRECACHE_ASSETS);

// INSTALACIÓN: guardar el "app shell" (HTML, JS y CSS de React, iconos, fuentes)
self.addEventListener('install', function (event) {
  console.log('[Service Worker] Instalando versión', BUILD_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        return cache.addAll(STATIC_FILES);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// ACTIVACIÓN: borrar cachés de versiones anteriores
self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activando versión', BUILD_VERSION);
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            var isAppCache = key.indexOf('static-') === 0 || key.indexOf('dynamic-') === 0;
            if (isAppCache && key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function trimCache(cacheName, maxItems) {
  return caches.open(cacheName).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length > maxItems) {
        return cache.delete(keys[0]).then(function () {
          return trimCache(cacheName, maxItems);
        });
      }
    });
  });
}

// Consultar la red y guardar el recurso en la caché dinámica
function fetchAndCache(request) {
  return fetch(request).then(function (res) {
    if (!res.ok && res.type !== 'opaque') {
      return res;
    }
    var clone = res.clone();
    caches.open(CACHE_DYNAMIC_NAME)
      .then(function (cache) {
        return cache.put(request, clone);
      })
      .then(function () {
        return trimCache(CACHE_DYNAMIC_NAME, MAX_DYNAMIC_ITEMS);
      })
      .catch(function (err) {
        console.log('[Service Worker] No se pudo guardar en caché:', err);
      });
    return res;
  });
}

// Guardar en IndexedDB las publicaciones que llegan de Firebase
function storePosts(res) {
  return res.clone().json().then(function (data) {
    var posts = [];
    for (var key in data || {}) {
      var post = data[key];
      if (post && typeof post === 'object') {
        if (post.id === undefined || post.id === null) post.id = key;
        posts.push(post);
      }
    }
    return clearAllData('posts').then(function () {
      return Promise.all(posts.map(function (post) {
        return writeData('posts', post);
      }));
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  var url = new URL(request.url);

  // API propia y geocodificación: siempre por red
  if (url.pathname.indexOf('/api/') === 0 || url.hostname === 'nominatim.openstreetmap.org') {
    return;
  }

  // Firebase: red primero; la copia se guarda en IndexedDB (la página la lee si no hay red)
  if (request.url.split('?')[0] === POSTS_URL) {
    var networkResponse = fetch(request);
    event.waitUntil(
      networkResponse
        .then(function (res) {
          if (res.ok) return storePosts(res);
        })
        .catch(function () {})
    );
    event.respondWith(networkResponse);
    return;
  }

  // Navegación (rutas de React como / o /help): siempre la misma página, desde caché
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(function (cached) {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Resto de recursos: caché primero y, si no está, red + caché dinámica
  event.respondWith(
    caches.match(request).then(function (cached) {
      return cached || fetchAndCache(request);
    }).catch(function () {
      return Response.error();
    })
  );
});

function notifySubscribers(post) {
  return fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: post.title, location: post.location })
  }).catch(function () {});
}

// BACKGROUND SYNC: enviar publicaciones creadas sin conexión
self.addEventListener('sync', function (event) {
  if (event.tag !== 'sync-new-posts') return;
  console.log('[Service Worker] Sincronizando publicaciones');

  event.waitUntil(
    readAllData('sync-posts')
      .then(function (posts) {
        return Promise.all(posts.map(function (post) {
          return fetch(POSTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            // Solo los campos que aceptan las reglas de Firebase
            body: JSON.stringify({ id: post.id, title: post.title, location: post.location, image: post.image })
          }).then(function (res) {
            if (!res.ok) {
              return res.text().then(function (detail) {
                throw new Error('Error al enviar (' + res.status + '): ' + detail);
              });
            }
            return deleteItemFromData('sync-posts', post.id);
          }).then(function () {
            return notifySubscribers(post);
          });
        }));
      })
      .then(function () {
        // Avisar a las páginas abiertas para que actualicen el feed
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'posts-synced' });
        });
      })
  );
});

// NOTIFICACIONES PUSH
self.addEventListener('push', function (event) {
  var data = { title: 'UTEQGram', body: 'Hay novedades', url: '/' };
  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/icons/icon-192x192.png',
      badge: '/images/icons/icon-192x192.png',
      data: { url: data.url },
      tag: 'new-post'
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  var target = (event.notification.data && event.notification.data.url) || '/';
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if ('focus' in clients[i]) {
          clients[i].navigate(target);
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
