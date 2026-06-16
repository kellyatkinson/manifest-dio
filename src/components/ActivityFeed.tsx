// ---------------------------------------------------------------
// ActivityFeed — renders a list of activity entries with their
// optional link chips, project context, and timestamps.
//
// Used on:
//   - Dashboard (recent across portfolio)
//   - Project detail
//   - Programme detail (project's children rolled up)
// ---------------------------------------------------------------

import { Link } from 'react-router-dom';

import { LinkChip } from '@/components/LinkChip';
import { ZendeskTicketsChips } from '@/components/ZendeskTickets';
import { useDeleteActivity } from '@/hooks/useActivity';
import { useUrls } from '@/hooks/useUrls';
import type { ActivityEntry } from '@/lib/types';

import styles from './ActivityFeed.module.css';

interface Props {
  entries: ActivityEntry[];
  /** Show the project name on each entry (default true on dashboard, false on project page). */
  showProject?: boolean;
  /** Cap rendering at this many entries (undefined = all). */
  limit?: number;
  emptyMessage?: string;
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

export function ActivityFeed({
  entries,
  showProject = true,
  limit,
  emptyMessage = 'No activity logged yet.',
}: Props) {
  const deleteMut = useDeleteActivity();
  const { projectPath } = useUrls();
  const visible = typeof limit === 'number' ? entries.slice(0, limit) : entries;

  if (visible.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <ul className={styles.list}>
      {visible.map((e) => (
        <li key={e.id} className={styles.item}>
          <div className={styles.head}>
            <time className={styles.time} dateTime={e.created_at} title={new Date(e.created_at).toLocaleString('en-NZ')}>
              {formatRelative(e.created_at)}
            </time>
            {showProject && e.project && (
              <Link to={projectPath(e.project.id)} className={styles.projectTag}>
                {e.project.name}
              </Link>
            )}
            {!showProject && e.kind && <span className={styles.kindTag}>{e.kind}</span>}
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => {
                if (window.confirm('Delete this activity entry? This cannot be undone.')) {
                  void deleteMut.mutateAsync(e.id);
                }
              }}
              title="Delete entry"
              aria-label="Delete entry"
            >
              ×
            </button>
          </div>
          <div className={styles.content}>{e.content}</div>
          {((e.links && e.links.length > 0) || (e.zendesk_tickets && e.zendesk_tickets.length > 0)) && (
            <div className={styles.links}>
              {e.zendesk_tickets && e.zendesk_tickets.length > 0 && (
                <ZendeskTicketsChips ids={e.zendesk_tickets} />
              )}
              {e.links && e.links.map((l) => (
                <LinkChip key={l.id} link={l} />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
