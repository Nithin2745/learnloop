import 'dotenv/config';

/**
 * Provider registry. Switching provider = change LLM_PROVIDER (+ its API key).
 * Each entry knows its default base URL, model, and which env var holds its key.
 * OpenRouter is pre-wired: LLM_PROVIDER=openrouter + OPENROUTER_API_KEY is all
 * that's needed to fail over. Any field can be overridden via LLM_* env vars.
 */
const PROVIDERS = {
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: undefined, // groq-sdk default: https://api.groq.com
    model: 'openai/gpt-oss-120b',
  },
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct',
  },
};

export function getLlmConfig() {
  const name = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown LLM_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`,
    );
  }
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    const err = new Error(
      `Missing API key: set ${provider.apiKeyEnv} in your environment (.env).`,
    );
    err.code = 'AUTH';
    throw err;
  }
  return {
    provider: name,
    apiKey,
    baseURL: process.env.LLM_BASE_URL || provider.baseURL,
    model: process.env.LLM_MODEL || provider.model,
  };
}

export const serverConfig = {
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
