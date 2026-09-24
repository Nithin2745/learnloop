/** Strip a trailing "(...)" depth spec from a topic label: "OS(Easy,Hard)" -> "OS". */
export function baseTopicName(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(.*?)\s*\([^)]*\)\s*$/);
  return m ? m[1].trim() || s : s;
}

/**
 * Dedupe a list of raw topics by their base name (case-insensitive), returning
 * the base names. Used for Plan and Revise, which don't care about depth specs.
 */
export function dedupeByBase(topics) {
  const seen = new Set();
  const out = [];
  for (const t of topics || []) {
    const base = baseTopicName(t);
    const key = base.toLowerCase();
    if (base && !seen.has(key)) {
      seen.add(key);
      out.push(base);
    }
  }
  return out;
}
