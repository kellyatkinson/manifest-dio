import type { MouseEvent } from 'react';

import type { HealthId } from '@/lib/types';
import { statusLabel } from '@/lib/format';

import styles from './StatusPill.module.css';

interface Props {
  status: HealthId;
  inferred?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}

const colourClass: Record<HealthId, string> = {
  green: styles.green,
  amber: styles.amber,
  red: styles.red,
  placeholder: styles.placeholder,
};

export function StatusPill({ status, inferred, onClick, title }: Props) {
  const className = [styles.pill, colourClass[status], inferred ? styles.inferred : '']
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} title={title}>
        {statusLabel(status)}
        {inferred && <span className={styles.dagger} aria-label="inferred">†</span>}
      </button>
    );
  }

  return (
    <span className={className} title={title}>
      {statusLabel(status)}
      {inferred && <span className={styles.dagger} aria-label="inferred">†</span>}
    </span>
  );
}
