import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// MUST match the registry entry's `name`. Repos use the slug 'notes'.
const REMOTE_NAME = 'notes';

// GitHub Pages serves project sites at /<repo>/. Vite's `base` must match
// so that imports + chunks resolve correctly under https://<owner>.github.io/<repo>/.
// In dev (no base prefix), keep base = '/'.
const GITHUB_PAGES_BASE = '/test1/';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT ?? 5177);
  const origin = env.VITE_ORIGIN ?? `http://localhost:${port}`;
  const isBuild = command === 'build';

  return {
    base: isBuild ? GITHUB_PAGES_BASE : '/',
    plugins: [
      react(),
      federation({
        name: REMOTE_NAME,
        filename: 'remoteEntry.js',
        manifest: true,
        exposes: { './App': './src/expose/App.tsx' },
        shared: {
          react: { singleton: true, requiredVersion: '^18.3.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
        },
        dts: false,
      }),
    ],
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    server: { port, strictPort: true, cors: true, origin },
    preview: { port, strictPort: true, cors: true },
    build: {
      target: 'es2022',
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
