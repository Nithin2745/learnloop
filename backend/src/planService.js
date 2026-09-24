import { runJsonCompletion } from './llmJson.js';
import { buildMessages } from './promptBuilder.js';
import { buildStudyPlan } from './scheduleBuilder.js';

const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const DIFFICULTY_DEFAULT_WEIGHT = { easy: 1, medium: 2, hard: 3 };

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

      const questions = Array.isArray(t?.practiceQuestions) ? t.practiceQuestions : [];
      const practiceQuestions = questions
        .map((item) => {
          // Tolerate either a bare string or a { question, answer } object.
          if (item && typeof item === 'object') {
            return {
              question: String(item.question ?? item.q ?? ''),
              answer: String(item.answer ?? item.a ?? ''),
            };
          }
          return { question: String(item ?? ''), answer: '' };
        })
        .filter((q) => q.question);

      return { name, difficulty, weight, practiceQuestions };
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
