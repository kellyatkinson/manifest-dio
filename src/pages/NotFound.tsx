import { Link } from 'react-router-dom';

import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Not found</h1>
        <p className={styles.sub}>
          That page does not exist in Manifest. The portfolio is the place to start.
        </p>
        <Link to="/portfolio" className={styles.link}>
          Back to portfolio
        </Link>
      </div>
    </div>
  );
}
