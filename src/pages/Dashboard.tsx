// ---------------------------------------------------------------
// Dashboard — the new home page at /portfolio.
//
// Four regions, all on one screen at typical viewport sizes:
//   1. Pulse strip (overall portfolio health)
//   2. Compact programme tiles (one per programme + a standalone bucket)
//   3. Recent activity feed (with QuickLog input)
//   4. This week (deadlines) + Logged this week (per-programme tally)
//
// The detailed Board / Map / Table views live at /portfolio/board etc.
// ---------------------------------------------------------------

import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { ActivityFeed } from '@/components/ActivityFeed';
import { ProgrammeTile } from '@/components/ProgrammeTile';
import { PulsePanel } from '@/components/PulsePanel';
import { QuickLog } from '@/components/QuickLog';
import { WeekRail } from '@/components/WeekRail';
import { useRecentActivity } from '@/hooks/useActivity';
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import type { Project } from '@/lib/types';

import styles from './Dashboard.module.css';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function Dashboard() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const { data: tasks = [] } = useAllTasks(false);
  const { data: recent = [] } = useRecentActivity(50);

  // Group projects by their programme parent
  const { programmes, childrenByParent, standaloneProjects, operationalItems } = useMemo(() => {
    const programmesList = projects.filter((p) => p.project_type === 'programme');
    const childMap = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.parent_id) {
        const list = childMap.get(p.parent_id) ?? [];
        list.push(p);
        childMap.set(p.parent_id, list);
      }
    }
    const childIds = new Set(
      Array.from(childMap.values()).flatMap((list) => list.map((c) => c.id)),
    );
    const standalone = projects.filter(
      (p) => p.project_type === 'project' && !p.parent_id && !childIds.has(p.id),
    );
    const operational = projects.filter((p) => p.project_type === 'operational');
    return {
      programmes: programmesList,
      childrenByParent: childMap,
      standaloneProjects: standalone,
      operationalItems: operational,
    };
  }, [projects]);

  // Weekly activity count per project id (last 7 days)
  const weeklyCountByProject = useMemo(() => {
    const cutoff = Date.now() - ONE_WEEK_MS;
    const counts = new Map<string, number>();
    for (const entry of recent) {
      if (!entry.project_id) continue;
      const t = new Date(entry.created_at).getTime();
      if (t < cutoff) continue;
      counts.set(entry.project_id, (counts.get(entry.project_id) ?? 0) + 1);
    }
    return counts;
  }, [recent]);

  // Weekly activity per programme = its own count + sum of children's
  function weeklyForProgramme(progId: string): number {
    let total = weeklyCountByProject.get(progId) ?? 0;
    for (const c of childrenByParent.get(progId) ?? []) {
      total += weeklyCountByProject.get(c.id) ?? 0;
    }
    return total;
  }

  // Per-programme weekly tally for the "Logged this week" mini-panel
  const loggedThisWeek = useMemo(() => {
    const rows = programmes
      .map((p) => ({ id: p.id, name: p.name, count: weeklyForProgramme(p.id) }))
      .sort((a, b) => b.count - a.count);

    // Tally for "Other" = standalone + operational
    const otherCount =
      [...standaloneProjects, ...operationalItems]
        .reduce((sum, p) => sum + (weeklyCountByProject.get(p.id) ?? 0), 0);
    if (otherCount > 0) rows.push({ id: '__other', name: 'Other', count: otherCount });

    return rows;
  }, [programmes, standaloneProjects, operationalItems, weeklyCountByProject]);

  return (
    <div className={styles.root}>
      {/* Page header */}
      <header className={styles.head}>
        <div className={styles.headIntro}>
          <h1 className={styles.title}>Portfolio</h1>
          <p className={styles.sub}>Everything in flight, and what&apos;s next.</p>
        </div>
        <div className={styles.headActions}>
          <Link to="/portfolio/board" className={styles.detailLink}>
            Detail views →
          </Link>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          Could not load portfolio: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className={styles.note}>Loading…</div>
      ) : (
        <>
          {/* Pulse */}
          <PulsePanel projects={projects} />

          {/* Programme grid */}
          {programmes.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Programmes</h2>
              <div className={styles.tileGrid}>
                {programmes.map((p) => (
                  <ProgrammeTile
                    key={p.id}
                    programme={p}
                    children={childrenByParent.get(p.id) ?? []}
                    weeklyActivity={weeklyForProgramme(p.id)}
                  />
                ))}
                {(standaloneProjects.length > 0 || operationalItems.length > 0) && (
                  <Link to="/portfolio/board" className={styles.standaloneTile}>
                    <div className={styles.standaloneHead}>
                      <span className={styles.standaloneKicker}>No programme</span>
                      <span className={styles.standaloneCount}>
                        {standaloneProjects.length + operationalItems.length}
                      </span>
                    </div>
                    <div className={styles.standaloneList}>
                      {[...standaloneProjects, ...operationalItems]
                        .slice(0, 3)
                        .map((p) => (
                          <span key={p.id} className={styles.standaloneItem}>
                            {p.name}
                          </span>
                        ))}
                      {standaloneProjects.length + operationalItems.length > 3 && (
                        <span className={styles.standaloneMore}>
                          +{standaloneProjects.length + operationalItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Lower two-column: activity + this-week */}
          <div className={styles.lower}>
            <section className={styles.activitySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Recent activity</h2>
                <span className={styles.sectionCount}>{recent.length}</span>
              </div>
              <div className={styles.activityCard}>
                <div className={styles.quickLogWrap}>
                  <QuickLog projectId={null} />
                </div>
                <ActivityFeed
                  entries={recent}
                  limit={8}
                  showProject
                  emptyMessage="Nothing logged yet. Try the input above — discussions, decisions, small actions."
                />
              </div>
            </section>

            <aside className={styles.sideCol}>
              <section>
                <h2 className={styles.sectionTitle}>This week</h2>
                <div className={styles.weekWrap}>
                  <WeekRail projects={projects} tasks={tasks} />
                </div>
              </section>

              <section>
                <h2 className={styles.sectionTitle}>Logged this week</h2>
                {loggedThisWeek.length === 0 ? (
                  <div className={styles.loggedEmpty}>Nothing logged yet this week.</div>
                ) : (
                  <ul className={styles.loggedList}>
                    {loggedThisWeek.slice(0, 6).map((row) => (
                      <li key={row.id} className={styles.loggedRow}>
                        <span className={styles.loggedName}>{row.name}</span>
                        <span
                          className={`${styles.loggedCount} ${row.count === 0 ? styles.loggedCountDim : ''}`}
                        >
                          {row.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
