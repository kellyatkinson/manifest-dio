// ---------------------------------------------------------------
// Zendesk ticket helpers
// ---------------------------------------------------------------
// One subdomain for the lot, hardcoded — only Dio's instance is
// targeted today, and a config table would be overkill for a
// single-tenant URL prefix.
//
// Storage shape in the DB: integer[] (zendesk_tickets column on
// projects, tasks, activity_log). UI shape: number[].
// ---------------------------------------------------------------

const ZENDESK_HOST = 'https://diocesan.zendesk.com';

/** Resolve a ticket ID to its agent URL. */
export function zendeskTicketUrl(id: number): string {
  return `${ZENDESK_HOST}/agent/tickets/${id}`;
}

/** Render a ticket number for display, e.g. 219497 → "#219497". */
export function formatTicketRef(id: number): string {
  return `#${id}`;
}

/**
 * Parse arbitrary user input — bare numbers, comma/space/newline
 * separated numbers, or full Zendesk URLs (with or without trailing
 * paths/queries) — into a deduped, ordered list of ticket IDs.
 *
 * - Rejects zero and negatives.
 * - Caps at a sane upper bound to avoid pathological input pasting
 *   in a million-character string (10-digit IDs only).
 */
export function parseZendeskTicketsInput(raw: string): number[] {
  if (!raw) return [];

  const ids: number[] = [];
  const seen = new Set<number>();

  // Cap on ticket digit length — anything longer is rejected rather than
  // truncated, so a fat-fingered paste fails loudly instead of silently
  // splitting into two IDs. Real Zendesk tickets are well below this.
  const MAX_DIGITS = 12;

  // Match /agent/tickets/<digits> URLs first, then any standalone digit
  // run. Digit runs are matched greedily so a 13-digit string is rejected
  // (over MAX_DIGITS) rather than truncated to a 12-digit ID + an orphan.
  const urlPattern = /\/agent\/tickets\/(\d+)/g;
  let working = raw;
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(working)) !== null) {
    if (m[1].length > MAX_DIGITS) continue;
    const n = Number(m[1]);
    if (n > 0 && !seen.has(n)) {
      ids.push(n);
      seen.add(n);
    }
  }
  working = working.replace(urlPattern, ' ');

  const numberPattern = /(\d+)/g;
  while ((m = numberPattern.exec(working)) !== null) {
    if (m[1].length > MAX_DIGITS) continue;
    const n = Number(m[1]);
    if (n > 0 && !seen.has(n)) {
      ids.push(n);
      seen.add(n);
    }
  }

  return ids;
}

/**
 * Render an integer array (as it lives in the DB) into a chip-friendly
 * "#1, #2" string. Used by the audit-trail formatter.
 *
 * Accepts either a real number[] or the Postgres text form a history
 * row carries, e.g. "{219497,219501}" or "{}".
 */
export function formatTicketList(value: number[] | string | null | undefined): string {
  const ids = coerceToIdArray(value);
  if (ids.length === 0) return '';
  return ids.map(formatTicketRef).join(', ');
}

/** Parse `{219497,219501}` / `{}` / `null` / number[] uniformly. */
export function coerceToIdArray(value: number[] | string | null | undefined): number[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((n) => typeof n === 'number' && n > 0);
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '{}') return [];
  // Strip the curly braces if present (Postgres array literal form).
  const inner = trimmed.startsWith('{') && trimmed.endsWith('}')
    ? trimmed.slice(1, -1)
    : trimmed;
  return inner
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
