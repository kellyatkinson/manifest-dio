import type { MouseEvent } from 'react';

import styles from './OwnerCell.module.css';

interface Props {
  owner: string | null;
  inferred?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** Render an owner string, with † when inferred. Optional click handler for the inference popover. */
export function OwnerCell({ owner, inferred, onClick }: Props) {
  const display = owner ?? <span className={styles.muted}>unassigned</span>;
  const dagger = inferred ? (
    <span className={styles.dagger} title="Inferred by Marcus -- click to confirm or correct">†</span>
  ) : null;

  if (onClick) {
    return (
      <button type="button" className={styles.button} onClick={onClick}>
        {display}
        {dagger}
      </button>
    );
  }

  return (
    <span className={styles.root}>
      {display}
      {dagger}
    </span>
  );
}
