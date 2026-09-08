// ---------------------------------------------------------------
// ProjectPicker — type-to-filter project chooser.
//
// Replaces a plain <select> where the list is long enough that
// scrolling it is slower than typing. Two things a select cannot do:
//
//   - filters as you type, on the project's name AND on its path, so
//     a half-remembered name ("purview", "report checks") or the area
//     it sits in ("data gov") both find it;
//   - offers to create a shell project from whatever has been typed,
//     for when the project does not exist yet. The shell is created
//     with the typed name only, outside any portfolio, so it shows up
//     on the Portfolios page as needing filing.
//
// The list renders in a portal, positioned against the input. It has
// to: this sits inside the task modal, whose body is a scroll
// container, and an absolutely positioned list would be clipped by it.
// ---------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useCreateProject } from '@/hooks/useProjects';
import type { Project } from '@/lib/types';

import styles from './ProjectPicker.module.css';

interface Props {
  /** Currently selected project id. */
  value: string;
  /** The projects to choose between. */
  projects: Project[];
  onChange: (id: string) => void;
  id?: string;
  /** Show the "create a new project" option. Off by default. */
  allowCreate?: boolean;
  /** Shown when the selected id is not in `projects`. */
  fallbackLabel?: string;
}

interface Option {
  id: string;
  name: string;
  /** Ancestors, outermost first: "Data governance › Policy and procedure". */
  path: string;
  /** Name + path, lowercased, for matching. */
  haystack: string;
}

/** Every word in the query must appear somewhere, in any order. */
function matches(opt: Option, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => opt.haystack.includes(w));
}

export function ProjectPicker({
  value,
  projects,
  onChange,
  id,
  allowCreate = false,
  fallbackLabel = 'Current project',
}: Props) {
  const createMut = useCreateProject();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(
    null,
  );

  const options = useMemo<Option[]>(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const pathOf = (p: Project): string => {
      const names: string[] = [];
      const seen = new Set<string>([p.id]);
      let cur = p.parent_id ? byId.get(p.parent_id) : undefined;
      // Guarded against a bad parent_id loop, which the database
      // does not prevent.
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        names.unshift(cur.name);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
      return names.join(' › ');
    };
    return [...projects]
      .map((p) => {
        const path = pathOf(p);
        return {
          id: p.id,
          name: p.name,
          path,
          haystack: `${p.name} ${path}`.toLowerCase(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'en-NZ'));
  }, [projects]);

  const selected = options.find((o) => o.id === value);
  const shown = useMemo(
    () => (query.trim() ? options.filter((o) => matches(o, query)) : options),
    [options, query],
  );

  const typed = query.trim();
  const exact = shown.some((o) => o.name.toLowerCase() === typed.toLowerCase());
  const showCreate = allowCreate && typed.length > 0 && !exact;
  /** Index of the create row, or -1. Sits after the filtered list. */
  const createIndex = showCreate ? shown.length : -1;
  const rowCount = shown.length + (showCreate ? 1 : 0);

  // Keep the highlight inside the list as it filters.
  useEffect(() => {
    setActive((a) => (rowCount === 0 ? 0 : Math.min(a, rowCount - 1)));
  }, [rowCount]);

  // Position the list against the input, flipping above it when there
  // is more room there. Recomputed while open, because the modal body
  // this sits in scrolls underneath us.
  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const below = window.innerHeight - r.bottom - gap - 8;
    const above = r.top - gap - 8;
    const flip = below < 180 && above > below;
    const maxHeight = Math.min(280, Math.max(120, flip ? above : below));
    setBox({
      left: r.left,
      top: flip ? r.top - gap - maxHeight : r.bottom + gap,
      width: r.width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    place();
    // capture:true so the modal body's own scrolling is picked up too.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place, rowCount]);

  // Close when the click lands outside the field or the list.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelectorAll('li')[active]
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function close() {
    setOpen(false);
    setQuery('');
    setActive(0);
    setError(null);
  }

  function pick(optId: string) {
    onChange(optId);
    close();
  }

  async function createShell() {
    const name = typed;
    if (!name) return;
    setError(null);
    try {
      const res = await createMut.mutateAsync({
        name,
        project_type: 'project',
        health: 'placeholder',
        parent_id: null,
      });
      if (!res.id) throw new Error('The project was created but returned no id');
      pick(res.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project');
    }
  }

  function commitActive() {
    if (createIndex !== -1 && active === createIndex) {
      void createShell();
      return;
    }
    const opt = shown[active];
    if (opt) pick(opt.id);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (rowCount === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + rowCount) % rowCount);
      return;
    }
    if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      commitActive();
      return;
    }
    if (e.key === 'Escape' && open) {
      // Close the list, not the dialog this sits in.
      e.preventDefault();
      e.stopPropagation();
      close();
      inputRef.current?.blur();
    }
  }

  const label = selected?.name ?? (value ? fallbackLabel : '');

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={id}
        ref={inputRef}
        className={styles.input}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-list` : undefined}
        autoComplete="off"
        value={open ? query : label}
        // Open and empty, the current project stays visible as the
        // placeholder, so typing over it does not lose sight of it.
        placeholder={open ? label || 'Type to filter…' : 'Choose a project'}
        title={selected ? [selected.path, selected.name].filter(Boolean).join(' › ') : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className={styles.caret} aria-hidden>
        ▾
      </span>

      {open && box && createPortal(
        <ul
          className={styles.list}
          id={id ? `${id}-list` : undefined}
          role="listbox"
          ref={listRef}
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            maxHeight: box.maxHeight,
          }}
        >
          {shown.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === value}>
              <button
                type="button"
                className={`${styles.row} ${i === active ? styles.rowActive : ''} ${
                  o.id === value ? styles.rowSelected : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o.id)}
              >
                <span className={styles.rowName}>{o.name}</span>
                {o.path && <span className={styles.rowPath}>{o.path}</span>}
              </button>
            </li>
          ))}

          {shown.length === 0 && !showCreate && (
            <li className={styles.none}>No project matches “{typed}”</li>
          )}

          {showCreate && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                className={`${styles.row} ${styles.create} ${
                  active === createIndex ? styles.rowActive : ''
                }`}
                onMouseEnter={() => setActive(createIndex)}
                onClick={() => void createShell()}
                disabled={createMut.isPending}
              >
                <span className={styles.rowName}>
                  {createMut.isPending ? 'Creating…' : `+ New project “${typed}”`}
                </span>
                <span className={styles.rowPath}>
                  Created as a shell, outside a portfolio — fill it in later
                </span>
              </button>
            </li>
          )}

          {error && <li className={styles.error}>{error}</li>}
        </ul>,
        document.body,
      )}
    </div>
  );
}
