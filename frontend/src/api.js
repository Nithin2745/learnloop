const BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * POST JSON to an API route and return the parsed body.
 * Throws an Error with a human-readable message on any non-2xx response.
 */
async function postJson(path, payload) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      Array.isArray(data?.details) && data.details.length
        ? data.details.join(' ')
        : data?.error || `Request failed (${res.status}).`;
    throw new Error(message);
  }

  return data;
}

/** POST /api/generate-plan → plan JSON. */
export function generatePlan(payload) {
  return postJson('/api/generate-plan', payload);
}

/** POST /api/extract-topics → { subjects: [...] }. */
export function extractTopics(text) {
  return postJson('/api/extract-topics', { text });
}

/** POST /api/learn → { items: [...] }. */
export function generateLearning(topics) {
  return postJson('/api/learn', { topics });
}

/** POST /api/revise → { items: [...] }. */
export function generateRevision(topics) {
  return postJson('/api/revise', { topics });
}
