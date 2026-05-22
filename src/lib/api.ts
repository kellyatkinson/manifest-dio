// ---------------------------------------------------------------
// RPC wrappers
// ---------------------------------------------------------------
// One async function per admin_* RPC defined in `app/schema.sql`.
// Each function:
//   - calls supabase.rpc(name, args)
//   - throws if the network call failed
//   - throws if the RPC returned { ok: false, error: '...' }
//   - returns the parsed payload otherwise
//
// React Query handles error states. This wrapper is the only
// place we look at the {ok, error} envelope.
// ---------------------------------------------------------------

import { supabase } from './supabase';
import type {
  ConfidenceId,
  Decision,
  Project,
  ProjectHistoryRow,
  HealthId,
  ProjectTypeId,
  RpcOk,
  Setting,
  Task,
  TaskHistoryRow,
  TaskStatusId,
  ProjectType,
  HealthRef,
  ProjectStatusRef,
  ConfidenceLevel,
  TaskStatus,
} from './types';

// ---- Low-level helper ---------------------------------------------------

/**
 * Call a Supabase RPC and unwrap the {ok, error} envelope.
 * Throws on network error or `{ok: false}` response.
 */
export async function callRpc<T = Record<string, unknown>>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<RpcOk<T>> {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    throw new Error(`[${name}] ${error.message}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error(`[${name}] unexpected response: ${JSON.stringify(data)}`);
  }

  const envelope = data as { ok?: boolean; error?: string };
  if (envelope.ok !== true) {
    throw new Error(`[${name}] ${envelope.error ?? 'unknown error'}`);
  }

  return envelope as RpcOk<T>;
}

// =========================================================================
// Reads (PostgREST -- direct table selects)
// =========================================================================

export async function listProjects(status: 'active' | 'archived' | 'excluded' | 'all' = 'active'): Promise<Project[]> {
  let query = supabase.from('projects').select('*').order('display_order', { ascending: true });
  if (status !== 'all') {
    query = supabase.from('projects').select('*').eq('status', status).order(
      status === 'active' ? 'display_order' : 'updated_at',
      { ascending: status === 'active' },
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(`getProject: ${error.message}`);
  return (data as Project) ?? null;
}

export async function listAllTasks(includeArchived = false): Promise<Task[]> {
  let q = supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (!includeArchived) {
    q = q.is('archived_at', null);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listAllTasks: ${error.message}`);
  return (data ?? []) as Task[];
}

