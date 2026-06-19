// ---------------------------------------------------------------
// GlobalSearch — portfolio-wide quick search.
// ---------------------------------------------------------------
// Searches projects, tasks, and decisions by any word, and by
// Zendesk ticket number (with or without a leading '#'). Runs
// entirely client-side over the already-cached project/task lists
// (useUrls warms these) plus the decisions log — the portfolio is
// small, so there's no need for a server round-trip per keystroke.
//
// Results link straight to the relevant detail route. Keyboard:
// type to filter, ↑/↓ to move, Enter to open, Esc to clear/close.
// ---------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import { useUrls } from '@/hooks/useUrls';
import { listDecisions } from '@/lib/api';
import type { Decision, Project, Task } from '@/lib/types';

import styles from './GlobalSearch.module.css';

type ResultKind = 'project' | 'task' | 'decision';

interface SearchResult {
  key: string;
  kind: ResultKind;
  title: string;
  meta: string;
  to: string;
  haystack: string;
}

const MAX_RESULTS = 25;
const KIND_LABEL: Record<ResultKind, string> = {
  project: 'Project',
  task: 'Task',
  decision: 'Decision',
};

/** Lowercase + collapse whitespace. */
function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

/** Build the searchable text blob for a row, including Zendesk ticket
 *  numbers rendered both bare (219497) and hashed (#219497) so either
 *  form of query matches. */
function ticketText(tickets: number[] | null | undefined): string {
  if (!tickets || tickets.length === 0) return '';
  return tickets.map((id) => `${id} #${id}`).join(' ');
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const { projectPath, taskPath, projectName } = useUrls();

  // 'all' / include-archived so closed work is findable too.
  const { data: projects = [] } = useProjects('all');
  const { data: tasks = [] } = useAllTasks(true);
  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions'],
    queryFn: listDecisions,
  });

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Build the searchable index once per data change ----------------
  const index = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = [];

    for (const p of projects as Project[]) {
      const meta = [p.owner, p.stream, p.status === 'archived' ? 'closed' : null]
        .filter(Boolean)
        .join(' · ');
      const hay = [
        p.name, p.description, p.owner, p.next_decision, p.deadline,
        p.primary_location, p.stream, p.role_tag, ticketText(p.zendesk_tickets),
      ].map(norm).join(' ');
      items.push({
        key: `p-${p.id}`,
        kind: 'project',
        title: p.name,
        meta: meta || 'Project',
        to: projectPath(p.id),
        haystack: hay,
      });
    }

    for (const t of tasks as Task[]) {
      const parent = projectName(t.project_id) ?? '';
      const hay = [
        t.title, t.description, t.owner, parent, ticketText(t.zendesk_tickets),
      ].map(norm).join(' ');
      items.push({
        key: `t-${t.id}`,
        kind: 'task',
        title: t.title,
        meta: parent ? `in ${parent}` : 'Task',
        to: t.project_id ? taskPath(t.project_id, t.id) : '/tasks',
        haystack: hay,
      });
    }

    for (const d of decisions as Decision[]) {
      const parent = projectName(d.project_id) ?? '';
      const hay = [d.question, d.resolution, d.decided_by, parent].map(norm).join(' ');
      items.push({
        key: `d-${d.id}`,
        kind: 'decision',
        title: d.question,
        meta: parent ? `Decision · ${parent}` : 'Decision',
        to: d.project_id ? projectPath(d.project_id) : '/decisions',
        haystack: hay,
      });
    }

    return items;
  }, [projects, tasks, decisions, projectPath, taskPath, projectName]);

  // ---- Filter ---------------------------------------------------------
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Split into terms; a bare/hashed ticket number is one term. All
    // terms must be present (AND) — narrows as you type more words.
    const terms = q.replace(/#/g, '').split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const matched = index.filter((it) =>
      terms.every((term) => it.haystack.includes(term)),
    );
    // Projects first, then tasks, then decisions — stable, predictable.
    const order: Record<ResultKind, number> = { project: 0, task: 1, decision: 2 };
    matched.sort((a, b) => order[a.kind] - order[b.kind]);
    return matched.slice(0, MAX_RESULTS);
  }, [query, index]);

  // Keep the active row in range whenever results change.
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function go(r: SearchResult) {
    navigate(r.to);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) go(r);
    }
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.field}>
        <svg className={styles.icon} viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Search projects, tasks, tickets…"
          value={query}
          aria-label="Search the portfolio"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>

      {showPanel && (
        <div className={styles.panel} role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className={styles.empty}>No matches for “{query.trim()}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={r.key}
                role="option"
                aria-selected={i === active}
                className={`${styles.result} ${i === active ? styles.resultActive : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
              >
                <span className={`${styles.kind} ${styles[`kind_${r.kind}`]}`}>
                  {KIND_LABEL[r.kind]}
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>{r.title}</span>
                  <span className={styles.meta}>{r.meta}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
