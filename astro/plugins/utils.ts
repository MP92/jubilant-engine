import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function* walkFiles(dir: string): AsyncGenerator<string> {
  await mkdir(dir, { recursive: true });

  const dirents = await readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);

    if (dirent.isDirectory()) yield* walkFiles(res);
    else yield res;
  }
}

export const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
