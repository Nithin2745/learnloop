import Groq from 'groq-sdk';
import { getLlmConfig } from './config.js';

let cached = null;

/**
 * Returns an OpenAI-compatible chat client + resolved model name.
 *
 * groq-sdk is OpenAI-wire-compatible, so pointing `baseURL` at OpenRouter
 * (or any compatible gateway) works with no code change — see config.js.
 * The client is built lazily and cached so a missing key fails on first
 * request rather than at import time.
 */
export function getClient() {
  if (cached) return cached;
  const cfg = getLlmConfig();
  const client = new Groq({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  cached = { client, model: cfg.model, provider: cfg.provider };
  return cached;
}
