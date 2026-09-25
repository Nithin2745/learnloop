import { runJsonCompletion } from './llmJson.js';
import { buildQuestionsMessages } from './questionsPrompt.js';
import { normalizeQuestion } from './planService.js';

/**
 * Generate practice questions per topic, on demand.
 *
 * Mirrors reviseService.js: the study plan only rates topics now, so questions
 * are fetched lazily per topic (the frontend opens a topic panel and asks for
 * that topic's questions). Reuses planService.normalizeQuestion so mcq/fill/open
 * items are coerced identically to how they were when baked into the plan.
 */

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertQuestionsShape(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
    throw new SyntaxError('Parsed JSON does not match the expected questions shape.');
  }
  return result;
}

/** Coerce each item to { topic, questions } with normalized, typed questions. */
function normalizeQuestions(result) {
  result.items = result.items
    .map((it) => ({
      topic: String(it?.topic ?? '').trim(),
      questions: Array.isArray(it?.questions)
        ? it.questions.map(normalizeQuestion).filter(Boolean)
        : [],
    }))
    .filter((it) => it.topic);
  return result;
}

/**
 * Generate practice questions for the given topics.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generatePracticeQuestions(topics) {
  return runJsonCompletion({
    messages: buildQuestionsMessages(topics),
    finalize: (parsed) => normalizeQuestions(assertQuestionsShape(parsed)),
  });
}
