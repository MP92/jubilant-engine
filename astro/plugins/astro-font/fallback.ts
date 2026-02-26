import { create, type Font } from 'fontkit';
import { pickFontFileForFallbackGeneration } from './fallback-utils';
import { getFallbackMetricsFromFontFile } from './font';
import { getFS, getFontBuffer, simpleHash } from './common-utils';
import type { FontEntry, Config, Source } from './types';
import { getFromCache, saveToCache } from './cache-utils';

function resolveCachedFileName(src: Source[]) {
  // Create a json based on slugified path, style and weight
  const slugifyPath = (i: Source) => `${i.path}_${i.style}_${i.weight}`;
  const slugifiedCollection = src.map(slugifyPath);

  return simpleHash(slugifiedCollection.join('_')) + '.json';
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

export async function getFallbackFont(
  fontCollection: Config,
): Promise<Record<string, string>> {
  const fs = await getFS();

  if (!fs) {
    return {};
  }

  const cachedFileName = resolveCachedFileName(fontCollection.src);

  const fallbackFontFromCache = await getFromCache(
    cachedFileName,
    fontCollection.cacheDir,
  );

  if (fallbackFontFromCache) {
    return fallbackFontFromCache;
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

  await saveToCache(cachedFileName, fallbackMetrics, fontCollection);

  return fallbackMetrics;
}
