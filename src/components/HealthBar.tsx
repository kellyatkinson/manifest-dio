// ---------------------------------------------------------------
// HealthBar — portfolio health as four short horizontal bars.
//
// Replaces the old HealthDonut. Per data-viz principle, bar length
// (position-on-a-common-scale) is read far more accurately than a
// donut's arc angle. One row per health level; bar length scales to
// the largest count so comparisons across levels are direct.
// ---------------------------------------------------------------

import { useMemo } from 'react';

import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './HealthBar.module.css';

// Most-severe first so the eye lands on red/amber.
const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

const HEALTH_COLOR: Record<HealthId, string> = {
  red: 'var(--status-red)',
  amber: 'var(--status-amber)',
  green: 'var(--status-green)',
  placeholder: 'var(--status-placeholder)',
};

interface Props {
  projects: Project[];
}

export function HealthBar({ projects }: Props) {
  const { counts, total, max } = useMemo(() => {
    const byHealth: Record<HealthId, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const p of projects) byHealth[p.health]++;
    const maxCount = Math.max(1, ...HEALTH_ORDER.map((h) => byHealth[h]));
    return { counts: byHealth, total: projects.length, max: maxCount };
  }, [projects]);

  return (
    <section className={styles.card} aria-label="Portfolio health">
      <div className={styles.head}>
        <h2 className={styles.title}>Health</h2>
        <span className={styles.total}>{total} active</span>
      </div>

      {total === 0 ? (
        <div className={styles.empty}>No active items.</div>
      ) : (
        <ul className={styles.rows}>
          {HEALTH_ORDER.map((h) => {
            const count = counts[h];
            const pct = (count / max) * 100;
            return (
              <li key={h} className={styles.row}>
                <span className={styles.label}>{statusLabel(h)}</span>
                <span className={styles.track}>
                  <span
                    className={styles.fill}
                    style={{ width: `${pct}%`, background: HEALTH_COLOR[h] }}
                    aria-hidden
                  />
                </span>
                <span className={styles.count}>{count}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
