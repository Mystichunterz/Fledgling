import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Server-side route that proxies frame-parse requests to Groq. The API key
// is read from the loaded env at config time and held in closure — it never
// reaches the browser bundle.
function groqParseApi(env: Record<string, string>): Plugin {
  return {
    name: 'fledgling-groq-parse-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/parse', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('method not allowed');
          return;
        }
        try {
          const body = await readJsonBody(req);
          const text = typeof body?.text === 'string' ? body.text : '';
          if (!text.trim()) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'missing "text" in body' }));
            return;
          }

          const apiKey = env.GROQ_API_KEY ?? process.env.GROQ_API_KEY ?? '';
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'GROQ_API_KEY not set in env' }));
            return;
          }

          const parseMod = await server.ssrLoadModule('/src/lang/parse.ts');
          const langMod = await server.ssrLoadModule('/src/lang/example-language.ts');

          const conceptIds = parseMod.conceptIdsFromLanguage(langMod.EXAMPLE_LANGUAGE);
          const frame = await parseMod.parseEnglishToFrame(text, { conceptIds, apiKey });

          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ frame }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          );
        }
      });
    },
  };
}

function readJsonBody(req: IncomingMessage): Promise<{ text?: unknown }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), groqParseApi(env)],
    server: { port: 5173, open: false },
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          workbench: 'workbench.html',
          parse: 'parse.html',
          village: 'village.html',
        },
        output: {
          manualChunks: { phaser: ['phaser'] },
        },
      },
    },
  };
});
