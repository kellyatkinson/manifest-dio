import { useNavigate } from 'react-router-dom';

import { useUrls } from '@/hooks/useUrls';
import { StatusPill } from './StatusPill';
import { dash } from '@/lib/format';
import type { Project } from '@/lib/types';

import styles from './ProgrammeCard.module.css';

interface Props {
  project: Project;
  children?: Project[];
}

export function ProgrammeCard({ project, children = [] }: Props) {
  const navigate = useNavigate();
  const { projectPath } = useUrls();

  return (
    <article className={styles.card}>
      {/* ── Programme header (clickable) ── */}
      <div
        className={styles.main}
        onClick={() => navigate(projectPath(project.id))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(projectPath(project.id))}
        aria-label={`Open programme: ${project.name}`}
      >
        <div className={styles.header}>
          <span className={styles.typeBadge}>Programme</span>
          <StatusPill status={project.health} inferred={project.health_inferred} />
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

        <div className={styles.decision}>
          <span className={styles.decisionLabel}>Next decision</span>
          <span className={styles.decisionText}>
            {project.next_decision && project.next_decision.trim() !== ''
              ? project.next_decision
              : dash(null)}
          </span>
        </div>
      </div>

      {/* ── Nested projects ── */}
      {children.length > 0 && (
        <div className={styles.children}>
          <div className={styles.childrenHeader}>
            <span className={styles.childrenLabel}>Projects</span>
            <span className={styles.childrenCount}>{children.length}</span>
          </div>
          <div className={styles.childGrid}>
            {children.map((child) => (
              <div
                key={child.id}
                className={styles.childCard}
                onClick={() => navigate(projectPath(child.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(projectPath(child.id))}
              >
                <div className={styles.childTop}>
                  <StatusPill status={child.health} inferred={child.health_inferred} />
                </div>
                <div className={styles.childName}>{child.name}</div>
                <div className={styles.childMeta}>
                  <span>{child.owner ?? <span className={styles.muted}>unassigned</span>}</span>
                  {child.deadline && <span className={styles.childDeadline}>{child.deadline}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
