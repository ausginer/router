import { constants, copyFile, mkdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { glob } from 'glob';

const root = new URL('../', import.meta.url);
const temp = new URL('./.temp/', root);

await mkdir(temp).catch((e: unknown) => {
  if (!(typeof e === 'object' && e != null && 'code' in e && e.code === 'EEXIST')) {
    throw e;
  }
});

const files = await glob(['src/**/*.d.ts'], { cwd: root });
await Promise.all(files.map(async (f) => copyFile(f, new URL(basename(f), temp), constants.COPYFILE_FICLONE)));
