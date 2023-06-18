import { constants, copyFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { glob } from 'glob';

const root = new URL('../', import.meta.url);

const files = await glob(['src/**/*.d.ts'], { cwd: root });
await Promise.all(files.map(async (f) => copyFile(f, new URL(basename(f), root), constants.COPYFILE_FICLONE)));
