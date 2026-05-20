// ---------------------------------------------------------------
// Portfolio page
// ---------------------------------------------------------------
// Mirrors the existing `portfolio.html` dashboard:
//  - summary tiles up top (count, programme/project mix, status mix, recently closed)
//  - filter bar (search, status, type, owner, optional state)
//  - sortable table of projects
//
// Driven by the `mode` prop:
//  - mode='active'   -> shows active rows (default, /portfolio)
//  - mode='archived' -> shows archived rows (/closed)
//
// State filter UI (Active / Archived / Hidden / All) only appears on
// the active route -- the closed route is hardwired to archived.
// ---------------------------------------------------------------

import { useMemo, useState, type ReactNode } from 'react';

import { ProjectFilters, type FilterState } from '@/components/ProjectFilters';
import { ProjectTable } from '@/components/ProjectTable';
import { useProjects } from '@/hooks/useProjects';
import type { ProjectStateId } from '@/lib/types';
import { statusLabel } from '@/lib/format';

import styles from './Portfolio.module.css';

interface Props {
  mode: 'active' | 'archived';
}

const INITIAL_FILTERS: FilterState = {
  search: '',
  status: '',
  type: '',
  owner: '',
  state: 'active',
};

export function Portfolio({ mode }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    state: mode === 'archived' ? 'archived' : 'active',
  });

  // The state filter controls which Supabase query runs.
  // 'all' fetches active, archived and hidden in one go.
  const queryState: ProjectStateId | 'all' =
    mode === 'archived' ? 'archived' : filters.state ?? 'active';

  const { data: projects = [], isLoading, error } = useProjects(queryState);

  // Build the owner dropdown options from data we actually have.
  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.owner) set.add(p.owner);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en-NZ'));
  }, [projects]);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return projects.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.type && p.project_type !== filters.type) return false;
      if (filters.owner && (p.owner ?? '') !== filters.owner) return false;
      if (term) {
        const haystack = [
          p.name,
          p.next_decision ?? '',
          p.owner ?? '',
          p.deadline ?? '',
          p.canonical_location ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [projects, filters]);

  // ---- Summary tiles (mirrors portfolio.html behaviour) ----
  const summary = useMemo(() => {
    const total = projects.length;
    const programmes = projects.filter((p) => p.project_type === 'programme').length;
    const projectCount = projects.filter((p) => p.project_type === 'project').length;
    const annual = projects.filter((p) => p.project_type === 'annual_cycle').length;
    const byStatus: Record<string, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const p of projects) byStatus[p.status]++;
    return { total, programmes, projectCount, annual, byStatus };
  }, [projects]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>
          {mode === 'archived' ? 'Recently closed' : 'Portfolio'}
        </h1>
        <p className={styles.sub}>
          {mode === 'archived'
            ? 'Projects that have been closed. Restore from the detail page if needed.'
            : 'BIM portfolio inventory. Click a row to see its details, tasks and history.'}
        </p>
      </header>

      {/* Summary tiles */}
      {mode === 'active' && (
        <div className={styles.tiles}>
          <Tile label="Active" value={summary.total} />
          <Tile
            label="Mix"
            value={`${summary.projectCount}P · ${summary.programmes}Pg · ${summary.annual}A`}
            sub="projects / programmes / annual"
          />
          <Tile
            label="Status"
            value={
              <span>
                <StatusDot tone="red" /> {summary.byStatus.red}
                {'  '}
                <StatusDot tone="amber" /> {summary.byStatus.amber}
                {'  '}
                <StatusDot tone="green" /> {summary.byStatus.green}
                {'  '}
                <StatusDot tone="placeholder" /> {summary.byStatus.placeholder}
              </span>
            }
            sub={`${statusLabel('red')} / ${statusLabel('amber')} / ${statusLabel('green')} / ${statusLabel('placeholder')}`}
          />
        </div>
      )}

      <ProjectFilters
        value={filters}
        onChange={setFilters}
        ownerOptions={ownerOptions}
        showStateFilter={mode === 'active'}
      />

      {isLoading && <div className={styles.note}>Loading projects…</div>}
      {error && (
        <div className={styles.error}>
          Could not load projects: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && <ProjectTable projects={filtered} />}

      {!isLoading && !error && filtered.length > 0 && (
        <div className={styles.foot}>
          Showing {filtered.length} of {projects.length}
          {filtered.length !== projects.length ? ' (filtered)' : ''}.
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
      {sub && <div className={styles.tileSub}>{sub}</div>}
    </div>
  );
}

function StatusDot({ tone }: { tone: 'red' | 'amber' | 'green' | 'placeholder' }) {
  return <span className={`${styles.dot} ${styles[`dot_${tone}`]}`} />;
}
