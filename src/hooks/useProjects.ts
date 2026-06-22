// ---------------------------------------------------------------
// React Query hooks for projects
// ---------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminArchiveProject,
  adminConfirmInference,
  adminDeleteProject,
  adminCreateProject,
  adminHideProject,
  adminHoldProject,
  adminRestoreProject,
  adminSetOwner,
  adminSetHealth,
  adminUpdateProject,
  getProject,
  listProjects,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@/lib/api';
import type { ConfidenceId, HealthId, ProjectStatusId } from '@/lib/types';

const PROJECTS_KEY = ['projects'] as const;
const PROJECT_KEY = (id: string) => ['project', id] as const;

export function useProjects(status: ProjectStatusId | 'all' = 'active') {
  return useQuery({
    queryKey: [...PROJECTS_KEY, status],
    queryFn: () => listProjects(status),
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

export function useSetHealth(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { health: HealthId; confidence?: ConfidenceId; note?: string }) =>
      adminSetHealth(projectId, vars.health, vars.confidence, vars.note),
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
    mutationFn: (field: 'health' | 'owner') => adminConfirmInference(projectId, field),
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

export function useHoldProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminHoldProject(projectId, reason),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => adminDeleteProject(projectId),
    onSuccess: () => invalidateAllProjects(qc),
  });
}

export function useRestoreProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => adminRestoreProject(projectId, reason),
    onSuccess: () => invalidateAllProjects(qc, projectId),
  });
}
