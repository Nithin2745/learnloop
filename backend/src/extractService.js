import { runJsonCompletion } from './llmJson.js';
import { buildExtractMessages } from './extractPrompt.js';

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertExtractShape(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.subjects)) {
    throw new SyntaxError('Parsed JSON does not match the expected extract shape.');
  }
  return result;
}

/** Trim strings, drop empty topics/units/subjects the model may have left in. */
function normalizeExtract(result) {
  result.subjects = result.subjects
    .map((s) => ({
      name: String(s?.name ?? '').trim(),
      code: String(s?.code ?? '').trim(),
      units: Array.isArray(s?.units)
        ? s.units
            .map((u) => ({
              name: String(u?.name ?? '').trim(),
              topics: Array.isArray(u?.topics)
                ? u.topics.map((t) => String(t ?? '').trim()).filter(Boolean)
                : [],
            }))
            .filter((u) => u.topics.length > 0)
        : [],
    }))
    .filter((s) => s.name && s.units.length > 0);
  return result;
}

/**
 * Structure one chunk of raw syllabus text into subjects → units → topics.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function extractTopics(text) {
  return runJsonCompletion({
    messages: buildExtractMessages(text),
    finalize: (parsed) => normalizeExtract(assertExtractShape(parsed)),
  });
}
