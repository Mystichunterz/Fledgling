---
Author: backend / Impero
Date: 2026-05-09
Status: live (endpoint wired in dev + ready for Vercel deploy; awaits real GEMINI_API_KEY in env)
---

# gemini-token.md

`/api/gemini-token` — mints short-lived Gemini Live ephemeral tokens for the browser. Used by the Hala climax (live voice agent path, T48). The long-lived `GEMINI_API_KEY` stays server-side; only the bounded ephemeral token reaches the client.

## Endpoint

| | |
|---|---|
| Method | `GET` or `POST` (no body required) |
| Path (dev) | `http://localhost:5173/api/gemini-token` |
| Path (prod) | `/api/gemini-token` (Vercel auto-detects `app/api/gemini-token.ts`) |
| Auth | none (public — but rate limit at the platform level if abused) |
| Response | proxied JSON from Google `auth_tokens` API |

### Token lifetime

| Field | Value | Meaning |
|---|---|---|
| `newSessionExpireTime` | now + 60s | window in which the browser must call `ai.live.connect()` |
| `expireTime` | now + 30 min | hard cap on the live session itself |

Engine should mint a fresh token immediately before opening the session, not pre-fetch.

## Browser usage (paste into `app/src/voice/gemini-live.ts` — voice lane)

```ts
import { GoogleGenAI, Modality } from '@google/genai';

export async function openHalaSession(systemInstruction: string) {
  const r = await fetch('/api/gemini-token');
  if (!r.ok) throw new Error(`token mint failed: ${r.status}`);
  const { name } = await r.json(); // 'name' is the ephemeral token string

  const ai = new GoogleGenAI({ apiKey: name });
  return ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction,
    },
    callbacks: {
      onmessage: (resp) => {
        const part = resp.serverContent?.modelTurn?.parts?.[0];
        if (part?.inlineData) playAudioBase64(part.inlineData.data);
      },
    },
  });
}
```

Note `@google/genai` is **not** yet in `package.json` — voice lane installs it when wiring T48. The endpoint itself has no SDK dependency (raw `fetch`).

## Local dev story

The endpoint has two implementations of the same logic:

1. **`app/api/gemini-token.ts`** — Vercel-format `export default async function handler(req, res)`. Picked up automatically on `vercel deploy`.
2. **`vite.config.ts` → `geminiTokenApi(env)` plugin** — same logic served as Vite middleware on `/api/gemini-token`. Mirrors the existing `groqParseApi` pattern. Runs on `npm run dev`.

The duplication is deliberate (~25 lines each). Tried SSR-loading the api file from the Vite plugin — too brittle. Both paths read `GEMINI_API_KEY` from env; if you change the upstream call shape, change both. Search `AUTH_TOKENS_URL` to find them.

## Env

Add to `app/.env.local` (already documented in `app/.env.example`):

```
GEMINI_API_KEY=<your-key>
```

For Vercel: set `GEMINI_API_KEY` in the project's Environment Variables (Production + Preview). **Never** prefix with `VITE_` — that would bundle it into the browser. The whole point of this endpoint is to keep the key off the client.

## Smoke test

With a key set:

```bash
curl -i http://localhost:5173/api/gemini-token
# HTTP/1.1 200
# {"name":"projects/.../authTokens/...","expireTime":"..."}
```

Without a key set (proves wiring is live):

```bash
curl -i http://localhost:5173/api/gemini-token
# HTTP/1.1 500
# {"error":"GEMINI_API_KEY not set in env"}
```

## Pre-warm (latency reduction)

Per `research/voice-api-comparison.md` §7, Vercel cold-start on the token endpoint adds latency. Engine should fire-and-forget a `fetch('/api/gemini-token')` early (e.g. on `BootScene.create()`) so the lambda is warm by the time the player reaches the lighthouse. Discard the response — it's just keeping the function hot.

## Gotchas

- The Google API field is `name`, not `token` — that's the ephemeral token string. Pass it as `apiKey` to `GoogleGenAI({ apiKey: name })`.
- `cache-control: no-store` is set so browsers/proxies don't cache the response. Don't strip this.
- Token is single-window: client has 60 s to call `ai.live.connect()` after minting. If the player loiters at the lighthouse for >60 s before triggering the dialogue, mint again on actual interaction.
- Vercel charges per invocation. Don't poll. Mint once per Hala session, reuse the connection.
- `app/api/` had to be added to `tsconfig.json` `include` (was `["src"]` only) so `npm run typecheck` actually checks the route.

## See also

- `../api/gemini-token.ts` — the Vercel handler
- `../vite.config.ts` — `geminiTokenApi(env)` plugin (dev mirror)
- `../../research/voice-api-comparison.md` §4–§7 — design rationale, auth, latency budget
- `../../REQUIREMENTS.md` §4 (Vercel serverless), §5.5 (BG3 menu choice payload that climax forwards to Gemini Live)
- `../../TASKS.md` — T35 (this), T48 (engine wiring), T15 (voice synthesis integration)
