import type { ReactNode } from 'react';

import styles from './InferenceBanner.module.css';

interface Props {
  message: ReactNode;
  onConfirm?: () => void;
  onChange?: () => void;
  confirmLabel?: string;
  changeLabel?: string;
}

/** A small banner that surfaces an inferred value with confirm/change actions. */
export function InferenceBanner({
  message,
  onConfirm,
  onChange,
  confirmLabel = 'Confirm as-is',
  changeLabel = 'Change…',
}: Props) {
  return (
    <div className={styles.root} role="status">
      <span className={styles.icon} aria-hidden>†</span>
      <div className={styles.body}>{message}</div>
      {(onConfirm || onChange) && (
        <div className={styles.actions}>
          {onConfirm && (
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          )}
          {onChange && (
            <button type="button" className={styles.button} onClick={onChange}>
              {changeLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
