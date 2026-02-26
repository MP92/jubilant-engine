import { join } from 'node:path';
import fs from 'node:fs';
import { getFS, ifFSOSWrites } from './common-utils';
import type { Config } from './types';

async function getOS(): Promise<typeof import('node:os') | undefined> {
  let os;
  try {
    os = await import('node:os');
    return os;
  } catch {
    // NOP
  }
}

export async function resolveCacheDir(cacheDir?: string | null) {
  if (cacheDir) {
    return cacheDir;
  }

  const os = await getOS();

  if (!os) {
    return null;
  }

  const writeAllowed = await Promise.all([
    ifFSOSWrites(os.tmpdir()),
    ifFSOSWrites('node_modules/.cache'),
  ]);

  return writeAllowed.find((i) => i !== undefined) ?? null;
}

async function resolveCachedFilePath(
  fileName: string,
  cacheDir?: string | null,
) {
  cacheDir = await resolveCacheDir(cacheDir);

  if (!cacheDir) {
    return null;
  }

  return join(cacheDir, fileName);
}

export async function getFromCache(fileName: string, cacheDir?: string | null) {
  const cachedFilePath = await resolveCachedFilePath(fileName, cacheDir);

  if (cachedFilePath && fs.existsSync(cachedFilePath)) {
    try {
      const data = fs.readFileSync(cachedFilePath, 'utf8');

      if (fileName.endsWith('.json')) {
        return JSON.parse(data);
      }

      return data;
    } catch {
      // NOP
    }
  }

  return null;
}

export async function saveToCache(
  fileName: string,
  data: string | object,
  { cacheDir, verbose }: Config,
) {
  const fs = await getFS();

  if (!fs || !cacheDir) {
    return;
  }

  const cachedFilePath = await resolveCachedFilePath(fileName, cacheDir);

  if (
    !cachedFilePath ||
    fs.existsSync(cachedFilePath) ||
    !(await ifFSOSWrites(process.cwd()))
  ) {
    return;
  }

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });

    if (verbose) {
      console.log(`[astro-font] ▶ Created ${cacheDir}`);
    }
  }

  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }

  fs.writeFileSync(cachedFilePath, data, 'utf8');

  if (verbose) {
    console.log(`[astro-font] ▶ Created ${cachedFilePath}`);
  }
}
