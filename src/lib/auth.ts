// ---------------------------------------------------------------
// Auth helpers + React hooks
// ---------------------------------------------------------------
// Google OAuth via Supabase, restricted to @diocesan.school.nz by
// the `hd` hint plus the `enforce_email_domain` trigger that lives
// on auth.users (defined in schema.sql).
//
// `useUser` subscribes to Supabase auth state and re-renders.
// `useIsAdmin` calls is_admin_email via the API wrapper -- cheap
// boolean check, cached by react-query.
// ---------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { isAdmin } from './api';

const DOMAIN_HINT = 'diocesan.school.nz';

/**
 * Start the Google OAuth flow. The browser redirects to Google and
 * back. The `hd` param hints Google to only show @diocesan accounts;
 * server-side enforcement still runs in the Supabase trigger.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        hd: DOMAIN_HINT,
        prompt: 'select_account',
      },
    },
  });
  if (error) {
    throw new Error(`signInWithGoogle: ${error.message}`);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`signOut: ${error.message}`);
}

// ---- Hooks --------------------------------------------------------------

/**
 * Returns the current Supabase user (or null) and updates on auth events.
 * `loading` is true on first paint while Supabase reads its persisted session.
 */
export function useUser(): { user: User | null; session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user: session?.user ?? null, session, loading };
}

/**
 * Cached check against `public.admins` via is_admin_email RPC.
 * Returns `{ data: boolean | undefined, isLoading: boolean }`.
 * Server-side enforcement still happens inside every admin_* RPC --
 * this hook is for UX only (show/hide edit affordances).
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user } = useUser();
  const { data, isLoading } = useQuery({
    queryKey: ['is-admin', user?.email ?? null],
    queryFn: () => isAdmin(user?.email),
    enabled: Boolean(user?.email),
    staleTime: 5 * 60 * 1000, // 5 min -- admin list rarely changes
  });
  return { isAdmin: Boolean(data), isLoading };
}
