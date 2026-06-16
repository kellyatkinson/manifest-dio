import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import { useUrls } from '@/hooks/useUrls';
import { formatDate } from '@/lib/format';
import type { Task, TaskStatusId } from '@/lib/types';

import styles from './Tasks.module.css';

const STATUS_TABS: { id: TaskStatusId | 'open' | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'hold', label: 'On hold' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };

export function Tasks() {
  const navigate = useNavigate();
  const { projectPath, taskPath } = useUrls();
  const { data: tasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects('active');
  const [statusFilter, setStatusFilter] = useState<TaskStatusId | 'open' | 'all'>('open');
  const [search, setSearch] = useState('');

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; project_type: string }>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter === 'open') {
        // "Open" = still on the radar. Waiting counts (expected unblocker).
        // Hold is intentionally excluded -- it's the someday/maybe bucket.
        if (t.status !== 'todo' && t.status !== 'in_progress' && t.status !== 'waiting') return false;
      } else if (statusFilter !== 'all') {
        if (t.status !== statusFilter) return false;
      }
      if (term && !t.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [tasks, statusFilter, search]);

  const isLoading = tasksLoading || projectsLoading;

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Tasks</h1>
        <p className={styles.sub}>Tasks across all projects, soonest due date first.</p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Status filter">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${statusFilter === tab.id ? styles.tabActive : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className={styles.search}
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className={styles.empty}>No tasks match the current filters.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thStatus} aria-label="Status" />
              <th className={styles.thTitle}>Task</th>
              <th className={styles.thProject}>Project</th>
              <th className={styles.thDue}>Due</th>
              <th className={styles.thOwner}>Owner</th>
              <th className={styles.thPri}>Pri</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const project = projectMap.get(task.project_id);
              const overdue = isOverdue(task);
              return (
                <tr
                  key={task.id}
                  className={`${styles.row} ${styles[`row_${task.status}`] ?? ''}`}
                  onClick={() => navigate(taskPath(task.project_id, task.id))}
                >
                  <td className={styles.tdStatus}>
                    <span
                      className={`${styles.dot} ${styles[`dot_${task.status}`]}`}
                      title={task.status.replace('_', ' ')}
                    />
                  </td>
                  <td className={styles.tdTitle}>
                    <span className={task.status === 'done' || task.status === 'cancelled' ? styles.strike : ''}>
                      {task.title}
                    </span>
                  </td>
                  <td className={styles.tdProject}>
                    {project ? (
                      <span
                        className={styles.projectLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(projectPath(task.project_id));
                        }}
                      >
                        {project.name}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={`${styles.tdDue} ${overdue ? styles.overdue : ''}`}>
                    {task.due_date ? formatDate(task.due_date) : <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.tdOwner}>
                    {task.owner ?? <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.tdPri}>
                    {task.priority ? (
                      <span className={`${styles.priority} ${styles[`pri${task.priority}`]}`}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!isLoading && tasks.length > 0 && (
        <div className={styles.foot}>
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== tasks.length ? ` (filtered from ${tasks.length})` : ''}.
        </div>
      )}
    </div>
  );
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.due_date) < today;
}
