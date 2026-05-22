import { useMemo } from 'react';

import { ProgrammeCard } from '@/components/ProgrammeCard';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';

import styles from './Programmes.module.css';

export function Programmes() {
  const { data: projects = [], isLoading, error } = useProjects('active');

  const programmes = projects.filter((p) => p.project_type === 'programme');

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.parent_id) {
        const list = map.get(p.parent_id) ?? [];
        list.push(p);
        map.set(p.parent_id, list);
      }
    }
    return map;
  }, [projects]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Programmes</h1>
        <p className={styles.sub}>Where related projects live together.</p>
      </header>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && (
        <div className={styles.error}>Could not load: {(error as Error).message}</div>
      )}

      {!isLoading && !error && (
        programmes.length === 0 ? (
          <div className={styles.empty}>No programmes yet. Click + New programme to group related projects.</div>
        ) : (
          <>
            <div className={styles.list}>
              {programmes.map((p) => (
                <ProgrammeCard
                  key={p.id}
                  project={p}
                  children={childrenByParent.get(p.id)}
                />
              ))}
            </div>
            <div className={styles.foot}>
              {programmes.length} programme{programmes.length !== 1 ? 's' : ''}.
            </div>
          </>
        )
      )}
    </div>
  );
}
