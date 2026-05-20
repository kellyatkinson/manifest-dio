// ---------------------------------------------------------------
// Decisions / "Resolved questions" log
// ---------------------------------------------------------------
// Lists every row from `decisions`, newest first. Decisions tied to
// a project link back to /portfolio/:projectId.
//
// Add / edit / delete affordances are wired but stay minimal: this
// is a reference log, not the daily-edit surface.
// ---------------------------------------------------------------

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminAddDecision,
  adminDeleteDecision,
  listDecisions,
  listProjects,
  type CreateDecisionInput,
} from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/format';

import styles from './Decisions.module.css';

export function Decisions() {
  const qc = useQueryClient();
  const { data: decisions = [], isLoading, error } = useQuery({
    queryKey: ['decisions'],
    queryFn: listDecisions,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'all-for-decisions'],
    queryFn: () => listProjects('all'),
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CreateDecisionInput>({
    project_id: '',
    question: '',
    resolution: '',
    decided_on: '',
    decided_by: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: (input: CreateDecisionInput) => adminAddDecision(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions'] });
      setAdding(false);
      setDraft({ project_id: '', question: '', resolution: '', decided_on: '', decided_by: '' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteDecision(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions'] });
      setDeleteTarget(null);
    },
  });

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Resolved questions</h1>
          <p className={styles.sub}>
            Portfolio-wide decisions log. New decisions get a row here; project-specific
            decisions also appear on the project's history feed.
          </p>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={() => setAdding((a) => !a)}>
          {adding ? 'Cancel' : 'Add decision'}
        </button>
      </header>

      {adding && (
        <section className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label}>Question (optional)</label>
            <input
              className={styles.input}
              value={draft.question ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              placeholder="e.g. Should HR/Payroll sit under SIS?"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Resolution *</label>
            <textarea
              rows={3}
              className={styles.input}
              value={draft.resolution}
              onChange={(e) => setDraft((d) => ({ ...d, resolution: e.target.value }))}
              placeholder="What was decided?"
            />
          </div>
          <div className={styles.rowGrid}>
            <div className={styles.row}>
              <label className={styles.label}>Decided on</label>
              <input
                type="date"
                className={styles.input}
                value={draft.decided_on ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, decided_on: e.target.value }))}
              />
            </div>
            <div className={styles.row}>
              <label className={styles.label}>Decided by</label>
              <input
                className={styles.input}
                value={draft.decided_by ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, decided_by: e.target.value }))}
                placeholder="e.g. Kelly + Paul"
              />
            </div>
            <div className={styles.row}>
              <label className={styles.label}>Project (optional)</label>
              <select
                className={styles.input}
                value={draft.project_id ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, project_id: e.target.value }))}
              >
                <option value="">— Portfolio-wide —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!draft.resolution.trim() || addMut.isPending}
              onClick={() => {
                void addMut.mutateAsync({
                  project_id: draft.project_id || undefined,
                  question: draft.question,
                  resolution: draft.resolution,
                  decided_on: draft.decided_on || undefined,
                  decided_by: draft.decided_by || undefined,
                });
              }}
            >
              {addMut.isPending ? 'Saving…' : 'Save decision'}
            </button>
          </div>
        </section>
      )}

      {isLoading && <div className={styles.note}>Loading decisions…</div>}
      {error && <div className={styles.error}>Could not load decisions: {(error as Error).message}</div>}

      {!isLoading && decisions.length === 0 && (
        <div className={styles.empty}>No decisions logged yet.</div>
      )}

      <ul className={styles.list}>
        {decisions.map((d) => (
          <li key={d.id} className={styles.item}>
            <div className={styles.itemHead}>
              <span className={styles.date}>{d.decided_on ? formatDate(d.decided_on) : 'Date TBD'}</span>
              {d.decided_by && <span className={styles.by}>by {d.decided_by}</span>}
              <div className={styles.spacer} />
              {d.project_id && (
                <Link to={`/portfolio/${d.project_id}`} className={styles.projectLink}>
                  {projectNameById.get(d.project_id) ?? 'Project'}
                </Link>
              )}
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setDeleteTarget(d.id)}
                aria-label="Delete decision"
              >
                Delete
              </button>
            </div>
            {d.question && <div className={styles.question}>Q: {d.question}</div>}
            <div className={styles.resolution}>{d.resolution}</div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this decision?"
        body="Decisions are the only entity Manifest hard-deletes. There is no undo."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteMut.mutateAsync(deleteTarget);
        }}
      />
    </div>
  );
}
