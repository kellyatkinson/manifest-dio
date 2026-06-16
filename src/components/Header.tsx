import { Link, useLocation, useParams } from 'react-router-dom';
import { Fragment } from 'react';

import { signOut, useUser } from '@/lib/auth';
import { useProject } from '@/hooks/useProjects';
import { useTask } from '@/hooks/useTasks';
import { useUrls } from '@/hooks/useUrls';

import { ManifestIcon } from './icons/ManifestIcon';
import styles from './Header.module.css';

interface Crumb {
  label: string;
  to?: string;
}

function useCrumbs(): Crumb[] {
  const location = useLocation();
  const params = useParams<{ projectId?: string; taskId?: string }>();
  const { resolveProject, resolveTask, projectKey } = useUrls();
  const projectId = resolveProject(params.projectId);
  const taskId = resolveTask(params.taskId);

  const { data: project } = useProject(projectId);
  const { data: task } = useTask(taskId);

  const path = location.pathname;

  if (path === '/portfolio' || path === '/') {
    return [{ label: 'Portfolio' }];
  }
  if (path === '/closed') {
    return [{ label: 'Recently closed' }];
  }
  if (path === '/decisions') {
    return [{ label: 'Resolved questions' }];
  }

  if (path.startsWith('/portfolio/') && params.projectId) {
    const crumbs: Crumb[] = [
      { label: 'Portfolio', to: '/portfolio' },
      { label: project?.name ?? '…', to: `/portfolio/${projectKey(projectId)}` },
    ];
    if (params.taskId) {
      crumbs.push({ label: task?.title ?? 'Task' });
    }
    return crumbs;
  }

  return [{ label: 'Manifest' }];
}

interface HeaderProps {
  onMenuClick?: () => void;
  drawerOpen?: boolean;
}

export function Header({ onMenuClick, drawerOpen = false }: HeaderProps = {}) {
  const { user } = useUser();
  const crumbs = useCrumbs();

  return (
    <div className={styles.root}>
      {/* Mobile hamburger -- CSS hides this on viewports wider than 720px. */}
      <button
        type="button"
        className={styles.menuBtn}
        aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={drawerOpen}
        aria-controls="primary-nav"
        onClick={onMenuClick}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {/* App brand mark -- mobile only (sidebar carries the brand on desktop). */}
      <ManifestIcon className={styles.brandMark} />

      <div className={styles.crumbs}>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span className={styles.sep}>/</span>}
              {isLast || !c.to ? (
                <span className={styles.crumbCurrent} title={c.label}>
                  {c.label}
                </span>
              ) : (
                <Link to={c.to} className={styles.crumb}>
                  {c.label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className={styles.user}>
        {user?.email && <span className={styles.userEmail}>{user.email}</span>}
        <button
          type="button"
          className={styles.signOut}
          onClick={() => {
            void signOut();
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
