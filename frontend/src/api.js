import { supabase } from './lib/supabase.js';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

// Give up on a request that runs long — a wedged or unreachable backend should
// surface a clear message instead of spinning forever. The backend bounds its
// own LLM calls (see backend/src/llmClient.js), so this is a safety net.
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * POST JSON to an API route and return the parsed body.
 * Throws an Error with a human-readable message on any non-2xx response,
 * a timeout, or an unreachable server.
 */
async function postJson(path, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Attach the signed-in user's access token so the (gated) backend accepts the
  // request. getSession() returns the cached session and refreshes it if needed.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('The request took too long and timed out. Please try again.');
    }
    throw new Error('Could not reach the server. Is the backend running?');
  } finally {
    clearTimeout(timer);
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

/** POST /api/expand-topics → { subjects: [...] } (disambiguated + decomposed typed topics). */
export function expandTopics(topics, level = '') {
  return postJson('/api/expand-topics', { topics, level });
}

/** POST /api/learn → { items: [...] }. */
export function generateLearning(topics) {
  return postJson('/api/learn', { topics });
}

/** POST /api/revise → { items: [...] }. */
export function generateRevision(topics) {
  return postJson('/api/revise', { topics });
}

/**
 * POST /api/practice-questions → { items: [{ topic, questions }] }.
 * Practice questions are generated per topic on demand (the study plan only
 * rates topics now), so this is called lazily as a topic panel is opened.
 */
export function generatePracticeQuestions(topics) {
  return postJson('/api/practice-questions', { topics });
}

/**
 * POST /api/grade → { score, verdict, gotRight[], toFix[], modelAnswer }.
 * Grades a student's typed answer to a practice/revision question.
 */
export function gradeAnswer({ topic, question, referenceAnswer = '', studentAnswer }) {
  return postJson('/api/grade', { topic, question, referenceAnswer, studentAnswer });
}
