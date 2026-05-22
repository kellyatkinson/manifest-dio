// ---------------------------------------------------------------
// Portfolio page — board + table view
// ---------------------------------------------------------------
// Board view (default): Programmes (large cards) → Projects (grid)
//   → Operational (compact rows).
// Table view: the original sortable table.
// Mode prop controls whether we show active or archived rows.
//
// Filter state is mirrored to URL search params so a reload (or a
// shared link) preserves the view.
// ---------------------------------------------------------------

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CreateProjectModal } from '@/components/CreateProjectModal';
import { PortfolioMap } from '@/components/PortfolioMap';
import { ProjectFilters, type FilterState } from '@/components/ProjectFilters';
import { ProjectTable } from '@/components/ProjectTable';
import { ProgrammeCard } from '@/components/ProgrammeCard';
import { ProjectCard } from '@/components/ProjectCard';
import { PulsePanel } from '@/components/PulsePanel';
import { WeekRail } from '@/components/WeekRail';
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import type {
  HealthId,
  Project,
  ProjectStatusId,
  ProjectTypeId,
} from '@/lib/types';

import styles from './Portfolio.module.css';

interface Props {
  mode: 'active' | 'archived';
}

type ViewMode = 'board' | 'table' | 'map';

const VALID_HEALTH: ReadonlySet<HealthId> = new Set(['green', 'amber', 'red', 'placeholder']);
const VALID_TYPE: ReadonlySet<ProjectTypeId> = new Set(['project', 'programme', 'operational']);
const VALID_STATUS: ReadonlySet<ProjectStatusId> = new Set(['active', 'archived', 'excluded']);

export function Portfolio({ mode }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [showCreate, setShowCreate] = useState(false);

  // Derive FilterState from URL — keeps filters shareable and reload-safe.
  const filters = useMemo<FilterState>(() => {
    const healthParam = searchParams.get('health') ?? '';
    const typeParam = searchParams.get('type') ?? '';
    const statusParam = searchParams.get('status') ?? '';
    const defaultStatus: ProjectStatusId | 'all' = mode === 'archived' ? 'archived' : 'active';
    const stateValue: ProjectStatusId | 'all' =
      mode === 'archived'
        ? 'archived'
        : statusParam === 'all'
          ? 'all'
          : VALID_STATUS.has(statusParam as ProjectStatusId)
            ? (statusParam as ProjectStatusId)
            : defaultStatus;

    return {
      search: searchParams.get('q') ?? '',
      status: VALID_HEALTH.has(healthParam as HealthId) ? (healthParam as HealthId) : '',
      type: VALID_TYPE.has(typeParam as ProjectTypeId) ? (typeParam as ProjectTypeId) : '',
      owner: searchParams.get('owner') ?? '',
      state: stateValue,
    };
  }, [searchParams, mode]);

  const setFilters = useCallback(
    (next: FilterState) => {
      const params = new URLSearchParams(searchParams);
      if (next.search) params.set('q', next.search);
      else params.delete('q');
      if (next.status) params.set('health', next.status);
      else params.delete('health');
      if (next.type) params.set('type', next.type);
      else params.delete('type');
      if (next.owner) params.set('owner', next.owner);
      else params.delete('owner');
      const defaultStatus = mode === 'archived' ? 'archived' : 'active';
      if (next.state && next.state !== defaultStatus) params.set('status', next.state);
      else params.delete('status');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, mode],
  );

  const queryState: ProjectStatusId | 'all' =
    mode === 'archived' ? 'archived' : filters.state ?? 'active';

  const { data: projects = [], isLoading, error } = useProjects(queryState);
  const { data: tasks = [] } = useAllTasks(false);

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
      if (filters.status && p.health !== filters.status) return false;
      if (filters.type && p.project_type !== filters.type) return false;
      if (filters.owner && (p.owner ?? '') !== filters.owner) return false;
      if (term) {
        const haystack = [
          p.name,
          p.next_decision ?? '',
          p.owner ?? '',
          p.deadline ?? '',
          p.primary_location ?? '',
          p.description ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [projects, filters]);

  // Build parent → children map for board view
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of filtered) {
      if (p.parent_id) {
        const list = map.get(p.parent_id) ?? [];
        list.push(p);
        map.set(p.parent_id, list);
      }
    }
    return map;
  }, [filtered]);

  // Split board sections — child projects are shown inside their programme, not in the grid
  const childIds = new Set(filtered.filter((p) => p.parent_id).map((p) => p.id));
  const programmes = filtered.filter((p) => p.project_type === 'programme');
  const projectItems = filtered.filter((p) => p.project_type === 'project' && !childIds.has(p.id));
  const operationalItems = filtered.filter((p) => p.project_type === 'operational');

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
                ? 'Projects we finished. Restore one if you need to.'
                : "Everything in flight, and what's next."}
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
                  className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('map')}
                >
                  Map
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
                + New project
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Pulse summary panel (replaces 3 flat tiles) */}
      {mode === 'active' && <PulsePanel projects={projects} />}

      {/* This week — due within 7 days */}
      {mode === 'active' && viewMode === 'board' && (
        <WeekRail projects={projects} tasks={tasks} />
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
        ) : viewMode === 'map' ? (
          <PortfolioMap projects={filtered} />
        ) : (
          <div className={styles.board}>
            {filtered.length === 0 && (
              <div className={styles.empty}>Nothing matches. Try clearing the search?</div>
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
                    <ProgrammeCard
                      key={p.id}
                      project={p}
                      children={childrenByParent.get(p.id)}
                    />
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

            {/* Operational */}
            {operationalItems.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <span className={`${styles.sectionDot} ${styles.dotAnnual}`} />
                    Operational
                  </h2>
                  <span className={styles.sectionCount}>{operationalItems.length}</span>
                </div>
                <div className={styles.projectGrid}>
                  {operationalItems.map((p) => (
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
        <CreateProjectModal
          programmes={projects.filter((p) => p.project_type === 'programme')}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
