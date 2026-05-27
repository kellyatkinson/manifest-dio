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

import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ActivityFeed } from '@/components/ActivityFeed';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HistoryFeed } from '@/components/HistoryFeed';
import { InferencePopover } from '@/components/InferencePopover';
import { QuickLog } from '@/components/QuickLog';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { TaskList } from '@/components/TaskList';
import { useProject, useProjects, useUpdateProject, useArchiveProject, useHideProject, useHoldProject, useRestoreProject } from '@/hooks/useProjects';
import { useProjectActivity } from '@/hooks/useActivity';
import { useProjectHistory } from '@/hooks/useHistory';
import { useTasksForProject } from '@/hooks/useTasks';
import { formatDateTime, humaniseFieldName, humaniseFieldValue, projectTypeLabel } from '@/lib/format';
import type { ConfidenceId, HealthId, ProjectHistoryRow, ProjectStatusId, ProjectTypeId } from '@/lib/types';

import { TaskDetail } from './TaskDetail';
import styles from './ProjectDetail.module.css';

const STATUSES: HealthId[] = ['green', 'amber', 'red', 'placeholder'];
const TYPES: ProjectTypeId[] = ['project', 'programme', 'operational'];
const CONFIDENCES: ConfidenceId[] = ['high', 'medium', 'low'];
const STATES: ProjectStatusId[] = ['active', 'on_hold', 'archived', 'excluded'];

const STATE_LABEL: Record<ProjectStatusId, string> = {
  active: 'Active',
  on_hold: 'On hold',
  archived: 'Closed',
  excluded: 'Excluded',
};

