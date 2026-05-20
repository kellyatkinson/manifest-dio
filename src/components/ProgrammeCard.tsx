import { useNavigate } from 'react-router-dom';

import { StatusPill } from './StatusPill';
import { dash } from '@/lib/format';
import type { Project } from '@/lib/types';

import styles from './ProgrammeCard.module.css';

interface Props {
  project: Project;
}

export function ProgrammeCard({ project }: Props) {
  const navigate = useNavigate();

  return (
    <article
      className={styles.card}
      onClick={() => navigate(`/portfolio/${project.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/portfolio/${project.id}`)}
      aria-label={`Open programme: ${project.name}`}
    >
      <div className={styles.header}>
        <span className={styles.typeBadge}>Programme</span>
        <StatusPill status={project.status} inferred={project.status_inferred} />
      </div>

      <h2 className={styles.title}>{project.name}</h2>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Owner</span>
          <span className={styles.metaValue}>
            {project.owner ?? <span className={styles.muted}>unassigned</span>}
          </span>
        </div>
        {project.deadline && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Deadline</span>
            <span className={styles.metaValue}>{project.deadline}</span>
          </div>
        )}
      </div>

      {project.next_decision && project.next_decision.trim() !== '' && (
        <div className={styles.decision}>
          <span className={styles.decisionLabel}>Next decision</span>
          <span className={styles.decisionText}>{dash(project.next_decision)}</span>
        </div>
      )}
    </article>
  );
}
