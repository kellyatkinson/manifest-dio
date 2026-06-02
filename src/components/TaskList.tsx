// ---------------------------------------------------------------
// TaskList -- the tasks panel shown below the project info on
// the project detail page.
//
// Clicking the checkbox toggles done<->todo (admin_set_task_status).
// Clicking the row itself opens the task detail modal via parent.
// "Add task" row inlines a new task creation.
// ---------------------------------------------------------------

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDate, sortableDateKey, taskStatusLabel } from '@/lib/format';
import type { Task, TaskStatusId } from '@/lib/types';
import { ZendeskTicketsChips } from './ZendeskTickets';
import { useCreateTask, useSetTaskStatus } from '@/hooks/useTasks';

import styles from './TaskList.module.css';

interface Props {
  projectId: string;
  tasks: Task[];
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };

export function TaskList({ projectId, tasks }: Props) {
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState('');
  const createMut = useCreateTask(projectId);

  const today = sortableDateKey(new Date().toISOString());

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Tasks
          <span className={styles.count}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>No tasks yet. Add one below to get started.</div>
      ) : (
        <div className={styles.list}>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} projectId={projectId} today={today} onOpen={() => navigate(`/portfolio/${projectId}/tasks/${t.id}`)} />
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
