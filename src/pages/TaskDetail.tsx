// ---------------------------------------------------------------
// Task detail
// ---------------------------------------------------------------
// Rendered as a modal overlay on the ProjectDetail page when the
// route is /portfolio/:projectId/tasks/:taskId. Edits in place
// against the admin_update_task RPC.
//
// Justification for modal vs separate route:
//   - tasks live inside a project. Replacing the whole page would
//     lose the user's scroll position in the task list.
//   - the URL still changes, so deep links and the back button work
//     as expected.
//   - the existing detail layout is already the "main" surface;
//     the task is a child object, presented as one.
// ---------------------------------------------------------------

import { useEffect, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HistoryFeed } from '@/components/HistoryFeed';
import { useArchiveTask, useTask, useUpdateTask } from '@/hooks/useTasks';
import { useTaskHistory } from '@/hooks/useHistory';
import { taskStatusLabel } from '@/lib/format';
import type { TaskStatusId } from '@/lib/types';

import styles from './TaskDetail.module.css';

const STATUSES: TaskStatusId[] = ['todo', 'in_progress', 'done', 'cancelled'];

interface Props {
  taskId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, projectId, onClose }: Props) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: history = [] } = useTaskHistory(taskId);
  const updateMut = useUpdateTask(taskId, projectId);
  const archiveMut = useArchiveTask(taskId, projectId);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  // When the task arrives or changes, seed the draft.
  useEffect(() => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      due_date: task.due_date ?? '',
      priority: task.priority?.toString() ?? '',
      owner: task.owner ?? '',
    });
    setDirty(false);
  }, [task]);

  // Close on ESC.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function setField(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  async function save() {
    if (!task) return;
    const payload: Record<string, unknown> = {};
    if (draft.title !== task.title) payload.title = draft.title;
    if (draft.description !== (task.description ?? '')) payload.description = draft.description || null;
    if (draft.status !== task.status) payload.status = draft.status;
    if (draft.due_date !== (task.due_date ?? '')) payload.due_date = draft.due_date || null;
    if (draft.owner !== (task.owner ?? '')) payload.owner = draft.owner || null;
    const draftP = draft.priority === '' ? null : Number(draft.priority);
    if (draftP !== task.priority) payload.priority = draftP;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    try {
      await updateMut.mutateAsync({ payload });
      onClose();
    } catch (err) {
      window.alert(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async function doArchive() {
    try {
      await archiveMut.mutateAsync(undefined);
      setConfirmArchive(false);
      onClose();
    } catch (err) {
      window.alert(`Archive failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.head}>
          <h2 className={styles.title}>{task?.title ?? 'Task'}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {isLoading && <div className={styles.placeholder}>Loading task…</div>}
        {!isLoading && !task && <div className={styles.placeholder}>Task not found.</div>}

        {task && (
          <div className={styles.body}>
            <div className={styles.grid}>
              <Field label="Title" wide>
                <input
                  value={draft.title ?? ''}
                  onChange={(e) => setField('title', e.target.value)}
                  className={styles.input}
                />
              </Field>
              <Field label="Status">
                <select
                  value={draft.status ?? ''}
                  onChange={(e) => setField('status', e.target.value)}
                  className={styles.input}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {taskStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  value={draft.due_date ?? ''}
                  onChange={(e) => setField('due_date', e.target.value)}
                  className={styles.input}
                />
              </Field>
              <Field label="Priority">
                <select
                  value={draft.priority ?? ''}
                  onChange={(e) => setField('priority', e.target.value)}
                  className={styles.input}
                >
                  <option value="">Unset</option>
                  <option value="1">P1 — highest</option>
                  <option value="2">P2</option>
                  <option value="3">P3</option>
                  <option value="4">P4 — lowest</option>
                </select>
              </Field>
              <Field label="Owner">
                <input
                  value={draft.owner ?? ''}
                  onChange={(e) => setField('owner', e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Jane Guo"
                />
              </Field>
              <Field label="Description" wide>
                <textarea
                  rows={4}
                  value={draft.description ?? ''}
                  onChange={(e) => setField('description', e.target.value)}
                  className={styles.input}
                />
              </Field>
            </div>

            <HistoryFeed rows={history} title="Task history" defaultOpen={false} />

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.archive}`}
                onClick={() => setConfirmArchive(true)}
              >
                Archive
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" className={styles.btn} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.primary}`}
                onClick={() => {
                  void save();
                }}
                disabled={!dirty || updateMut.isPending}
              >
                {updateMut.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this task?"
        body="Archived tasks are hidden from the active list but remain in history. There is no unarchive action in v1."
        confirmLabel="Archive"
        destructive
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          void doArchive();
        }}
      />
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? styles.fieldWide : styles.field}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{children}</div>
    </div>
  );
}
