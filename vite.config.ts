import { defineConfig, loadEnv } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// MUST match the registry entry's `name`. Repos use the slug 'notes'.
const REMOTE_NAME = 'notes';

// Local dev resolves `@mf-platform/ui` from the workspace source tree.
// In the standalone repo on the production server, this path doesn't
// exist — `scripts/patch-remote-config.mjs` rewires the import to the
// host's federation expose at runtime instead.
const localUiSrc = fileURLToPath(new URL('../packages/ui/src/index.ts', import.meta.url));
const hasLocalUi = existsSync(localUiSrc);

// GitHub Pages serves project sites at https://<owner>.github.io/<repo>/.
// Use the FULL absolute URL so the emitted `mf-manifest.json` has
// `publicPath: "https://..."`. With a root-relative base ("/test1/"), the
// host runtime would (incorrectly) resolve `publicPath` against the *host*
// origin and try to fetch remoteEntry.js from there.
// In dev (single-origin), keep base = '/'.
const GITHUB_PAGES_BASE = 'https://pigeon9989.github.io/test1/';

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
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        ...(hasLocalUi ? { '@mf-platform/ui': localUiSrc } : {}),
      },
    },
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
