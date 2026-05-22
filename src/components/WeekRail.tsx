// ---------------------------------------------------------------
// WeekRail — a horizontal strip showing what's due in the next 7 days.
// Pulls from tasks (proper due_date column) and projects with
// parseable ISO-ish deadline strings. Free-text deadlines like
// "TBD" or "Vendor-dependent" are skipped — they're not actionable
// within a week-rhythm view.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import type { Project, Task } from '@/lib/types';

import styles from './WeekRail.module.css';

interface Props {
  projects: Project[];
  tasks: Task[];
}

interface Entry {
  kind: 'task' | 'project';
  id: string;
  title: string;
  dueDate: Date;
  link: string;
  context: string;
}

/** Try to extract a YYYY-MM-DD from a free-text deadline string. */
function parseDeadline(deadline: string | null): Date | null {
  if (!deadline) return null;
  const match = deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function WeekRail({ projects, tasks }: Props) {
  const entries = useMemo<Entry[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    const out: Entry[] = [];

    // Tasks with a real due_date
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (t.status === 'done' || t.status === 'cancelled') continue;
      const due = new Date(`${t.due_date}T00:00:00`);
      if (Number.isNaN(due.getTime())) continue;
      if (due < today || due > horizon) continue;
      const project = projects.find((p) => p.id === t.project_id);
      out.push({
        kind: 'task',
        id: t.id,
        title: t.title,
        dueDate: due,
        link: project ? `/portfolio/${t.project_id}/tasks/${t.id}` : `/tasks`,
        context: project?.name ?? 'Unknown project',
      });
    }

    // Projects with an ISO-parseable deadline
    for (const p of projects) {
      const due = parseDeadline(p.deadline);
      if (!due) continue;
      if (due < today || due > horizon) continue;
      out.push({
        kind: 'project',
        id: p.id,
        title: p.name,
        dueDate: due,
        link: `/portfolio/${p.id}`,
        context: 'Project deadline',
      });
    }

    out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return out;
  }, [projects, tasks]);

  if (entries.length === 0) return null;

  return (
    <section className={styles.rail} aria-label="Due this week">
      <header className={styles.head}>
        <h2 className={styles.title}>This week</h2>
        <span className={styles.count}>{entries.length}</span>
      </header>
      <ul className={styles.list}>
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`} className={styles.item}>
            <Link to={e.link} className={styles.link}>
              <span className={`${styles.kind} ${styles[`kind_${e.kind}`]}`}>
                {e.kind === 'task' ? 'Task' : 'Project'}
              </span>
              <span className={styles.titleText}>{e.title}</span>
              <span className={styles.context}>{e.context}</span>
              <time className={styles.due} dateTime={e.dueDate.toISOString()}>
                {e.dueDate.toLocaleDateString('en-NZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
