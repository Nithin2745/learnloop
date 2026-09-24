import OpenAI from 'openai';
import { getProviderChain } from './config.js';

/**
 * One cached OpenAI-compatible client per provider name.
 *
 * We use the official `openai` SDK as a generic OpenAI-wire client: it appends
 * only `/chat/completions` to each provider's `baseURL`, so Groq, Gemini's
 * OpenAI-compat endpoint, NVIDIA NIM, and OpenRouter (all OpenAI-compatible)
 * work by baseURL alone — see config.js.
 *
 * NOTE: groq-sdk could NOT do this. It hardcodes the `/openai/v1/chat/completions`
 * path onto the baseURL, so a custom baseURL becomes e.g.
 * `.../v1beta/openai/openai/v1/chat/completions` and 404s for every provider but
 * Groq. That silent breakage is exactly why fallback never fired. Clients are
 * built lazily and cached per provider so a missing key fails on first request
 * rather than at import time.
 */
const clients = new Map();

/** Build (or reuse) a client bundle for one resolved provider config. */
export function getClientFor(cfg) {
  let client = clients.get(cfg.provider);
  if (!client) {
    client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    clients.set(cfg.provider, client);
  }
  return {
    client,
    model: cfg.model,
    provider: cfg.provider,
    maxTokens: cfg.maxTokens,
  };
}

/** Back-compat accessor: the primary provider's client bundle. */
export function getClient() {
  return getClientFor(getProviderChain()[0]);
}
