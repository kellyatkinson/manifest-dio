// ---------------------------------------------------------------
// PARA view
// ---------------------------------------------------------------
// Tiago Forte's PARA method mapped onto the portfolio:
//   Projects   — active work with an outcome and end state
//   Areas      — ongoing responsibilities (programmes + operational)
//   Resources  — parked / on-hold work to revisit or reference later
//   Archive    — completed or excluded, kept for reference
//
// Reuses useProjects('all') and the shared ProjectCard so it stays
// consistent with the rest of Manifest and picks up live edits.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';

import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import type { HealthId, Project, StreamId } from '@/lib/types';

import styles from './Para.module.css';

type ParaBucket = 'projects' | 'areas' | 'resources' | 'archive';

const COLUMNS: { key: ParaBucket; title: string; blurb: string }[] = [
  { key: 'projects', title: 'Projects', blurb: 'Active work with an outcome and an end state.' },
  { key: 'areas', title: 'Areas', blurb: 'Ongoing responsibilities — programmes & operations to maintain.' },
  { key: 'resources', title: 'Resources / Parked', blurb: 'On-hold work to revisit or reference later.' },
  { key: 'archive', title: 'Archive', blurb: 'Completed or excluded — kept for reference.' },
];

function bucketOf(p: Project): ParaBucket {
  if (p.status === 'archived' || p.status === 'excluded') return 'archive';
  if (p.project_type === 'programme' || p.project_type === 'operational') return 'areas';
  if (p.project_type === 'project' && p.status === 'on_hold') return 'resources';
  return 'projects';
}

export function Para() {
  const { data: projects = [], isLoading, error } = useProjects('all');
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<HealthId | ''>('');
  const [stream, setStream] = useState<StreamId | ''>('');
  const [showArchive, setShowArchive] = useState(false);

  const parentName = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return (p: Project) => (p.parent_id ? map.get(p.parent_id) : undefined);
  }, [projects]);

  const buckets = useMemo(() => {
    const term = search.trim().toLowerCase();
    const match = (p: Project) => {
      if (health && p.health !== health) return false;
      if (stream && p.stream !== stream) return false;
      if (term) {
        const hay = [p.name, p.owner ?? '', p.deadline ?? '', p.next_decision ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    };

    const out: Record<ParaBucket, Project[]> = {
      projects: [],
      areas: [],
      resources: [],
      archive: [],
    };
    projects
      .filter(match)
      .sort((a, b) => a.display_order - b.display_order)
      .forEach((p) => out[bucketOf(p)].push(p));
    return out;
  }, [projects, search, health, stream]);

  const visibleColumns = COLUMNS.filter((c) => c.key !== 'archive' || showArchive);

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>PARA</h1>
          <p className={styles.sub}>
            The portfolio as a second brain — Projects, Areas, Resources &amp; Archive.
          </p>
        </div>
      </header>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          value={stream}
          onChange={(e) => setStream(e.target.value)}
        >
          <option value="">All streams</option>
          <option value="change">Change</option>
          <option value="operations">Operations</option>
          <option value="governance">Governance</option>
        </select>
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
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showArchive}
            onChange={(e) => setShowArchive(e.target.checked)}
          />
          Show archive
        </label>
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && <div className={styles.error}>Could not load: {(error as Error).message}</div>}

      {!isLoading && !error && (
        <div className={`${styles.board} ${showArchive ? styles.boardFour : styles.boardThree}`}>
          {visibleColumns.map((col) => {
            const items = buckets[col.key];
            return (
              <section key={col.key} className={styles.column}>
                <div className={styles.columnHead}>
                  <h2 className={styles.columnTitle}>{col.title}</h2>
                  <span className={styles.count}>{items.length}</span>
                </div>
                <p className={styles.blurb}>{col.blurb}</p>
                {items.length === 0 ? (
                  <div className={styles.empty}>Nothing here.</div>
                ) : (
                  <div className={styles.cards}>
                    {items.map((p) => (
                      <ProjectCard key={p.id} project={p} parentName={parentName(p)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
