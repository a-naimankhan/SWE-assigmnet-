import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import {
  createAnthropicProvider,
  createBodyCollector,
  createRateLimiter,
  handleExplain,
  mockProvider,
} from './src/ai/serverHandler';
import { ROOMS } from './src/data/rooms';

/**
 * Dev/preview-only server side of the "Explain availability" adapter.
 * ANTHROPIC_API_KEY (no VITE_ prefix, so it is never bundled into the
 * browser) selects the real provider; without it the mock provider answers.
 */
function explainApi(mode: string): Plugin {
  const env = loadEnv(mode, '.', '');
  const key = env.ANTHROPIC_API_KEY;
  const provider = key
    ? createAnthropicProvider(key, { model: env.ANTHROPIC_MODEL || undefined })
    : mockProvider;

  const limiter = createRateLimiter();
  const allowedLabels: ReadonlySet<string> = new Set(ROOMS.map((r) => r.name));

  const middleware: Connect.NextHandleFunction = (req, res) => {
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
    if (!limiter.allow(req.socket.remoteAddress ?? 'unknown')) {
      return send(429, { error: 'Too many requests.' });
    }

    const body = createBodyCollector();
    let tooLarge = false;
    req.on('data', (chunk: Uint8Array | string) => {
      if (tooLarge) return;
      if (!body.push(chunk)) {
        tooLarge = true;
        res.setHeader('Connection', 'close');
        send(413, { error: 'Request too large.' });
        res.once('finish', () => req.destroy());
      }
    });
    req.on('end', async () => {
      if (tooLarge) return;
      const out = await handleExplain(body.text(), provider, undefined, { allowedLabels });
      send(out.status, out.body);
    });
  };

  return {
    name: 'explain-api',
    configureServer: (server) => void server.middlewares.use('/api/explain', middleware),
    configurePreviewServer: (server) => void server.middlewares.use('/api/explain', middleware),
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), explainApi(mode)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
