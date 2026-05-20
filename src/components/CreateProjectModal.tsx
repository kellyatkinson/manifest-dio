import { useState, type FormEvent } from 'react';

import { useCreateProject } from '@/hooks/useProjects';
import type { ProjectTypeId, ProjectStatusId } from '@/lib/types';

import styles from './CreateProjectModal.module.css';

interface Props {
  onClose: () => void;
}

export function CreateProjectModal({ onClose }: Props) {
  const createMut = useCreateProject();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectTypeId>('project');
  const [status, setStatus] = useState<ProjectStatusId>('placeholder');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [nextDecision, setNextDecision] = useState('');
  const [canonicalLocation, setCanonicalLocation] = useState('');
  const [logseqPage, setLogseqPage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createMut.mutateAsync({
        name: name.trim(),
        project_type: type,
        status,
        owner: owner.trim() || undefined,
        deadline: deadline.trim() || undefined,
        next_decision: nextDecision.trim() || undefined,
        canonical_location: canonicalLocation.trim() || undefined,
        logseq_page: logseqPage.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal} role="dialog" aria-modal aria-label="New project">
        <header className={styles.head}>
          <h2 className={styles.title}>New item</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="cp-name">Name *</label>
            <input
              id="cp-name"
              required
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Veracross replacement"
              autoFocus
            />
          </div>

          <div className={styles.cols2}>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-type">Type</label>
              <select
                id="cp-type"
                className={styles.input}
                value={type}
                onChange={(e) => setType(e.target.value as ProjectTypeId)}
              >
                <option value="programme">Programme</option>
                <option value="project">Project</option>
                <option value="annual_cycle">Annual cycle</option>
              </select>
            </div>

            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-status">Status</label>
              <select
                id="cp-status"
                className={styles.input}
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatusId)}
              >
                <option value="placeholder">Placeholder</option>
                <option value="green">Green</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>

          <div className={styles.cols2}>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-owner">Owner</label>
              <input
                id="cp-owner"
                className={styles.input}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Kelly (BIM)"
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-deadline">Deadline</label>
              <input
                id="cp-deadline"
                className={styles.input}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g. June 2026, TBD"
              />
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="cp-next-decision">Next decision</label>
            <textarea
              id="cp-next-decision"
              rows={2}
              className={styles.input}
              value={nextDecision}
              onChange={(e) => setNextDecision(e.target.value)}
              placeholder="What needs to be decided next?"
            />
          </div>

          <div className={styles.cols2}>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-location">Canonical location</label>
              <input
                id="cp-location"
                className={styles.input}
                value={canonicalLocation}
                onChange={(e) => setCanonicalLocation(e.target.value)}
                placeholder="e.g. OneDrive › 01 projects › …"
              />
            </div>
            <div className={styles.row}>
              <label className={styles.label} htmlFor="cp-logseq">Logseq page</label>
              <input
                id="cp-logseq"
                className={styles.input}
                value={logseqPage}
                onChange={(e) => setLogseqPage(e.target.value)}
                placeholder="Page title (without [[ ]])"
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={createMut.isPending || !name.trim()}
            >
              {createMut.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
