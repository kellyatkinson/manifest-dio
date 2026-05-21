import { useNavigate } from 'react-router-dom';

import { StatusPill } from './StatusPill';
import { projectTypeLabel } from '@/lib/format';
import type { Project } from '@/lib/types';

import styles from './ProjectCard.module.css';

interface Props {
  project: Project;
  parentName?: string; // name of the parent programme, if any
}

const typeClass: Record<string, string> = {
  project: styles.typeProject,
  annual_cycle: styles.typeAnnual,
};

// Deterministic colour index from programme name — consistent across renders,
// no DB field required. 6 colour slots defined in the CSS module.
function programmeColorIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
  }
  return Math.abs(h) % 6;
}

export function ProjectCard({ project, parentName }: Props) {
  const navigate = useNavigate();

  const programmeTag = parentName !== undefined ? (
    parentName ? (
      <span
        className={`${styles.programmeTag} ${styles[`prog${programmeColorIdx(parentName)}`]}`}
        title={`Part of programme: ${parentName}`}
      >
        ↳ {parentName}
      </span>
    ) : (
      <span className={`${styles.programmeTag} ${styles.progStandalone}`}>
        Standalone
      </span>
    )
  ) : null;

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

      {programmeTag && <div className={styles.programmeRow}>{programmeTag}</div>}

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
