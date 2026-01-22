import { dirname, join } from 'node:path';
import { create, type Font } from 'fontkit';
import { pickFontFileForFallbackGeneration } from './fallback-utils';
import { getFallbackMetricsFromFontFile } from './font';
import { getFS, ifFSOSWrites, getFontBuffer } from './common-utils';
import type { FontEntry, FontMetrics, Config, Source } from './types';

async function getOS(): Promise<typeof import('node:os') | undefined> {
  let os;
  try {
    os = await import('node:os');
    return os;
  } catch {
    // NOP
  }
}

function simpleHash(input: string) {
  let hash = 0;
  if (input.length === 0) return hash;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + input.length;
}

async function resolveCacheDir({ cacheDir }: Config) {
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

function resolveCachedFilePath({ src }: Config, cacheDir: string | null) {
  if (!cacheDir) {
    return null;
  }

  // Create a json based on slugified path, style and weight
  const slugifyPath = (i: Source) => `${i.path}_${i.style}_${i.weight}`;
  const slugifiedCollection = src.map(slugifyPath);
  const cachedFileName = simpleHash(slugifiedCollection.join('_')) + '.txt';

  return join(cacheDir, cachedFileName);
}

async function getFontsData({ src, verbose }: Config) {
  const fonts: FontEntry[] = [];

  await Promise.all(
    src.map(({ path, style, weight }) =>
      getFontBuffer(path).then((fontBuffer) => {
        if (fontBuffer) {
          try {
            const resMetadata = create(fontBuffer) as Font;
            fonts.push({
              style,
              weight: weight?.toString(),
              metadata: resMetadata,
            });
          } catch (e) {
            if (verbose) {
              console.log(`[astro-font] ▶`);
              console.error(e);
            }
          }
        }
      }),
    ),
  );

  return fonts;
}

async function saveToCache(
  cachedFilePath: string | null,
  fallbackMetrics: FontMetrics,
  verbose?: boolean,
) {
  const fs = await getFS();

  if (
    !cachedFilePath ||
    !fs ||
    fs.existsSync(cachedFilePath) ||
    !(await ifFSOSWrites(process.cwd()))
  ) {
    return;
  }

  const cacheDir = dirname(cachedFilePath);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });

    if (verbose) {
      console.log(`[astro-font] ▶ Created ${cacheDir}`);
    }
  }

  fs.writeFileSync(cachedFilePath, JSON.stringify(fallbackMetrics), 'utf8');

  if (verbose) {
    console.log(`[astro-font] ▶ Created ${cachedFilePath}`);
  }
}

export async function getFallbackFont(
  fontCollection: Config,
): Promise<Record<string, string>> {
  const fs = await getFS();

  if (!fs) {
    return {};
  }

  const cacheDir = await resolveCacheDir(fontCollection);
  const cachedFilePath = resolveCachedFilePath(fontCollection, cacheDir);

  if (cachedFilePath && fs.existsSync(cachedFilePath)) {
    try {
      const tmpCachedFilePath = fs.readFileSync(cachedFilePath, 'utf8');
      return JSON.parse(tmpCachedFilePath);
    } catch {
      // NOP
    }
  }

  const fonts: FontEntry[] = await getFontsData(fontCollection);

  if (!fonts.length) {
    return {};
  }

  const { metadata } = pickFontFileForFallbackGeneration(fonts);

  const fallbackMetrics = getFallbackMetricsFromFontFile(
    metadata,
    fontCollection.fallback,
  );

  await saveToCache(cachedFilePath, fallbackMetrics, fontCollection.verbose);

  return fallbackMetrics;
}
