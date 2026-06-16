// ---------------------------------------------------------------
// TaskList -- the tasks panel shown below the project info on
// the project detail page.
//
// Clicking the checkbox toggles done<->todo (admin_set_task_status).
// Clicking the row itself opens the task detail modal via parent.
// "Add task" row inlines a new task creation.
// Sort control (2026-06-12): Default / Due date / Priority /
// Status / Title — choice remembered per browser via localStorage.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate, sortableDateKey, taskStatusLabel } from '@/lib/format';
import type { Task, TaskStatusId } from '@/lib/types';
import { ZendeskTicketsChips } from './ZendeskTickets';
import { useCreateTask, useSetTaskStatus } from '@/hooks/useTasks';
import { useUrls } from '@/hooks/useUrls';

import styles from './TaskList.module.css';

interface Props {
  projectId: string;
  tasks: Task[];
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };

// ---- Sorting -------------------------------------------------------------

type SortKey = 'default' | 'due' | 'priority' | 'status' | 'title';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },
];

/** Active work first, finished last — mirrors task_statuses.display_order. */
const STATUS_ORDER: Record<TaskStatusId, number> = {
  todo: 1,
  in_progress: 2,
  waiting: 3,
  hold: 4,
  done: 5,
  cancelled: 6,
};

const SORT_STORAGE_KEY = 'manifest.taskSort';

function loadStoredSort(): SortKey {
  try {
    const v = localStorage.getItem(SORT_STORAGE_KEY);
    if (v && SORT_OPTIONS.some((o) => o.value === v)) return v as SortKey;
  } catch {
    /* private mode / storage unavailable — fall through */
  }
  return 'default';
}

/** Due date asc, undated last; ties by priority then title. */
function byDue(a: Task, b: Task): number {
  const da = a.due_date ?? '9999-12-31';
  const db = b.due_date ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  return byPriority(a, b);
}

/** Priority asc (P1 first), unset last; ties by due date then title. */
function byPriority(a: Task, b: Task): number {
  const pa = a.priority ?? 99;
  const pb = b.priority ?? 99;
  if (pa !== pb) return pa - pb;
  const da = a.due_date ?? '9999-12-31';
  const db = b.due_date ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  return a.title.localeCompare(b.title);
}

function byStatus(a: Task, b: Task): number {
  const sa = STATUS_ORDER[a.status] ?? 99;
  const sb = STATUS_ORDER[b.status] ?? 99;
  if (sa !== sb) return sa - sb;
  return byDue(a, b);
}

function byTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title);
}

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  if (key === 'default') return tasks;
  const sorted = [...tasks];
  switch (key) {
    case 'due':
      sorted.sort(byDue);
      break;
    case 'priority':
      sorted.sort(byPriority);
      break;
    case 'status':
      sorted.sort(byStatus);
      break;
    case 'title':
      sorted.sort(byTitle);
      break;
  }
  return sorted;
}

// ---- Component -----------------------------------------------------------

export function TaskList({ projectId, tasks }: Props) {
  const navigate = useNavigate();
  const { taskPath } = useUrls();
  const [newTitle, setNewTitle] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(loadStoredSort);
  const createMut = useCreateTask(projectId);

  const today = sortableDateKey(new Date().toISOString());

  const sortedTasks = useMemo(() => sortTasks(tasks, sortKey), [tasks, sortKey]);

  function handleSortChange(value: SortKey) {
    setSortKey(value);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, value);
    } catch {
      /* storage unavailable — selection still applies this session */
    }
  }

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Tasks
          <span className={styles.count}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </h2>
        {tasks.length > 1 && (
          <label className={styles.sortWrap}>
            <span className={styles.sortLabel}>Sort</span>
            <select
              className={styles.sortSelect}
              value={sortKey}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>No tasks yet. Add one below to get started.</div>
      ) : (
        <div className={styles.list}>
          {sortedTasks.map((t) => (
            <TaskRow key={t.id} task={t} projectId={projectId} today={today} onOpen={() => navigate(taskPath(projectId, t.id))} />
          ))}
        </div>
      )}

      <form
        className={styles.addRow}
        onSubmit={async (e) => {
          e.preventDefault();
          const title = newTitle.trim();
          if (!title) return;
          await createMut.mutateAsync({ title });
          setNewTitle('');
        }}
      >
        <input
          className={styles.input}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
        />
        <button type="submit" className={styles.addBtn} disabled={!newTitle.trim() || createMut.isPending}>
          {createMut.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
    </section>
  );
}

function TaskRow({
  task,
  projectId,
  today,
  onOpen,
}: {
  task: Task;
  projectId: string;
  today: string;
  onOpen: () => void;
}) {
  const setStatus = useSetTaskStatus(task.id, projectId);
  const done = task.status === 'done';
  const cancelled = task.status === 'cancelled';
  const overdue = task.due_date && task.due_date < today && !done && !cancelled;

  const statusClass = done
    ? styles.statusDone
    : cancelled
      ? styles.statusCancelled
      : task.status === 'in_progress'
        ? styles.statusInProgress
        : '';

  const priorityClass =
    task.priority === 1 ? styles.priorityHigh : task.priority === 2 ? styles.priorityMed : '';

  return (
    <div className={styles.row} onClick={onOpen} role="button" tabIndex={0}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={done}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const next: TaskStatusId = e.target.checked ? 'done' : 'todo';
          void setStatus.mutateAsync({ status: next });
        }}
      />
      <div className={`${styles.taskTitle} ${done ? styles.done : ''} ${cancelled ? styles.cancelled : ''}`}>
        <span>{task.title}</span>
        {task.zendesk_tickets && task.zendesk_tickets.length > 0 && (
          <span className={styles.tickets} onClick={(e) => e.stopPropagation()}>
            <ZendeskTicketsChips ids={task.zendesk_tickets} />
          </span>
        )}
      </div>
      <div className={`${styles.due} ${overdue ? styles.dueOverdue : ''}`}>
        {task.due_date ? formatDate(task.due_date) : ''}
      </div>
      {task.priority && <div className={`${styles.priority} ${priorityClass}`}>{PRIORITY_LABEL[task.priority]}</div>}
      <div className={`${styles.status} ${statusClass}`}>{taskStatusLabel(task.status)}</div>
    </div>
  );
}
