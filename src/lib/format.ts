// ---------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------
// All display dates are rendered in Pacific/Auckland.
// Sortable date keys use en-CA which gives YYYY-MM-DD.
// Conventions lifted from Kelly's focus-group repo.
// ---------------------------------------------------------------

import type { ConfidenceId, ProjectStatusId, ProjectTypeId, TaskStatusId } from './types';

const NZ_TIMEZONE = 'Pacific/Auckland';

/** Display a timestamp in NZ time, e.g. "20 May 2026, 09:14". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-NZ', {
    timeZone: NZ_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Display a date-only value, e.g. "20 May 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NZ', {
    timeZone: NZ_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Sortable key in YYYY-MM-DD form (en-CA locale gives the ISO shape). */
export function sortableDateKey(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: NZ_TIMEZONE });
}

// ---- Labels -------------------------------------------------------------

export function statusLabel(s: ProjectStatusId): string {
  switch (s) {
    case 'green':
      return 'Green';
    case 'amber':
      return 'Amber';
    case 'red':
      return 'Red';
    case 'placeholder':
      return 'Placeholder';
  }
}

/** Severity ordering for status: Red > Amber > Green > Placeholder.
 *  Lower number = higher severity = appears first when sorting desc. */
export function statusSeverity(s: ProjectStatusId): number {
  switch (s) {
    case 'red':
      return 1;
    case 'amber':
      return 2;
    case 'green':
      return 3;
    case 'placeholder':
      return 4;
  }
}

export function projectTypeLabel(t: ProjectTypeId): string {
  switch (t) {
    case 'project':
      return 'Project';
    case 'programme':
      return 'Programme';
    case 'annual_cycle':
      return 'Annual cycle';
  }
}

export function taskStatusLabel(s: TaskStatusId): string {
  switch (s) {
    case 'todo':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function confidenceLabel(c: ConfidenceId | null | undefined): string {
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

// ---- History field-name humanisation ------------------------------------

export function humaniseFieldName(field: string): string {
  switch (field) {
    case 'next_decision':
      return 'Next decision';
    case 'canonical_location':
      return 'Canonical location';
    case 'logseq_page':
      return 'Logseq page';
    case 'parent_id':
      return 'Parent programme';
    case 'project_type':
      return 'Project type';
    case 'status_inferred':
      return 'Status inference';
    case 'owner_inferred':
      return 'Owner inference';
    case 'due_date':
      return 'Due date';
    case 'archived_at':
      return 'Archived';
    case 'order_index':
      return 'Order';
    default:
      return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
  }
}

/** "—" for null/empty values in display. */
export function dash(v: string | null | undefined): string {
  return v && v.trim() !== '' ? v : '—';
}
