// ---------------------------------------------------------------
// PortfolioMap — a one-glance visualisation of the whole portfolio.
//
// Layout: each programme is a column, width proportional to
// (children.length + 1). Inside each programme: the programme
// header on top (sized by programme health), then a grid of
// child tiles below. Standalone projects (no parent programme)
// share a rightmost column.
//
// Every tile is colour-coded by health and clickable; the goal is
// to give Kelly a structural-and-health view at a glance, with
// drill-in by click.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { statusLabel } from '@/lib/format';
import type { HealthId, Project, ProjectTypeId } from '@/lib/types';

import styles from './PortfolioMap.module.css';

interface Props {
  projects: Project[];
}

interface ProgrammeNode {
  programme: Project;
  children: Project[];
  weight: number; // for column-width proportionality
}

function classifyByHealth(p: Project): HealthId {
  return p.health;
}

export function PortfolioMap({ projects }: Props) {
  const { programmes, standalone, operational } = useMemo(() => {
    const programmesList = projects.filter((p) => p.project_type === 'programme');
    const programmeNodes: ProgrammeNode[] = programmesList.map((prog) => {
      const kids = projects.filter((p) => p.parent_id === prog.id);
      return { programme: prog, children: kids, weight: kids.length + 1 };
    });

    // Sort programmes by descending weight (biggest first) for visual rhythm
    programmeNodes.sort((a, b) => b.weight - a.weight);

    const childIds = new Set(
      programmeNodes.flatMap((node) => node.children.map((c) => c.id)),
    );
    const standaloneList = projects.filter(
      (p) =>
        p.project_type === 'project' &&
        !childIds.has(p.id) &&
        !p.parent_id,
    );
    const operationalList = projects.filter((p) => p.project_type === 'operational');

    return {
      programmes: programmeNodes,
      standalone: standaloneList,
      operational: operationalList,
    };
  }, [projects]);

  if (projects.length === 0) {
    return <div className={styles.empty}>No portfolio data to visualise.</div>;
  }

  const allColumns: { kind: 'programme' | 'standalone' | 'operational'; weight: number; node?: ProgrammeNode; items?: Project[]; title?: string }[] = [
    ...programmes.map((p) => ({ kind: 'programme' as const, weight: p.weight, node: p })),
  ];
  if (standalone.length > 0) {
    allColumns.push({
      kind: 'standalone',
      weight: Math.max(1, standalone.length),
      items: standalone,
      title: 'Standalone projects',
    });
  }
  if (operational.length > 0) {
    allColumns.push({
      kind: 'operational',
      weight: Math.max(1, operational.length),
      items: operational,
      title: 'Operational',
    });
  }

  return (
    <section className={styles.map} aria-label="Portfolio map">
      <header className={styles.head}>
        <h2 className={styles.title}>Portfolio map</h2>
        <p className={styles.sub}>
          Programmes sized by project count; tiles coloured by health. Click anything to drill in.
        </p>
      </header>

      <div className={styles.canvas}>
        {allColumns.map((col, idx) => {
          if (col.kind === 'programme' && col.node) {
            return (
              <ProgrammeColumn key={col.node.programme.id} node={col.node} weight={col.weight} />
            );
          }
          return (
            <PoolColumn
              key={`${col.kind}-${idx}`}
              kind={col.kind as 'standalone' | 'operational'}
              title={col.title ?? ''}
              items={col.items ?? []}
              weight={col.weight}
            />
          );
        })}
      </div>

      {/* Legend */}
      <footer className={styles.legend}>
        <span className={styles.legendLabel}>Health</span>
        {(['red', 'amber', 'green', 'placeholder'] as HealthId[]).map((h) => (
          <span key={h} className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles[`swatch_${h}`]}`} />
            {statusLabel(h)}
          </span>
        ))}
        <span className={styles.legendSep} aria-hidden>·</span>
        <span className={styles.legendLabel}>Type</span>
        {(['programme', 'project', 'operational'] as ProjectTypeId[]).map((t) => (
          <span key={t} className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles[`type_${t}`]}`} />
            {t}
          </span>
        ))}
      </footer>
    </section>
  );
}

// ---- Internal column components ----------------------------------------

function ProgrammeColumn({ node, weight }: { node: ProgrammeNode; weight: number }) {
  const navigate = useNavigate();
  const health = classifyByHealth(node.programme);

  return (
    <div className={styles.column} style={{ flexGrow: weight }}>
      <button
        type="button"
        className={`${styles.programmeHeader} ${styles[`health_${health}`]}`}
        onClick={() => navigate(`/programmes/${node.programme.id}`)}
        title={`Open programme: ${node.programme.name}`}
      >
        <span className={styles.programmeKicker}>Programme</span>
        <span className={styles.programmeName}>{node.programme.name}</span>
        <span className={styles.programmeMeta}>
          {node.children.length} project{node.children.length !== 1 ? 's' : ''} · {statusLabel(health)}
        </span>
      </button>
      <div className={styles.childrenGrid}>
        {node.children.length === 0 ? (
          <div className={styles.emptyChild}>No projects yet</div>
        ) : (
          node.children.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`${styles.childTile} ${styles[`health_${c.health}`]}`}
              onClick={() => navigate(`/portfolio/${c.id}`)}
              title={`${c.name} — ${statusLabel(c.health)}`}
            >
              <span className={styles.childName}>{c.name}</span>
              {c.owner && <span className={styles.childOwner}>{c.owner.split(' (')[0]}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function PoolColumn({
  kind,
  title,
  items,
  weight,
}: {
  kind: 'standalone' | 'operational';
  title: string;
  items: Project[];
  weight: number;
}) {
  const navigate = useNavigate();
  return (
    <div className={styles.column} style={{ flexGrow: weight }}>
      <div className={`${styles.programmeHeader} ${styles[`pool_${kind}`]}`}>
        <span className={styles.programmeKicker}>
          {kind === 'standalone' ? 'No programme' : 'Operational'}
        </span>
        <span className={styles.programmeName}>{title}</span>
        <span className={styles.programmeMeta}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className={styles.childrenGrid}>
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`${styles.childTile} ${styles[`health_${item.health}`]}`}
            onClick={() => navigate(`/portfolio/${item.id}`)}
            title={`${item.name} — ${statusLabel(item.health)}`}
          >
            <span className={styles.childName}>{item.name}</span>
            {item.owner && <span className={styles.childOwner}>{item.owner.split(' (')[0]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
