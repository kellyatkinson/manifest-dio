// ---------------------------------------------------------------
// React Query hooks for reference tables (dropdown options)
// ---------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';

import {
  listConfidenceLevels,
  listProjectStates,
  listProjectStatuses,
  listProjectTypes,
  listTaskStatuses,
} from '@/lib/api';

// Reference tables almost never change; cache them aggressively.
const REF_OPTS = { staleTime: 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000 };

export function useProjectTypes() {
  return useQuery({ queryKey: ['ref', 'project_types'], queryFn: listProjectTypes, ...REF_OPTS });
}

export function useProjectStatuses() {
  return useQuery({ queryKey: ['ref', 'project_statuses'], queryFn: listProjectStatuses, ...REF_OPTS });
}

export function useProjectStates() {
  return useQuery({ queryKey: ['ref', 'project_states'], queryFn: listProjectStates, ...REF_OPTS });
}

export function useConfidenceLevels() {
  return useQuery({ queryKey: ['ref', 'confidence_levels'], queryFn: listConfidenceLevels, ...REF_OPTS });
}

export function useTaskStatuses() {
  return useQuery({ queryKey: ['ref', 'task_statuses'], queryFn: listTaskStatuses, ...REF_OPTS });
}
