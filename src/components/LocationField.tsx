// ---------------------------------------------------------------
// LocationField — the "where it lives" input, with a format check.
//
// primary_location follows a house format (see lib/primaryLocation).
// Keeping to it by hand is the part that slips, so this checks the
// value when the field loses focus and offers a corrected string.
//
// It never blocks a save and never rewrites silently: the field stays
// free text, and applying the suggestion is one click. Checking on
// blur rather than on every keystroke means a half-typed path is not
// flagged while it is still being typed.
// ---------------------------------------------------------------

import { useMemo, useState } from 'react';

import { LOCATION_PREFIXES, checkLocation } from '@/lib/primaryLocation';

import styles from './LocationField.module.css';

interface Props {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function LocationField({ value, onChange, id, className, placeholder }: Props) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const check = useMemo(() => checkLocation(value), [value]);
  const show = touched && !focused && !check.ok;

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setTouched(true);
        }}
        placeholder={placeholder ?? 'e.g. SharePoint: BIM Team - Documents\\Systems\\'}
        spellCheck={false}
      />

      {show && (
        <div className={styles.notice}>
          <div className={styles.problems}>
            {check.problems.map((p) => (
              <div key={p}>{p}</div>
            ))}
          </div>

          {check.suggestion ? (
            <div className={styles.suggestRow}>
              <code className={styles.suggestion}>{check.suggestion}</code>
              <button
                type="button"
                className={styles.use}
                onClick={() => {
                  onChange(check.suggestion as string);
                  setTouched(false);
                }}
              >
                Use this
              </button>
            </div>
          ) : (
            <div className={styles.prefixes}>
              Prefixes: {LOCATION_PREFIXES.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
