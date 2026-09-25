import { runJsonCompletion } from './llmJson.js';
import { buildMessages } from './promptBuilder.js';
import { buildStudyPlan } from './scheduleBuilder.js';

const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const DIFFICULTY_DEFAULT_WEIGHT = { easy: 1, medium: 2, hard: 3 };
const VALID_QUESTION_TYPES = new Set(['mcq', 'fill', 'open']);

/**
 * Coerce one model-produced practice question into a clean, typed shape the UI
 * renders directly. Unrecognized items (a bare string, or an object that merely
 * has options) map to the safest matching type so older/looser payloads still
 * render. Returns null for an unusable item so the caller can filter it out.
 */
export function normalizeQuestion(item) {
  // A bare string is an open question with no reference answer.
  if (!item || typeof item !== 'object') {
    const q = String(item ?? '').trim();
    return q ? { type: 'open', question: q, answer: '' } : null;
  }

  const question = String(item.question ?? item.q ?? '').trim();
  if (!question) return null;

  // Infer the type when it is missing: an options array => multiple-choice,
  // otherwise open-ended (the historical default).
  const rawType = String(item.type ?? '').toLowerCase();
  const type = VALID_QUESTION_TYPES.has(rawType)
    ? rawType
    : Array.isArray(item.options)
      ? 'mcq'
      : 'open';

  if (type === 'mcq') {
    const options = (Array.isArray(item.options) ? item.options : [])
      .map((o) => String(o ?? '').trim())
      .filter(Boolean)
      .slice(0, 6);
    if (options.length < 2) return null; // not a usable multiple-choice item
    let correctIndex = Number(item.correctIndex ?? item.correct ?? item.answerIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }
    const explanation = String(item.explanation ?? '').trim();
    return { type: 'mcq', question, options, correctIndex, explanation };
  }

  if (type === 'fill') {
    const answer = String(item.answer ?? item.a ?? '').trim();
    if (!answer) return null; // can't grade a blank with no answer
    const acceptable = (Array.isArray(item.acceptable) ? item.acceptable : [])
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .slice(0, 8);
    return { type: 'fill', question, answer, acceptable };
  }

  return { type: 'open', question, answer: String(item.answer ?? item.a ?? '').trim() };
}

/**
 * Minimal shape check so a malformed-but-parseable object triggers a retry.
 * The model now returns a COMPACT plan ({ topics: [...] }); the calendar is
 * built in code afterwards (scheduleBuilder.js).
 */
function assertCompactShape(plan) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.topics)) {
    throw new SyntaxError('Parsed JSON does not match the expected plan shape.');
  }
  return plan;
}

/** Coerce the model's per-topic output into a clean, bounded structure. */
function normalizeCompact(plan) {
  const topics = plan.topics
    .map((t) => {
      const name = String(t?.name ?? '').trim();
      const difficulty = VALID_DIFFICULTY.has(t?.difficulty) ? t.difficulty : 'medium';

      let weight = Number(t?.weight);
      if (!Number.isFinite(weight) || weight <= 0) {
        weight = DIFFICULTY_DEFAULT_WEIGHT[difficulty];
      }
      weight = Math.min(5, Math.max(1, weight));

      return { name, difficulty, weight };
    })
    .filter((t) => t.name);

  if (topics.length === 0) {
    throw new SyntaxError('Plan contained no usable topics.');
  }
  return { topics };
}

/**
 * Generate and validate a study plan.
 *
 * The LLM rates the topics (compact JSON); buildStudyPlan then expands that
 * into the concrete day-by-day schedule deterministically, so the response is
 * fast and correctly sized for any exam horizon. Retries once (with a nudge)
 * if the model's output fails to parse.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generatePlan(input) {
  return runJsonCompletion({
    messages: buildMessages(input),
    finalize: (parsed) => buildStudyPlan(normalizeCompact(assertCompactShape(parsed)), input),
  });
}
