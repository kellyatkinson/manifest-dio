// ---------------------------------------------------------------
// useUrls — build and resolve readable project/task URLs.
//
// Centralises every "what's the path to this project/task?" and
// "what id does this URL key map to?" decision, backed by the cached
// project + task lists. Components call projectPath()/taskPath() to
// emit links; the detail pages call resolveProject()/resolveTask() to
// turn an incoming URL key (slug-hex or raw UUID) back into an id.
// ---------------------------------------------------------------

import { useMemo } from 'react';

import { buildShortIds, isUuid, slugify, trailingToken } from '@/lib/slug';

import { useProjects } from './useProjects';
import { useAllTasks } from './useTasks';

export interface Urls {
  /** Path to a project/programme detail page (slug-hex form). */
  projectPath: (id: string | null | undefined) => string;
  /** The `slug-hex` URL segment for a project (no base path). */
  projectKey: (id: string | null | undefined) => string;
  /** Path to a task modal route under its project. */
  taskPath: (projectId: string, taskId: string) => string;
  /** URL key (slug-hex or raw UUID) → project id, or undefined if unknown. */
  resolveProject: (key: string | null | undefined) => string | undefined;
  /** URL key (slug-hex or raw UUID) → task id, or undefined if unknown. */
  resolveTask: (key: string | null | undefined) => string | undefined;
  /** Display name for a project id, when loaded. */
  projectName: (id: string | null | undefined) => string | undefined;
}

export function useUrls(): Urls {
  // 'all' so archived/closed projects also resolve and normalise.
  const { data: projects = [] } = useProjects('all');
  const { data: tasks = [] } = useAllTasks(true);

  return useMemo<Urls>(() => {
    const projShort = buildShortIds(projects.map((p) => p.id));
    const taskShort = buildShortIds(tasks.map((t) => t.id));
    const projById = new Map(projects.map((p) => [p.id, p]));
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    function projectKey(id: string | null | undefined): string {
      if (!id) return '';
      const p = projById.get(id);
      const short = projShort.idToShort.get(id);
      return p && short ? `${slugify(p.name)}-${short}` : id; // fallback to UUID
    }

    function projectPath(id: string | null | undefined): string {
      if (!id) return '/portfolio';
      const p = projById.get(id);
      const base = p?.project_type === 'programme' ? '/programmes' : '/portfolio';
      return `${base}/${projectKey(id)}`;
    }

    function taskPath(projectId: string, taskId: string): string {
      const t = taskById.get(taskId);
      const ts = taskShort.idToShort.get(taskId);
      const taskSeg = t && ts ? `${slugify(t.title)}-${ts}` : taskId;
      return `/portfolio/${projectKey(projectId)}/tasks/${taskSeg}`;
    }

    function resolveProject(key: string | null | undefined): string | undefined {
      if (!key) return undefined;
      if (isUuid(key)) return key;
      return projShort.shortToId.get(trailingToken(key));
    }

    function resolveTask(key: string | null | undefined): string | undefined {
      if (!key) return undefined;
      if (isUuid(key)) return key;
      return taskShort.shortToId.get(trailingToken(key));
    }

    function projectName(id: string | null | undefined): string | undefined {
      return id ? projById.get(id)?.name : undefined;
    }

    return { projectPath, projectKey, taskPath, resolveProject, resolveTask, projectName };
  }, [projects, tasks]);
}
