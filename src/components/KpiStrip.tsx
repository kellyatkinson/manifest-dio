// ---------------------------------------------------------------
// KpiStrip — hero stat tiles for the Overview page.
//
// Four big numbers, each a click-through:
//   Active items     -> /portfolio/board
//   Needs attention  -> /portfolio/board   (red + amber projects)
//   Overdue tasks    -> /tasks             (open tasks past due)
//   Due this week    -> /tasks             (open tasks due in 7 days)
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { sortableDateKey } from '@/lib/format';
import type { Project, Task } from '@/lib/types';

import styles from './KpiStrip.module.css';

const OPEN_TASK_STATUSES = new Set<Task['status']>(['todo', 'in_progress', 'waiting', 'hold']);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  projects: Project[];
  tasks: Task[];
}

export function KpiStrip({ projects, tasks }: Props) {
  const kpi = useMemo(() => {
    const today = sortableDateKey(new Date().toISOString());
    const horizon = sortableDateKey(new Date(Date.now() + 7 * ONE_DAY_MS).toISOString());

    let attention = 0;
    for (const p of projects) {
      if (p.health === 'red' || p.health === 'amber') attention++;
    }

    let overdue = 0;
    let dueSoon = 0;
    for (const t of tasks) {
      if (!OPEN_TASK_STATUSES.has(t.status) || !t.due_date) continue;
      if (t.due_date < today) overdue++;
      else if (t.due_date <= horizon) dueSoon++;
    }

    return { active: projects.length, attention, overdue, dueSoon };
  }, [projects, tasks]);

  return (
    <div className={styles.strip}>
      <Tile value={kpi.active} label="Active items" sub="programmes + projects" to="/portfolio/board" tone="navy" />
      <Tile
        value={kpi.attention}
        label="Needs attention"
        sub="red or amber health"
        to="/portfolio/board"
        tone={kpi.attention > 0 ? 'red' : 'green'}
      />
      <Tile
        value={kpi.overdue}
        label="Overdue tasks"
        sub="past their due date"
        to="/tasks"
        tone={kpi.overdue > 0 ? 'red' : 'green'}
      />
      <Tile
        value={kpi.dueSoon}
        label="Due this week"
        sub="next 7 days"
        to="/tasks"
        tone={kpi.dueSoon > 0 ? 'amber' : 'green'}
      />
    </div>
  );
}

function Tile({
  value,
  label,
  sub,
  to,
  tone,
}: {
  value: number;
  label: string;
  sub: string;
  to: string;
  tone: 'navy' | 'red' | 'amber' | 'green';
}) {
  return (
    <Link to={to} className={`${styles.tile} ${styles[`tone_${tone}`]}`}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.sub}>{sub}</span>
    </Link>
  );
}
