// ---------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------
// Hand-written to match `app/schema.sql`. If Kelly regenerates
// these with `supabase gen types typescript` later, that output
// can replace this file -- but the shapes below are the contract
// the UI relies on.
//
// All `uuid` columns are typed as `string`. All `timestamptz`
// columns are ISO strings as returned by Supabase's REST API.
// `date` columns are ISO date strings (YYYY-MM-DD).
// ---------------------------------------------------------------

// ---- Reference enums (text PKs in the DB) -------------------------------

export type ProjectTypeId = 'project' | 'programme' | 'operational';
export type HealthId = 'green' | 'amber' | 'red' | 'placeholder';
export type ProjectStatusId = 'active' | 'archived' | 'excluded';
export type ConfidenceId = 'high' | 'medium' | 'low';
export type TaskStatusId = 'todo' | 'in_progress' | 'done' | 'cancelled';

// ---- Reference table rows -----------------------------------------------

export interface ReferenceRow<Id extends string = string> {
  id: Id;
  label: string;
  display_order: number;
}

export type ProjectType = ReferenceRow<ProjectTypeId>;
export type HealthRef = ReferenceRow<HealthId>;
export type ProjectStatusRef = ReferenceRow<ProjectStatusId>;
export type ConfidenceLevel = ReferenceRow<ConfidenceId>;
export type TaskStatus = ReferenceRow<TaskStatusId>;

// ---- Core rows ----------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  project_type: ProjectTypeId;
  owner: string | null;
  health: HealthId;
  next_decision: string | null;
  deadline: string | null;
  primary_location: string | null;
  logseq_page: string | null;
  parent_id: string | null;
  description: string | null;

  status: ProjectStatusId;
  status_reason: string | null;
  status_changed_at: string | null;
  status_changed_by_email: string | null;

  health_inferred: boolean;
  health_confidence: ConfidenceId | null;
  owner_inferred: boolean;
  owner_confidence: ConfidenceId | null;

  display_order: number;

  created_at: string;
  created_by_email: string | null;
  updated_at: string;
  updated_by_email: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatusId;
  due_date: string | null;
  priority: number | null;
  owner: string | null;
  order_index: number | null;
  archived_at: string | null;
  archived_reason: string | null;
  todoist_id: string | null;
  todoist_url: string | null;
  last_synced_at: string | null;
  sync_source: 'manifest' | 'todoist';
  created_at: string;
  created_by_email: string | null;
  updated_at: string;
  updated_by_email: string | null;
}

export interface Decision {
  id: string;
  project_id: string | null;
  question: string;
  resolution: string;
  decided_on: string | null;
  decided_by: string | null;
  created_at: string;
  created_by_email: string | null;
  updated_at: string;
  updated_by_email: string | null;
}

// ---- History rows (returned by admin_get_*_history RPCs) ----------------

export interface ProjectHistoryRow {
  id: string;
  project_id: string;
  project_name: string;
  change_group_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  was_inferred: boolean | null;
  changed_at: string;
  changed_by_email: string;
  note: string | null;
}

export interface TaskHistoryRow {
  id: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  change_group_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_email: string;
  note: string | null;
}

// ---- RPC response shape -------------------------------------------------
// Every admin_* RPC returns { ok: boolean, error?: string, ...payload }.

export interface RpcOk<T = Record<string, unknown>> {
  ok: true;
  error?: never;
  // Convenience fields commonly returned:
  id?: string;
  changed?: boolean;
  change_group_id?: string;
  // Plus any other arbitrary keys:
  [extra: string]: unknown | T;
}

export interface RpcErr {
  ok: false;
  error: string;
}

export type RpcResult<T = Record<string, unknown>> = RpcOk<T> | RpcErr;

// ---- Setting row --------------------------------------------------------

export interface Setting {
  key: string;
  value: string;
}
