// ---------------------------------------------------------------
// Project detail page
// ---------------------------------------------------------------
// Three stacked sections:
//   1. Project header + editable info card
//   2. Tasks list (with inline add)
//   3. Collapsible history feed
//
// Task detail is rendered as a modal overlay when /portfolio/:projectId/tasks/:taskId
// is the active route. Decision rationale: tasks are short, the
// project context above them is the value, and a full route change
// would lose the user's place in the tasks list. The URL still
// changes so the deep link works.
// ---------------------------------------------------------------

import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HistoryFeed } from '@/components/HistoryFeed';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { TaskList } from '@/components/TaskList';
import { useProject, useProjects, useUpdateProject, useArchiveProject, useHideProject, useRestoreProject } from '@/hooks/useProjects';
import { useProjectHistory } from '@/hooks/useHistory';
import { useTasksForProject } from '@/hooks/useTasks';
import { formatDateTime, projectTypeLabel } from '@/lib/format';
import type { ConfidenceId, ProjectStateId, ProjectStatusId, ProjectTypeId } from '@/lib/types';

import { TaskDetail } from './TaskDetail';
import styles from './ProjectDetail.module.css';

const STATUSES: ProjectStatusId[] = ['green', 'amber', 'red', 'placeholder'];
const TYPES: ProjectTypeId[] = ['project', 'programme', 'annual_cycle'];
const CONFIDENCES: ConfidenceId[] = ['high', 'medium', 'low'];
const STATES: ProjectStateId[] = ['active', 'archived', 'hidden_out_of_scope'];

const STATE_LABEL: Record<ProjectStateId, string> = {
  active: 'Active',
  archived: 'Archived (closed)',
  hidden_out_of_scope: 'Hidden / out of scope',
};

