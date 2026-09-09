// ---------------------------------------------------------------
// Small popover triggered by clicking an inferred cell.
// "Confirm as-is" calls admin_confirm_inference.
// "Change to ..." calls admin_set_status or admin_set_owner.
// ---------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';

import type { ConfidenceId, Project, HealthId } from '@/lib/types';
import { statusLabel } from '@/lib/format';
import { useConfirmInference, useSetOwner, useSetHealth } from '@/hooks/useProjects';

import styles from './InferencePopover.module.css';

type Field = 'health' | 'owner';

interface Props {
  project: Project;
  field: Field;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

const STATUS_OPTIONS: HealthId[] = ['green', 'amber', 'red', 'placeholder'];

export function InferencePopover({ project, field, anchor, onClose }: Props) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const confirmMut = useConfirmInference(project.id);
  const setHealthMut = useSetHealth(project.id);
  const setOwnerMut = useSetOwner(project.id);

  const [draftOwner, setDraftOwner] = useState<string>(project.owner ?? '');
  const [confidence, setConfidence] = useState<ConfidenceId>(
    (field === 'health' ? project.health_confidence : project.owner_confidence) ?? 'medium',
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

  const isHealth = field === 'health';
  const isInferred = isHealth ? project.health_inferred : project.owner_inferred;
  // A portfolio's health is the worst of the rows below it, so it is
  // not something to set here — change a row's health instead.
  const isRolledUp = isHealth && Boolean(project.health_rolled_up);

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
        <div className={styles.label}>{field === 'health' ? 'Health' : 'Owner'}</div>
        <div className={styles.current}>
          Current: <strong>{isHealth ? statusLabel(project.health) : project.owner ?? 'unassigned'}</strong>
          {isRolledUp ? ' (from the rows below)' : isInferred && ' (inferred)'}
        </div>

        {isRolledUp && (
          <div className={styles.current}>
            A portfolio takes the worst health of its live rows. Change a row&rsquo;s health to
            move it.
          </div>
        )}

        {!isRolledUp && isInferred && (
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

        {!isRolledUp && <div className={styles.divider} />}

        {isRolledUp ? null : isHealth ? (
          <>
            <div className={styles.label}>Change to</div>
            <div className={styles.changeList}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.btn}
                  disabled={s === project.health}
                  onClick={async () => {
                    await setHealthMut.mutateAsync({ health: s, confidence });
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
              placeholder="e.g. Kelly"
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
