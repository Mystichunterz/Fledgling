// Mint short-lived ElevenLabs signed URLs from the server-side proxy.
//
// `/api/elevenlabs-token` returns a JSON `{ signedUrl, expiresAt }` where
// `signedUrl` is a `wss://` endpoint scoped to one voice for one stream
// session. The browser opens it with no further auth; the long-lived
// ELEVENLABS_API_KEY stays server-side.

const TOKEN_ENDPOINT = '/api/elevenlabs-token';

export interface ElevenLabsToken {
  signedUrl: string;
  expiresAt: number;
  voiceId: string;
}

export async function mintElevenLabsToken(
  voiceId: string,
  signal?: AbortSignal,
): Promise<ElevenLabsToken> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ voiceId }),
    cache: 'no-store',
  };
  if (signal) init.signal = signal;
  const r = await fetch(TOKEN_ENDPOINT, init);
  if (!r.ok) {
    let detail = '';
    try {
      detail = (await r.json()).error ?? '';
    } catch {
      // body wasn't JSON
    }
    throw new Error(
      `elevenlabs-token mint failed: ${r.status}${detail ? ` — ${detail}` : ''}`,
    );
  }
  const body = (await r.json()) as ElevenLabsToken;
  if (!body.signedUrl) {
    throw new Error('elevenlabs-token: response missing `signedUrl` field');
  }
  return body;
}

export function prewarmElevenLabsToken(): void {
  if (typeof fetch !== 'function') return;
  fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ voiceId: 'warmup' }),
    cache: 'no-store',
  }).catch(() => {
    // Pre-warm failures are intentionally swallowed.
  });
}

export function isElevenLabsTokenFresh(token: ElevenLabsToken): boolean {
  return token.expiresAt - Date.now() > 5_000;
}
