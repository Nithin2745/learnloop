import { createClient } from '@supabase/supabase-js';

// Both values are public by design (see frontend/.env). The app is intentionally
// unusable without them — sign-in is required — so surface a clear message if a
// clone is missing its .env rather than failing with a cryptic client error.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — add them to frontend/.env.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true, // keep the session in localStorage across reloads
    autoRefreshToken: true, // refresh the access token before it expires
    detectSessionInUrl: true, // complete the OAuth redirect handshake on load
  },
});
