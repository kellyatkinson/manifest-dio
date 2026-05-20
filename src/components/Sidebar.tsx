import { NavLink } from 'react-router-dom';

import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/portfolio', label: 'Portfolio', end: false },
  { to: '/closed', label: 'Recently closed' },
  { to: '/decisions', label: 'Resolved questions' },
];

export function Sidebar() {
  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <div className={styles.brandTitle}>Manifest</div>
        <div className={styles.brandSub}>Portfolio Inventory</div>
      </div>

      <div className={styles.sectionLabel}>Views</div>
      <nav className={styles.nav}>
        {PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? true}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>Settings (coming soon)</div>
    </div>
  );
}
