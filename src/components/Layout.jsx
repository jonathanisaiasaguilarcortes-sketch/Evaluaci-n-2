import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import NotificationsButton from './NotificationsButton.jsx';
import useOnlineStatus from '../hooks/useOnlineStatus.js';

const links = [
  { to: '/', label: 'Feed', icon: 'home' },
  { to: '/help', label: 'Ayuda', icon: 'help_outline' }
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const online = useOnlineStatus();
  const close = () => setDrawerOpen(false);

  return (
    <div className="layout">
      <header className="app-header mdl-color--primary">
        <button
          type="button"
          className="icon-button only-mobile"
          aria-label="Abrir menú"
          onClick={() => setDrawerOpen(true)}
        >
          <i className="material-icons">menu</i>
        </button>
        <span className="app-title">UTEQGram</span>
        <span className="spacer" />
        <nav className="header-nav only-desktop">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className="header-link">
              {link.label}
            </NavLink>
          ))}
          <NotificationsButton />
        </nav>
      </header>

      {!online && (
        <div className="offline-banner" role="status">
          <i className="material-icons">cloud_off</i> Sin conexión: mostrando datos guardados
        </div>
      )}

      <div className={'drawer-backdrop' + (drawerOpen ? ' is-visible' : '')} onClick={close} />
      <aside className={'drawer' + (drawerOpen ? ' is-visible' : '')} aria-hidden={!drawerOpen}>
        <span className="drawer-title">UTEQGram</span>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className="drawer-link" onClick={close}>
              <i className="material-icons">{link.icon}</i> {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="drawer-option">
          <NotificationsButton />
        </div>
      </aside>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
