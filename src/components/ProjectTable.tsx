// ---------------------------------------------------------------
// Sortable + clickable project table.
// Sorting headers: name, type, owner, status (severity), next decision, deadline, display order.
// Click row -> /portfolio/:id (handled by parent via onRowClick).
// Inferred status / owner cells expose an inline popover.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { dash, projectTypeLabel, sortableDateKey, statusSeverity } from '@/lib/format';
import type { Project } from '@/lib/types';

import { InferencePopover } from './InferencePopover';
import { OwnerCell } from './OwnerCell';
import { StatusPill } from './StatusPill';
import styles from './ProjectTable.module.css';

type SortKey =
  | 'display_order'
  | 'name'
  | 'project_type'
  | 'owner'
  | 'status'
  | 'next_decision'
  | 'deadline'
  | 'updated_at';

interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

interface Props {
  projects: Project[];
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'display_order', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'project_type', label: 'Type' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Health' },
  { key: 'next_decision', label: 'Next decision' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'updated_at', label: 'Updated' },
];

export function ProjectTable({ projects }: Props) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortState>({ key: 'display_order', dir: 'asc' });
  const [popover, setPopover] = useState<{
    project: Project;
    field: 'health' | 'owner';
    anchor: { x: number; y: number };
  } | null>(null);

  const sorted = useMemo(() => {
    const copy = [...projects];
    copy.sort((a, b) => cmp(a, b, sort.key));
    if (sort.dir === 'desc') copy.reverse();
    return copy;
  }, [projects, sort]);

  function handleHeader(key: SortKey) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  if (projects.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.empty}>No projects match the current filters.</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => handleHeader(col.key)}>
                  {col.label}
                  {sort.key === col.key && (
                    <span className={styles.sortIndicator}>{sort.dir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className={styles.row} onClick={() => navigate(`/portfolio/${p.id}`)}>
                <td className={styles.numCell}>{p.display_order}</td>
                <td className={styles.name}>{p.name}</td>
                <td>
                  <span
                    className={`${styles.typeChip} ${
                      p.project_type === 'programme'
                        ? styles.typeProgramme
                        : p.project_type === 'operational'
                          ? styles.typeAnnual
                          : ''
                    }`}
                  >
                    {projectTypeLabel(p.project_type)}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <OwnerCell
                    owner={p.owner}
                    inferred={p.owner_inferred}
                    onClick={
                      p.owner_inferred
                        ? (event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPopover({
                              project: p,
                              field: 'owner',
                              anchor: { x: rect.left, y: rect.bottom },
                            });
                          }
                        : undefined
                    }
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <StatusPill
                    status={p.health}
                    inferred={p.health_inferred}
                    onClick={
                      p.health_inferred
                        ? (event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPopover({
                              project: p,
                              field: 'health',
                              anchor: { x: rect.left, y: rect.bottom },
                            });
                          }
                        : undefined
                    }
                  />
                </td>
                <td>{dash(p.next_decision)}</td>
                <td>{dash(p.deadline)}</td>
                <td className={styles.numCell}>{sortableDateKey(p.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popover && (
        <InferencePopover
          project={popover.project}
          field={popover.field}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

// ---------------- comparators ----------------

function cmp(a: Project, b: Project, key: SortKey): number {
  switch (key) {
    case 'display_order':
      return a.display_order - b.display_order;
    case 'name':
      return a.name.localeCompare(b.name, 'en-NZ');
    case 'project_type':
      return a.project_type.localeCompare(b.project_type);
    case 'owner':
      return (a.owner ?? '').localeCompare(b.owner ?? '', 'en-NZ');
    case 'status':
      // Severity-based: Red > Amber > Green > Placeholder.
      return statusSeverity(a.health) - statusSeverity(b.health);
    case 'next_decision':
      return (a.next_decision ?? '').localeCompare(b.next_decision ?? '', 'en-NZ');
    case 'deadline':
      // Free-text deadline -- sort as string. Empty values float to the end.
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline, 'en-NZ');
    case 'updated_at':
      return sortableDateKey(a.updated_at).localeCompare(sortableDateKey(b.updated_at));
  }
}
