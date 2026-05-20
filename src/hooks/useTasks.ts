// ---------------------------------------------------------------
// React Query hooks for tasks
// ---------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminArchiveTask,
  adminCompleteTask,
  adminCreateTask,
  adminSetTaskStatus,
  adminUpdateTask,
  getTask,
  listTasksForProject,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/lib/api';
import type { TaskStatusId } from '@/lib/types';

const TASKS_FOR_PROJECT = (projectId: string) => ['tasks', 'project', projectId] as const;
const TASK_KEY = (id: string) => ['task', id] as const;

export function useTasksForProject(projectId: string | undefined, includeArchived = false) {
  return useQuery({
    queryKey: projectId ? [...TASKS_FOR_PROJECT(projectId), includeArchived] : ['tasks', 'none'],
    queryFn: () => (projectId ? listTasksForProject(projectId, includeArchived) : Promise.resolve([])),
    enabled: Boolean(projectId),
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: taskId ? TASK_KEY(taskId) : ['task', 'none'],
    queryFn: () => (taskId ? getTask(taskId) : Promise.resolve(null)),
    enabled: Boolean(taskId),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, projectId?: string, taskId?: string) {
  if (projectId) qc.invalidateQueries({ queryKey: TASKS_FOR_PROJECT(projectId) });
  if (taskId) qc.invalidateQueries({ queryKey: TASK_KEY(taskId) });
  qc.invalidateQueries({ queryKey: ['task-history'] });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateTaskInput, 'project_id'>) => adminCreateTask({ ...input, project_id: projectId }),
    onSuccess: () => invalidateAll(qc, projectId),
  });
}

export function useUpdateTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { payload: UpdateTaskInput; note?: string }) =>
      adminUpdateTask(taskId, vars.payload, vars.note),
    onSuccess: () => invalidateAll(qc, projectId, taskId),
  });
}

export function useSetTaskStatus(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { status: TaskStatusId; note?: string }) =>
      adminSetTaskStatus(taskId, vars.status, vars.note),
    onSuccess: () => invalidateAll(qc, projectId, taskId),
  });
}

export function useCompleteTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => adminCompleteTask(taskId, note),
    onSuccess: () => invalidateAll(qc, projectId, taskId),
  });
}

export function useArchiveTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminArchiveTask(taskId, reason),
    onSuccess: () => invalidateAll(qc, projectId, taskId),
  });
}
