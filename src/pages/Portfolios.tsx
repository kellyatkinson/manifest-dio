// ---------------------------------------------------------------
// Portfolios — the six standing work areas, one large tile each.
//
// A portfolio is a top-level programme: a programme with no parent.
// Programmes that sit inside one are not portfolios; they appear on
// the Programmes page, and their projects roll up into the portfolio
// tile here.
//
// This page is the way in to the portfolio, so the whole tile is the
// link and each tile carries enough to decide where to go: how many
// live rows sit below it, how their health splits, and what the named
// programmes inside it are. Order and colour are fixed per portfolio
// (see lib/portfolioOrder) so the page reads the same every visit.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useProjects } from '@/hooks/useProjects';
import { useUrls } from '@/hooks/useUrls';
import { portfolioAccent, portfolioRank } from '@/lib/portfolioOrder';
import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './Portfolios.module.css';

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

type Tally = Record<HealthId, number>;

interface Group {
  key: string;
  title: string;
  accent: string;
  /** Fixed position, or -1 for a portfolio outside the standing six. */
  rank: number;
  programme: Project | null;
  items: Project[];
  tally: Tally;
  /** Named programmes directly inside the portfolio. */
  inside: string[];
}

function tallyOf(items: Project[]): Tally {
  const t: Tally = { red: 0, amber: 0, green: 0, placeholder: 0 };
  for (const p of items) t[p.health] += 1;
  return t;
}

/** "8 live rows, 4 at risk, 1 off track" — the tile in words. */
function summarise(count: number, tally: Tally): string {
  const parts = HEALTH_ORDER.filter((h) => tally[h] > 0).map(
    (h) => `${tally[h]} ${statusLabel(h).toLowerCase()}`,
  );
  const rows = `${count} live ${count === 1 ? 'row' : 'rows'}`;
  return parts.length ? `${rows}: ${parts.join(', ')}` : rows;
}

export function Portfolios() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const { projectPath } = useUrls();

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

    // What sits directly inside a portfolio, named on the tile.
    // Programmes lead, since they carry projects of their own; the
    // portfolio's own projects follow, alphabetically within each.
    const namesInside = (id: string): string[] => {
      const direct = [...(childrenByParent.get(id) ?? [])];
      return direct
        .sort((a, b) => {
          const aProg = a.project_type === 'programme' ? 0 : 1;
          const bProg = b.project_type === 'programme' ? 0 : 1;
          return aProg - bProg || a.name.localeCompare(b.name, 'en-NZ');
        })
        .map((p) => p.name);
    };

    const portfolios = projects.filter((p) => p.project_type === 'programme' && !p.parent_id);

    const out: Group[] = portfolios
      .map((pf) => {
        const items = descendants(pf.id);
        return {
          key: pf.id,
          title: pf.name,
          accent: portfolioAccent(pf.name, pf.id),
          rank: portfolioRank(pf.name),
          programme: pf,
          items,
          tally: tallyOf(items),
          inside: namesInside(pf.id),
        };
      })
      // Fixed order first, then anything unrecognised by size.
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          if (a.rank === -1) return 1;
          if (b.rank === -1) return -1;
          return a.rank - b.rank;
        }
        return b.items.length - a.items.length || a.title.localeCompare(b.title, 'en-NZ');
      });

    // Nothing should sit outside a portfolio, but never hide a row.
    const filed = new Set<string>(portfolios.map((p) => p.id));
    for (const g of out) for (const item of g.items) filed.add(item.id);
    const unfiled = projects.filter((p) => !filed.has(p.id));
    if (unfiled.length) {
      out.push({
        key: '__unfiled',
        title: 'Not in a portfolio yet',
        accent: '#7e96b0',
        rank: 99,
        programme: null,
        items: unfiled,
        tally: tallyOf(unfiled),
        inside: [],
      });
    }

    return out;
  }, [projects]);

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Portfolios</h1>
        <p className={styles.sub}>
          The six standing work areas. Each tile opens its portfolio, where the programmes,
          projects and tasks below it sit.
        </p>
      </header>

      <div className={styles.legend}>
        {HEALTH_ORDER.map((h) => (
          <span key={h} className={styles.legendItem}>
            <span className={`${styles.dot} ${styles[`dot_${h}`]}`} aria-hidden />
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
              <TileBody key={g.key} group={g} path={g.programme ? projectPath(g.programme.id) : null} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function TileBody({ group: g, path }: { group: Group; path: string | null }) {
  const total = g.items.length;
  const summary = summarise(total, g.tally);

  const inner = (
    <>
      <span className={styles.accentBar} aria-hidden />

      <span className={styles.tileHead}>
        <span className={styles.name}>{g.title}</span>
      </span>

      <span className={styles.metricRow}>
        <span className={styles.metric}>{total}</span>
        <span className={styles.metricLabel}>live {total === 1 ? 'row' : 'rows'}</span>
      </span>

      {total === 0 ? (
        <span className={styles.tileEmpty}>Nothing in this portfolio yet</span>
      ) : (
        <>
          <span className={styles.bar} role="img" aria-label={summary}>
            {HEALTH_ORDER.filter((h) => g.tally[h] > 0).map((h) => (
              <span
                key={h}
                className={`${styles.seg} ${styles[`seg_${h}`]}`}
                style={{ flexGrow: g.tally[h] }}
              />
            ))}
          </span>

          <span className={styles.tally} aria-hidden>
            {HEALTH_ORDER.filter((h) => g.tally[h] > 0).map((h) => (
              <span key={h} className={styles.tallyItem}>
                <span className={`${styles.dot} ${styles[`dot_${h}`]}`} />
                {g.tally[h]} {statusLabel(h).toLowerCase()}
              </span>
            ))}
          </span>
        </>
      )}

      {g.inside.length > 0 && (
        <span className={styles.inside}>
          {g.inside.slice(0, 4).join(' · ')}
          {g.inside.length > 4 && (
            <span className={styles.insideMore}> +{g.inside.length - 4} more</span>
          )}
        </span>
      )}

      {path && (
        <span className={styles.open}>
          Open portfolio <span aria-hidden>→</span>
        </span>
      )}
    </>
  );

  if (!path) {
    return (
      <section className={`${styles.tile} ${styles.tileStatic}`} style={{ '--accent': g.accent } as React.CSSProperties}>
        {inner}
      </section>
    );
  }

  return (
    <Link
      to={path}
      className={styles.tile}
      style={{ '--accent': g.accent } as React.CSSProperties}
      aria-label={`Open ${g.title} — ${summary}`}
    >
      {inner}
    </Link>
  );
}
