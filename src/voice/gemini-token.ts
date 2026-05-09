// Token mint helper for `/api/gemini-token`.
//
// The endpoint returns Google's auth_tokens response verbatim:
//   { name: "projects/.../authTokens/...", expireTime, newSessionExpireTime }
// `name` is the ephemeral token string. We mint just-in-time before opening
// a Live session, since the new-session window is only 60s.

const TOKEN_ENDPOINT = '/api/gemini-token';

export interface MintedToken {
  name: string;
  expireTime: string;
  newSessionExpireTime: string;
  mintedAt: number;
}

export async function mintGeminiToken(
  signal?: AbortSignal,
): Promise<MintedToken> {
  const r = await fetch(TOKEN_ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });
  if (!r.ok) {
    let detail = '';
    try {
      detail = (await r.json()).error ?? '';
    } catch {
      // body wasn't JSON
    }
    throw new Error(
      `gemini-token mint failed: ${r.status}${detail ? ` — ${detail}` : ''}`,
    );
  }
  const body = (await r.json()) as Omit<MintedToken, 'mintedAt'>;
  if (!body.name) {
    throw new Error('gemini-token: response missing `name` field');
  }
  return { ...body, mintedAt: Date.now() };
}

/**
 * Fire-and-forget token fetch to keep the Vercel lambda warm. Call this once
 * during BootScene; ignore the result. The mint cost is negligible compared
 * with the cold-start latency saved when the player actually reaches Hala.
 */
export function prewarmGeminiToken(): void {
  if (typeof fetch !== 'function') return;
  fetch(TOKEN_ENDPOINT, { method: 'GET', cache: 'no-store' }).catch(() => {
    // Pre-warm failures are intentionally swallowed — the real mint at
    // session-open time will surface any persistent breakage.
  });
}

/** Window in which the client must call `ai.live.connect()` after minting. */
export const NEW_SESSION_WINDOW_MS = 60_000;

export function isMintedTokenFresh(token: MintedToken): boolean {
  return Date.now() - token.mintedAt < NEW_SESSION_WINDOW_MS - 5_000;
}
