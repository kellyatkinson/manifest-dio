// ---------------------------------------------------------------
// Zendesk ticket UI
// ---------------------------------------------------------------
// Two surfaces in one file (sibling components, shared parser):
//
//   1. ZendeskTicketsChips — read-only chip strip. Each chip links
//      to https://diocesan.zendesk.com/agent/tickets/{id}.
//
//   2. ZendeskTicketsInput — paste a number, comma list, or full
//      Zendesk URL. Parser runs on blur (cheap; commits on Enter
//      too). Chips render alongside the input with × buttons.
//
// Both are unstyled-aware: they ship their own CSS module so they
// can drop into any form without leaking style. Layout-friendly:
// they expand to the parent's width.
// ---------------------------------------------------------------

import { useState, type KeyboardEvent } from 'react';

import { parseZendeskTicketsInput, zendeskTicketUrl } from '@/lib/zendesk';

import styles from './ZendeskTickets.module.css';

// ---- Read-only display -------------------------------------------------

interface ChipsProps {
  ids: number[];
  /** When true (default), render nothing if the list is empty.
   *  Set false to render an em-dash placeholder. */
  hideWhenEmpty?: boolean;
}

export function ZendeskTicketsChips({ ids, hideWhenEmpty = true }: ChipsProps) {
  if (ids.length === 0) {
    return hideWhenEmpty ? null : <span className={styles.muted}>—</span>;
  }
  return (
    <div className={styles.chips}>
      {ids.map((id) => (
        <a
          key={id}
          className={styles.chip}
          href={zendeskTicketUrl(id)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ticket ${id} in Zendesk`}
        >
          <span className={styles.glyph} aria-hidden>🎫</span>
          <span className={styles.label}>#{id}</span>
        </a>
      ))}
    </div>
  );
}

// ---- Editable input ----------------------------------------------------

interface InputProps {
  ids: number[];
  onChange: (next: number[]) => void;
  /** Override the placeholder when context calls for it. */
  placeholder?: string;
  /** Hide chips block and only show the input — useful in compact
   *  spots like the QuickLog. Defaults to showing chips. */
  compact?: boolean;
  id?: string;
}

export function ZendeskTicketsInput({
  ids,
  onChange,
  placeholder,
  compact,
  id,
}: InputProps) {
  const [raw, setRaw] = useState('');

  function commit() {
    if (!raw.trim()) return;
    const parsed = parseZendeskTicketsInput(raw);
    if (parsed.length === 0) {
      setRaw('');
      return;
    }
    const seen = new Set(ids);
    const merged = [...ids];
    for (const n of parsed) {
      if (!seen.has(n)) {
        merged.push(n);
        seen.add(n);
      }
    }
    onChange(merged);
    setRaw('');
  }

  function remove(id: number) {
    onChange(ids.filter((n) => n !== id));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && raw === '' && ids.length > 0) {
      // Backspace on empty input removes the last chip — keyboard nicety
      // that matches how most chip-inputs feel.
      onChange(ids.slice(0, -1));
    }
  }

  return (
    <div className={styles.inputWrap}>
      {!compact && ids.length > 0 && (
        <div className={styles.chipsEditable}>
          {ids.map((n) => (
            <span key={n} className={styles.chipEditable}>
              <a
                href={zendeskTicketUrl(n)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.chipLink}
                title={`Open ticket ${n} in Zendesk`}
              >
                <span className={styles.glyph} aria-hidden>🎫</span>
                <span className={styles.label}>#{n}</span>
              </a>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => remove(n)}
                aria-label={`Remove ticket ${n}`}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={id}
        type="text"
        className={styles.input}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? 'Paste a ticket # or Zendesk link, then Enter'}
        inputMode="numeric"
        aria-label="Add Zendesk ticket"
      />
      {compact && ids.length > 0 && (
        <div className={styles.chipsEditable}>
          {ids.map((n) => (
            <span key={n} className={styles.chipEditable}>
              <a
                href={zendeskTicketUrl(n)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.chipLink}
              >
                <span className={styles.glyph} aria-hidden>🎫</span>
                <span className={styles.label}>#{n}</span>
              </a>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => remove(n)}
                aria-label={`Remove ticket ${n}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
