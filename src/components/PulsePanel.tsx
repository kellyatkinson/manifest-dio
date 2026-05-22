// ---------------------------------------------------------------
// PulsePanel — composite summary tile for the Portfolio overview.
// Replaces the three flat tiles (Active / Mix / Status) with one
// wide panel: a stacked health bar, type counts, and a
// "needs attention" headline (red + amber count).
// ---------------------------------------------------------------

import { useMemo } from 'react';

import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './PulsePanel.module.css';

interface Props {
  projects: Project[];
}

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

export function PulsePanel({ projects }: Props) {
  const counts = useMemo(() => {
    const byHealth: Record<HealthId, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    let programmes = 0;
    let proj = 0;
    let operational = 0;
    for (const p of projects) {
      byHealth[p.health]++;
      if (p.project_type === 'programme') programmes++;
      else if (p.project_type === 'project') proj++;
      else if (p.project_type === 'operational') operational++;
    }
    return { byHealth, programmes, proj, operational, total: projects.length };
  }, [projects]);

  const total = counts.total || 1; // avoid divide-by-zero on first render
  const needsAttention = counts.byHealth.red + counts.byHealth.amber;

  return (
    <section className={styles.pulse} aria-label="Portfolio summary">
      <div className={styles.headRow}>
        <h2 className={styles.title}>Pulse</h2>
        <span className={styles.totalChip}>{counts.total} active</span>
      </div>

      <div className={styles.bar} role="img" aria-label="Health distribution">
        {HEALTH_ORDER.map((h) => {
          const n = counts.byHealth[h];
          if (n === 0) return null;
          const pct = (n / total) * 100;
          return (
            <div
              key={h}
              className={`${styles.barSeg} ${styles[`seg_${h}`]}`}
              style={{ width: `${pct}%` }}
              title={`${statusLabel(h)}: ${n}`}
            />
          );
        })}
      </div>

      <ul className={styles.legend}>
        {HEALTH_ORDER.map((h) => (
          <li key={h} className={styles.legendItem}>
            <span className={`${styles.dot} ${styles[`dot_${h}`]}`} />
            <span className={styles.legendCount}>{counts.byHealth[h]}</span>
            <span className={styles.legendLabel}>{statusLabel(h)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.footRow}>
        <div className={styles.mix}>
          <Mix label="Programmes" value={counts.programmes} tone="programme" />
          <span className={styles.divider} aria-hidden>·</span>
          <Mix label="Projects" value={counts.proj} tone="project" />
          <span className={styles.divider} aria-hidden>·</span>
          <Mix label="Operational" value={counts.operational} tone="operational" />
        </div>
        <div className={styles.attention}>
          <span className={styles.attentionLabel}>Needs attention</span>
          <span
            className={`${styles.attentionValue} ${
              needsAttention > 0 ? styles.attentionActive : ''
            }`}
          >
            {needsAttention}
          </span>
        </div>
      </div>
    </section>
  );
}

function Mix({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'programme' | 'project' | 'operational';
}) {
  return (
    <span className={styles.mixItem}>
      <span className={`${styles.mixDot} ${styles[`mix_${tone}`]}`} />
      <strong className={styles.mixValue}>{value}</strong>
      <span className={styles.mixLabel}>{label}</span>
    </span>
  );
}
