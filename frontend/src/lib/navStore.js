/**
 * navStore — a tiny sessionStorage-backed pointer to where the user is in the
 * app, so a page reload lands back in the same section instead of resetting to
 * the Setup (topic-input) screen.
 *
 * We deliberately persist only a POINTER, never content: the view/mode the user
 * is on, and the id of the saved-history row the active session belongs to (if
 * any). App.jsx restores by re-opening that row from history (the real source of
 * truth — localStorage cache + Supabase), so we never duplicate plan/learn/
 * revise content here and it can never go stale.
 *
 * sessionStorage (not localStorage) is intentional: the pointer should survive a
 * reload of THIS tab, but a brand-new tab/visit should still start on the home
 * Setup screen rather than silently reopening an old session.
 */
const KEY = 'learnloop:nav:v1';

/** Read the saved pointer, or null if absent/corrupt. */
export function readNav() {
  try {
    const raw = sessionStorage.getItem(KEY);
    const ptr = raw ? JSON.parse(raw) : null;
    return ptr && typeof ptr === 'object' ? ptr : null;
  } catch {
    return null;
  }
}

/** Persist the current nav pointer (best-effort; ignores storage errors). */
export function writeNav(ptr) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ptr));
  } catch {
    /* storage full/unavailable — navigation still works in-memory */
  }
}

/** Forget the pointer (e.g. on sign-out). */
export function clearNav() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
