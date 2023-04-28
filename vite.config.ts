import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(async () => ({
  build: {
    target: 'esnext',
  },
}));
