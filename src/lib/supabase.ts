// ---------------------------------------------------------------
// Supabase client (singleton)
// ---------------------------------------------------------------
// Mirrors the auth options used in Kelly's focus-group repo
// (persistSession, autoRefreshToken, detectSessionInUrl) so OAuth
// redirect flows behave identically.
//
// IMPORTANT: only VITE_-prefixed env vars are exposed to the
// browser. Never import a service-role key here.
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in development. Kelly's seen the Vite "blank screen"
  // failure mode -- a console error is far more useful than a silent crash.
  // eslint-disable-next-line no-console
  console.error(
    '[manifest] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in the Supabase values.',
  );
}

export const supabase: SupabaseClient = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
