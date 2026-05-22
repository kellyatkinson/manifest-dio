// ---------------------------------------------------------------
// QuickLog — single-line input for self-logging a piece of activity.
// URLs typed inline get auto-extracted on submit; an optional
// "+ Link" button lets you attach a labelled link explicitly.
//
// Used on the dashboard (project_id = null = portfolio-level),
// project detail, and programme detail surfaces.
// ---------------------------------------------------------------

import { useState, type FormEvent } from 'react';

import { useLogActivity } from '@/hooks/useActivity';
import { classifyUrl, extractUrls } from '@/lib/linkClassify';

import styles from './QuickLog.module.css';

interface Props {
  projectId: string | null;
  placeholder?: string;
  /** Hint label shown to the right (e.g. "SIS replacement") */
  contextHint?: string;
}

interface LinkRow {
  url: string;
  label: string;
}

export function QuickLog({ projectId, placeholder, contextHint }: Props) {
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = useLogActivity();

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

    try {
      await log.mutateAsync({
        project_id: projectId,
        content: trimmed,
        links: Array.from(byUrl.values()),
      });
      setContent('');
      setLinks([]);
      setShowLinks(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log activity');
    }
  }

  return (
    <form className={styles.root} onSubmit={(e) => void onSubmit(e)}>
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
          type="submit"
          className={styles.submitBtn}
          disabled={log.isPending || !content.trim()}
        >
          {log.isPending ? 'Logging…' : 'Log'}
        </button>
      </div>

      {contextHint && (
        <div className={styles.contextHint}>Will be logged against: {contextHint}</div>
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
