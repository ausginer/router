import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { glob } from 'glob';

const root = new URL('../', import.meta.url);

await build({
  entryPoints: await glob(['src/**/*.ts'], { cwd: root, ignore: ['**/*.d.ts'] }),
  minify: true,
  outdir: fileURLToPath(root),
  sourcemap: 'linked',
  sourcesContent: true,
  target: 'es2022',
  tsconfig: fileURLToPath(new URL('./tsconfig.build.json', root)),
});
