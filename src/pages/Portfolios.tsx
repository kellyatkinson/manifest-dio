// ---------------------------------------------------------------
// Portfolios — one card per portfolio.
//
// A portfolio is a top-level programme: a programme with no parent.
// Programmes that sit inside one are not portfolios; they appear on
// the Programmes page, and their projects roll up into the portfolio
// card here. Each portfolio gets a stable accent colour, and every
// live row below it shows as a health dot.
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
    const childrenByParent = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.parent_id) {
        const list = childrenByParent.get(p.parent_id) ?? [];
        list.push(p);
        childrenByParent.set(p.parent_id, list);
      }
    }

    // Everything below a row, at any depth. Guarded against a bad
    // parent_id loop, which the database does not prevent.
    const descendants = (id: string): Project[] => {
      const out: Project[] = [];
      const seen = new Set<string>([id]);
      const walk = (parent: string) => {
        for (const child of childrenByParent.get(parent) ?? []) {
          if (seen.has(child.id)) continue;
          seen.add(child.id);
          out.push(child);
          walk(child.id);
        }
      };
      walk(id);
      return out;
    };

    const portfolios = projects.filter((p) => p.project_type === 'programme' && !p.parent_id);

    const out: Group[] = portfolios
      .map((pf) => ({
        key: pf.id,
        title: pf.name,
        accent: accentFor(pf.id),
        programme: pf,
        items: sortItems(descendants(pf.id)),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title, 'en-NZ'));

    // Nothing should sit outside a portfolio, but never hide a row.
    const filed = new Set<string>(portfolios.map((p) => p.id));
    for (const g of out) for (const item of g.items) filed.add(item.id);
    const unfiled = projects.filter((p) => !filed.has(p.id));
    if (unfiled.length) {
      out.push({
        key: '__unfiled',
        title: 'Not in a portfolio yet',
        accent: '#B0761A',
        programme: null,
        items: sortItems(unfiled),
      });
    }

    return out;
  }, [projects]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Portfolios</h1>
        <p className={styles.sub}>Every live row grouped by the portfolio it sits in. The colour tells the portfolios apart; each dot is one project’s health.</p>
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
                  <div className={styles.cardEmpty}>Nothing in this portfolio yet</div>
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
