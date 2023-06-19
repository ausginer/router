import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const tsconfig = await readFile(new URL('tsconfig.test.json', import.meta.url), 'utf8').then(JSON.parse);

export default defineConfig({
  build: {
    target: 'esnext',
  },
  esbuild: {
    tsconfigRaw: tsconfig,
  },
});
