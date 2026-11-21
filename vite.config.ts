import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import {
  MAX_BODY_BYTES,
  createAnthropicProvider,
  handleExplain,
  mockProvider,
} from './src/ai/serverHandler';

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

  const middleware: Connect.NextHandleFunction = (req, res) => {
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });

    let body = '';
    let tooLarge = false;
    req.on('data', (chunk: string | Uint8Array) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (tooLarge) return;
      const out = await handleExplain(body, provider);
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
