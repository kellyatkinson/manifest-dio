// ---------------------------------------------------------------
// Container detail page  (route: /programmes/:id)
// ---------------------------------------------------------------
// A surface for a row that holds other rows: its own metadata, what
// sits inside it, aggregate health, and quick navigation.
//
// The visible copy says "container", not "programme". The same page
// serves a portfolio (top-level) and a programme (nested inside one),
// and calling a portfolio a programme was misleading — while calling
// it a portfolio here would need two sets of wording for one page.
// "Container" is what they have in common: they hold work rather than
// being it. The route, the file and the identifiers keep the
// programme name.
//
// For full edit of the record, link out to /portfolio/:id (which uses
// the same Project edit form). This keeps the view read-focused.
// ---------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ActivityFeed } from '@/components/ActivityFeed';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { HistoryFeed } from '@/components/HistoryFeed';
import { ProjectCard } from '@/components/ProjectCard';
import { QuickLog } from '@/components/QuickLog';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { useProject, useProjects } from '@/hooks/useProjects';
import { useUrls } from '@/hooks/useUrls';
import { useProjectsActivity } from '@/hooks/useActivity';
import { useProjectHistory } from '@/hooks/useHistory';
import { formatDateTime, statusLabel } from '@/lib/format';
import type { HealthId } from '@/lib/types';

import styles from './ProgrammeDetail.module.css';

const STATE_LABEL: Record<string, string> = {
  active: 'Active',
  on_hold: 'On hold',
  archived: 'Closed',
  excluded: 'Excluded',
};

const HEALTH_ORDER: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

export function ProgrammeDetail() {
  const { programmeId: programmeParam } = useParams<{ programmeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolveProject, projectPath, projectKey } = useUrls();
  const programmeId = resolveProject(programmeParam);

  const [showCreate, setShowCreate] = useState(false);

  const { data: programme, isLoading, error } = useProject(programmeId);
  const { data: allProjects = [] } = useProjects('active');
  const { data: history = [] } = useProjectHistory(programmeId);

  const children = useMemo(
    () => allProjects.filter((p) => p.parent_id === programmeId),
    [allProjects, programmeId],
  );

  // Roll-up activity = this row's own + everything inside it
  const activityProjectIds = useMemo(
    () => (programmeId ? [programmeId, ...children.map((c) => c.id)] : []),
    [programmeId, children],
  );
  const { data: activity = [] } = useProjectsActivity(activityProjectIds, 30);

  const healthMix = useMemo(() => {
    const counts: Record<HealthId, number> = { red: 0, amber: 0, green: 0, placeholder: 0 };
    for (const c of children) counts[c.health]++;
    return counts;
  }, [children]);

  const needsAttention = healthMix.red + healthMix.amber;
  const total = children.length || 1;

  // Normalise the address bar to the readable slug-hex form.
  useEffect(() => {
    if (!programme || programme.project_type !== 'programme') return;
    const pretty = `/programmes/${projectKey(programme.id)}`;
    if (location.pathname !== pretty) navigate(pretty, { replace: true });
  }, [programme, location.pathname, projectKey, navigate]);

  if (isLoading) return <div className={styles.placeholder}>Loading…</div>;
  if (error) return <div className={styles.error}>Could not load: {(error as Error).message}</div>;
  if (!programme) return <div className={styles.placeholder}>Not found.</div>;
  if (programme.project_type !== 'programme') {
    // A row that holds nothing is not a container: send it to the project view
    navigate(projectPath(programme.id), { replace: true });
    return null;
  }

  return (
    <div>
      {/* ---- Hero ---- */}
      <header className={styles.head}>
        <div className={styles.heroRow}>
          <div className={styles.heroIntro}>
            <span className={styles.kicker}>Container</span>
            <h1 className={styles.title}>{programme.name}</h1>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowCreate(true)}
            >
              New project
            </button>
            <Link to={`/portfolio/${projectKey(programme.id)}`} className={styles.btn}>
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

      {/* ---- Summary of what is inside ---- */}
      <section className={styles.summary}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Rows inside</span>
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

      {/* ---- Description ---- */}
      {programme.description && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Description</h3>
          <p className={styles.panelText}>{programme.description}</p>
        </section>
      )}

      {/* ---- Next decision ---- */}
      {programme.next_decision && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Next decision</h3>
          <p className={styles.panelText}>{programme.next_decision}</p>
        </section>
      )}

      {/* ---- Children grid ---- */}
      <section className={styles.childrenWrap}>
        <header className={styles.childrenHead}>
          <h2 className={styles.childrenTitle}>What sits inside</h2>
          <span className={styles.childrenCount}>{children.length}</span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnAdd}`}
            onClick={() => setShowCreate(true)}
          >
            + Add a project
          </button>
        </header>
        {children.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>Nothing inside this yet.</p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowCreate(true)}
            >
              Create the first project
            </button>
          </div>
        ) : (
          <div className={styles.childrenGrid}>
            {children.map((c) => (
              <ProjectCard key={c.id} project={c} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Activity (this row + everything inside, rolled up) ---- */}
      <section className={styles.activityWrap}>
        <header className={styles.activityHead}>
          <h2 className={styles.activityTitle}>Activity</h2>
          <span className={styles.activityCount}>{activity.length}</span>
        </header>
        <div className={styles.activityCard}>
          <div className={styles.quickLogWrap}>
            <QuickLog
              projectId={programme.id}
              placeholder="Log a discussion or decision at this level…"
              contextHint={programme.name}
            />
          </div>
          <ActivityFeed
            entries={activity}
            limit={15}
            showProject
            emptyMessage="Nothing logged across this container yet."
          />
        </div>
      </section>

      {/* ---- History ---- */}
      <div className={styles.historyWrap}>
        <HistoryFeed rows={history} title="History" />
      </div>

      {showCreate && (
        <CreateProjectModal
          programmes={allProjects.filter((p) => p.project_type === 'programme')}
          defaultParentId={programmeId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
