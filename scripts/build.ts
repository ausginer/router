import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const src = new URL('./src/', root);

await build({
  entryPoints: (await readdir(src)).map((file) => new URL(file, src)).map(fileURLToPath),
  minify: true,
  outdir: fileURLToPath(root),
  sourcemap: 'linked',
  sourcesContent: true,
  tsconfig: fileURLToPath(new URL('./tsconfig.build.json', root)),
  write: true,
});
