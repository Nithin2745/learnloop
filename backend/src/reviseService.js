import { runJsonCompletion } from './llmJson.js';
import { buildReviseMessages } from './revisePrompt.js';

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertReviseShape(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
    throw new SyntaxError('Parsed JSON does not match the expected revise shape.');
  }
  return result;
}

/** Coerce each item to the flashcards + richer-questions contract. */
function normalizeRevise(result) {
  result.items = result.items.map((it) => ({
    topic: String(it?.topic ?? '').trim(),
    flashcards: Array.isArray(it?.flashcards)
      ? it.flashcards
          .map((c) => ({
            front: String(c?.front ?? '').trim(),
            back: String(c?.back ?? '').trim(),
          }))
          .filter((c) => c.front || c.back)
      : [],
    questions: Array.isArray(it?.questions)
      ? it.questions
          .map((q) => ({
            question: String(q?.question ?? '').trim(),
            answer: String(q?.answer ?? '').trim(),
            keyPoints: Array.isArray(q?.keyPoints)
              ? q.keyPoints.map((k) => String(k ?? '').trim()).filter(Boolean)
              : [],
            example: String(q?.example ?? '').trim(),
          }))
          .filter((q) => q.question)
      : [],
  }));
  return result;
}

/**
 * Generate flashcards + important Q&A for the given topics.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generateRevision(topics) {
  return runJsonCompletion({
    messages: buildReviseMessages(topics),
    finalize: (parsed) => normalizeRevise(assertReviseShape(parsed)),
  });
}
