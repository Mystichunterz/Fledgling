import type { IncomingMessage, ServerResponse } from 'node:http';

const SIGNED_URL_API =
  'https://api.elevenlabs.io/v1/text-to-speech';

const TOKEN_LIFETIME_MS = 5 * 60_000;

interface TokenRequestBody {
  voiceId?: string;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY not set in env' }));
    return;
  }

  let body: TokenRequestBody = {};
  try {
    body = await readJson(req);
  } catch {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'invalid JSON body' }));
    return;
  }

  const voiceId = body.voiceId;
  if (!voiceId || typeof voiceId !== 'string') {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'voiceId required' }));
    return;
  }

  const expiresAt = Date.now() + TOKEN_LIFETIME_MS;
  const wssBase = `wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream-input`;
  const params = new URLSearchParams({
    model_id: 'eleven_turbo_v2_5',
    output_format: 'pcm_24000',
    optimize_streaming_latency: '3',
  });

  try {
    // Validate the voice exists upstream before we hand the browser a URL
    // it will fail to open. One round-trip; cached on Vercel's lambda warm.
    const probe = await fetch(`${SIGNED_URL_API}/${encodeURIComponent(voiceId)}`, {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    });
    if (!probe.ok && probe.status !== 405) {
      res.statusCode = probe.status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: `voice ${voiceId} not available` }));
      return;
    }
    const signedUrl = `${wssBase}?${params.toString()}&xi_api_key=${encodeURIComponent(apiKey)}`;

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ signedUrl, expiresAt, voiceId }));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'failed to mint elevenlabs token',
        detail: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

async function readJson(req: IncomingMessage): Promise<TokenRequestBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