export async function listTasksForProject(projectId: string, includeArchived = false): Promise<Task[]> {
  let q = supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true, nullsFirst: false });
  if (!includeArchived) {
    q = q.is('archived_at', null);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listTasksForProject: ${error.message}`);
  return (data ?? []) as Task[];
}

export async function getTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();
  if (error) throw new Error(`getTask: ${error.message}`);
  return (data as Task) ?? null;
}

export async function listDecisions(): Promise<Decision[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .order('decided_on', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`listDecisions: ${error.message}`);
  return (data ?? []) as Decision[];
}

export async function listSettings(): Promise<Setting[]> {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) throw new Error(`listSettings: ${error.message}`);
  return (data ?? []) as Setting[];
}

// ---- Reference tables (for dropdowns) ----

export async function listProjectTypes(): Promise<ProjectType[]> {
  const { data, error } = await supabase.from('project_types').select('*').order('display_order');
  if (error) throw new Error(`listProjectTypes: ${error.message}`);
  return (data ?? []) as ProjectType[];
}

export async function listProjectStatuses(): Promise<HealthRef[]> {
  const { data, error } = await supabase.from('health_levels').select('*').order('display_order');
  if (error) throw new Error(`listProjectStatuses: ${error.message}`);
  return (data ?? []) as HealthRef[];
}

export async function listProjectStates(): Promise<ProjectStatusRef[]> {
  const { data, error } = await supabase.from('project_statuses').select('*').order('display_order');
  if (error) throw new Error(`listProjectStates: ${error.message}`);
  return (data ?? []) as ProjectStatusRef[];
}

export async function listConfidenceLevels(): Promise<ConfidenceLevel[]> {
  const { data, error } = await supabase.from('confidence_levels').select('*').order('display_order');
  if (error) throw new Error(`listConfidenceLevels: ${error.message}`);
  return (data ?? []) as ConfidenceLevel[];
}

export async function listTaskStatuses(): Promise<TaskStatus[]> {
  const { data, error } = await supabase.from('task_statuses').select('*').order('display_order');
  if (error) throw new Error(`listTaskStatuses: ${error.message}`);
  return (data ?? []) as TaskStatus[];
}

// =========================================================================
// Writes (admin_* RPCs)
// =========================================================================

// ---- Projects ----

export interface CreateProjectInput {
  name: string;
  project_type: ProjectTypeId;
  health: HealthId;
  owner?: string;
  next_decision?: string;
  deadline?: string;
  primary_location?: string;
  logseq_page?: string;
  parent_id?: string | null;
  description?: string | null;
  health_inferred?: boolean;
  health_confidence?: ConfidenceId;
  owner_inferred?: boolean;
  owner_confidence?: ConfidenceId;
  display_order?: number;
}

export function adminCreateProject(payload: CreateProjectInput) {
  return callRpc<{ id: string }>('admin_create_project', { p_payload: payload });
}

export interface UpdateProjectInput {
  name?: string;
  project_type?: ProjectTypeId;
  owner?: string | null;
  health?: HealthId;
  health_confidence?: ConfidenceId;
  owner_confidence?: ConfidenceId;
  next_decision?: string | null;
  deadline?: string | null;
  primary_location?: string | null;
  logseq_page?: string | null;
  parent_id?: string | null;
  description?: string | null;
  display_order?: number;
}

export function adminUpdateProject(projectId: string, payload: UpdateProjectInput, note?: string) {
  return callRpc<{ changed: boolean; change_group_id: string }>('admin_update_project', {
    p_project_id: projectId,
    p_payload: payload,
    p_note: note ?? null,
  });
}

export function adminSetHealth(projectId: string, health: HealthId, confidence?: ConfidenceId, note?: string) {
  return callRpc('admin_set_health', {
    p_project_id: projectId,
    p_health: health,
    p_confidence: confidence ?? null,
    p_note: note ?? null,
  });
}

export function adminSetOwner(projectId: string, owner: string | null, confidence?: ConfidenceId, note?: string) {
  return callRpc('admin_set_owner', {
    p_project_id: projectId,
    p_owner: owner,
    p_confidence: confidence ?? null,
    p_note: note ?? null,
  });
}

export function adminConfirmInference(projectId: string, field: 'health' | 'owner') {
  return callRpc('admin_confirm_inference', { p_project_id: projectId, p_field: field });
}

export function adminArchiveProject(projectId: string, reason?: string) {
  return callRpc('admin_archive_project', { p_project_id: projectId, p_reason: reason ?? null });
}

export function adminHideProject(projectId: string, reason?: string) {
  return callRpc('admin_hide_project', { p_project_id: projectId, p_reason: reason ?? null });
}

export function adminRestoreProject(projectId: string, reason?: string) {
  return callRpc('admin_restore_project', { p_project_id: projectId, p_reason: reason ?? null });
}

// ---- Decisions ----

export interface CreateDecisionInput {
  project_id?: string | null;
  question?: string;
  resolution: string;
  decided_on?: string;
  decided_by?: string;
}

export function adminAddDecision(payload: CreateDecisionInput) {
  return callRpc<{ id: string }>('admin_add_decision', { p_payload: payload });
}

export function adminUpdateDecision(decisionId: string, payload: Partial<CreateDecisionInput>) {
  return callRpc('admin_update_decision', { p_decision_id: decisionId, p_payload: payload });
}

export function adminDeleteDecision(decisionId: string) {
  return callRpc('admin_delete_decision', { p_decision_id: decisionId });
}

// ---- Settings ----

export function adminSetSetting(key: string, value: string) {
  return callRpc('admin_set_setting', { p_key: key, p_value: value });
}

// ---- Tasks ----

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatusId;
  due_date?: string;
  priority?: number;
  owner?: string;
  order_index?: number;
}

export function adminCreateTask(payload: CreateTaskInput) {
  return callRpc<{ id: string }>('admin_create_task', { p_payload: payload });
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatusId;
  due_date?: string | null;
  priority?: number | null;
  owner?: string | null;
  order_index?: number;
}

export function adminUpdateTask(taskId: string, payload: UpdateTaskInput, note?: string) {
  return callRpc<{ changed: boolean; change_group_id: string }>('admin_update_task', {
    p_task_id: taskId,
    p_payload: payload,
    p_note: note ?? null,
  });
}

export function adminSetTaskStatus(taskId: string, status: TaskStatusId, note?: string) {
  return callRpc('admin_set_task_status', { p_task_id: taskId, p_status: status, p_note: note ?? null });
}

export function adminCompleteTask(taskId: string, note?: string) {
  return callRpc('admin_complete_task', { p_task_id: taskId, p_note: note ?? null });
}

export function adminArchiveTask(taskId: string, reason?: string) {
  return callRpc('admin_archive_task', { p_task_id: taskId, p_reason: reason ?? null });
}

// ---- History ----

export async function adminGetProjectHistory(projectId?: string | null): Promise<ProjectHistoryRow[]> {
  const { data, error } = await supabase.rpc('admin_get_project_history', {
    p_project_id: projectId ?? null,
  });
  if (error) throw new Error(`admin_get_project_history: ${error.message}`);
  return (data ?? []) as ProjectHistoryRow[];
}

export async function adminGetTaskHistory(taskId?: string | null): Promise<TaskHistoryRow[]> {
  const { data, error } = await supabase.rpc('admin_get_task_history', { p_task_id: taskId ?? null });
  if (error) throw new Error(`admin_get_task_history: ${error.message}`);
  return (data ?? []) as TaskHistoryRow[];
}

// ---- Admin check ----

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase.rpc('is_admin_email', { p_email: email });
  if (error) {
    // is_admin_email is a public helper -- a failure here means we couldn't talk to Supabase at all.
    // Default to "not admin" to fail safe.
    // eslint-disable-next-line no-console
    console.warn('[manifest] is_admin_email failed, defaulting to non-admin:', error.message);
    return false;
  }
  return Boolean(data);
}
