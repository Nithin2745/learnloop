import { useCallback, useEffect, useState } from 'react';
import {
  readCache,
  writeCache,
  fetchRemote,
  buildSessionRow,
  insertRemote,
  deleteRemote,
} from '../lib/store.js';

/**
 * React binding over the study-history store. Local-first: paints the cached
 * list immediately, then reconciles with Supabase. Saves/deletes are optimistic
 * (applied to state + cache first) so history survives a failed network write.
 *
 * Pass the signed-in user's id; with no user it stays empty and does no I/O.
 */
export function useHistory(userId) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      return undefined;
    }
    let active = true;
    setSessions(readCache(userId)); // instant paint from cache
    setLoading(true);
    fetchRemote()
      .then((remote) => {
        if (!active) return;
        setSessions(remote);
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

  const saveSession = useCallback(
    async (input) => {
      if (!userId) return null;
      const row = buildSessionRow(userId, input);
      setSessions((prev) => {
        const next = [row, ...prev];
        writeCache(userId, next);
        return next;
      });
      try {
        await insertRemote(row);
      } catch {
        /* kept locally; absent on other devices until a later successful sync */
      }
      return row;
    },
    [userId],
  );

  const deleteSession = useCallback(
    async (id) => {
      if (!userId) return;
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        writeCache(userId, next);
        return next;
      });
      try {
        await deleteRemote(id);
      } catch {
        /* best-effort; the local removal already applied */
      }
    },
    [userId],
  );

  return { sessions, loading, saveSession, deleteSession };
}
