// ---------------------------------------------------------------
// Small popover triggered by clicking an inferred cell.
// "Confirm as-is" calls admin_confirm_inference.
// "Change to ..." calls admin_set_status or admin_set_owner.
// ---------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';

import type { ConfidenceId, Project, ProjectStatusId } from '@/lib/types';
import { statusLabel } from '@/lib/format';
import { useConfirmInference, useSetOwner, useSetStatus } from '@/hooks/useProjects';

import styles from './InferencePopover.module.css';

type Field = 'status' | 'owner';

interface Props {
  project: Project;
  field: Field;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

const STATUS_OPTIONS: ProjectStatusId[] = ['green', 'amber', 'red', 'placeholder'];

export function InferencePopover({ project, field, anchor, onClose }: Props) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const confirmMut = useConfirmInference(project.id);
  const setStatusMut = useSetStatus(project.id);
  const setOwnerMut = useSetOwner(project.id);

  const [draftOwner, setDraftOwner] = useState<string>(project.owner ?? '');
  const [confidence, setConfidence] = useState<ConfidenceId>(
    (field === 'status' ? project.status_confidence : project.owner_confidence) ?? 'medium',
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!anchor) return null;

  const isStatus = field === 'status';
  const isInferred = isStatus ? project.status_inferred : project.owner_inferred;

  // Position the popover next to the anchor point. Keep within viewport.
  const left = Math.min(anchor.x, window.innerWidth - 260);
  const top = Math.min(anchor.y + 6, window.innerHeight - 220);

  return (
    <>
      <div className={styles.backdrop} aria-hidden />
      <div
        ref={popRef}
        className={styles.popover}
        role="dialog"
        aria-label={`Edit ${field}`}
        style={{ left, top }}
      >
        <div className={styles.label}>{field === 'status' ? 'Status' : 'Owner'}</div>
        <div className={styles.current}>
          Current: <strong>{isStatus ? statusLabel(project.status) : project.owner ?? 'unassigned'}</strong>
          {isInferred && ' (inferred)'}
        </div>

        {isInferred && (
          <button
            type="button"
            className={`${styles.btn} ${styles.primary}`}
            onClick={async () => {
              await confirmMut.mutateAsync(field);
              onClose();
            }}
          >
            Confirm as-is
          </button>
        )}

        <div className={styles.divider} />

        {isStatus ? (
          <>
            <div className={styles.label}>Change to</div>
            <div className={styles.changeList}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.btn}
                  disabled={s === project.status}
                  onClick={async () => {
                    await setStatusMut.mutateAsync({ status: s, confidence });
                    onClose();
                  }}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
            <div className={styles.divider} />
            <div className={styles.row}>
              <span className={styles.label} style={{ marginBottom: 0 }}>
                Confidence
              </span>
              <select
                className={styles.input}
                style={{ width: 'auto', marginBottom: 0 }}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceId)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div className={styles.label}>Change owner</div>
            <input
              className={styles.input}
              value={draftOwner}
              onChange={(e) => setDraftOwner(e.target.value)}
              placeholder="e.g. Kelly (BIM)"
            />
            <div className={styles.row}>
              <span className={styles.label} style={{ marginBottom: 0 }}>
                Confidence
              </span>
              <select
                className={styles.input}
                style={{ width: 'auto', marginBottom: 0 }}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceId)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className={styles.divider} />
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={async () => {
                await setOwnerMut.mutateAsync({ owner: draftOwner.trim() || null, confidence });
                onClose();
              }}
            >
              Save owner
            </button>
          </>
        )}
      </div>
    </>
  );
}
