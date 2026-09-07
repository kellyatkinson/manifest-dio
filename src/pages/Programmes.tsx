import { useMemo } from 'react';

import { ProgrammeCard } from '@/components/ProgrammeCard';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';

import styles from './Programmes.module.css';

export function Programmes() {
  const { data: projects = [], isLoading, error } = useProjects('active');

  // A top-level programme is a portfolio and belongs on the Portfolios
  // page. This page is the programmes that sit inside one, grouped by
  // the portfolio they belong to - the hierarchy, not a flat list.
  const programmes = projects.filter((p) => p.project_type === 'programme' && p.parent_id);

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

  // One section per portfolio, holding the programmes nested inside it.
  const sections = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const portfolioOf = (p: Project): Project | null => {
      let cur: Project | undefined = p;
      const seen = new Set<string>();
      while (cur?.parent_id && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_id);
      }
      return cur && cur.id !== p.id ? cur : null;
    };

    const grouped = new Map<string, { portfolio: Project | null; items: Project[] }>();
    for (const prog of programmes) {
      const pf = portfolioOf(prog);
      const key = pf?.id ?? '__none';
      const entry = grouped.get(key) ?? { portfolio: pf, items: [] };
      entry.items.push(prog);
      grouped.set(key, entry);
    }

    return [...grouped.values()]
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => a.display_order - b.display_order),
      }))
      .sort(
        (a, b) =>
          (a.portfolio?.display_order ?? 1e9) - (b.portfolio?.display_order ?? 1e9),
      );
  }, [projects, programmes]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Programmes</h1>
        <p className={styles.sub}>Programmes group related projects inside a portfolio, shown here under the portfolio they belong to.</p>
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
            {sections.map((section) => (
              <section key={section.portfolio?.id ?? '__none'} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {section.portfolio ? section.portfolio.name : 'Outside any portfolio'}
                  <span className={styles.sectionCount}>
                    {section.items.length} programme{section.items.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <div className={styles.list}>
                  {section.items.map((p) => (
                    <ProgrammeCard
                      key={p.id}
                      project={p}
                      children={childrenByParent.get(p.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
            <div className={styles.foot}>
              {programmes.length} programme{programmes.length !== 1 ? 's' : ''} across{' '}
              {sections.length} portfolio{sections.length !== 1 ? 's' : ''}.
            </div>
          </>
        )
      )}
    </div>
  );
}
