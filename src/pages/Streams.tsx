// ---------------------------------------------------------------
// Streams — the portfolio sliced by a dimension that cuts across the
// tree instead of following it.
//
// A system is the main one: Schoolbox work lives in several
// portfolios at once, so system is a label on the row, not a level
// above it. A row carrying two systems appears under both.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjects } from '@/hooks/useProjects';
import { useUrls } from '@/hooks/useUrls';
import { statusLabel } from '@/lib/format';
import type { HealthId, Project } from '@/lib/types';

import styles from './Streams.module.css';

type Dimension = 'system' | 'stream' | 'health';

const DIMENSIONS: { id: Dimension; label: string; blurb: string }[] = [
  {
    id: 'system',
    label: 'System',
    blurb: 'Systems cut across the portfolios. A row that touches two appears under both.',
  },
  {
    id: 'stream',
    label: 'Stream',
    blurb: 'Change, governance or operations — the kind of work rather than the system.',
  },
  {
    id: 'health',
    label: 'Health',
    blurb: 'RAG colour across every portfolio at once.',
  },
];

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];
const HEALTH_RANK: Record<HealthId, number> = { red: 0, amber: 1, green: 2, placeholder: 3 };

interface Bucket {
  key: string;
  title: string;
  untagged: boolean;
  items: Project[];
}

export function Streams() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const { projectPath } = useUrls();
  const navigate = useNavigate();
  const [dimension, setDimension] = useState<Dimension>('system');

  const active = DIMENSIONS.find((d) => d.id === dimension) ?? DIMENSIONS[0];

  // Which portfolio each row sits under, for the chip on every line.
  const portfolioOf = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const out = new Map<string, string>();
    for (const p of projects) {
      let cur: Project | undefined = p;
      const seen = new Set<string>();
      while (cur?.parent_id && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_id);
      }
      if (cur && cur.id !== p.id) out.set(p.id, cur.name);
    }
    return out;
  }, [projects]);

  const buckets = useMemo<Bucket[]>(() => {
    const sortItems = (items: Project[]) =>
      [...items].sort(
        (a, b) =>
          HEALTH_RANK[a.health] - HEALTH_RANK[b.health] ||
          a.name.localeCompare(b.name, 'en-NZ'),
      );

    if (dimension === 'health') {
      return HEALTH_ORDER.map((h) => ({
        key: h,
        title: statusLabel(h),
        untagged: h === 'placeholder',
        items: sortItems(projects.filter((p) => p.health === h)),
      })).filter((b) => b.items.length > 0);
    }

    if (dimension === 'stream') {
      const named = new Map<string, Project[]>();
      const none: Project[] = [];
      for (const p of projects) {
        if (!p.stream) {
          none.push(p);
          continue;
        }
        const list = named.get(p.stream) ?? [];
        list.push(p);
        named.set(p.stream, list);
      }
      const out: Bucket[] = [...named.entries()]
        .map(([key, items]) => ({
          key,
          title: key.charAt(0).toUpperCase() + key.slice(1),
          untagged: false,
          items: sortItems(items),
        }))
        .sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title, 'en-NZ'));
      if (none.length) {
        out.push({ key: '__none', title: 'No stream set', untagged: true, items: sortItems(none) });
      }
      return out;
    }

    const bySystem = new Map<string, Project[]>();
    const untagged: Project[] = [];
    for (const p of projects) {
      const systems = p.systems ?? [];
      if (systems.length === 0) {
        untagged.push(p);
        continue;
      }
      for (const sys of systems) {
        const list = bySystem.get(sys) ?? [];
        list.push(p);
        bySystem.set(sys, list);
      }
    }
    const out: Bucket[] = [...bySystem.entries()]
      .map(([key, items]) => ({ key, title: key, untagged: false, items: sortItems(items) }))
      .sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title, 'en-NZ'));
    if (untagged.length) {
      out.push({
        key: '__untagged',
        title: 'No system tagged',
        untagged: true,
        items: sortItems(untagged),
      });
    }
    return out;
  }, [projects, dimension]);

  const tagged = dimension === 'system'
    ? projects.filter((p) => (p.systems ?? []).length > 0).length
    : null;

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Streams</h1>
        <p className={styles.sub}>{active.blurb}</p>
      </header>

      <div className={styles.switcher} role="tablist" aria-label="Dimension">
        {DIMENSIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === dimension}
            className={`${styles.tab} ${d.id === dimension ? styles.tabOn : ''}`}
            onClick={() => setDimension(d.id)}
          >
            {d.label}
          </button>
        ))}
        {tagged !== null && (
          <span className={styles.tally}>
            {tagged} of {projects.length} rows tagged
          </span>
        )}
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && <div className={styles.error}>Could not load: {(error as Error).message}</div>}

      {!isLoading && !error && (
        buckets.length === 0 ? (
          <div className={styles.empty}>Nothing to group yet.</div>
        ) : (
          <div className={styles.grid}>
            {buckets.map((b) => (
              <section
                key={b.key}
                className={`${styles.card} ${b.untagged ? styles.cardUntagged : ''}`}
              >
                <div className={styles.cardHead}>
                  <span className={styles.cardTitle}>{b.title}</span>
                  <span className={styles.count}>{b.items.length}</span>
                </div>
                <ul className={styles.rows}>
                  {b.items.map((p) => (
                    <li key={p.id} className={styles.row}>
                      <span
                        className={`${styles.dot} ${styles[`dot_${p.health}`]}`}
                        title={statusLabel(p.health)}
                        aria-hidden
                      />
                      <button
                        type="button"
                        className={styles.rowName}
                        onClick={() => navigate(projectPath(p.id))}
                      >
                        {p.name}
                      </button>
                      {portfolioOf.get(p.id) && (
                        <span className={styles.chip}>{portfolioOf.get(p.id)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      )}
    </div>
  );
}
