// ---------------------------------------------------------------
// Wins — what you've completed/achieved in a recent window.
//
// Pulls completed tasks, closed (archived) projects and resolved
// decisions from the list_wins RPC, grouped into three sections
// with a switchable time window. A morale page as much as a record.
// ---------------------------------------------------------------

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWins, type WinsWindow } from '@/hooks/useWins';
import { useUrls } from '@/hooks/useUrls';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/format';

import styles from './Wins.module.css';

const WINDOWS: { value: WinsWindow; label: string }[] = [
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 'all', label: 'All time' },
];

function Check() {
  return (
    <svg className={styles.check} viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
      <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wins() {
  const [window, setWindow] = useState<WinsWindow>(30);
  const { data, isLoading, error } = useWins(window);
  const { projectPath, taskPath } = useUrls();
  const navigate = useNavigate();

  const tasks = data?.tasks ?? [];
  const projects = data?.projects ?? [];
  const decisions = data?.decisions ?? [];
  const total = tasks.length + projects.length + decisions.length;

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Wins</h1>
        <p className={styles.sub}>What you've completed and closed out — proof of momentum.</p>
      </header>

      <div className={styles.toolbar} role="group" aria-label="Time window">
        {WINDOWS.map((w) => (
          <button
            key={String(w.value)}
            type="button"
            className={`${styles.winBtn} ${window === w.value ? styles.winBtnActive : ''}`}
            onClick={() => setWindow(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {isLoading && <div className={styles.note}>Loading…</div>}
      {error && <div className={styles.error}>Could not load: {(error as Error).message}</div>}

      {!isLoading && !error && (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.kpiNum}>{tasks.length}</div>
              <div className={styles.kpiLabel}>Tasks completed</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiNum}>{projects.length}</div>
              <div className={styles.kpiLabel}>Projects closed</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiNum}>{decisions.length}</div>
              <div className={styles.kpiLabel}>Decisions resolved</div>
            </div>
          </div>

          {total === 0 ? (
            <div className={styles.empty}>Nothing logged as done in this window yet — go close something out.</div>
          ) : (
            <>
              {tasks.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Tasks completed <span className={styles.count}>{tasks.length}</span></h2>
                  <div className={styles.list}>
                    {tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={styles.row}
                        onClick={() => t.project_id && navigate(taskPath(t.project_id, t.id))}
                      >
                        <Check />
                        <span className={styles.rowMain}>{t.title}</span>
                        {t.project_name && <span className={styles.rowMeta}>{t.project_name}</span>}
                        <span className={styles.rowDate}>{formatDate(t.completed_at)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {projects.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Projects closed <span className={styles.count}>{projects.length}</span></h2>
                  <div className={styles.list}>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles.row}
                        onClick={() => navigate(projectPath(p.id))}
                      >
                        <Check />
                        <span className={styles.rowMain}>{p.name}</span>
                        <span className={styles.rowMeta}>{statusLabel(p.health)}</span>
                        <span className={styles.rowDate}>{formatDate(p.completed_at)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {decisions.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Decisions resolved <span className={styles.count}>{decisions.length}</span></h2>
                  <div className={styles.list}>
                    {decisions.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={styles.row}
                        onClick={() => navigate(d.project_id ? projectPath(d.project_id) : '/decisions')}
                      >
                        <Check />
                        <span className={styles.rowMain}>{d.question}</span>
                        {d.project_name && <span className={styles.rowMeta}>{d.project_name}</span>}
                        <span className={styles.rowDate}>{formatDate(d.decided_on)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
