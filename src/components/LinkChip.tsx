// ---------------------------------------------------------------
// Small clickable chip for a link attached to an activity entry.
// Icon, label, and external-link affordance vary by kind.
// ---------------------------------------------------------------

import type { ActivityLink } from '@/lib/types';
import { classifyUrl } from '@/lib/linkClassify';

import styles from './LinkChip.module.css';

interface Props {
  link: ActivityLink;
  size?: 'sm' | 'md';
}

const KIND_GLYPH: Record<string, string> = {
  zendesk_ticket: '🎫',
  zendesk_kb: '📘',
  logseq: '◉',
  onedrive: '📁',
  external: '↗',
};

// Plain-text glyphs so the chip works even without an icon font.
// The Tabler/icon fonts in the host page aren't loaded in this app,
// so we keep this rendering self-sufficient.

export function LinkChip({ link, size = 'sm' }: Props) {
  // Fall back to URL classification if the link wasn't classified server-side.
  const inferred = link.label && link.kind ? null : classifyUrl(link.url);
  const label = link.label ?? inferred?.label ?? link.url;
  const kind = (link.kind ?? inferred?.kind ?? 'external') as keyof typeof KIND_GLYPH;
  const glyph = KIND_GLYPH[kind] ?? KIND_GLYPH.external;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.chip} ${styles[`chip_${kind}`] ?? ''} ${styles[`size_${size}`]}`}
      title={link.url}
    >
      <span className={styles.glyph} aria-hidden>
        {glyph}
      </span>
      <span className={styles.label}>{label}</span>
    </a>
  );
}
