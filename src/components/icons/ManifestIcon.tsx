// Manifest app icon -- clipboard / checklist glyph (Dio-purchased,
// 2026-05-28). Renders inline so CSS `color` controls the fill via
// currentColor on the path.

import { MANIFEST_ICON_PATH_D } from './manifestIconPath';

interface Props {
  className?: string;
  title?: string;
}

export function ManifestIcon({ className, title }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 1200"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path fill="currentColor" d={MANIFEST_ICON_PATH_D} />
    </svg>
  );
}
