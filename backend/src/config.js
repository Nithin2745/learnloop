import 'dotenv/config';

/**
 * Provider registry. Every provider here speaks the OpenAI chat-completions
 * wire format, so a single Groq-SDK client with a per-provider baseURL talks to
 * all of them (see llmClient.js). Adding a provider = adding an entry here.
 *
 * Free-tier reliability notes (verified 2026-09-24):
 *  - gemini     : most generous free tier (gemini-2.5-flash ~10 RPM / 250 RPD /
 *                 250K TPM, no credit card) — best default primary.
 *  - groq       : fastest inference, but a small free tokens-per-minute window;
 *                 large 8000-token calls 429 under load.
 *  - nvidia     : free OpenAI-compatible NIM endpoints (build.nvidia.com).
 *  - openrouter : ":free" models are zero-cost but frequently rate-limited
 *                 upstream (429) — best kept last in the chain.
 */
const PROVIDERS = {
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1', // OpenAI-compatible endpoint
    model: 'qwen/qwen3.8-27b',
  },
  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
  },
  nvidia: {
    apiKeyEnv: 'NVIDIA_API_KEY',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    model: 'mistralai/mistral-nemotron',
  },
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    // qwen3.8-27b:free mirrors the Groq model, so explanations stay consistent
    // when this tier happens to be available.
    model: 'qwen/qwen3.8-27b:free',
  },
};

// Order tried when the caller doesn't pin one. Providers without a usable key
// are dropped, so unconfigured ones are skipped silently.
const DEFAULT_ORDER = ['gemini', 'groq', 'nvidia', 'openrouter'];

const PLACEHOLDER = /your_.*_here/i;
function hasRealKey(name) {
  const v = (process.env[name] || '').trim();
  return v.length > 0 && !PLACEHOLDER.test(v);
}

function resolveProvider(name) {
  const p = PROVIDERS[name];
  if (!p || !hasRealKey(p.apiKeyEnv)) return null;
  // Per-provider model override, e.g. GEMINI_MODEL=gemini-2.5-flash-lite.
  const perProviderModel = process.env[`${name.toUpperCase()}_MODEL`];
  return {
    provider: name,
    apiKey: process.env[p.apiKeyEnv],
    baseURL: p.baseURL,
    model: perProviderModel || p.model,
    // Learn explanations now carry prerequisites, a worked example, and
    // misconceptions per depth level, so a multi-depth batch is token-heavy.
    // Keep the ceiling generous to avoid truncation -> PARSE_FAILED.
    maxTokens: Number(process.env.LLM_MAX_TOKENS) || 12000,
  };
}

/**
 * Ordered list of usable providers (those with a real API key), primary first.
 * runJsonCompletion walks this chain, falling through to the next provider on a
 * rate-limit / server / auth error — so one throttled provider no longer breaks
 * a request. Order precedence: LLM_PROVIDER_ORDER (csv) > LLM_PROVIDER (legacy,
 * pinned first) > DEFAULT_ORDER. Global LLM_MODEL / LLM_BASE_URL override the
 * primary only. Throws AUTH if no provider has a key.
 */
export function getProviderChain() {
  const explicit = (process.env.LLM_PROVIDER_ORDER || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  let order;
  if (explicit.length) order = explicit;
  else if (process.env.LLM_PROVIDER) {
    order = [process.env.LLM_PROVIDER.trim().toLowerCase(), ...DEFAULT_ORDER];
  } else order = [...DEFAULT_ORDER];

  const chain = [...new Set(order)].map(resolveProvider).filter(Boolean);
  if (chain.length === 0) {
    const err = new Error(
      'No LLM provider configured. Set at least one API key (' +
        Object.values(PROVIDERS)
          .map((p) => p.apiKeyEnv)
          .join(', ') +
        ') in your .env.',
    );
    err.code = 'AUTH';
    throw err;
  }
  // Legacy global overrides apply to the primary provider only.
  if (process.env.LLM_MODEL) chain[0].model = process.env.LLM_MODEL;
  if (process.env.LLM_BASE_URL) chain[0].baseURL = process.env.LLM_BASE_URL;
  return chain;
}

/** Back-compat single-provider accessor: the primary (first) provider. */
export function getLlmConfig() {
  return getProviderChain()[0];
}

export const serverConfig = {
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

/**
 * Supabase auth. We verify the user's access token against the project's public
 * JWKS (asymmetric ES256/RS256 keys) — no server secret is needed, so nothing
 * here is sensitive. `SUPABASE_URL` is the only required value; the JWKS URI and
 * token issuer are derived from it. `supabaseJwtSecret` is an optional fallback
 * for legacy projects that still sign tokens with a shared HS256 secret.
 */
const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
export const authConfig = {
  supabaseUrl,
  configured: supabaseUrl.length > 0,
  issuer: supabaseUrl ? `${supabaseUrl}/auth/v1` : '',
  jwksUri: supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : '',
  supabaseJwtSecret: (process.env.SUPABASE_JWT_SECRET || '').trim(),
};
