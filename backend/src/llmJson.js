import { getProviderChain } from './config.js';
import { getClientFor } from './llmClient.js';

/**
 * Shared LLM-as-JSON plumbing for every LearnLoop feature (plan, extract,
 * learn, revise). Centralizes json_object response_format, fence-tolerant
 * parsing, a caller-supplied shape check, one retry-with-nudge per provider,
 * and automatic fallback across the provider chain (config.js) when a provider
 * is rate-limited / erroring — so a throttled Groq no longer fails the request.
 */

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

/** Translate SDK/API errors into stable codes the route layer maps to HTTP. */
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

function parseFailed() {
  const e = new Error('The AI returned an unreadable response after retrying.');
  e.code = 'PARSE_FAILED';
  return e;
}

async function callModel(bundle, messages) {
  const { client, model, maxTokens } = bundle;
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });
  return resp?.choices?.[0]?.message?.content ?? '';
}

const DEFAULT_NUDGE = {
  role: 'user',
  content:
    'Your previous response could not be parsed as JSON. Respond again with ' +
    'ONLY the JSON object — no markdown fences, no explanation.',
};

/**
 * Run a chat completion expected to return a single JSON object.
 *
 * Walks the provider chain (config.js). For each provider it makes up to two
 * attempts (a parse/shape failure retries once with `nudge`); an API-level
 * failure (rate limit / server / rejected key) or a still-unparseable response
 * falls through to the next provider. If every provider fails, the last tagged
 * error is thrown.
 *
 * `finalize` runs inside the loop: assert the shape (throw on mismatch) and
 * return the normalized result.
 *
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 *
 * @param {object}            opts
 * @param {Array}             opts.messages  Chat messages (system + user).
 * @param {(parsed:any)=>any} opts.finalize  Shape-check + normalize.
 * @param {object}            [opts.nudge]   Retry message; defaults to a JSON nudge.
 */
export async function runJsonCompletion({ messages, finalize, nudge = DEFAULT_NUDGE }) {
  const chain = getProviderChain(); // throws AUTH if nothing is configured
  let lastError = null;

  for (const cfg of chain) {
    const bundle = getClientFor(cfg);

    for (let attempt = 1; attempt <= 2; attempt++) {
      const msgs = attempt === 1 ? messages : [...messages, nudge];

      let content;
      try {
        content = await callModel(bundle, msgs);
      } catch (err) {
        lastError = tagApiError(err);
        break; // API failure — stop retrying this provider, try the next one.
      }

      try {
        return finalize(extractJson(content));
      } catch {
        lastError = parseFailed(); // parse/shape failure — loop retries once.
      }
    }

    if (chain.length > 1) {
      console.warn(
        `[llm] provider "${cfg.provider}" unavailable (${lastError?.code}); ` +
          'falling through to next provider',
      );
    }
  }

  throw lastError ?? parseFailed();
}
