import { supabase } from './supabase.js';

/**
 * Spaced-repetition state storage: local-first with Supabase as source of truth.
 * One row per (user, review item). Mirrors store.js (study history): a per-user
 * localStorage write-through cache for instant paint + offline resilience,
 * reconciled against the RLS-protected review_state table.
 */

const TABLE = 'review_state';
const CACHE_PREFIX = 'learnloop:reviews:v1:';
const COLUMNS =
  'item_key, label, easiness, interval_days, repetitions, due_date, last_grade, last_reviewed';

function cacheKey(userId) {
  return `${CACHE_PREFIX}${userId}`;
}

/** Read a user's cached review states. Never throws. */
export function readCache(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Overwrite a user's cached review states. Never throws. */
export function writeCache(userId, rows) {
  if (!userId) return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(rows));
  } catch {
    /* storage full / unavailable — Supabase remains the source of truth */
  }
}

/** Fetch a user's review states, soonest-due first. Throws on error. */
export async function fetchRemote() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Map an SM-2 result into a persist-ready snake_case row. */
export function buildReviewRow(userId, itemKey, label, next) {
  return {
    user_id: userId,
    item_key: itemKey,
    label: label || '',
    easiness: next.easiness,
    interval_days: next.intervalDays,
    repetitions: next.repetitions,
    due_date: next.dueDate,
    last_grade: next.lastGrade,
    last_reviewed: new Date().toISOString(),
  };
}

/** Insert-or-update one review row on its (user_id, item_key) key. Throws on error. */
export async function upsertRemote(row) {
  const { error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: 'user_id,item_key' });
  if (error) throw error;
}
