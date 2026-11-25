import { useState } from 'react';
import { enableNotifications, notificationsSupported } from '../lib/notifications.js';
import { useToast } from './Toast.jsx';

export default function NotificationsButton() {
  const showToast = useToast();
  const [permission, setPermission] = useState(
    notificationsSupported() ? Notification.permission : 'unsupported'
  );
  const [busy, setBusy] = useState(false);

  if (permission === 'unsupported') {
    return (
      <p className="drawer-hint">
        Para recibir notificaciones en iPhone, agrega la app a la pantalla de inicio.
      </p>
    );
  }

  async function handleClick() {
    setBusy(true);
    try {
      const result = await enableNotifications();
      setPermission(result.permission);
      if (result.permission === 'granted') {
        showToast(result.subscribed ? 'Notificaciones activadas' : 'Notificaciones locales activadas');
      } else {
        showToast('No se dio permiso para las notificaciones');
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudieron activar las notificaciones');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="mdl-button mdl-button--raised mdl-button--accent"
      onClick={handleClick}
      disabled={busy || permission === 'denied'}
    >
      {permission === 'granted'
        ? 'Notificaciones activas'
        : permission === 'denied'
          ? 'Notificaciones bloqueadas'
          : 'Habilitar notificaciones'}
    </button>
  );
}
