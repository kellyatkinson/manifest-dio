// ---------------------------------------------------------------
// Portfolios — one-glance visual map of the whole portfolio.
//
// Grouped by programme (the dimension that's actually populated),
// each programme gets its own stable accent colour so the page
// reads as distinct, colour-coded blocks rather than a wall of
// repeated health colours. Health is demoted to a small dot on
// each project; the variety comes from structure, not RAG.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjects } from '@/hooks/useProjects';
import { useUrls } from '@/hooks/useUrls';
import { accentFor } from '@/lib/programmeAccent';
import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './Portfolios.module.css';

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

interface Group {
  key: string;
  title: string;
  accent: string;
  programme: Project | null;
  items: Project[];
}

function sortItems(items: Project[]): Project[] {
  const rank: Record<HealthId, number> = { red: 0, amber: 1, green: 2, placeholder: 3 };
  return [...items].sort(
    (a, b) => rank[a.health] - rank[b.health] || a.name.localeCompare(b.name, 'en-NZ'),
  );
}

export function Portfolios() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const { projectPath } = useUrls();
  const navigate = useNavigate();

  const groups = useMemo<Group[]>(() => {
    const programmes = projects.filter((p) => p.project_type === 'programme');
    const childrenByParent = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.parent_id) {
        const list = childrenByParent.get(p.parent_id) ?? [];
        list.push(p);
        childrenByParent.set(p.parent_id, list);
      }
    }

    const out: Group[] = [];

    const sortedProgrammes = [...programmes].sort(
      (a, b) =>
        (childrenByParent.get(b.id)?.length ?? 0) - (childrenByParent.get(a.id)?.length ?? 0),
    );
    for (const prog of sortedProgrammes) {
      out.push({
        key: prog.id,
        title: prog.name,
        accent: accentFor(prog.id),
        programme: prog,
        items: sortItems(childrenByParent.get(prog.id) ?? []),
      });
    }

    const standalone = projects.filter((p) => p.project_type === 'project' && !p.parent_id);
    if (standalone.length) {
      out.push({
        key: '__standalone',
        title: 'Standalone projects',
        accent: '#888780',
        programme: null,
        items: sortItems(standalone),
      });
    }

    const operational = projects.filter((p) => p.project_type === 'operational');
    if (operational.length) {
      out.push({
        key: '__operational',
        title: 'Operational',
        accent: '#5F5E5A',
        programme: null,
        items: sortItems(operational),
      });
    }

    return out;
  }, [projects]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Portfolios</h1>
        <p className={styles.sub}>The whole portfolio at a glance — by programme, coloured to tell them apart.</p>
      </header>

      <div className={styles.legend} aria-hidden>
        {HEALTH_ORDER.map((h) => (
          <span key={h} className={styles.legendItem}>
            <span className={`${styles.dot} ${styles[`dot_${h}`]}`} />
            {statusLabel(h)}
          </span>
        ))}
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && <div className={styles.error}>Could not load: {(error as Error).message}</div>}

      {!isLoading && !error && (
        groups.length === 0 ? (
          <div className={styles.empty}>Nothing to show yet.</div>
        ) : (
          <div className={styles.grid}>
            {groups.map((g) => (
              <section key={g.key} className={styles.card} style={{ borderLeftColor: g.accent }}>
                <div className={styles.cardHead}>
                  <span className={styles.swatch} style={{ background: g.accent }} />
                  {g.programme ? (
                    <button
                      type="button"
                      className={styles.cardTitleBtn}
                      onClick={() => navigate(projectPath(g.programme!.id))}
                      title={`Open ${g.title}`}
                    >
                      {g.title}
                    </button>
                  ) : (
                    <span className={styles.cardTitle}>{g.title}</span>
                  )}
                  <span className={styles.count}>{g.items.length}</span>
                </div>

                {g.items.length === 0 ? (
                  <div className={styles.cardEmpty}>No projects yet</div>
                ) : (
                  <div className={styles.dots}>
                    {g.items.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`${styles.dot} ${styles.dotBtn} ${styles[`dot_${p.health}`]}`}
                        title={`${p.name} — ${statusLabel(p.health)}`}
                        aria-label={`${p.name}, ${statusLabel(p.health)}`}
                        onClick={() => navigate(projectPath(p.id))}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )
      )}
    </div>
  );
}
