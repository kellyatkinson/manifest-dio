import { useMemo } from 'react';

import { ProgrammeCard } from '@/components/ProgrammeCard';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';

import styles from './Programmes.module.css';

export function Programmes() {
  const { data: projects = [], isLoading, error } = useProjects('active');

  // A top-level programme is a portfolio and belongs on the Portfolios
  // page. This page is the programmes that sit inside one.
  const programmes = projects.filter((p) => p.project_type === 'programme' && p.parent_id);
  const nameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

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
        <p className={styles.sub}>Programmes group related projects inside a portfolio.</p>
      </header>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && (
        <div className={styles.error}>Could not load: {(error as Error).message}</div>
      )}

      {!isLoading && !error && (
        programmes.length === 0 ? (
          <div className={styles.empty}>No programmes inside a portfolio yet. The portfolios themselves are on the Portfolios page.</div>
        ) : (
          <>
            <div className={styles.list}>
              {programmes.map((p) => (
                <div key={p.id} className={styles.item}>
                  <div className={styles.parent}>
                    in {p.parent_id ? nameById.get(p.parent_id) ?? 'an archived portfolio' : ''}
                  </div>
                  <ProgrammeCard project={p} children={childrenByParent.get(p.id)} />
                </div>
              ))}
            </div>
            <div className={styles.foot}>
              {programmes.length} programme{programmes.length !== 1 ? 's' : ''} inside portfolios.
            </div>
          </>
        )
      )}
    </div>
  );
}
