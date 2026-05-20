// ---------------------------------------------------------------
// HistoryFeed -- renders project_history or task_history.
// Groups consecutive rows that share a change_group_id into a
// single event (matches the multi-field update story).
// Collapsible -- starts collapsed; click header to expand.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';

import { dash, formatDateTime, humaniseFieldName } from '@/lib/format';
import type { ProjectHistoryRow, TaskHistoryRow } from '@/lib/types';

import styles from './HistoryFeed.module.css';

type Row = ProjectHistoryRow | TaskHistoryRow;

interface Props {
  rows: Row[];
  title?: string;
  defaultOpen?: boolean;
  emptyMessage?: string;
}

interface ChangeGroup {
  id: string;
  changedAt: string;
  changedByEmail: string;
  note: string | null;
  rows: Row[];
}

export function HistoryFeed({
  rows,
  title = 'History',
  defaultOpen = false,
  emptyMessage = 'No history yet.',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const groups = useMemo<ChangeGroup[]>(() => {
    const map = new Map<string, ChangeGroup>();
    for (const r of rows) {
      const id = r.change_group_id;
      const existing = map.get(id);
      if (existing) {
        existing.rows.push(r);
      } else {
        map.set(id, {
          id,
          changedAt: r.changed_at,
          changedByEmail: r.changed_by_email,
          note: r.note,
          rows: [r],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }, [rows]);

  return (
    <section className={styles.root}>
      <button
        type="button"
        className={styles.head}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.toggle}>{open ? 'Hide' : `Show (${groups.length})`}</span>
      </button>
      {open && (
        <div className={styles.body}>
          {groups.length === 0 ? (
            <div className={styles.empty}>{emptyMessage}</div>
          ) : (
            groups.map((g) => (
              <div key={g.id} className={styles.group}>
                <div className={styles.groupHead}>
                  {formatDateTime(g.changedAt)} — <span className={styles.email}>{g.changedByEmail}</span>
                </div>
                {g.rows.map((row) => (
                  <div key={row.id} className={styles.change}>
                    Changed <span className={styles.fieldName}>{humaniseFieldName(row.field_name)}</span>{' '}
                    <span className={styles.from}>from {dash(row.old_value)} to {dash(row.new_value)}</span>
                    {isProjectRow(row) && row.was_inferred && (
                      <span className={styles.inferredTag}>was inferred</span>
                    )}
                  </div>
                ))}
                {g.note && <div className={styles.note}>Note: “{g.note}”</div>}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function isProjectRow(r: Row): r is ProjectHistoryRow {
  return 'was_inferred' in r;
}