export function ProjectDetail() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useProject(projectId);
  const { data: tasks = [] } = useTasksForProject(projectId);
  const { data: history = [] } = useProjectHistory(projectId);
  const { data: activity = [] } = useProjectActivity(projectId, 30);
  const { data: allProjects = [] } = useProjects('active');
  const programmes = allProjects.filter((p) => p.project_type === 'programme' && p.id !== projectId);

  const updateMut = useUpdateProject(projectId ?? '');
  const archiveMut = useArchiveProject(projectId ?? '');
  const hideMut = useHideProject(projectId ?? '');
  const holdMut = useHoldProject(projectId ?? '');
  const restoreMut = useRestoreProject(projectId ?? '');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [stateAction, setStateAction] = useState<{ next: ProjectStatusId; label: string } | null>(null);
  const [stateReason, setStateReason] = useState('');
  const [popover, setPopover] = useState<{
    field: 'health' | 'owner';
    anchor: { x: number; y: number };
  } | null>(null);

  if (isLoading) return <div className={styles.placeholder}>Loading project…</div>;
  if (error) return <div className={styles.error}>Could not load project: {(error as Error).message}</div>;
  if (!project) return <div className={styles.placeholder}>Project not found.</div>;

  function startEdit() {
    if (!project) return;
    setDraft({
      name: project.name,
      project_type: project.project_type,
      owner: project.owner ?? '',
      health: project.health,
      health_confidence: project.health_confidence ?? '',
      owner_confidence: project.owner_confidence ?? '',
      next_decision: project.next_decision ?? '',
      deadline: project.deadline ?? '',
      primary_location: project.primary_location ?? '',
      logseq_page: project.logseq_page ?? '',
      parent_id: project.parent_id ?? '',
      description: project.description ?? '',
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!project) return;
    const payload: Record<string, unknown> = {};
    if (draft.name !== project.name) payload.name = draft.name;
    if (draft.project_type !== project.project_type) payload.project_type = draft.project_type;
    if (draft.owner !== (project.owner ?? '')) payload.owner = draft.owner || null;
    if (draft.health !== project.health) payload.health = draft.health;
    if (draft.health_confidence !== (project.health_confidence ?? ''))
      payload.health_confidence = draft.health_confidence || null;
    if (draft.owner_confidence !== (project.owner_confidence ?? ''))
      payload.owner_confidence = draft.owner_confidence || null;
    if (draft.next_decision !== (project.next_decision ?? ''))
      payload.next_decision = draft.next_decision || null;
    if (draft.deadline !== (project.deadline ?? '')) payload.deadline = draft.deadline || null;
    if (draft.primary_location !== (project.primary_location ?? ''))
      payload.primary_location = draft.primary_location || null;
    if (draft.logseq_page !== (project.logseq_page ?? ''))
      payload.logseq_page = draft.logseq_page || null;
    if (draft.parent_id !== (project.parent_id ?? ''))
      payload.parent_id = draft.parent_id || null;
    if (draft.description !== (project.description ?? ''))
      payload.description = draft.description || null;

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
      } else if (stateAction.next === 'excluded') {
        await hideMut.mutateAsync(reason);
      } else if (stateAction.next === 'on_hold') {
        await holdMut.mutateAsync(reason);
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
        <div className={styles.heroRow}>
          <h1 className={styles.title}>{project.name}</h1>
          <div className={styles.heroActions}>
            {!editing && (
              <button type="button" className={styles.btn} onClick={startEdit}>
                Edit
              </button>
            )}
            <select
              className={`${styles.input} ${styles.heroSelect}`}
              data-state={project.status}
              value={project.status}
              onChange={(e) => {
                const next = e.target.value as ProjectStatusId;
                if (next === project.status) return;
                setStateAction({ next, label: STATE_LABEL[next] });
                setStateReason('');
              }}
              aria-label="Project status"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.heroChips}>
          <span className={styles.typeChip} data-type={project.project_type}>
            {projectTypeLabel(project.project_type)}
          </span>
          <StatusPill
            status={project.health}
            inferred={project.health_inferred}
            onClick={
              project.health_inferred
                ? (event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setPopover({ field: 'health', anchor: { x: rect.left, y: rect.bottom } });
                  }
                : undefined
            }
          />
          {project.project_type === 'project' && project.parent_id && (() => {
            const parent = allProjects.find((p) => p.id === project.parent_id);
            return (
              <button
                type="button"
                className={styles.programmePill}
                onClick={() => navigate(`/programmes/${project.parent_id}`)}
                title="Open parent programme"
              >
                <span aria-hidden>↳ </span>
                {parent?.name ?? 'Unknown programme'}
              </button>
            );
          })()}
          <span className={styles.ownerPill}>
            <span className={styles.ownerLabel}>Owner</span>
            <span className={styles.ownerName}>
              {project.owner ?? <span className={styles.muted}>unassigned</span>}
            </span>
            {project.owner_inferred && (
              <button
                type="button"
                className={styles.daggerBtn}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setPopover({ field: 'owner', anchor: { x: rect.left, y: rect.bottom } });
                }}
                title="Inferred — click to confirm or change"
                aria-label="Inferred owner"
              >
                †
              </button>
            )}
            {project.owner_confidence && (
              <ConfidenceBadge confidence={project.owner_confidence} />
            )}
          </span>
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

      {/* ---- Recently rail (last-3 history events, inline with hero) ---- */}
      {history.length > 0 && !editing && <RecentlyRail history={history} />}

      {/* ---- Info card / edit form ---- */}
      <section className={styles.card}>
        {!editing ? (
          <div className={styles.panels}>
            {project.description && (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Description</h3>
                <p className={styles.panelText}>{project.description}</p>
              </div>
            )}
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>What's happening</h3>
              <div className={styles.panelGrid}>
                <Field label="Next decision" value={project.next_decision ?? <Muted />} wide />
                <Field label="Deadline" value={project.deadline ?? <Muted />} />
                {project.health_confidence && (
                  <Field
                    label="Health confidence"
                    value={<ConfidenceBadge confidence={project.health_confidence} />}
                  />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Where it lives</h3>
              <div className={styles.panelGrid}>
                <Field
                  label="Primary location"
                  value={
                    project.primary_location ? (
                      <code className={styles.code}>{project.primary_location}</code>
                    ) : (
                      <Muted />
                    )
                  }
                  wide
                />
                <Field
                  label="Notes (Logseq)"
                  value={
                    project.logseq_page ? (
                      <code className={styles.code}>[[{project.logseq_page}]]</code>
                    ) : (
                      <Muted />
                    )
                  }
                />
              </div>
            </div>
            {project.status_reason && (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Status note</h3>
                <p className={styles.panelText}>{project.status_reason}</p>
              </div>
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
            <EditField label="Health">
              <select
                value={draft.health ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, health: e.target.value }))}
                className={styles.input}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Health confidence">
              <select
                value={draft.health_confidence ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, health_confidence: e.target.value }))}
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
            <EditField label="Description" wide>
              <textarea
                rows={3}
                value={draft.description ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className={styles.input}
                placeholder="Scope notes, context, anything that doesn't fit the name."
              />
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
            <EditField label="Where it lives" wide>
              <input
                value={draft.primary_location ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, primary_location: e.target.value }))}
                className={styles.input}
                placeholder="e.g. OneDrive › 01 projects › Project Name"
              />
            </EditField>
            <EditField label="Notes (Logseq)">
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

      {/* ---- Activity (self-logged) ---- */}
      <section className={styles.activityWrap}>
        <header className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Activity</h2>
          <span className={styles.sectionCount}>{activity.length}</span>
        </header>
        <div className={styles.activityCard}>
          <div className={styles.quickLogWrap}>
            <QuickLog
              projectId={project.id}
              placeholder="Log a discussion, decision, or quick action on this project…"
            />
          </div>
          <ActivityFeed
            entries={activity}
            limit={12}
            showProject={false}
            emptyMessage="Nothing logged on this project yet. Discussions, decisions, and quick actions land here."
          />
        </div>
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
        destructive={stateAction?.next === 'excluded'}
        onCancel={() => {
          setStateAction(null);
          setStateReason('');
        }}
        onConfirm={() => {
          void performStateChange();
        }}
      />

      {/* ---- Inference popover for clicking the inferred dagger / health pill ---- */}
      {popover && (
        <InferencePopover
          project={project}
          field={popover.field}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
        />
      )}
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

// ---------------- Recently rail ----------------
// Compact "last 3 change groups" preview shown inline with the hero,
// so the most recent activity is visible without expanding the full history.

function RecentlyRail({ history }: { history: ProjectHistoryRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ProjectHistoryRow[]>();
    for (const r of history) {
      const existing = map.get(r.change_group_id) ?? [];
      existing.push(r);
      map.set(r.change_group_id, existing);
    }
    return Array.from(map.entries())
      .map(([id, rows]) => ({
        id,
        rows,
        changedAt: rows[0].changed_at,
      }))
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
      .slice(0, 3);
  }, [history]);

  if (groups.length === 0) return null;

  return (
    <aside className={styles.recently} aria-label="Recent activity">
      <span className={styles.recentlyLabel}>Recently</span>
      <ul className={styles.recentlyList}>
        {groups.map((g) => (
          <li key={g.id} className={styles.recentlyItem}>
            {g.rows.length === 1 ? (
              <>
                <span className={styles.recentlyField}>
                  {humaniseFieldName(g.rows[0].field_name)}
                </span>
                <span className={styles.recentlyArrow}> → </span>
                <span className={styles.recentlyValue}>
                  {humaniseFieldValue(g.rows[0].field_name, g.rows[0].new_value)}
                </span>
              </>
            ) : (
              <span className={styles.recentlyField}>
                {g.rows.length} fields updated
              </span>
            )}
            <span className={styles.recentlyTime}> · {formatDateTime(g.changedAt)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
