// ---------------------------------------------------------------
// React Query hooks for projects
// ---------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminArchiveProject,
  adminConfirmInference,
  adminCreateProject,
  adminHideProject,
  adminRestoreProject,
  adminSetOwner,
  adminSetStatus,
  adminUpdateProject,
  getProject,
  listProjects,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@/lib/api';
import type { ConfidenceId, ProjectStateId, ProjectStatusId } from '@/lib/types';

const PROJECTS_KEY = ['projects'] as const;
const PROJECT_KEY = (id: string) => ['project', id] as const;

export function useProjects(state: ProjectStateId | 'all' = 'active') {
  return useQuery({
    queryKey: [...PROJECTS_KEY, state],
    queryFn: () => listProjects(state),
    staleTime: 30 * 1000,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? PROJECT_KEY(projectId) : ['project', 'none'],
    queryFn: () => (projectId ? getProject(projectId) : Promise.resolve(null)),
    enabled: Boolean(projectId),
  });
}

// ---- Mutations ----------------------------------------------------------

function invalidateAllProjects(qc: ReturnType<typeof useQueryClient>, projectId?: string) {
  qc.invalidateQueries({ queryKey: PROJECTS_KEY });
  if (projectId) qc.invalidateQueries({ queryKey: PROJECT_KEY(projectId) });
  qc.invalidateQueries({ queryKey: ['project-history'] });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => adminCreateProject(input),
    onSuccess: () => invalidateAllProjects(qc),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { payload: UpdateProjectInput; note?: string }) =>
      adminUpdateProject(projectId, vars.payload, vars.note),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useSetStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { status: ProjectStatusId; confidence?: ConfidenceId; note?: string }) =>
      adminSetStatus(projectId, vars.status, vars.confidence, vars.note),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useSetOwner(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { owner: string | null; confidence?: ConfidenceId; note?: string }) =>
      adminSetOwner(projectId, vars.owner, vars.confidence, vars.note),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useConfirmInference(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (field: 'status' | 'owner') => adminConfirmInference(projectId, field),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useArchiveProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminArchiveProject(projectId, reason),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useHideProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminHideProject(projectId, reason),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useRestoreProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminRestoreProject(projectId, reason),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}
