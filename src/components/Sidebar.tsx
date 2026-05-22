import { NavLink } from 'react-router-dom';

import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/portfolio', label: 'Portfolio', end: false },
  { to: '/programmes', label: 'Programmes' },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'Tasks' },
];

const SECONDARY: NavItem[] = [
  { to: '/closed', label: 'Recently closed' },
  { to: '/decisions', label: 'Resolved questions' },
];

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <nav className={styles.nav}>
      {items.map((item) => (
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
  );
}

// Small filigree mark — stylised three-leaf flourish in gold, echoes
// the Dio filigree device without being literal.
function FiligreeMark() {
  return (
    <svg
      className={styles.filigree}
      viewBox="0 0 60 18"
      aria-hidden
      focusable="false"
    >
      <path
        d="M30 9 C 24 4, 18 4, 12 9 C 18 14, 24 14, 30 9 Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M30 9 C 36 4, 42 4, 48 9 C 42 14, 36 14, 30 9 Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="30" cy="9" r="1.6" fill="currentColor" />
      <circle cx="6" cy="9" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="54" cy="9" r="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <FiligreeMark />
        <div className={styles.brandTitle}>Manifest</div>
        <div className={styles.brandSub}>Portfolio Inventory</div>
      </div>

      <div className={styles.sectionLabel}>Views</div>
      <NavGroup items={PRIMARY} />

      <div className={styles.divider} />

      <div className={styles.sectionLabel}>Archive</div>
      <NavGroup items={SECONDARY} />

      <div className={styles.spacer} />

      <div className={styles.brandFoot}>
        <FiligreeMark />
        <span className={styles.brandFootText}>Diocesan School for Girls</span>
      </div>
    </div>
  );
}
