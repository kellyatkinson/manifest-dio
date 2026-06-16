// ---------------------------------------------------------------
// slug.ts — readable URL keys for projects and tasks.
//
// A URL key looks like `hr-reporting-dashboards-a3f9`: a slugified
// name plus a short hex token. The hex is a stable hash of the row's
// UUID, so it survives renames (the slug part is cosmetic — resolution
// uses the trailing hex). Raw UUIDs still resolve too, so old links and
// bookmarks keep working.
// ---------------------------------------------------------------

/** Lowercase, hyphenated, ASCII-only slug. Empty names fall back to 'item'. */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'item';
}

/** FNV-1a 32-bit hash → 8-char hex. Distributes even sequential UUIDs well
 *  (so the seeded 0000…0001-style ids don't collide on a short prefix). */
function fullHex(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Build bidirectional id⇄short-hex maps for a set of UUIDs. Uses the
 * shortest uniform length (≥4) that keeps every short id unique.
 */
export function buildShortIds(ids: string[]): {
  idToShort: Map<string, string>;
  shortToId: Map<string, string>;
} {
  for (let len = 4; len <= 8; len++) {
    const idToShort = new Map<string, string>();
    const shortToId = new Map<string, string>();
    let collision = false;
    for (const id of ids) {
      const short = fullHex(id).slice(0, len);
      if (shortToId.has(short)) {
        collision = true;
        break;
      }
      idToShort.set(id, short);
      shortToId.set(short, id);
    }
    if (!collision) return { idToShort, shortToId };
  }
  // Fallback (practically unreachable): full 8-char hex.
  const idToShort = new Map<string, string>();
  const shortToId = new Map<string, string>();
  for (const id of ids) {
    const h = fullHex(id);
    idToShort.set(id, h);
    shortToId.set(h, id);
  }
  return { idToShort, shortToId };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** The trailing `-`-delimited token of a key (the short hex we appended). */
export function trailingToken(key: string): string {
  const i = key.lastIndexOf('-');
  return i >= 0 ? key.slice(i + 1) : key;
}
