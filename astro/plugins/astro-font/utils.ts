import { relative, join } from 'pathe';
import { fontsDir } from './config';
import type { Config } from './types';
import { getFallbackFont } from './fallback';
import { getFontBuffer, getFS, ifFSOSWrites } from './common-utils';
import { getGoogleFontsParams } from './google-fonts';

const extToPreload = {
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  eot: 'application/vnd.ms-fontobject',
};

function getBasePath(src?: string) {
  return src || './public';
}

export function getRelativePath(from: string, to: string) {
  if (to.includes('https:') || to.includes('http:')) return to;
  return '/' + relative(from, to);
}

// Compute the preload type for the <link tag
export function getPreloadType(src: string) {
  const ext = /\.(woff|woff2|eot|ttf|otf)$/.exec(src)?.[1];
  if (!ext) throw Error(`Unexpected file \`${src}\``);
  return extToPreload[ext as 'woff' | 'woff2' | 'eot' | 'ttf' | 'otf'];
}

// Get everything after the last forward slash
function extractFileNameFromPath(path: string): string {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex !== -1) return path.substring(lastSlashIndex + 1);
  return path;
}

async function createFontFiles(
  fontPath: [number, number, string, string],
): Promise<[number, number, string]> {
  const [i, j, path, basePath] = fontPath;

  // Check if we've access to fs exist in the system
  const fs = await getFS();
  if (!fs) return [i, j, path];

  // Compute the to-be destination of the font
  const name = extractFileNameFromPath(path);
  const generatedFolderPath = join(basePath, fontsDir);
  const savedName = join(generatedFolderPath, name);

  // If the to-be destination already exists, pre-predict
  if (fs.existsSync(savedName)) return [i, j, savedName];

  // Check if writing files is permitted by the system
  const writeAllowed = await ifFSOSWrites(process.cwd());
  if (!writeAllowed) return [i, j, path];

  // By now, we can do anything with fs, hence proceed with creating the folder
  if (!fs.existsSync(generatedFolderPath)) {
    fs.mkdirSync(generatedFolderPath, { recursive: true });
    console.log(`[astro-font] ▶ Created ${generatedFolderPath}`);
  }

  // Try to get the font buffer
  // If found, place it in the required directory
  const fontBuffer = await getFontBuffer(path);
  if (fontBuffer) {
    console.log(`[astro-font] ▶ Generated ${savedName}`);
    fs.writeFileSync(savedName, fontBuffer);
    return [i, j, savedName];
  }

  // Fallback to the original configurations
  return [i, j, path];
}

// Function to generate the final destination of the fonts and consume further
export async function generateFonts(
  fontCollection: Config[],
): Promise<Config[]> {
  const duplicatedCollection = [...fontCollection];
  // Pre-operation to parse and insert google fonts in the src array
  await Promise.all(
    duplicatedCollection.map(async (config) => {
      const googleFontsParams = await getGoogleFontsParams(config);

      if (googleFontsParams) {
        config.src = googleFontsParams;
      }
    }),
  );
  const indicesMatrix: [number, number, string, string][] = [];
  duplicatedCollection.forEach((config, i) => {
    if (config.fetch) {
      config.src.forEach((src, j) => {
        indicesMatrix.push([i, j, src.path, getBasePath(config.basePath)]);
      });
    }
  });
  if (indicesMatrix.length > 0) {
    const tmp = await Promise.all(indicesMatrix.map(createFontFiles));
    tmp.forEach((i) => {
      duplicatedCollection[i[0]]['src'][i[1]]['path'] = i[2];
    });
  }
  return duplicatedCollection;
}

export function createPreloads(fontCollection: Config): string[] {
  // If the parent preload is set to be false, look for true only preload values
  if (fontCollection.preload === false) {
    return fontCollection.src
      .filter((i) => i.preload === true)
      .map((i) =>
        getRelativePath(getBasePath(fontCollection.basePath), i.path),
      );
  }
  // If the parent preload is set to be true (or not defined), look for non-false values
  return fontCollection.src
    .filter((i) => i.preload !== false)
    .map((i) => getRelativePath(getBasePath(fontCollection.basePath), i.path));
}

export async function createBaseCSS(fontCollection: Config): Promise<string[]> {
  try {
    return fontCollection.src.map((i) => {
      const cssProperties = Object.entries(i.css || {}).map(
        ([key, value]) => `${key}: ${value}`,
      );
      if (i.weight) cssProperties.push(`font-weight: ${i.weight}`);
      if (i.style) cssProperties.push(`font-style: ${i.style}`);
      if (fontCollection.name)
        cssProperties.push(`font-family: '${fontCollection.name}'`);
      if (fontCollection.display)
        cssProperties.push(`font-display: ${fontCollection.display}`);
      cssProperties.push(
        `src: url(${getRelativePath(getBasePath(fontCollection.basePath), i.path)})`,
      );
      return `@font-face {${cssProperties.join(';')}}`;
    });
  } catch (e) {
    console.log(e);
  }
  return [];
}

function addFontCssVar(
  collection: string[],
  fontCollection: Config,
  fallbackName?: string | null,
) {
  if (
    typeof fontCollection.cssVariable === 'boolean' &&
    fontCollection.cssVariable
  ) {
    collection.push(
      `:root{ --astro-font: '${fontCollection.name}'${fallbackName ? ', ' + fallbackName : ''}, ${fontCollection.fallback}; }`,
    );
  } else if (
    typeof fontCollection.cssVariable === 'string' &&
    fontCollection.cssVariable.length > 0
  ) {
    collection.push(
      `:root{ --${fontCollection.cssVariable}: '${fontCollection.name}'${fallbackName ? ', ' + fallbackName : ''}, ${fontCollection.fallback}; }`,
    );
  }
}

export async function createFontCSS(fontCollection: Config): Promise<string> {
  const collection = [];

  const fallbackName = fontCollection.fallbackName ?? null;
  const fallbackFont = fallbackName
    ? await getFallbackFont(fontCollection)
    : {};

  if (fontCollection.selector) {
    collection.push(fontCollection.selector);
    collection.push(`{`);
  }

  if (Object.keys(fallbackFont).length > 0) {
    if (fontCollection.selector) {
      collection.push(
        `font-family: '${fontCollection.name}', ${fallbackName}, ${fontCollection.fallback};`,
      );
      collection.push(`}`);
    }

    addFontCssVar(collection, fontCollection, fallbackName);

    collection.push(`@font-face`);
    collection.push(`{`);
    collection.push(`font-family: ${fallbackName};`);
    collection.push(`size-adjust: ${fallbackFont.sizeAdjust};`);
    collection.push(`src: local('${fallbackFont.fallbackFont}');`);
    collection.push(`ascent-override: ${fallbackFont.ascentOverride};`);
    collection.push(`descent-override: ${fallbackFont.descentOverride};`);
    collection.push(`line-gap-override: ${fallbackFont.lineGapOverride};`);
    collection.push(`}`);
  } else {
    if (fontCollection.selector) {
      collection.push(
        `font-family: '${fontCollection.name}', ${fontCollection.fallback};`,
      );
      collection.push(`}`);
    }

    addFontCssVar(collection, fontCollection, fallbackName);
  }

  return collection.join(' ');
}
