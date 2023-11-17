import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { glob } from 'glob';

const cwd = new URL('../', import.meta.url);
const entryPoints = await glob('./src/**/*.ts', { cwd });

await build({
  entryPoints,
  format: 'esm',
  outdir: fileURLToPath(cwd),
  packages: 'external',
  sourcemap: 'linked',
  sourcesContent: true,
  target: 'es2022',
  tsconfig: fileURLToPath(new URL('./tsconfig.build.json', cwd)),
});
