import { getClient } from './llmClient.js';
import { buildMessages, retryNudge } from './promptBuilder.js';

/** Remove a wrapping ```json ... ``` (or ``` ... ```) fence if present. */
function stripFences(text) {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

/** Parse the model output into an object, tolerating minor stray text. */
function extractJson(text) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the outermost { ... } span.
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new SyntaxError('Model did not return valid JSON.');
  }
}

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertPlanShape(plan) {
  if (
    !plan ||
    typeof plan !== 'object' ||
    !Array.isArray(plan.schedule) ||
    !Array.isArray(plan.practiceQuestions)
  ) {
    throw new SyntaxError('Parsed JSON does not match the expected plan shape.');
  }
  return plan;
}

/** Normalize obvious drift without second-guessing the model's content. */
function normalizePlan(plan) {
  const validDifficulty = new Set(['easy', 'medium', 'hard']);
  plan.totalDays =
    typeof plan.totalDays === 'number' ? plan.totalDays : plan.schedule.length;

  plan.schedule = plan.schedule.map((day) => ({
    date: String(day?.date ?? ''),
    dayLabel: String(day?.dayLabel ?? ''),
    isBufferDay: Boolean(day?.isBufferDay),
    topics: Array.isArray(day?.topics)
      ? day.topics.map((t) => ({
          name: String(t?.name ?? ''),
          difficulty: validDifficulty.has(t?.difficulty) ? t.difficulty : 'medium',
          estimatedHours: Number(t?.estimatedHours) || 0,
        }))
      : [],
  }));

  plan.practiceQuestions = plan.practiceQuestions.map((q) => ({
    topic: String(q?.topic ?? ''),
    questions: Array.isArray(q?.questions)
      ? q.questions.map((s) => String(s))
      : [],
  }));

  return plan;
}

/** Translate SDK/API errors into stable codes the route layer can map to HTTP. */
function tagApiError(err) {
  if (err?.code === 'AUTH') return err; // from config: missing key
  const status = err?.status ?? err?.response?.status;
  if (status === 429) {
    const e = new Error('The AI service is rate limited.');
    e.code = 'RATE_LIMIT';
    return e;
  }
  if (status === 401 || status === 403) {
    const e = new Error('The AI API key was rejected.');
    e.code = 'AUTH';
    return e;
  }
  const e = new Error(err?.message || 'The AI service call failed.');
  e.code = 'LLM_ERROR';
  return e;
}

async function callModel(messages) {
  const { client, model } = getClient();
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });
  return resp?.choices?.[0]?.message?.content ?? '';
}

/**
 * Generate and validate a study plan.
 * Retries once (with a nudge) if the model's output fails to parse.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generatePlan(input) {
  const baseMessages = buildMessages(input);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const messages =
      attempt === 1 ? baseMessages : [...baseMessages, retryNudge()];

    let content;
    try {
      content = await callModel(messages);
    } catch (err) {
      // API-level failures (rate limit, auth, network) are not worth retrying here.
      throw tagApiError(err);
    }

    try {
      const parsed = assertPlanShape(extractJson(content));
      return normalizePlan(parsed);
    } catch {
      // Parse/shape failure: loop retries once with a nudge.
    }
  }

  const e = new Error('The AI returned an unreadable plan after retrying.');
  e.code = 'PARSE_FAILED';
  throw e;
}
