import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  readCache,
  writeCache,
  fetchRemote,
  buildReviewRow,
  upsertRemote,
} from '../lib/reviewStore.js';
import { sm2, qualityFromScore, localDateISO, isDue } from '../lib/sm2.js';

/**
 * React binding over the spaced-repetition store. Local-first (same pattern as
 * useHistory): paints the cache, reconciles with Supabase, and applies reviews
 * optimistically so a graded answer still schedules a review when the network
 * write fails. `dueToday` is derived in the client's local timezone.
 *
 * Pass the signed-in user's id; with no user it stays empty and does no I/O.
 */
export function useReviews(userId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setReviews([]);
      return undefined;
    }
    let active = true;
    setReviews(readCache(userId)); // instant paint from cache
    setLoading(true);
    fetchRemote()
      .then((remote) => {
        if (!active) return;
        setReviews(remote);
        writeCache(userId, remote);
      })
      .catch(() => {
        /* offline or table missing — keep showing the cache */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // Grade -> SM-2 -> upsert. Optimistic: the new state is applied to memory +
  // cache first, so a review still counts if the Supabase write fails.
  const recordReview = useCallback(
    async ({ itemKey, label, score }) => {
      if (!userId || !itemKey) return null;
      let row;
      setReviews((prev) => {
        const existing = prev.find((r) => r.item_key === itemKey);
        const next = sm2(
          {
            easiness: existing?.easiness,
            intervalDays: existing?.interval_days,
            repetitions: existing?.repetitions,
          },
          qualityFromScore(score),
        );
        row = buildReviewRow(userId, itemKey, label ?? existing?.label, next);
        const merged = [row, ...prev.filter((r) => r.item_key !== itemKey)];
        writeCache(userId, merged);
        return merged;
      });
      try {
        if (row) await upsertRemote(row);
      } catch {
        /* kept locally; syncs on a later successful write */
      }
      return row;
    },
    [userId],
  );

  const today = localDateISO();
  const dueToday = useMemo(
    () =>
      reviews
        .filter((r) => isDue(r.due_date, today))
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    [reviews, today],
  );

  return { reviews, dueToday, loading, recordReview };
}
