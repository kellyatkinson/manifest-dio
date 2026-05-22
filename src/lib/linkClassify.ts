// ---------------------------------------------------------------
// Smart link classification for activity entries.
//
// Given a URL, infer a kind ('zendesk_ticket', 'zendesk_kb', etc.)
// and a sensible default label. The label is overridable in the UI.
//
// Detection runs on submit (extract URLs from quick-log text and
// classify each), and on render of any stored link that doesn't
// already have an explicit label.
// ---------------------------------------------------------------

import type { ActivityLinkKind } from './types';

export interface ClassifiedLink {
  url: string;
  label: string;
  kind: ActivityLinkKind;
}

const URL_REGEX = /https?:\/\/[^\s<>"')]+/gi;

/** Pull all http(s) URLs out of a free-text string. Returns unique URLs in order. */
export function extractUrls(text: string): string[] {
  const found = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of found) {
    // Strip trailing punctuation that's almost certainly not part of the URL
    const url = raw.replace(/[.,;:!?)]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}

/** Classify a URL into a kind + a default label. */
export function classifyUrl(url: string): ClassifiedLink {
  let host = '';
  let pathname = '';
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    pathname = u.pathname;
  } catch {
    return { url, label: url, kind: 'external' };
  }

  // Zendesk ticket: *.zendesk.com/agent/tickets/<n>
  if (host.endsWith('.zendesk.com')) {
    const ticket = pathname.match(/\/agent\/tickets\/(\d+)/);
    if (ticket) {
      return { url, label: `Ticket #${ticket[1]}`, kind: 'zendesk_ticket' };
    }
    // Zendesk KB article: *.zendesk.com/hc/.../articles/<n>
    const kb = pathname.match(/\/hc\/(?:[a-z-]+\/)?articles\/(\d+)/);
    if (kb) {
      return { url, label: `KB article #${kb[1]}`, kind: 'zendesk_kb' };
    }
    return { url, label: 'Zendesk', kind: 'external' };
  }

  // Logseq deep link: logseq://graph/...?page=...
  if (url.startsWith('logseq://')) {
    const m = url.match(/[?&]page=([^&]+)/);
    return {
      url,
      label: m ? `[[${decodeURIComponent(m[1])}]]` : 'Logseq page',
      kind: 'logseq',
    };
  }

  // OneDrive / SharePoint
  if (
    host.includes('onedrive.live.com') ||
    host.includes('sharepoint.com') ||
    host.includes('1drv.ms') ||
    /-my\.sharepoint\.com$/.test(host)
  ) {
    return { url, label: 'OneDrive', kind: 'onedrive' };
  }

  // GitHub repo / file / PR
  if (host === 'github.com' || host.endsWith('.github.com')) {
    return { url, label: 'GitHub', kind: 'external' };
  }

  // Generic fallback: domain name as label
  const cleanHost = host.replace(/^www\./, '');
  return { url, label: cleanHost || url, kind: 'external' };
}

/** Classify several URLs at once, dedupe preserving order. */
export function classifyUrls(urls: string[]): ClassifiedLink[] {
  return urls.map(classifyUrl);
}
