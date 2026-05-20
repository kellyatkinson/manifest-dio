// ---------------------------------------------------------------
// Portfolio page — board + table view
// ---------------------------------------------------------------
// Board view (default): Programmes (large cards) → Projects (grid)
//   → Annual cycles (compact rows).
// Table view: the original sortable table.
// Mode prop controls whether we show active or archived rows.
// ---------------------------------------------------------------

import { useMemo, useState, type ReactNode } from 'react';

import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ProjectFilters, type FilterState } from '@/components/ProjectFilters';
import { ProjectTable } from '@/components/ProjectTable';
import { ProgrammeCard } from '@/components/ProgrammeCard';
import { ProjectCard } from '@/components/ProjectCard';
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

type ViewMode = 'board' | 'table';

export function Portfolio({ mode }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    state: mode === 'archived' ? 'archived' : 'active',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showCreate, setShowCreate] = useState(false);

  const queryState: ProjectStateId | 'all' =
    mode === 'archived' ? 'archived' : filters.state ?? 'active';

  const { data: projects = [], isLoading, error } = useProjects(queryState);

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
        const haystack = [p.name, p.next_decision ?? '', p.owner ?? '', p.deadline ?? '', p.canonical_location ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [projects, filters]);

  const summary = useMemo(() => {
    const total = projects.length;
    const programmes = projects.filter((p) => p.project_type === 'programme').length;
    const projectCount = projects.filter((p) => p.project_type === 'project').length;
    const annual = projects.filter((p) => p.project_type === 'annual_cycle').length;
    const byStatus: Record<string, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const p of projects) byStatus[p.status]++;
    return { total, programmes, projectCount, annual, byStatus };
  }, [projects]);

  // Split board sections
  const programmes = filtered.filter((p) => p.project_type === 'programme');
  const projectItems = filtered.filter((p) => p.project_type === 'project');
  const annualCycles = filtered.filter((p) => p.project_type === 'annual_cycle');

  return (
    <div>
      {/* Page header */}
      <header className={styles.head}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>
              {mode === 'archived' ? 'Recently closed' : 'Portfolio'}
            </h1>
            <p className={styles.sub}>
              {mode === 'archived'
                ? 'Projects that have been closed. Restore from the detail page if needed.'
                : 'BIM portfolio inventory — click any item to view details, tasks and history.'}
            </p>
          </div>

          {mode === 'active' && (
            <div className={styles.headActions}>
              {/* Board / Table toggle */}
              <div className={styles.viewToggle} role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${viewMode === 'board' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('board')}
                >
                  Board
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </button>
              </div>
              <button
                type="button"
                className={styles.createBtn}
                onClick={() => setShowCreate(true)}
              >
                + New item
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Summary tiles (active view only) */}
      {mode === 'active' && (
        <div className={styles.tiles}>
          <Tile label="Active" value={summary.total} accent="blue" />
          <Tile
            label="Mix"
            value={`${summary.projectCount}P · ${summary.programmes}Pg · ${summary.annual}A`}
            sub="projects · programmes · annual"
            accent="blue"
          />
          <Tile
            label="Status"
            value={
              <span className={styles.statusRow}>
                <StatusDot tone="red" /> {summary.byStatus.red}
                <StatusDot tone="amber" /> {summary.byStatus.amber}
                <StatusDot tone="green" /> {summary.byStatus.green}
                <StatusDot tone="placeholder" /> {summary.byStatus.placeholder}
              </span>
            }
            sub={`${statusLabel('red')} · ${statusLabel('amber')} · ${statusLabel('green')} · ${statusLabel('placeholder')}`}
            accent="blue"
          />
        </div>
      )}

      {/* Filters */}
      <ProjectFilters
        value={filters}
        onChange={setFilters}
        ownerOptions={ownerOptions}
        showStateFilter={mode === 'active'}
      />

      {/* Loading / error states */}
      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && (
        <div className={styles.error}>
          Could not load portfolio: {(error as Error).message}
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        viewMode === 'table' || mode === 'archived' ? (
          <ProjectTable projects={filtered} />
        ) : (
          <div className={styles.board}>
            {filtered.length === 0 && (
              <div className={styles.empty}>No items match the current filters.</div>
            )}

            {/* Programmes */}
            {programmes.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <span className={`${styles.sectionDot} ${styles.dotProgramme}`} />
                    Programmes
                  </h2>
                  <span className={styles.sectionCount}>{programmes.length}</span>
                </div>
                <div className={styles.programmeList}>
                  {programmes.map((p) => (
                    <ProgrammeCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {projectItems.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <span className={`${styles.sectionDot} ${styles.dotProject}`} />
                    Projects
                  </h2>
                  <span className={styles.sectionCount}>{projectItems.length}</span>
                </div>
                <div className={styles.projectGrid}>
                  {projectItems.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Annual cycles */}
            {annualCycles.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <span className={`${styles.sectionDot} ${styles.dotAnnual}`} />
                    Annual cycles
                  </h2>
                  <span className={styles.sectionCount}>{annualCycles.length}</span>
                </div>
                <div className={styles.projectGrid}>
                  {annualCycles.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className={styles.foot}>
          Showing {filtered.length} of {projects.length}
          {filtered.length !== projects.length ? ' (filtered)' : ''}.
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ---- Internal helpers ----

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={`${styles.tile} ${accent === 'blue' ? styles.tileBlue : ''}`}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
      {sub && <div className={styles.tileSub}>{sub}</div>}
    </div>
  );
}

function StatusDot({ tone }: { tone: 'red' | 'amber' | 'green' | 'placeholder' }) {
  return <span className={`${styles.dot} ${styles[`dot_${tone}`]}`} />;
}
