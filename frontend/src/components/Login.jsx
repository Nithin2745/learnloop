import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

/**
 * Sign-in screen shown whenever there is no session. Google is the only
 * provider (configured in the Supabase dashboard). On success the browser is
 * redirected to Google and back, so we don't reset `busy` on the happy path.
 */
export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setBusy(true);
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err.message || 'Could not start sign-in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
            <span className="text-2xl font-bold">L</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Welcome to LearnLoop</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to build study plans, learn, and revise with AI.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-rose-600">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          We only use your Google account to sign you in.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
