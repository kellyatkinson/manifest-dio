// ---------------------------------------------------------------
// Login page
// ---------------------------------------------------------------
// Single-button Google OAuth flow. Restricted to @diocesan.school.nz
// via the `hd` Google hint plus the server-side
// `enforce_email_domain` trigger in Supabase (see schema.sql).
//
// If a session already exists, redirect straight through to /.
// ---------------------------------------------------------------

import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { signInWithGoogle, useUser } from '@/lib/auth';
import styles from './Login.module.css';

export function Login() {
  const { user, loading } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (user) {
    return <Navigate to="/portfolio" replace />;
  }

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setBusy(false);
    }
    // Note: on success the browser navigates away to Google, so no setBusy(false) needed here.
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Manifest</div>
          <div className={styles.brandSub}>Portfolio Inventory</div>
        </div>

        <p className={styles.intro}>
          Sign in with your Diocesan School for Girls account to view and edit
          the BIM portfolio inventory.
        </p>

        <button
          type="button"
          className={styles.signIn}
          onClick={() => {
            void handleSignIn();
          }}
          disabled={busy}
        >
          {busy ? 'Redirecting…' : 'Sign in with Google'}
        </button>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.foot}>
          Only @diocesan.school.nz accounts may sign in.
        </div>
      </div>
    </div>
  );
}
