import { useMemo, useState } from 'react';

import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ProjectTable } from '@/components/ProjectTable';
import { useProjects } from '@/hooks/useProjects';
import type { HealthId } from '@/lib/types';

import styles from './Projects.module.css';

export function Projects() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<HealthId | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const projectItems = projects.filter((p) => p.project_type === 'project');
  const programmes = projects.filter((p) => p.project_type === 'programme');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projectItems.filter((p) => {
      if (health && p.health !== health) return false;
      if (term) {
        const hay = [p.name, p.owner ?? '', p.deadline ?? '', p.next_decision ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [projectItems, search, health]);

  return (
    <div>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>Projects</h1>
            <p className={styles.sub}>All active projects — sort any column, or filter below.</p>
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
          value={health}
          onChange={(e) => setHealth(e.target.value as HealthId | '')}
        >
          <option value="">All health</option>
          <option value="green">Green</option>
          <option value="amber">Amber</option>
          <option value="red">Red</option>
          <option value="placeholder">Placeholder</option>
        </select>
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && <div className={styles.error}>Could not load: {(error as Error).message}</div>}

      {!isLoading && !error && <ProjectTable projects={filtered} />}

      {!isLoading && !error && projectItems.length > 0 && (
        <div className={styles.foot}>
          Showing {filtered.length} of {projectItems.length}
          {filtered.length !== projectItems.length ? ' (filtered)' : ''}.
        </div>
      )}

      {showCreate && (
        <CreateProjectModal programmes={programmes} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
