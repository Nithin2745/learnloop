import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * localStorage-backed progress tracking for a generated plan.
 *
 * Each topic-session is keyed by "<dayIndex>:<topicIndex>". Completion is
 * stored under a key derived from a signature of the plan's content, so
 * regenerating the same plan restores its ticks while a different plan starts
 * fresh. No backend, no DB — survives refresh within the browser.
 */

function signature(plan) {
  const basis = (plan?.schedule || [])
    .map(
      (d) =>
        `${d.date}|${(d.topics || [])
          .map((t) => `${t.name}${t.isReview ? '*' : ''}`)
          .join(',')}`,
    )
    .join(';');
  let h = 5381;
  for (let i = 0; i < basis.length; i++) {
    h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export function useProgress(plan) {
  const storageKey = useMemo(() => `learnloop:progress:v1:${signature(plan)}`, [plan]);

  const allKeys = useMemo(() => {
    const keys = [];
    (plan?.schedule || []).forEach((d, di) =>
      (d.topics || []).forEach((_, ti) => keys.push(`${di}:${ti}`)),
    );
    return keys;
  }, [plan]);

  const [completed, setCompleted] = useState(() => new Set());

  // Load (and prune to still-valid keys) whenever the plan changes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? JSON.parse(raw) : [];
      const valid = new Set(allKeys);
      setCompleted(new Set(arr.filter((k) => valid.has(k))));
    } catch {
      setCompleted(new Set());
    }
  }, [storageKey, allKeys]);

  const persist = useCallback(
    (set) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...set]));
      } catch {
        /* storage full / unavailable — progress just won't persist */
      }
    },
    [storageKey],
  );

  const toggle = useCallback(
    (key) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    const empty = new Set();
    setCompleted(empty);
    persist(empty);
  }, [persist]);

  const total = allKeys.length;
  const done = completed.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return { completed, toggle, reset, total, done, pct };
}
