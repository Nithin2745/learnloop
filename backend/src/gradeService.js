import { runJsonCompletion } from './llmJson.js';
import { buildGradeMessages } from './gradePrompt.js';

const validVerdict = new Set(['correct', 'partial', 'incorrect']);

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertGradeShape(result) {
  if (!result || typeof result !== 'object' || typeof result.score !== 'number') {
    throw new SyntaxError('Parsed JSON does not match the expected grade shape.');
  }
  return result;
}

/** Clamp/derive a verdict that stays consistent with the score band. */
function verdictFor(score, raw) {
  if (validVerdict.has(raw)) return raw;
  if (score >= 80) return 'correct';
  if (score >= 35) return 'partial';
  return 'incorrect';
}

/** Coerce the grade to the contract: bounded integer score + capped feedback. */
function normalizeGrade(result) {
  let score = Math.round(Number(result.score));
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, score));

  const list = (arr) =>
    Array.isArray(arr)
      ? arr.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 4)
      : [];

  return {
    score,
    verdict: verdictFor(score, result.verdict),
    gotRight: list(result.gotRight),
    toFix: list(result.toFix),
    modelAnswer: String(result.modelAnswer ?? '').trim(),
  };
}

/**
 * Grade a student's typed answer to a practice/revision question. Reuses the
 * single-shot JSON completion engine (no streaming/multi-turn). Throws tagged
 * errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 *
 * @param {{ topic: string, question: string, referenceAnswer?: string, studentAnswer: string }} input
 */
export async function gradeAnswer(input) {
  return runJsonCompletion({
    messages: buildGradeMessages(input),
    finalize: (parsed) => normalizeGrade(assertGradeShape(parsed)),
  });
}
