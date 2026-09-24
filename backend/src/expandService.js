import { runJsonCompletion } from './llmJson.js';
import { buildExpandMessages } from './expandPrompt.js';

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertExpandShape(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.subjects)) {
    throw new SyntaxError('Parsed JSON does not match the expected expand shape.');
  }
  return result;
}

/** Trim strings, drop empty topics/units/subjects the model may have left in. */
function normalizeExpand(result) {
  result.subjects = result.subjects
    .map((s) => ({
      name: String(s?.name ?? '').trim(),
      code: String(s?.code ?? '').trim(),
      units: Array.isArray(s?.units)
        ? s.units
            .map((u) => ({
              name: String(u?.name ?? '').trim() || 'Topics',
              topics: Array.isArray(u?.topics)
                ? u.topics.map((t) => String(t ?? '').trim()).filter(Boolean)
                : [],
            }))
            .filter((u) => u.topics.length > 0)
        : [],
    }))
    .filter((s) => s.name && s.units.length > 0);

  if (result.subjects.length === 0) {
    throw new SyntaxError('Expansion produced no usable subtopics.');
  }
  return result;
}

/**
 * Disambiguate + decompose a list of typed topics into a subjects → units →
 * topics outline (same shape as extract-topics, so the SubjectTree picker
 * renders it unchanged). Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR |
 * PARSE_FAILED.
 *
 * @param {string[]} topics  Validated, trimmed, non-empty topic strings.
 * @param {string}   [level] Optional study-level hint.
 */
export async function expandTopics(topics, level = '') {
  return runJsonCompletion({
    messages: buildExpandMessages(topics, level),
    finalize: (parsed) => normalizeExpand(assertExpandShape(parsed)),
  });
}
