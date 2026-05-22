// ---------------------------------------------------------------
// React Query hooks for activity log
// ---------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminDeleteActivity,
  adminLogActivity,
  listActivityForProject,
  listActivityForProjects,
  listRecentActivity,
  type LogActivityInput,
} from '@/lib/api';

const ACTIVITY_KEY = ['activity'] as const;

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: [...ACTIVITY_KEY, 'recent', limit],
    queryFn: () => listRecentActivity(limit),
    staleTime: 15 * 1000,
  });
}

export function useProjectActivity(projectId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: projectId ? [...ACTIVITY_KEY, 'project', projectId, limit] : [...ACTIVITY_KEY, 'project', 'none'],
    queryFn: () => (projectId ? listActivityForProject(projectId, limit) : Promise.resolve([])),
    enabled: Boolean(projectId),
    staleTime: 15 * 1000,
  });
}

/** Roll-up activity across a list of project IDs (a programme + its children). */
export function useProjectsActivity(projectIds: string[], limit = 50) {
  const key = [...ACTIVITY_KEY, 'projects', [...projectIds].sort().join(','), limit];
  return useQuery({
    queryKey: key,
    queryFn: () => listActivityForProjects(projectIds, limit),
    enabled: projectIds.length > 0,
    staleTime: 15 * 1000,
  });
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ACTIVITY_KEY });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogActivityInput) => adminLogActivity(input),
    onSuccess: () => invalidateActivity(qc),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => adminDeleteActivity(activityId),
    onSuccess: () => invalidateActivity(qc),
  });
}
