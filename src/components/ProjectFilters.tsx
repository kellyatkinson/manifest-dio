import type { HealthId, ProjectStatusId, ProjectTypeId } from '@/lib/types';

import styles from './ProjectFilters.module.css';

export interface FilterState {
  search: string;
  status: HealthId | '';
  type: ProjectTypeId | '';
  owner: string;
  state?: ProjectStatusId | 'all';
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  ownerOptions: string[];
  showStateFilter?: boolean;
}

export function ProjectFilters({ value, onChange, ownerOptions, showStateFilter }: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const cleared: FilterState = {
    search: '',
    status: '',
    type: '',
    owner: '',
    ...(showStateFilter ? { state: 'active' as const } : {}),
  };

  return (
    <div className={styles.root}>
      <div className={styles.group}>
        <span className={styles.label}>Search</span>
        <input
          className={styles.text}
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="name, next decision, owner…"
        />
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Health</span>
        <select
          className={styles.select}
          value={value.status}
          onChange={(e) => set('status', e.target.value as HealthId | '')}
        >
          <option value="">All</option>
          <option value="red">Off track</option>
          <option value="amber">At risk</option>
          <option value="green">On track</option>
          <option value="placeholder">Watching</option>
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Type</span>
        <select
          className={styles.select}
          value={value.type}
          onChange={(e) => set('type', e.target.value as ProjectTypeId | '')}
        >
          <option value="">All</option>
          <option value="project">Project</option>
          <option value="programme">Programme</option>
          <option value="annual_cycle">Annual cycle</option>
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Owner</span>
        <select className={styles.select} value={value.owner} onChange={(e) => set('owner', e.target.value)}>
          <option value="">All</option>
          {ownerOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {showStateFilter && (
        <div className={styles.group}>
          <span className={styles.label}>State</span>
          <select
            className={styles.select}
            value={value.state ?? 'active'}
            onChange={(e) => set('state', e.target.value as ProjectStatusId | 'all')}
          >
            <option value="active">Active</option>
            <option value="archived">Closed</option>
            <option value="excluded">Excluded</option>
            <option value="all">All</option>
          </select>
        </div>
      )}

      <div className={styles.spacer} />
      <button type="button" className={styles.clear} onClick={() => onChange(cleared)}>
        Clear
      </button>
    </div>
  );
}
