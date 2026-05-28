import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  // Close the drawer whenever the route changes (i.e. user picked a nav item).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Lock body scroll while the drawer is open (mobile only -- harmless on desktop).
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className={styles.shell} data-drawer-open={drawerOpen}>
      <aside
        className={styles.sidebar}
        id="primary-nav"
        aria-label="Primary navigation"
      >
        <Sidebar />
      </aside>

      {/* Backdrop -- visible on mobile only when drawer is open. */}
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close navigation"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={closeDrawer}
        data-visible={drawerOpen}
      />

      <header className={styles.header}>
        <Header onMenuClick={openDrawer} drawerOpen={drawerOpen} />
      </header>

      <main className={styles.main}>
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
