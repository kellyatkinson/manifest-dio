// ---------------------------------------------------------------
// React Query hooks for project_history and task_history
// ---------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';

import { adminGetProjectHistory, adminGetTaskHistory } from '@/lib/api';

export function useProjectHistory(projectId?: string | null) {
  return useQuery({
    queryKey: ['project-history', projectId ?? 'all'],
    queryFn: () => adminGetProjectHistory(projectId),
  });
}

export function useTaskHistory(taskId?: string | null) {
  return useQuery({
    queryKey: ['task-history', taskId ?? 'all'],
    queryFn: () => adminGetTaskHistory(taskId),
  });
}
