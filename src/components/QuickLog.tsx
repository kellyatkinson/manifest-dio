// ---------------------------------------------------------------
// QuickLog — single-line input for self-logging a piece of activity.
// URLs typed inline get auto-extracted on submit; an optional
// "+ Link" button lets you attach a labelled link explicitly.
//
// Used on the Overview/dashboard (where allowProjectSelect=true so the
// user can pick a project to tag the entry to), project detail, and
// programme detail surfaces (where the project is fixed by context).
// ---------------------------------------------------------------

import { useMemo, useState, type FormEvent } from 'react';

import { useLogActivity } from '@/hooks/useActivity';
import { useProjects } from '@/hooks/useProjects';
import { classifyUrl, extractUrls } from '@/lib/linkClassify';
import { ZendeskTicketsInput } from './ZendeskTickets';

import styles from './QuickLog.module.css';

interface Props {
  projectId: string | null;
  /** When true, render a project selector and use its value instead of
   *  the `projectId` prop. Selector defaults to "(no project)". */
  allowProjectSelect?: boolean;
  placeholder?: string;
  /** Hint label shown beneath the input (e.g. "SIS replacement"). Only
   *  used when allowProjectSelect is false. */
  contextHint?: string;
}

interface LinkRow {
  url: string;
  label: string;
}

export function QuickLog({
  projectId,
  allowProjectSelect,
  placeholder,
  contextHint,
}: Props) {
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [tickets, setTickets] = useState<number[]>([]);
  const [showTickets, setShowTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const log = useLogActivity();
  // Active projects only — fetched here so the component is self-contained.
  // React Query will dedupe with any parallel call from the host page.
  const { data: allProjects = [] } = useProjects('active');

  const { programmesGroup, projectsGroup, operationalGroup } = useMemo(() => {
    const byName = (a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name);
    return {
      programmesGroup: allProjects
        .filter((p) => p.project_type === 'programme')
        .sort(byName),
      projectsGroup: allProjects
        .filter((p) => p.project_type === 'project')
        .sort(byName),
      operationalGroup: allProjects
        .filter((p) => p.project_type === 'operational')
        .sort(byName),
    };
  }, [allProjects]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) return;

    // Combine inline URLs with explicit link rows. Dedupe by URL.
    const inline = extractUrls(trimmed).map((u) => classifyUrl(u));
    const manual = links
      .filter((l) => l.url.trim())
      .map((l) => {
        const c = classifyUrl(l.url.trim());
        return { url: c.url, label: l.label.trim() || c.label, kind: c.kind };
      });

    const byUrl = new Map<string, { url: string; label: string; kind: string }>();
    for (const l of inline) byUrl.set(l.url, l);
    for (const l of manual) byUrl.set(l.url, l); // manual wins on label override

    const effectiveProjectId = allowProjectSelect ? selectedProjectId : projectId;

    try {
      await log.mutateAsync({
        project_id: effectiveProjectId,
        content: trimmed,
        links: Array.from(byUrl.values()),
        zendesk_tickets: tickets,
      });
      setContent('');
      setLinks([]);
      setShowLinks(false);
      setTickets([]);
      setShowTickets(false);
      // Intentionally retain selectedProjectId so consecutive entries
      // against the same project don't require re-picking it.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log activity');
    }
  }

  return (
    <form className={styles.root} onSubmit={(e) => void onSubmit(e)}>
      {allowProjectSelect && (
        <div className={styles.selectorRow}>
          <label className={styles.selectorLabel} htmlFor="quicklog-project">
            Project
          </label>
          <select
            id="quicklog-project"
            className={styles.select}
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            aria-label="Tag this entry to a project (optional)"
          >
            <option value="">None — portfolio-level note</option>
            {programmesGroup.length > 0 && (
              <optgroup label="Programmes">
                {programmesGroup.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {projectsGroup.length > 0 && (
              <optgroup label="Projects">
                {projectsGroup.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {operationalGroup.length > 0 && (
              <optgroup label="Operational">
                {operationalGroup.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div className={styles.row}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder ?? 'Log a discussion, decision, or quick action…'}
          className={styles.input}
          aria-label="Activity content"
        />
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => setShowLinks((s) => !s)}
          aria-pressed={showLinks}
          title={showLinks ? 'Hide links' : 'Add a link'}
        >
          {showLinks ? '— Link' : '+ Link'}
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => setShowTickets((s) => !s)}
          aria-pressed={showTickets}
          title={showTickets ? 'Hide tickets' : 'Attach a Zendesk ticket'}
        >
          {showTickets ? '— Ticket' : '+ Ticket'}
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={log.isPending || !content.trim()}
        >
          {log.isPending ? 'Logging…' : 'Log'}
        </button>
      </div>

      {contextHint && !allowProjectSelect && (
        <div className={styles.contextHint}>Will be logged against: {contextHint}</div>
      )}

      {showTickets && (
        <div className={styles.linkBox}>
          <p className={styles.linkHint}>
            Paste a Dio Zendesk ticket # or link. Add as many as you need.
          </p>
          <ZendeskTicketsInput
            ids={tickets}
            onChange={setTickets}
            placeholder="e.g. 219497 or https://diocesan.zendesk.com/agent/tickets/219497"
          />
        </div>
      )}

      {showLinks && (
        <div className={styles.linkBox}>
          {links.length === 0 && (
            <p className={styles.linkHint}>
              URLs typed in the text above are detected automatically. Add one here
              if you want a custom label.
            </p>
          )}
          {links.map((l, i) => (
            <div key={i} className={styles.linkRow}>
              <input
                type="url"
                value={l.url}
                onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], url: e.target.value };
                  setLinks(next);
                }}
                placeholder="https://…"
                className={styles.input}
                aria-label="Link URL"
              />
              <input
                type="text"
                value={l.label}
                onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], label: e.target.value };
                  setLinks(next);
                }}
                placeholder="Label (optional)"
                className={styles.input}
                aria-label="Link label"
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                title="Remove link"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setLinks([...links, { url: '', label: '' }])}
          >
            + Add another link
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </form>
  );
}
