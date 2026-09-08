// ---------------------------------------------------------------
// primary_location — the house format for "where it lives".
//
// Every project's primary_location follows one shape, so the field
// stays sortable, greppable and unambiguous about which system a
// path belongs to:
//
//   SharePoint: <library>\<path>\        folder in a SharePoint library
//   OneDrive: <path>\                    folder in OneDrive
//   Local: C:\...\                       path on a machine
//   Logseq: [[Page]]                     a Logseq page
//   Logseq: journal <date>               a Logseq journal entry
//   GitHub: <repo>                       a repository
//   Live: <url>                          a running site or app
//   SharePoint page: <url>               a SharePoint page, not a folder
//
// Rules: backslash separators; a trailing backslash on a folder and
// none on a file; several locations joined with " + "; any
// explanatory aside in parentheses at the end of its own part.
//
// checkLocation reports what does not match and suggests a corrected
// string. It never rejects a value — the field stays free text, and
// the suggestion is offered, not imposed.
// ---------------------------------------------------------------

/** Canonical prefixes. Longest first, so "SharePoint page:" is
 *  tested before "SharePoint:". */
export const LOCATION_PREFIXES = [
  'SharePoint page:',
  'SharePoint:',
  'OneDrive:',
  'Logseq:',
  'GitHub:',
  'Local:',
  'Live:',
] as const;

export type LocationPrefix = (typeof LOCATION_PREFIXES)[number];

/** Prefixes whose body is a URL — left exactly as typed. Everything
 *  not handled specially below is a Windows-style path: backslash
 *  separators, and a trailing backslash on a folder. */
const URL_PREFIXES: readonly string[] = ['SharePoint page:', 'Live:'];

export interface LocationCheck {
  /** True when the value already matches the house format. */
  ok: boolean;
  /** The corrected value, or null when nothing can be suggested. */
  suggestion: string | null;
  /** What does not match, in plain words, one per problem. */
  problems: string[];
}

/** A trailing "(…)" aside, kept aside while the path is tidied. */
function splitAside(body: string): { path: string; aside: string } {
  const m = /^(.*?)\s*(\([^()]*\))\s*$/.exec(body);
  return m ? { path: m[1].trim(), aside: ` ${m[2]}` } : { path: body.trim(), aside: '' };
}

/** Does the last path segment look like a file rather than a folder? */
function looksLikeFile(path: string): boolean {
  const last = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
  return /\.[A-Za-z0-9]{1,6}$/.test(last);
}

/** "onedrive/x" — the right prefix, typed without its colon. Only
 *  matched when a path separator follows, so ordinary prose such as
 *  "Local files somewhere" is not rewritten. */
function prefixMissingColon(raw: string): { prefix: LocationPrefix; rest: string } | null {
  for (const prefix of LOCATION_PREFIXES) {
    const word = prefix.slice(0, -1);
    const m = new RegExp(`^${word.replace(/ /g, '\\s+')}[\\\\/]+(.*)$`, 'i').exec(raw);
    if (m) return { prefix, rest: m[1] };
  }
  return null;
}

function normalisePart(part: string, problems: string[]): string | null {
  let raw = part.trim();
  if (!raw) return null;

  let prefix = LOCATION_PREFIXES.find((p) =>
    raw.toLowerCase().startsWith(p.toLowerCase()),
  );

  if (!prefix) {
    const guess = prefixMissingColon(raw);
    if (guess) {
      problems.push(`Missing the colon after “${guess.prefix.slice(0, -1)}”`);
      prefix = guess.prefix;
      raw = `${guess.prefix} ${guess.rest}`;
    }
  }

  if (!prefix) {
    const shown = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
    // The prefix list is shown alongside, so it is not repeated here.
    problems.push(`“${shown}” does not start with a known prefix`);
    return null;
  }

  if (!raw.startsWith(prefix)) {
    problems.push(`Prefix should be written “${prefix}”`);
  }

  let body = raw.slice(prefix.length);
  if (!/^\s/.test(body) && body.length > 0) {
    problems.push(`Needs a space after “${prefix}”`);
  }
  body = body.trim();
  if (!body) {
    problems.push(`“${prefix}” has nothing after it`);
    return null;
  }

  if (URL_PREFIXES.includes(prefix)) {
    return `${prefix} ${body}`;
  }

  if (prefix === 'Logseq:') {
    // Either [[Page]] or "journal <date>".
    if (!/^\[\[.+\]\]$/.test(body) && !/^journal\s+\S+/i.test(body)) {
      problems.push('Logseq should be “[[Page]]” or “journal <date>”');
    }
    return `${prefix} ${body}`;
  }

  if (prefix === 'GitHub:') {
    return `${prefix} ${body}`;
  }

  // A path: backslashes, one trailing one on a folder.
  const { path, aside } = splitAside(body);
  let p = path;

  if (p.includes('/')) {
    problems.push('Path separators should be backslashes');
    p = p.replace(/\//g, '\\');
  }
  // A doubled separator mid-path is a typo. A leading "\\" is a UNC
  // server name and is left alone.
  if (/(?!^)\\{2,}/.test(p.slice(1))) {
    problems.push('Path has a doubled backslash');
    p = p.charAt(0) + p.slice(1).replace(/\\{2,}/g, '\\');
  }
  // Some people type "›" as a separator; treat it as one.
  if (p.includes('›')) {
    problems.push('Path separators should be backslashes');
    p = p
      .split('›')
      .map((seg) => seg.trim())
      .filter(Boolean)
      .join('\\');
  }

  const isFile = looksLikeFile(p);
  const hasTrailing = /\\$/.test(p);
  if (isFile && hasTrailing) {
    problems.push('A file should not end with a backslash');
    p = p.replace(/\\+$/, '');
  }
  if (!isFile && !hasTrailing) {
    problems.push('A folder should end with a backslash');
    p = `${p}\\`;
  }

  return `${prefix} ${p}${aside}`;
}

/** Check a primary_location against the house format. */
export function checkLocation(value: string | null | undefined): LocationCheck {
  const raw = (value ?? '').trim();
  if (!raw) return { ok: true, suggestion: null, problems: [] };

  const problems: string[] = [];
  // " + " joins several locations. Tolerate a missing space either side.
  const parts = raw.split(/\s*\+\s*/).filter((s) => s.trim().length > 0);
  const fixed = parts.map((part) => normalisePart(part, problems));

  // A part that could not be normalised means no whole-string suggestion.
  if (fixed.some((f) => f === null)) {
    return { ok: false, suggestion: null, problems };
  }

  const suggestion = fixed.join(' + ');
  if (suggestion === raw && problems.length === 0) {
    return { ok: true, suggestion: null, problems: [] };
  }
  if (suggestion === raw) {
    // Flagged something that is not mechanically fixable (e.g. a
    // Logseq body that is neither a page nor a journal).
    return { ok: false, suggestion: null, problems };
  }
  return { ok: false, suggestion, problems };
}

/** One-line reminder of the format, for placeholder and help text. */
export const LOCATION_HINT =
  'e.g. SharePoint: BIM Team - Documents\\HR processes\\  ·  OneDrive: 01 projects\\Manifest\\  ·  Logseq: [[Manifest]]';
