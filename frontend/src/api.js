const BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Calls POST /api/generate-plan and returns the plan JSON.
 * Throws an Error with a human-readable message on any non-2xx response.
 */
export async function generatePlan(payload) {
  let res;
  try {
    res = await fetch(`${BASE}/api/generate-plan`, {
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
