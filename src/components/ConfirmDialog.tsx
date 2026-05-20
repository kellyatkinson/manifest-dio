import type { ReactNode } from 'react';

import styles from './ConfirmDialog.module.css';

interface Props {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A minimal modal confirmation. No portal -- it's at the bottom of the DOM via React's tree. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        {body && <div className={styles.body}>{body}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${destructive ? styles.danger : styles.primary}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
