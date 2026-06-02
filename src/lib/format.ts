// ---------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------
// All display dates are rendered in Pacific/Auckland.
// Sortable date keys use en-CA which gives YYYY-MM-DD.
// Conventions lifted from Kelly's focus-group repo.
// ---------------------------------------------------------------

import type { ConfidenceId, HealthId, ProjectTypeId, TaskStatusId } from './types';
import { formatTicketList } from './zendesk';

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

export function statusLabel(s: HealthId): string {
  switch (s) {
    case 'green':
      return 'On track';
    case 'amber':
      return 'At risk';
    case 'red':
      return 'Off track';
    case 'placeholder':
      return 'Watching';
  }
}

/** Severity ordering for health: Red > Amber > Green > Placeholder.
 *  Lower number = higher severity = appears first when sorting desc. */
export function statusSeverity(s: HealthId): number {
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
    case 'operational':
      return 'Operational';
  }
}

export function taskStatusLabel(s: TaskStatusId): string {
  switch (s) {
    case 'todo':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'waiting':
      return 'Waiting';
    case 'hold':
      return 'On hold';
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
    case 'primary_location':
      return 'Where it lives';
    case 'canonical_location': // Keep for backwards compat with old history
      return 'Where it lives';
    case 'logseq_page':
      return 'Notes (Logseq)';
    case 'parent_id':
      return 'Parent programme';
    case 'project_type':
      return 'Project type';
    case 'health_inferred':
      return 'Health inference';
    case 'health':
      return 'Health';
    case 'status':
      return 'Status';
    case 'status_reason':
      return 'Status note';
    case 'status_inferred': // Keep for backwards compat with old history
      return 'Health inference';
    case 'owner_inferred':
      return 'Owner inference';
    case 'due_date':
      return 'Due date';
    case 'archived_at':
      return 'Archived';
    case 'order_index':
      return 'Order';
    case 'zendesk_tickets':
      return 'Zendesk tickets';
    default:
      return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
  }
}

/** "—" for null/empty values in display. */
export function dash(v: string | null | undefined): string {
  return v && v.trim() !== '' ? v : '—';
}

// ---- History field-value humanisation -----------------------------------
// Maps enum values stored in *_history.old_value / new_value to their human
// labels. Lifecycle status: archived → "Closed", excluded → "Excluded",
// active → "Active". Falls back to the raw value for anything we don't
// recognise (free-text fields, IDs, timestamps).

// Status enum values for both project lifecycle (active/on_hold/archived/excluded)
// and task statuses (todo/in_progress/waiting/hold/done/cancelled). The two
// sets don't overlap, so one combined map covers both project_history and
// task_history rows where field_name='status'.
const STATUS_VALUE_LABEL: Record<string, string> = {
  // Project lifecycle
  active: 'Active',
  on_hold: 'On hold',
  archived: 'Closed',
  excluded: 'Excluded',
  // Task statuses
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  hold: 'On hold',
  done: 'Done',
  cancelled: 'Cancelled',
};

const PROJECT_TYPE_VALUE_LABEL: Record<string, string> = {
  project: 'Project',
  programme: 'Programme',
  operational: 'Operational',
};

export function humaniseFieldValue(field: string, value: string | null | undefined): string {
  if (!value || value.trim() === '') return '—';
  switch (field) {
    case 'status':
    case 'state': // backwards compat with pre-rename history rows
      return STATUS_VALUE_LABEL[value] ?? value;
    case 'health':
      return statusLabel(value as HealthId);
    case 'project_type':
      return PROJECT_TYPE_VALUE_LABEL[value] ?? value;
    case 'health_confidence':
    case 'owner_confidence':
      return confidenceLabel(value as ConfidenceId);
    case 'zendesk_tickets': {
      const rendered = formatTicketList(value);
      return rendered === '' ? '—' : rendered;
    }
    default:
      return value;
  }
}
