// ---------------------------------------------------------------
// priority.ts — Eisenhower (Urgent × Important) classification.
//
// Sorts every actionable unit on the portfolio into one of four
// quadrants so the home page can answer "what do I work on today?".
// Pure functions over live Project/Task data — no DB, no React —
// so the placement rules are testable in isolation.
//
//   Important × Urgent   → Do now   (Q1)
//   Important × !Urgent  → Schedule (Q2)
//   !Important × Urgent  → Delegate (Q3)
//   !Important × !Urgent → Park     (Q4)
//
// Signals (all already in the schema):
//   Urgency    ← overdue / due-soon task due_date · red health
//   Importance ← task priority (P1/P2) · health (red/amber)
//                · role_tag = accountable · programme type
//
// NOTE: project `deadline` is free text ("late June", "TBD",
// "Board decision 23 June 2026") so it is deliberately NOT parsed
// for urgency — only reliable task `due_date` (a real date column)
// and red health drive project-level urgency.
// ---------------------------------------------------------------

import { sortableDateKey } from './format';
import type { Project, Task, TaskStatusId } from './types';

export const OPEN_TASK_STATUSES = new Set<TaskStatusId>(['todo', 'in_progress', 'waiting', 'hold']);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;

export type Quadrant = 'do_now' | 'schedule' | 'delegate' | 'park';
export type Tone = 'overdue' | 'decision' | 'due' | 'priority' | 'watch';

export interface MatrixItem {
  key: string;
  kind: 'task' | 'project';
  quadrant: Quadrant;
  tone: Tone;
  badge: string;
  title: string;
  context: string;
  /** Ids the renderer turns into a pretty URL via useUrls. */
  projectId: string;
  taskId?: string;
  /** Lower sorts first within a quadrant. */
  sortKey: number;
}

export type Matrix = Record<Quadrant, MatrixItem[]>;

export const QUADRANT_META: Record<Quadrant, { title: string; blurb: string }> = {
  do_now: { title: 'Do now', blurb: 'Urgent & important' },
  schedule: { title: 'Schedule', blurb: 'Important, not urgent' },
  delegate: { title: 'Delegate', blurb: 'Urgent, not important' },
  park: { title: 'Park', blurb: 'Neither — revisit later' },
};

function quadrantOf(important: boolean, urgent: boolean): Quadrant {
  if (important && urgent) return 'do_now';
  if (important && !urgent) return 'schedule';
  if (!important && urgent) return 'delegate';
  return 'park';
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short' });
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((new Date(toKey).getTime() - new Date(fromKey).getTime()) / ONE_DAY_MS);
}

/** A tracked project counts as important if it carries strategic weight. */
function projectImportant(p: Project): boolean {
  return (
    p.health === 'red' ||
    p.health === 'amber' ||
    p.role_tag === 'accountable' ||
    p.project_type === 'programme'
  );
}

/** A task inherits importance from its priority or its parent project. */
function taskImportant(t: Task, parent: Project | undefined): boolean {
  if (t.priority != null && t.priority <= 2) return true;
  if (!parent) return false;
  return parent.health === 'red' || parent.health === 'amber' || parent.role_tag === 'accountable';
}

export function buildMatrix(projects: Project[], tasks: Task[]): Matrix {
  const today = sortableDateKey(new Date().toISOString());
  const horizon = sortableDateKey(new Date(Date.now() + DUE_SOON_DAYS * ONE_DAY_MS).toISOString());
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const matrix: Matrix = { do_now: [], schedule: [], delegate: [], park: [] };

  // ---- Tasks: the primary actionable units --------------------------------
  for (const t of tasks) {
    if (!OPEN_TASK_STATUSES.has(t.status)) continue;
    const parent = projectById.get(t.project_id);

    const overdue = !!t.due_date && t.due_date < today;
    const dueSoon = !!t.due_date && t.due_date >= today && t.due_date <= horizon;
    const urgent = overdue || dueSoon;
    const important = taskImportant(t, parent);

    let tone: Tone;
    let badge: string;
    let sortKey: number;
    if (overdue) {
      const days = daysBetween(t.due_date!, today);
      tone = 'overdue';
      badge = days <= 1 ? 'Overdue' : `${days}d overdue`;
      sortKey = -days; // most overdue first
    } else if (dueSoon) {
      tone = 'due';
      badge = t.due_date === today ? 'Today' : `Due ${shortDate(t.due_date!)}`;
      sortKey = 1000 + daysBetween(today, t.due_date!);
    } else {
      tone = 'priority';
      badge = t.priority != null ? `P${t.priority}` : 'Task';
      sortKey = 3000 + (t.priority ?? 9);
    }

    matrix[quadrantOf(important, urgent)].push({
      key: `task-${t.id}`,
      kind: 'task',
      quadrant: quadrantOf(important, urgent),
      tone,
      badge,
      title: t.title,
      context: parent?.name ?? '',
      projectId: t.project_id,
      taskId: t.id,
      sortKey,
    });
  }

  // ---- Projects: decision pointers for off-track / at-risk work -----------
  // Red is always shown (needs a decision now). Amber is shown only when it
  // has a next_decision to point at, so the matrix stays a pointer not a dump.
  for (const p of projects) {
    if (p.status !== 'active') continue;
    const isRed = p.health === 'red';
    const isAmber = p.health === 'amber';
    if (!isRed && !(isAmber && p.next_decision)) continue;

    const urgent = isRed;
    const important = projectImportant(p);
    const context = p.next_decision ? `Next decision: ${p.next_decision}` : 'Needs a decision';

    matrix[quadrantOf(important, urgent)].push({
      key: `proj-${p.id}`,
      kind: 'project',
      quadrant: quadrantOf(important, urgent),
      tone: isRed ? 'decision' : 'watch',
      badge: isRed ? 'Off track' : 'At risk',
      title: p.name,
      context,
      projectId: p.id,
      sortKey: isRed ? 500 : 4000, // red between overdue tasks and due-soon; amber late
    });
  }

  for (const q of Object.keys(matrix) as Quadrant[]) {
    matrix[q].sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title));
  }

  return matrix;
}
