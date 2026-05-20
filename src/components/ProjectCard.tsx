import { useNavigate } from 'react-router-dom';

import { StatusPill } from './StatusPill';
import { projectTypeLabel } from '@/lib/format';
import type { Project } from '@/lib/types';

import styles from './ProjectCard.module.css';

interface Props {
  project: Project;
}

const typeClass: Record<string, string> = {
  project: styles.typeProject,
  annual_cycle: styles.typeAnnual,
};

export function ProjectCard({ project }: Props) {
  const navigate = useNavigate();

  return (
    <article
      className={`${styles.card} ${typeClass[project.project_type] ?? ''}`}
      onClick={() => navigate(`/portfolio/${project.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/portfolio/${project.id}`)}
      aria-label={`Open ${projectTypeLabel(project.project_type).toLowerCase()}: ${project.name}`}
    >
      <div className={styles.header}>
        <span className={styles.typeBadge}>{projectTypeLabel(project.project_type)}</span>
        <StatusPill status={project.status} inferred={project.status_inferred} />
      </div>

      <h3 className={styles.title}>{project.name}</h3>

      <div className={styles.footer}>
        <span className={styles.owner}>
          {project.owner ?? <span className={styles.muted}>unassigned</span>}
        </span>
        {project.deadline && (
          <span className={styles.deadline}>{project.deadline}</span>
        )}
      </div>
    </article>
  );
}
