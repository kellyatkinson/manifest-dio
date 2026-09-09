// ---------------------------------------------------------------
// Portfolio health is rolled up, not stored.
//
// A portfolio is a container: its own stored health said nothing that
// its contents did not say better, and it went stale as soon as the
// work below it moved. So a portfolio shows the worst health among
// its live rows — off track if any row is, then at risk, then on
// track — and falls back to its stored value only while it is empty.
//
// The roll-up is applied where projects are read (see useProjects),
// so every view agrees, and a rolled-up row is marked so the UI can
// show its health as derived rather than editable.
// ---------------------------------------------------------------

import type { HealthId, Project } from './types';

/** Worst first. 'placeholder' means no health set, so it never wins
 *  over a real one. */
const SEVERITY: HealthId[] = ['red', 'amber', 'green', 'placeholder'];

/** The worst health present, or null when there is nothing to judge. */
export function worstHealth(items: readonly { health: HealthId }[]): HealthId | null {
  for (const h of SEVERITY) {
    if (items.some((i) => i.health === h)) return h;
  }
  return null;
}

/** Everything below `id`, at any depth. Guarded against a bad
 *  parent_id loop, which the database does not prevent. */
function descendantsOf(id: string, childrenByParent: Map<string, Project[]>): Project[] {
  const out: Project[] = [];
  const seen = new Set<string>([id]);
  const walk = (parent: string) => {
    for (const child of childrenByParent.get(parent) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
      walk(child.id);
    }
  };
  walk(id);
  return out;
}

/** Replace each portfolio's health with the worst among its live
 *  rows. Rows that are not portfolios are returned untouched. */
export function applyPortfolioRollUp(projects: Project[]): Project[] {
  const childrenByParent = new Map<string, Project[]>();
  for (const p of projects) {
    if (!p.parent_id) continue;
    const list = childrenByParent.get(p.parent_id) ?? [];
    list.push(p);
    childrenByParent.set(p.parent_id, list);
  }

  return projects.map((p) => {
    const isPortfolio = p.project_type === 'programme' && !p.parent_id;
    if (!isPortfolio) return p;

    const below = descendantsOf(p.id, childrenByParent);
    const rolled = worstHealth(below);
    // An empty portfolio keeps whatever is stored — there is nothing
    // to roll up from, and inventing a health would be a guess.
    if (!rolled) return p;

    return { ...p, health: rolled, health_rolled_up: true };
  });
}
