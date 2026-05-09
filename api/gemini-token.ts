import type { IncomingMessage, ServerResponse } from 'node:http';

const AUTH_TOKENS_URL =
  'https://generativelanguage.googleapis.com/v1beta/auth_tokens';

const NEW_SESSION_WINDOW_MS = 60_000;
const TOKEN_LIFETIME_MS = 30 * 60_000;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set in env' }));
    return;
  }

  const now = Date.now();
  const newSessionExpireTime = new Date(now + NEW_SESSION_WINDOW_MS).toISOString();
  const expireTime = new Date(now + TOKEN_LIFETIME_MS).toISOString();

  try {
    const upstream = await fetch(AUTH_TOKENS_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ newSessionExpireTime, expireTime }),
    });

    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(text);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'failed to mint ephemeral token',
        detail: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
