import { useCallback, useEffect, useRef, useState } from 'react';
import CreatePost from '../components/CreatePost.jsx';
import PostCard from '../components/PostCard.jsx';
import { useToast } from '../components/Toast.jsx';
import { DEFAULT_IMAGE_URL } from '../lib/config.js';
import { notifyNewPost } from '../lib/notifications.js';
import {
  fetchRemotePosts,
  readLocalPosts,
  readPendingPosts,
  savePendingPost,
  sendPendingPosts
} from '../lib/posts.js';

const hasBackgroundSync = 'serviceWorker' in navigator && 'SyncManager' in window;

export default function Feed() {
  const showToast = useToast();
  const [posts, setPosts] = useState([]);
  const [pending, setPending] = useState([]);
  const [source, setSource] = useState('');
  const [creating, setCreating] = useState(false);
  const remoteLoaded = useRef(false);

  const refresh = useCallback(async () => {
    setPending((await readPendingPosts()).map((p) => ({ ...p, pending: true })));

    // Datos locales primero (rápido y sin conexión)...
    readLocalPosts()
      .then((local) => {
        if (!remoteLoaded.current && local.length) {
          setPosts(local);
          setSource('local');
        }
      })
      .catch((err) => console.error('Error al leer los datos locales:', err));

    // ...y luego los remotos, si hay red.
    try {
      const remote = await fetchRemotePosts();
      remoteLoaded.current = true;
      setPosts(remote);
      setSource('remote');
    } catch (err) {
      console.log('Sin acceso a la red. Se usan los datos locales.', err);
      remoteLoaded.current = false;
      setSource('local');
    }
  }, []);

  // Para navegadores sin Background Sync: la página envía los pendientes.
  const flushPending = useCallback(async () => {
    try {
      const pendingBefore = await readPendingPosts();
      const sent = await sendPendingPosts();
      if (sent > 0) {
        pendingBefore.forEach(notifyNewPost);
        showToast(sent === 1 ? 'Publicación enviada' : `${sent} publicaciones enviadas`);
        await refresh();
      }
    } catch (err) {
      console.log('No se pudieron enviar las publicaciones pendientes:', err);
    }
  }, [refresh, showToast]);

  useEffect(() => {
    refresh();
    if (!hasBackgroundSync) flushPending();

    // El service worker avisa cuando terminó de enviar las publicaciones pendientes.
    const onMessage = (event) => {
      if (event.data && event.data.type === 'posts-synced') {
        showToast('Publicaciones sincronizadas');
        refresh();
      }
    };
    // En iPhone la app de la pantalla de inicio no se recarga al reabrirla.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        if (!hasBackgroundSync) flushPending();
      }
    };
    const onOnline = () => {
      refresh();
      if (!hasBackgroundSync) flushPending();
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh, flushPending, showToast]);

  async function handleCreate({ title, location, image, coords }) {
    const post = {
      id: new Date().toISOString(),
      title,
      location,
      image: image || DEFAULT_IMAGE_URL,
      ...(coords ? { coords } : {})
    };

    try {
      // Guardar primero en IndexedDB para no perderla si no hay internet.
      await savePendingPost(post);
      setPending((list) => [{ ...post, pending: true }, ...list]);

      if (hasBackgroundSync) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-new-posts');
        showToast(navigator.onLine ? 'Publicando...' : 'Guardada: se enviará al volver el internet');
      } else {
        showToast(navigator.onLine ? 'Publicando...' : 'Guardada: se enviará al volver el internet');
        await flushPending();
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar la publicación');
    }
  }

  const visible = [...pending, ...posts.filter((p) => !pending.some((q) => q.id === p.id))];

  return (
    <>
      <img src="/images/main-image-lg.png" alt="Explora la ciudad" className="main-image" />
      <div className="page-content">
        <h5 className="text-center mdl-color-text--primary">Comparte tus momentos</h5>
        {source && (
          <p className="data-source text-center">
            {source === 'remote' ? 'Datos remotos (Firebase)' : 'Datos locales (IndexedDB)'}
          </p>
        )}
        <div id="shared-moments">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {source && visible.length === 0 && (
            <p className="text-center">Todavía no hay publicaciones.</p>
          )}
        </div>
      </div>

      <div className="floating-button">
        <button
          type="button"
          className="mdl-button mdl-button--fab mdl-button--colored"
          aria-label="Nueva publicación"
          onClick={() => setCreating(true)}
        >
          <i className="material-icons">add</i>
        </button>
      </div>

      <CreatePost open={creating} onClose={() => setCreating(false)} onSubmit={handleCreate} />
    </>
  );
}
