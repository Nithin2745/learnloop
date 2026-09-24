import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authConfig } from './config.js';

/**
 * requireAuth — Express middleware gating the (paid) LLM endpoints behind a
 * valid Supabase login. Reads `Authorization: Bearer <jwt>`, verifies it against
 * the project's public JWKS (asymmetric ES256/RS256 keys, so no server secret is
 * needed), and sets `req.user = { id, email }`. Responds 401 on any missing or
 * invalid token, closing the previously-open, unauthenticated paid endpoints.
 *
 * The JWKS is fetched lazily on first use and cached by `jose` (with its own
 * background refresh + rotation handling), so this adds no per-request network
 * cost in steady state.
 */

// Built once at startup. createRemoteJWKSet returns a resolver that fetches and
// caches the signing keys, refetching when it sees an unknown `kid` (rotation).
const JWKS = authConfig.configured
  ? createRemoteJWKSet(new URL(authConfig.jwksUri))
  : null;

function bearerToken(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

export async function requireAuth(req, res, next) {
  // Fail closed: with no SUPABASE_URL there is no way to verify anyone, so no
  // request is authorized (rather than silently letting everyone through).
  if (!JWKS) {
    return res
      .status(500)
      .json({ error: 'Server is misconfigured: authentication is not set up.' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authConfig.issuer,
      audience: 'authenticated',
    });
    req.user = { id: payload.sub, email: payload.email || '' };
    return next();
  } catch {
    // Expired / bad signature / wrong issuer|audience / unresolvable key.
    return res
      .status(401)
      .json({ error: 'Your session is invalid or has expired. Please sign in again.' });
  }
}
