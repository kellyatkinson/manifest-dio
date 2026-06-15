// ---------------------------------------------------------------
// HealthDonut — SVG donut of portfolio health distribution.
//
// Pure SVG (no chart library). Segments use the shared status
// colour tokens; centre shows the active item count. Legend below
// gives count + label per health level.
// ---------------------------------------------------------------

import { useMemo } from 'react';

import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './HealthDonut.module.css';

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

const HEALTH_COLOR: Record<HealthId, string> = {
  red: 'var(--status-red)',
  amber: 'var(--status-amber)',
  green: 'var(--status-green)',
  placeholder: 'var(--status-placeholder)',
};

const R = 52;
const STROKE = 20;
const CIRC = 2 * Math.PI * R;

interface Props {
  projects: Project[];
}

export function HealthDonut({ projects }: Props) {
  const { counts, total, segments } = useMemo(() => {
    const byHealth: Record<HealthId, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const p of projects) byHealth[p.health]++;
    const totalCount = projects.length;
    const denom = totalCount || 1;

    let offset = 0;
    const segs = HEALTH_ORDER.filter((h) => byHealth[h] > 0).map((h) => {
      const dash = (byHealth[h] / denom) * CIRC;
      const seg = { health: h, dash, offset };
      offset += dash;
      return seg;
    });

    return { counts: byHealth, total: totalCount, segments: segs };
  }, [projects]);

  return (
    <section className={styles.card} aria-label="Portfolio health">
      <h2 className={styles.title}>Health</h2>

      {total === 0 ? (
        <div className={styles.empty}>No active items.</div>
      ) : (
        <>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 140 140" className={styles.donut} role="img" aria-label="Health distribution donut">
              <g transform="rotate(-90 70 70)">
                {segments.map((s) => (
                  <circle
                    key={s.health}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={HEALTH_COLOR[s.health]}
                    strokeWidth={STROKE}
                    strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                    strokeDashoffset={-s.offset}
                  />
                ))}
              </g>
              <text x="70" y="68" textAnchor="middle" className={styles.centreValue}>
                {total}
              </text>
              <text x="70" y="86" textAnchor="middle" className={styles.centreLabel}>
                active
              </text>
            </svg>
          </div>

          <ul className={styles.legend}>
            {HEALTH_ORDER.map((h) => (
              <li key={h} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: HEALTH_COLOR[h] }} />
                <span className={styles.legendCount}>{counts[h]}</span>
                <span className={styles.legendLabel}>{statusLabel(h)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
