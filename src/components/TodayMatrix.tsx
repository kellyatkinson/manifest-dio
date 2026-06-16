// ---------------------------------------------------------------
// TodayMatrix — the Eisenhower (Urgent × Important) home-page view.
//
// Replaces the old linear "Next up" panel: its "Do now" quadrant is
// the new answer to "what should I work on today?", but the 2×2 also
// shows what to schedule, what to hand off, and what to leave alone.
// Placement logic lives in lib/priority.ts; this is presentation only.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildMatrix, QUADRANT_META, type MatrixItem, type Quadrant } from '@/lib/priority';
import { useUrls } from '@/hooks/useUrls';
import type { Project, Task } from '@/lib/types';

import styles from './TodayMatrix.module.css';

// Top-left → bottom-right reading order.
const LAYOUT: Quadrant[] = ['do_now', 'schedule', 'delegate', 'park'];
const PER_QUADRANT = 6;

interface Props {
  projects: Project[];
  tasks: Task[];
}

export function TodayMatrix({ projects, tasks }: Props) {
  const navigate = useNavigate();
  const { projectPath, taskPath } = useUrls();
  const matrix = useMemo(() => buildMatrix(projects, tasks), [projects, tasks]);

  return (
    <section className={styles.wrap} aria-label="Today — urgent and important">
      <div className={styles.head}>
        <h2 className={styles.title}>Today</h2>
        <p className={styles.sub}>Urgent &times; important</p>
      </div>

      <div className={styles.grid}>
        {LAYOUT.map((q) => {
          const items = matrix[q];
          const shown = items.slice(0, PER_QUADRANT);
          const overflow = items.length - shown.length;
          return (
            <div key={q} className={`${styles.cell} ${styles[`cell_${q}`]}`}>
              <div className={styles.cellHead}>
                <span className={styles.cellTitle}>{QUADRANT_META[q].title}</span>
                <span className={styles.cellBlurb}>{QUADRANT_META[q].blurb}</span>
                <span className={styles.cellCount}>{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className={styles.cellEmpty}>Clear.</p>
              ) : (
                <ul className={styles.list}>
                  {shown.map((item: MatrixItem) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        className={styles.row}
                        onClick={() =>
                          navigate(item.taskId ? taskPath(item.projectId, item.taskId) : projectPath(item.projectId))
                        }
                        title={item.title}
                      >
                        <span className={`${styles.badge} ${styles[`badge_${item.tone}`]}`}>{item.badge}</span>
                        <span className={styles.rowBody}>
                          <span className={styles.rowTitle}>{item.title}</span>
                          {item.context && <span className={styles.rowContext}>{item.context}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                  {overflow > 0 && <li className={styles.more}>+{overflow} more</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
