// ---------------------------------------------------------------
// Stable accent colour per programme. Used by the dashboard
// programme tiles and anywhere else a programme needs a visual
// identity beyond its name.
//
// Hashes the programme ID to one of N preset accents so the same
// programme always gets the same colour across sessions.
// ---------------------------------------------------------------

export const PROGRAMME_ACCENTS = [
  '#004990', // Dio Blue (deep)
  '#1D9E75', // Teal
  '#D85A30', // Coral
  '#D4537E', // Pink
  '#534AB7', // Purple
  '#EF9F27', // Amber
] as const;

export type ProgrammeAccent = (typeof PROGRAMME_ACCENTS)[number];

/** Deterministic hash from string to integer. */
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Pick a stable accent for a programme by id (preferred) or by name. */
export function accentFor(idOrName: string): ProgrammeAccent {
  if (!idOrName) return PROGRAMME_ACCENTS[0];
  return PROGRAMME_ACCENTS[djb2(idOrName) % PROGRAMME_ACCENTS.length];
}
