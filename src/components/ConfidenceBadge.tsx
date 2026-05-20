import type { ConfidenceId } from '@/lib/types';
import { confidenceLabel } from '@/lib/format';

import styles from './ConfidenceBadge.module.css';

interface Props {
  confidence: ConfidenceId | null | undefined;
}

const tone: Record<ConfidenceId, string> = {
  high: styles.high,
  medium: styles.medium,
  low: styles.low,
};

export function ConfidenceBadge({ confidence }: Props) {
  if (!confidence) return null;
  return <span className={`${styles.badge} ${tone[confidence]}`}>{confidenceLabel(confidence)}</span>;
}
