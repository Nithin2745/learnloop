import { supabase } from './supabase.js';

/**
 * Study-history storage: local-first with Supabase as the source of truth.
 *
 * Supabase (RLS-protected: a user only ever sees their own rows) holds the real
 * data; localStorage is a per-user write-through cache so the History view
 * paints instantly and survives a flaky network. Row ids + timestamps are
 * generated client-side so an optimistic cache entry and its Supabase row share
 * identity (no duplicate after a refresh).
 */

const TABLE = 'study_sessions';
const CACHE_PREFIX = 'learnloop:history:v1:';
// Select every column so optional, later-added content columns (learn / revise)
// come back when present — and reads keep working before that migration is run.
const COLUMNS = '*';

function cacheKey(userId) {
  return `${CACHE_PREFIX}${userId}`;
}

/** Read the cached session list for a user (newest first). Never throws. */
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

/** Overwrite the cached session list for a user. Never throws. */
export function writeCache(userId, sessions) {
  if (!userId) return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(sessions));
  } catch {
    /* storage full / unavailable — Supabase remains the source of truth */
  }
}

/** Fetch a user's saved sessions from Supabase, newest first. Throws on error. */
export async function fetchRemote() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Build a persist-ready row from an App setup + generated plan. Columns are
 * snake_case to match the table; the app's camelCase setup is mapped here.
 */
export function buildSessionRow(userId, { topics, examDate, hoursPerDay, plan }) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
    topics: Array.isArray(topics) ? topics : [],
    exam_date: examDate || null,
    hours_per_day: Number.isFinite(hoursPerDay) ? hoursPerDay : null,
    plan,
  };
}

/** Insert a prepared row. Throws on error so the caller can keep the local copy. */
export async function insertRemote(row) {
  const { error } = await supabase.from(TABLE).insert(row);
  if (error) throw error;
}

/** Delete one session by id. Throws on error. */
export async function deleteRemote(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Patch columns on one session (e.g. { learn } or { revise } once generated).
 * Throws on error so the caller can keep the optimistic local copy.
 */
export async function updateRemote(id, patch) {
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
  if (error) throw error;
}
