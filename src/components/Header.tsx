import { Link, useLocation, useParams } from 'react-router-dom';
import { Fragment } from 'react';

import { signOut, useUser } from '@/lib/auth';
import { useProject } from '@/hooks/useProjects';
import { useTask } from '@/hooks/useTasks';

import styles from './Header.module.css';

interface Crumb {
  label: string;
  to?: string;
}

function useCrumbs(): Crumb[] {
  const location = useLocation();
  const params = useParams<{ projectId?: string; taskId?: string }>();

  const { data: project } = useProject(params.projectId);
  const { data: task } = useTask(params.taskId);

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
      { label: project?.name ?? '…', to: `/portfolio/${params.projectId}` },
    ];
    if (params.taskId) {
      crumbs.push({ label: task?.title ?? 'Task' });
    }
    return crumbs;
  }

  return [{ label: 'Manifest' }];
}

export function Header() {
  const { user } = useUser();
  const crumbs = useCrumbs();

  return (
    <div className={styles.root}>
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
