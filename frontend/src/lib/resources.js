/** Build a GeeksforGeeks search URL for a topic (no hallucinated article links). */
export function gfgSearchUrl(topic) {
  const q = encodeURIComponent(String(topic || '').trim());
  return `https://www.geeksforgeeks.org/search/?gq=${q}`;
}
