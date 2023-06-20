import { constants, copyFile, mkdir } from 'node:fs/promises';
import { glob } from 'glob';

const root = new URL('../', import.meta.url);
const src = new URL('./src/', root);

const files = await glob(['**/*.d.ts'], { cwd: src });
await Promise.all(
  files.map(async (f) => {
    const file = new URL(f, root);
    await mkdir(new URL('./', file), { recursive: true });
    return copyFile(new URL(f, src), file, constants.COPYFILE_FICLONE);
  }),
);
