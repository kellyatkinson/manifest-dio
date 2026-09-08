// ---------------------------------------------------------------
// Portfolio order and accent — the six standing work areas.
//
// The six portfolios are settled and are not expected to change, so
// the Portfolios page shows them in a fixed order with a fixed colour
// each, rather than sorting by size. The page keeps the same shape on
// every visit, which is what makes it navigable from memory.
//
// To reorder the page, reorder PORTFOLIO_ORDER — nothing else needs
// to change. If a portfolio is renamed in Manifest, update its stem
// here to match; until then it still appears, in a run after the six.
// ---------------------------------------------------------------

import { PROGRAMME_ACCENTS, accentFor, type ProgrammeAccent } from './programmeAccent';

/** Name stems, in the order the tiles appear. Matched on leading
 *  words (see portfolioRank), so "SIS replacement (Synergetic to
 *  Veracross)" matches the "sis replacement" stem. */
export const PORTFOLIO_ORDER = [
  'data governance',
  'sis replacement',
  'team and capability',
  'systems',
  'service operations and fixes',
  'reporting and analytics',
] as const;

/** Lowercase, "&" to "and", punctuation to spaces, spaces collapsed. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Position in the fixed order, or -1 for a portfolio outside the six.
 *  Compares leading words, so a parenthetical or trailing qualifier in
 *  the Manifest name still matches its stem. */
export function portfolioRank(name: string): number {
  const n = normalise(name);
  if (!n) return -1;
  return PORTFOLIO_ORDER.findIndex(
    (stem) => n === stem || n.startsWith(`${stem} `) || stem.startsWith(`${n} `),
  );
}

/** One distinct accent per fixed portfolio, by position. Anything
 *  outside the six falls back to the hashed accent. */
export function portfolioAccent(name: string, id: string): ProgrammeAccent {
  const rank = portfolioRank(name);
  return rank === -1 ? accentFor(id) : PROGRAMME_ACCENTS[rank % PROGRAMME_ACCENTS.length];
}
