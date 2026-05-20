import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      <header className={styles.header}>
        <Header />
      </header>
      <main className={styles.main}>
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
