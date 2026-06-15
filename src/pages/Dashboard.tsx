// ---------------------------------------------------------------
// Dashboard — the home page at /portfolio.
//
// v2 (2026-06-12): rebuilt as a visual overview. Regions:
//   1. KPI strip (active / needs attention / overdue / due this week)
//   2. Health donut + portfolio map, side by side
//   3. "Next up" ranked pointer panel + recent activity (QuickLog)
//
// The detailed Board / Map / Table views live at /portfolio/board etc.
// ---------------------------------------------------------------

import { Link } from 'react-router-dom';

import { ActivityFeed } from '@/components/ActivityFeed';
import { HealthDonut } from '@/components/HealthDonut';
import { KpiStrip } from '@/components/KpiStrip';
import { NextUp } from '@/components/NextUp';
import { PortfolioMap } from '@/components/PortfolioMap';
import { QuickLog } from '@/components/QuickLog';
import { useRecentActivity } from '@/hooks/useActivity';
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';

import styles from './Dashboard.module.css';

export function Dashboard() {
  const { data: projects = [], isLoading, error } = useProjects('active');
  const { data: tasks = [] } = useAllTasks(false);
  const { data: recent = [] } = useRecentActivity(50);

  return (
    <div className={styles.root}>
      {/* Page header */}
      <header className={styles.head}>
        <div className={styles.headIntro}>
          <h1 className={styles.title}>Overview</h1>
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
          {/* 1. KPI hero strip */}
          <KpiStrip projects={projects} tasks={tasks} />

          {/* 2. Health donut + portfolio map */}
          <div className={styles.vizRow}>
            <HealthDonut projects={projects} />
            <div className={styles.mapWrap}>
              <PortfolioMap projects={projects} />
            </div>
          </div>

          {/* 3. Next up + recent activity */}
          <div className={styles.lower}>
            <NextUp projects={projects} tasks={tasks} />

            <section className={styles.activitySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Recent activity</h2>
                <span className={styles.sectionCount}>{recent.length}</span>
              </div>
              <div className={styles.activityCard}>
                <div className={styles.quickLogWrap}>
                  <QuickLog projectId={null} allowProjectSelect />
                </div>
                <ActivityFeed
                  entries={recent}
                  limit={8}
                  showProject
                  emptyMessage="Nothing logged yet. Try the input above — discussions, decisions, small actions."
                />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
