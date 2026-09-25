import OpenAI from 'openai';
import { getProviderChain } from './config.js';

/**
 * One cached OpenAI-compatible client per (provider, key index).
 *
 * We use the official `openai` SDK as a generic OpenAI-wire client: it appends
 * only `/chat/completions` to each provider's `baseURL`, so Groq, Gemini's
 * OpenAI-compat endpoint, NVIDIA NIM, and OpenRouter (all OpenAI-compatible)
 * work by baseURL alone — see config.js.
 *
 * A provider may carry several API keys (`cfg.apiKeys`, comma-separated in the
 * env); llmJson.js rotates them round-robin, so we cache one client per key
 * (keyed `provider#index`) rather than per provider.
 *
 * NOTE: groq-sdk could NOT do this. It hardcodes the `/openai/v1/chat/completions`
 * path onto the baseURL, so a custom baseURL becomes e.g.
 * `.../v1beta/openai/openai/v1/chat/completions` and 404s for every provider but
 * Groq. That silent breakage is exactly why fallback never fired. Clients are
 * built lazily and cached so a missing key fails on first request rather than at
 * import time.
 */
const clients = new Map();

/**
 * Build (or reuse) a client bundle for one resolved provider config, using the
 * key at `keyIndex` (default the first). The index wraps, so callers can rotate
 * freely without bounds-checking.
 */
export function getClientFor(cfg, keyIndex = 0) {
  const keys = cfg.apiKeys?.length ? cfg.apiKeys : [cfg.apiKey];
  const idx = ((keyIndex % keys.length) + keys.length) % keys.length;
  const cacheKey = `${cfg.provider}#${idx}`;
  let client = clients.get(cacheKey);
  if (!client) {
    // Bound each request so a slow/hung provider fails fast and the chain
    // (llmJson.js) can fall through to the next one, instead of the SDK's
    // 10-minute default holding the whole request open. maxRetries: 1 keeps a
    // single quick retry for a transient blip without stalling fall-through.
    client = new OpenAI({
      apiKey: keys[idx],
      baseURL: cfg.baseURL,
      timeout: 60_000,
      maxRetries: 1,
    });
    clients.set(cacheKey, client);
  }
  return {
    client,
    model: cfg.model,
    provider: cfg.provider,
    maxTokens: cfg.maxTokens,
    keyCount: keys.length,
    keyIndex: idx,
  };
}

/** Back-compat accessor: the primary provider's client bundle. */
export function getClient() {
  return getClientFor(getProviderChain()[0]);
}
