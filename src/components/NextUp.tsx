// ---------------------------------------------------------------
// NextUp — "what should I work on next?" panel for the Overview.
//
// Ranks a single ordered list from live data:
//   1. Overdue open tasks            (most overdue first, then priority)
//   2. Red projects                  (decision pointer: next_decision)
//   3. Open tasks due in 7 days      (soonest first, then priority)
//   4. Undated P1 open tasks
//
// Each row is a click-through to the task modal or project page.
// Capped at MAX_ITEMS so it stays a pointer, not a backlog.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { sortableDateKey } from '@/lib/format';
import type { Project, Task } from '@/lib/types';

import styles from './NextUp.module.css';

const OPEN_TASK_STATUSES = new Set<Task['status']>(['todo', 'in_progress', 'waiting', 'hold']);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 8;

type Tone = 'overdue' | 'decision' | 'due' | 'priority';

interface NextItem {
  key: string;
  tone: Tone;
  badge: string;
  title: string;
  context: string;
  to: string;
}

interface Props {
  projects: Project[];
  tasks: Task[];
}

/** "15 Jun" style short date in NZ time. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short' });
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((new Date(toKey).getTime() - new Date(fromKey).getTime()) / ONE_DAY_MS);
}

/** Priority asc with nulls last; stable-ish tiebreak by title. */
function byPriorityThenTitle(a: Task, b: Task): number {
  const pa = a.priority ?? 99;
  const pb = b.priority ?? 99;
  if (pa !== pb) return pa - pb;
  return a.title.localeCompare(b.title);
}

export function NextUp({ projects, tasks }: Props) {
  const navigate = useNavigate();

  const items = useMemo<NextItem[]>(() => {
    const today = sortableDateKey(new Date().toISOString());
    const horizon = sortableDateKey(new Date(Date.now() + 7 * ONE_DAY_MS).toISOString());

    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const open = tasks.filter((t) => OPEN_TASK_STATUSES.has(t.status));

    const taskItem = (t: Task, tone: Tone, badge: string): NextItem => ({
      key: `task-${t.id}`,
      tone,
      badge,
      title: t.title,
      context: projectName.get(t.project_id) ?? '',
      to: `/portfolio/${t.project_id}/tasks/${t.id}`,
    });

    const overdue = open
      .filter((t) => t.due_date && t.due_date < today)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : byPriorityThenTitle(a, b)))
      .map((t) => {
        const days = daysBetween(t.due_date!, today);
        return taskItem(t, 'overdue', days <= 1 ? 'Overdue' : `${days} d overdue`);
      });

    const decisions = projects
      .filter((p) => p.health === 'red')
      .map((p): NextItem => ({
        key: `proj-${p.id}`,
        tone: 'decision',
        badge: 'Off track',
        title: p.name,
        context: p.next_decision ? `Next decision: ${p.next_decision}` : 'Needs a decision',
        to: p.project_type === 'programme' ? `/programmes/${p.id}` : `/portfolio/${p.id}`,
      }));

    const dueSoon = open
      .filter((t) => t.due_date && t.due_date >= today && t.due_date <= horizon)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : byPriorityThenTitle(a, b)))
      .map((t) => taskItem(t, 'due', t.due_date === today ? 'Today' : `Due ${shortDate(t.due_date!)}`));

    const p1Undated = open
      .filter((t) => t.priority === 1 && !t.due_date)
      .sort(byPriorityThenTitle)
      .map((t) => taskItem(t, 'priority', 'P1'));

    return [...overdue, ...decisions, ...dueSoon, ...p1Undated].slice(0, MAX_ITEMS);
  }, [projects, tasks]);

  return (
    <section className={styles.card} aria-label="Next up">
      <h2 className={styles.title}>Next up</h2>

      {items.length === 0 ? (
        <div className={styles.empty}>Nothing urgent. Nothing overdue, no red projects, a clear week ahead.</div>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" className={styles.row} onClick={() => navigate(item.to)} title={item.title}>
                <span className={`${styles.badge} ${styles[`badge_${item.tone}`]}`}>{item.badge}</span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{item.title}</span>
                  {item.context && <span className={styles.rowContext}>{item.context}</span>}
                </span>
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
