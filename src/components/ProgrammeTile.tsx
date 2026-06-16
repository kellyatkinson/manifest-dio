// ---------------------------------------------------------------
// ProgrammeTile — compact tile for the dashboard programme grid.
//
// Each tile shows:
//   - Programme name
//   - Health pill
//   - Child project count
//   - Row of dots showing each child's health
//   - Activity count for the last 7 days (rolled up across children)
//
// Stable left-edge accent colour per programme (from programmeAccent).
// ---------------------------------------------------------------

import { useNavigate } from 'react-router-dom';

import { useUrls } from '@/hooks/useUrls';
import { StatusPill } from './StatusPill';
import { accentFor } from '@/lib/programmeAccent';
import type { HealthId, Project } from '@/lib/types';

import styles from './ProgrammeTile.module.css';

interface Props {
  programme: Project;
  children: Project[];
  /** Activity entry count in the last 7 days across this programme + its children. */
  weeklyActivity?: number;
}

const HEALTH_DOT_CLASS: Record<HealthId, string> = {
  red: styles.dot_red,
  amber: styles.dot_amber,
  green: styles.dot_green,
  placeholder: styles.dot_placeholder,
};

export function ProgrammeTile({ programme, children, weeklyActivity = 0 }: Props) {
  const navigate = useNavigate();
  const { projectPath } = useUrls();
  const accent = accentFor(programme.id || programme.name);

  return (
    <button
      type="button"
      className={styles.tile}
      style={{ borderLeftColor: accent }}
      onClick={() => navigate(projectPath(programme.id))}
      title={`Open programme: ${programme.name}`}
    >
      <div className={styles.head}>
        <span className={styles.name}>{programme.name}</span>
        <StatusPill status={programme.health} inferred={programme.health_inferred} />
      </div>

      <div className={styles.meta}>
        {children.length} {children.length === 1 ? 'project' : 'projects'}
      </div>

      <div className={styles.dots}>
        {children.length === 0 ? (
          <span className={styles.noDots}>—</span>
        ) : (
          children.map((c) => (
            <span
              key={c.id}
              className={`${styles.dot} ${HEALTH_DOT_CLASS[c.health]}`}
              title={`${c.name} — ${c.health}`}
            />
          ))
        )}
      </div>

      <div className={styles.foot}>
        <span className={styles.activity}>
          <span className={styles.activityIcon} aria-hidden>◉</span>
          {weeklyActivity} this week
        </span>
        <span className={styles.arrow} aria-hidden>↳</span>
      </div>
    </button>
  );
}
