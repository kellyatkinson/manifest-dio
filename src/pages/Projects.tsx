import { useMemo, useState } from 'react';

import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import type { ProjectStatusId } from '@/lib/types';

import styles from './Projects.module.css';

export function Projects() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatusId | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const projectItems = projects.filter((p) => p.project_type === 'project');
  const programmes = projects.filter((p) => p.project_type === 'programme');

  // id → name map for resolving parent programme labels on cards
  const programmeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of programmes) map.set(p.id, p.name);
    return map;
  }, [programmes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projectItems.filter((p) => {
      if (status && p.status !== status) return false;
      if (term) {
        const hay = [p.name, p.owner ?? '', p.deadline ?? ''].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [projectItems, search, status]);

  return (
    <div>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>Projects</h1>
            <p className={styles.sub}>All active projects across the portfolio.</p>
          </div>
          <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
            + New project
          </button>
        </div>
      </header>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatusId | '')}
        >
          <option value="">All statuses</option>
          <option value="green">Green</option>
          <option value="amber">Amber</option>
          <option value="red">Red</option>
          <option value="placeholder">Placeholder</option>
        </select>
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && (
        <div className={styles.error}>Could not load: {(error as Error).message}</div>
      )}

      {!isLoading && !error && (
        filtered.length === 0 ? (
          <div className={styles.empty}>No projects match the current filters.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                parentName={p.parent_id
                  ? (programmeNameById.get(p.parent_id) ?? 'Programme')
                  : ''}
              />
            ))}
          </div>
        )
      )}

      {!isLoading && !error && projectItems.length > 0 && (
        <div className={styles.foot}>
          Showing {filtered.length} of {projectItems.length}
          {filtered.length !== projectItems.length ? ' (filtered)' : ''}.
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          programmes={programmes}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
