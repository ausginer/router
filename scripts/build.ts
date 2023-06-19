import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);

await build({
  bundle: true,
  entryPoints: [fileURLToPath(new URL('./src/index.ts', root))],
  format: 'esm',
  minify: true,
  outdir: fileURLToPath(root),
  packages: 'external',
  sourcemap: 'linked',
  sourcesContent: true,
  target: 'es2022',
  tsconfig: fileURLToPath(new URL('./tsconfig.build.json', root)),
});