export function ProjectDetail() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useProject(projectId);
  const { data: tasks = [] } = useTasksForProject(projectId);
  const { data: history = [] } = useProjectHistory(projectId);
  const { data: allProjects = [] } = useProjects('active');
  const programmes = allProjects.filter((p) => p.project_type === 'programme' && p.id !== projectId);

  const updateMut = useUpdateProject(projectId ?? '');
  const archiveMut = useArchiveProject(projectId ?? '');
  const hideMut = useHideProject(projectId ?? '');
  const restoreMut = useRestoreProject(projectId ?? '');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [stateAction, setStateAction] = useState<{ next: ProjectStateId; label: string } | null>(null);
  const [stateReason, setStateReason] = useState('');

  if (isLoading) return <div className={styles.placeholder}>Loading project…</div>;
  if (error) return <div className={styles.error}>Could not load project: {(error as Error).message}</div>;
  if (!project) return <div className={styles.placeholder}>Project not found.</div>;

  function startEdit() {
    if (!project) return;
    setDraft({
      name: project.name,
      project_type: project.project_type,
      owner: project.owner ?? '',
      status: project.status,
      status_confidence: project.status_confidence ?? '',
      owner_confidence: project.owner_confidence ?? '',
      next_decision: project.next_decision ?? '',
      deadline: project.deadline ?? '',
      canonical_location: project.canonical_location ?? '',
      logseq_page: project.logseq_page ?? '',
      parent_id: project.parent_id ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!project) return;
    const payload: Record<string, unknown> = {};
    if (draft.name !== project.name) payload.name = draft.name;
    if (draft.project_type !== project.project_type) payload.project_type = draft.project_type;
    if (draft.owner !== (project.owner ?? '')) payload.owner = draft.owner || null;
    if (draft.status !== project.status) payload.status = draft.status;
    if (draft.status_confidence !== (project.status_confidence ?? ''))
      payload.status_confidence = draft.status_confidence || null;
    if (draft.owner_confidence !== (project.owner_confidence ?? ''))
      payload.owner_confidence = draft.owner_confidence || null;
    if (draft.next_decision !== (project.next_decision ?? ''))
      payload.next_decision = draft.next_decision || null;
    if (draft.deadline !== (project.deadline ?? '')) payload.deadline = draft.deadline || null;
    if (draft.canonical_location !== (project.canonical_location ?? ''))
      payload.canonical_location = draft.canonical_location || null;
    if (draft.logseq_page !== (project.logseq_page ?? ''))
      payload.logseq_page = draft.logseq_page || null;
    if (draft.parent_id !== (project.parent_id ?? ''))
      payload.parent_id = draft.parent_id || null;

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    try {
      await updateMut.mutateAsync({ payload });
      setEditing(false);
    } catch (err) {
      window.alert(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async function performStateChange() {
    if (!stateAction || !project) return;
    const reason = stateReason.trim() || undefined;
    try {
      if (stateAction.next === 'archived') {
        await archiveMut.mutateAsync(reason);
      } else if (stateAction.next === 'hidden_out_of_scope') {
        await hideMut.mutateAsync(reason);
      } else if (stateAction.next === 'active') {
        await restoreMut.mutateAsync(reason);
      }
      setStateAction(null);
      setStateReason('');
    } catch (err) {
      window.alert(`State change failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return (
    <div>
      {/* ---- Header / state ---- */}
      <header className={styles.head}>
        <div className={styles.headRow}>
          <h1 className={styles.title}>{project.name}</h1>
          <div className={styles.headActions}>
            {!editing && (
              <button type="button" className={styles.btn} onClick={startEdit}>
                Edit
              </button>
            )}
            <div className={styles.stateChip} data-state={project.state}>
              {STATE_LABEL[project.state]}
            </div>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Updated</span>
          <span>{formatDateTime(project.updated_at)}</span>
          {project.updated_by_email && (
            <>
              <span className={styles.metaLabel}>by</span>
              <span className={styles.email}>{project.updated_by_email}</span>
            </>
          )}
        </div>
      </header>

      {/* ---- Info card / edit form ---- */}
      <section className={styles.card}>
        {!editing ? (
          <div className={styles.grid}>
            <Field label="Type" value={projectTypeLabel(project.project_type)} />
            <Field
              label="Status"
              value={
                <span className={styles.fieldRow}>
                  <StatusPill status={project.status} inferred={project.status_inferred} />
                  {project.status_confidence && (
                    <ConfidenceBadge confidence={project.status_confidence} />
                  )}
                </span>
              }
            />
            <Field
              label="Owner"
              value={
                <span className={styles.fieldRow}>
                  <span>{project.owner ?? <span className={styles.muted}>unassigned</span>}</span>
                  {project.owner_inferred && (
                    <span className={styles.inferredFlag} title="Inferred — needs confirmation">
                      †
                    </span>
                  )}
                  {project.owner_confidence && (
                    <ConfidenceBadge confidence={project.owner_confidence} />
                  )}
                </span>
              }
            />
            <Field label="Next decision" value={project.next_decision ?? <Muted />} wide />
            <Field label="Deadline" value={project.deadline ?? <Muted />} />
            <Field
              label="Canonical location"
              value={
                project.canonical_location ? (
                  <code className={styles.code}>{project.canonical_location}</code>
                ) : (
                  <Muted />
                )
              }
              wide
            />
            <Field
              label="Logseq page"
              value={
                project.logseq_page ? (
                  <code className={styles.code}>[[{project.logseq_page}]]</code>
                ) : (
                  <Muted />
                )
              }
            />
            {project.project_type === 'project' && (
              <Field
                label="Parent programme"
                value={
                  project.parent_id ? (
                    allProjects.find((p) => p.id === project.parent_id)?.name ?? (
                      <span className={styles.muted}>Unknown programme</span>
                    )
                  ) : (
                    <Muted />
                  )
                }
              />
            )}
            {project.state_reason && (
              <Field label="State reason" value={project.state_reason} wide />
            )}
          </div>
        ) : (
          <div className={styles.editGrid}>
            <EditField label="Name">
              <input
                value={draft.name ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className={styles.input}
              />
            </EditField>
            <EditField label="Type">
              <select
                value={draft.project_type ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, project_type: e.target.value }))}
                className={styles.input}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {projectTypeLabel(t)}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Owner">
              <input
                value={draft.owner ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
                className={styles.input}
                placeholder="e.g. Kelly (BIM)"
              />
            </EditField>
            <EditField label="Owner confidence">
              <select
                value={draft.owner_confidence ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, owner_confidence: e.target.value }))}
                className={styles.input}
              >
                <option value="">—</option>
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Status">
              <select
                value={draft.status ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                className={styles.input}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Status confidence">
              <select
                value={draft.status_confidence ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, status_confidence: e.target.value }))}
                className={styles.input}
              >
                <option value="">—</option>
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Next decision" wide>
              <textarea
                rows={2}
                value={draft.next_decision ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, next_decision: e.target.value }))}
                className={styles.input}
              />
            </EditField>
            <EditField label="Deadline">
              <input
                value={draft.deadline ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
                className={styles.input}
                placeholder="free text — e.g. TBD, 2026-06-15"
              />
            </EditField>
            <EditField label="Canonical location" wide>
              <input
                value={draft.canonical_location ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, canonical_location: e.target.value }))}
                className={styles.input}
                placeholder="e.g. OneDrive › 01 projects › Project Name"
              />
            </EditField>
            <EditField label="Logseq page">
              <input
                value={draft.logseq_page ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, logseq_page: e.target.value }))}
                className={styles.input}
                placeholder="Page title (without [[ ]])"
              />
            </EditField>
            {(draft.project_type ?? project.project_type) === 'project' && programmes.length > 0 && (
              <EditField label="Parent programme">
                <select
                  value={draft.parent_id ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, parent_id: e.target.value }))}
                  className={styles.input}
                >
                  <option value="">— none (standalone) —</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </EditField>
            )}

            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  setEditing(false);
                  setDraft({});
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  void saveEdit();
                }}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---- State transitions ---- */}
      <section className={styles.stateRow}>
        <span className={styles.metaLabel}>State</span>
        <select
          className={styles.input}
          value={project.state}
          onChange={(e) => {
            const next = e.target.value as ProjectStateId;
            if (next === project.state) return;
            setStateAction({ next, label: STATE_LABEL[next] });
            setStateReason('');
          }}
        >
          {STATES.map((s) => (
            <option key={s} value={s}>
              {STATE_LABEL[s]}
            </option>
          ))}
        </select>
      </section>

      {/* ---- Tasks ---- */}
      <div className={styles.tasksWrap}>
        <TaskList projectId={project.id} tasks={tasks} />
      </div>

      {/* ---- History feed ---- */}
      <div className={styles.historyWrap}>
        <HistoryFeed rows={history} title="Project history" />
      </div>

      {/* ---- Task detail modal (route-driven) ---- */}
      {taskId && projectId && (
        <TaskDetail
          taskId={taskId}
          projectId={projectId}
          onClose={() => navigate(`/portfolio/${projectId}`)}
        />
      )}

      {/* ---- State-change confirm dialog ---- */}
      <ConfirmDialog
        open={Boolean(stateAction)}
        title={stateAction ? `Move project to "${stateAction.label}"?` : ''}
        body={
          stateAction && (
            <div>
              <p style={{ marginBottom: 'var(--sp-2)' }}>
                A history row will be written for this state change. Reason is optional but recommended.
              </p>
              <textarea
                rows={3}
                value={stateReason}
                onChange={(e) => setStateReason(e.target.value)}
                placeholder="Why this change? (optional)"
                className={styles.input}
                style={{ width: '100%' }}
              />
            </div>
          )
        }
        confirmLabel="Apply"
        destructive={stateAction?.next === 'hidden_out_of_scope'}
        onCancel={() => {
          setStateAction(null);
          setStateReason('');
        }}
        onConfirm={() => {
          void performStateChange();
        }}
      />
    </div>
  );
}

// ---------------- helpers ----------------

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? styles.fieldWide : styles.field}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}

function EditField({
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

function Muted() {
  return <span className={styles.muted}>—</span>;
}
