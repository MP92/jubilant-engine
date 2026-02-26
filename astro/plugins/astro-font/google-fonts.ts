import { USER_AGENT } from './config';
import type { Config, Source } from './types';
import { simpleHash } from './common-utils';
import { getFromCache, saveToCache } from './cache-utils';

const FONT_FACE_WITH_SUBSET_COMMENT_REGEX =
  /\/\*(.*?)\*\/\s*@font-face\s*{[^}]*}/gi;

const resolveCachedFileName = (googleFontsURL: string) =>
  simpleHash(googleFontsURL) + '.css';

async function getGoogleFontsCssFromCache(
  googleFontsURL: string,
  config: Config,
) {
  const cachedFileName = resolveCachedFileName(googleFontsURL);

  return await getFromCache(cachedFileName, config.cacheDir);
}

async function saveGoogleFontsCssToCache(
  googleFontsURL: string,
  googleFontsCSS: string,
  config: Config,
) {
  const cachedFileName = resolveCachedFileName(googleFontsURL);

  await saveToCache(cachedFileName, googleFontsCSS, config);
}

async function getGoogleFontsCssFromServer(
  googleFontsURL: string,
  config: Config,
) {
  const googleFontsCSS = await fetch(googleFontsURL, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  }).then((res) => res.text());

  await saveGoogleFontsCssToCache(googleFontsURL, googleFontsCSS, config);

  return googleFontsCSS;
}

export async function getGoogleFontsParams(config: Config) {
  const { googleFontsURL } = config;

  if (!googleFontsURL) {
    return null;
  }

  const googleFontsCSS =
    (await getGoogleFontsCssFromCache(googleFontsURL, config)) ??
    (await getGoogleFontsCssFromServer(googleFontsURL, config));

  const filteredGoogleFontsCSS = filterGoogleFonts(
    googleFontsCSS,
    config.subsets,
  );

  return parseGoogleCSS(filteredGoogleFontsCSS);
}

function filterGoogleFonts(cssContent: string, subsets?: string[]) {
  if (!subsets?.length) {
    return cssContent;
  }

  let newCssContent = '';

  const fontFaceWithSubsetCommentMatches = cssContent.matchAll(
    FONT_FACE_WITH_SUBSET_COMMENT_REGEX,
  );

  for (const fontFaceWithSubsetCommentMatch of fontFaceWithSubsetCommentMatches) {
    if (subsets.includes(fontFaceWithSubsetCommentMatch[1].trim())) {
      newCssContent += fontFaceWithSubsetCommentMatch[0].trim() + '\n';
    }
  }

  return newCssContent.trim();
}

function parseGoogleCSS(tmp: string) {
  let match;
  const fontFaceMatches = [];
  const fontFaceRegex = /@font-face\s*{([^}]+)}/g;
  while ((match = fontFaceRegex.exec(tmp)) !== null) {
    const fontFaceRule = match[1];
    const fontFaceObject = {} as Source;
    fontFaceRule.split(';').forEach((property) => {
      if (property.includes('src') && property.includes('url')) {
        try {
          fontFaceObject['path'] =
            property
              .trim()
              .split(/\(|\)|(url\()/)
              .find((each) => each.trim().includes('https:'))
              ?.trim() ?? '';
        } catch {
          // NOP
        }
      }
      if (property.includes('-style')) {
        fontFaceObject['style'] = property.split(':').map((i) => i.trim())[1];
      }
      if (property.includes('-weight')) {
        fontFaceObject['weight'] = property.split(':').map((i) => i.trim())[1];
      }
      if (property.includes('unicode-range')) {
        if (!fontFaceObject['css']) fontFaceObject['css'] = {};
        fontFaceObject['css']['unicode-range'] = property
          .split(':')
          .map((i) => i.trim())[1];
      }
    });
    fontFaceMatches.push(fontFaceObject);
  }
  return fontFaceMatches;
}
