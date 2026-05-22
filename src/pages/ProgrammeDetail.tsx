// ---------------------------------------------------------------
// Programme detail page
// ---------------------------------------------------------------
// A dedicated surface for a programme — the row's own metadata,
// plus a clear list of the child projects underneath it, with
// aggregate health and quick navigation.
//
// For full edit of the programme record, link out to /portfolio/:id
// (which uses the same Project edit form). This keeps the
// programme view read-focused.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { HistoryFeed } from '@/components/HistoryFeed';
import { ProjectCard } from '@/components/ProjectCard';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { useProject, useProjects } from '@/hooks/useProjects';
import { useProjectHistory } from '@/hooks/useHistory';
import { formatDateTime, statusLabel } from '@/lib/format';
import type { HealthId } from '@/lib/types';

import styles from './ProgrammeDetail.module.css';

const STATE_LABEL: Record<string, string> = {
  active: 'Active',
  archived: 'Closed',
  excluded: 'Excluded',
};

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

export function ProgrammeDetail() {
  const { programmeId } = useParams<{ programmeId: string }>();
  const navigate = useNavigate();

  const { data: programme, isLoading, error } = useProject(programmeId);
  const { data: allProjects = [] } = useProjects('active');
  const { data: history = [] } = useProjectHistory(programmeId);

  const children = useMemo(
    () => allProjects.filter((p) => p.parent_id === programmeId),
    [allProjects, programmeId],
  );

  const healthMix = useMemo(() => {
    const counts: Record<HealthId, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const c of children) counts[c.health]++;
    return counts;
  }, [children]);

  const needsAttention = healthMix.red + healthMix.amber;
  const total = children.length || 1;

  if (isLoading) return <div className={styles.placeholder}>Loading programme…</div>;
  if (error) return <div className={styles.error}>Could not load programme: {(error as Error).message}</div>;
  if (!programme) return <div className={styles.placeholder}>Programme not found.</div>;
  if (programme.project_type !== 'programme') {
    // If someone routes here with a non-programme ID, redirect to the project view
    navigate(`/portfolio/${programme.id}`, { replace: true });
    return null;
  }

  return (
    <div>
      {/* ---- Hero ---- */}
      <header className={styles.head}>
        <div className={styles.heroRow}>
          <div className={styles.heroIntro}>
            <span className={styles.kicker}>Programme</span>
            <h1 className={styles.title}>{programme.name}</h1>
          </div>
          <div className={styles.heroActions}>
            <Link to={`/portfolio/${programme.id}`} className={styles.btn}>
              Open / edit
            </Link>
            <div className={styles.stateChip} data-state={programme.status}>
              {STATE_LABEL[programme.status] ?? programme.status}
            </div>
          </div>
        </div>

        <div className={styles.heroChips}>
          <StatusPill status={programme.health} inferred={programme.health_inferred} />
          <span className={styles.ownerPill}>
            <span className={styles.ownerLabel}>Owner</span>
            <span className={styles.ownerName}>
              {programme.owner ?? <span className={styles.muted}>unassigned</span>}
            </span>
            {programme.owner_confidence && (
              <ConfidenceBadge confidence={programme.owner_confidence} />
            )}
          </span>
          {programme.deadline && (
            <span className={styles.deadline}>
              <span className={styles.deadlineLabel}>Deadline</span>
              <span>{programme.deadline}</span>
            </span>
          )}
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Updated</span>
          <span>{formatDateTime(programme.updated_at)}</span>
          {programme.updated_by_email && (
            <>
              <span className={styles.metaLabel}>by</span>
              <span className={styles.email}>{programme.updated_by_email}</span>
            </>
          )}
        </div>
      </header>

      {/* ---- Programme summary (children stats) ---- */}
      <section className={styles.summary}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Projects in this programme</span>
          <span className={styles.statValue}>{children.length}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Needs attention</span>
          <span
            className={`${styles.statValue} ${needsAttention > 0 ? styles.statValueAlert : ''}`}
          >
            {needsAttention}
          </span>
          <span className={styles.statSub}>red + amber</span>
        </div>
        <div className={styles.summaryHealth}>
          <span className={styles.statLabel}>Health mix</span>
          <div className={styles.healthBar} role="img" aria-label="Health distribution across children">
            {HEALTH_ORDER.map((h) => {
              const n = healthMix[h];
              if (n === 0) return null;
              const pct = (n / total) * 100;
              return (
                <div
                  key={h}
                  className={`${styles.healthSeg} ${styles[`seg_${h}`]}`}
                  style={{ width: `${pct}%` }}
                  title={`${statusLabel(h)}: ${n}`}
                />
              );
            })}
          </div>
          <ul className={styles.healthLegend}>
            {HEALTH_ORDER.map((h) =>
              healthMix[h] > 0 ? (
                <li key={h}>
                  <span className={`${styles.legendDot} ${styles[`dot_${h}`]}`} />
                  <strong>{healthMix[h]}</strong> {statusLabel(h)}
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </section>

      {/* ---- Programme description ---- */}
      {programme.description && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Description</h3>
          <p className={styles.panelText}>{programme.description}</p>
        </section>
      )}

      {/* ---- Programme next decision ---- */}
      {programme.next_decision && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Next decision</h3>
          <p className={styles.panelText}>{programme.next_decision}</p>
        </section>
      )}

      {/* ---- Children grid ---- */}
      <section className={styles.childrenWrap}>
        <header className={styles.childrenHead}>
          <h2 className={styles.childrenTitle}>Projects in this programme</h2>
          <span className={styles.childrenCount}>{children.length}</span>
        </header>
        {children.length === 0 ? (
          <div className={styles.empty}>
            No projects yet under this programme. Open a project and set its Parent programme to add one.
          </div>
        ) : (
          <div className={styles.childrenGrid}>
            {children.map((c) => (
              <ProjectCard key={c.id} project={c} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Programme history ---- */}
      <div className={styles.historyWrap}>
        <HistoryFeed rows={history} title="Programme history" />
      </div>
    </div>
  );
}
