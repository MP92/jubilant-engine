import path from 'node:path';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import { promisify } from 'node:util';
import postcss from 'postcss';
import discard from 'postcss-discard';
import sortMediaQueries from 'postcss-sort-media-queries';
import lightningcss from 'postcss-lightningcss';
import normalizeNewline from 'normalize-newline';
import CleanCSS from 'clean-css';

const getCssAssetsUrls = (distPath: string, htmlContent: string) =>
  htmlContent
    .matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/gi)
    .map((m) => path.resolve(distPath, m[1].replace(/^\/*/, '')))
    .toArray();

export async function getCssAssetsMap(
  distPath: string,
  assets: Map<string, URL[]>,
) {
  const result: Record<string, string[]> = {};

  for (const [pageUrl, [href]] of assets) {
    const htmlContent = await readFile(href, 'utf-8');

    result[pageUrl] = getCssAssetsUrls(distPath, htmlContent);
  }

  return result;
}

/**
 * Remove styles
 * @param {string} styles CSS
 * @param {array<string>} css CSS
 * @returns {string} css string not containing any of the styles defined in css array
 */
export function removeDuplicateStyles(styles: string, css: string[]): string {
  const _styles = normalizeNewline(styles || '');
  const _css = normalizeNewline(css.join('\n'));
  if (_css.trim() !== '') {
    return postcss(discard({ css: _css })).process(_styles).css;
  }

  return _styles;
}

export function fixCssReducedMotionValues(
  inlinedHtmlPageContents: string | Buffer,
) {
  if (typeof inlinedHtmlPageContents === 'object') {
    inlinedHtmlPageContents = inlinedHtmlPageContents.toString();
  }

  return inlinedHtmlPageContents.replaceAll(
    /((animation|transition)-duration:\s*)NaNs/g,
    '$1.01ms',
  );
}

export const minifyCss = (css: string) => {
  const cleanCSS = new CleanCSS({
    level: {
      1: {
        all: true,
        replaceTimeUnits: false,
      },
      2: {
        all: false,
        mergeAdjacentRules: true,
        mergeIntoShorthands: true,
        mergeMedia: true,
        mergeNonAdjacentRules: true,
        removeEmpty: true,
        reduceNonAdjacentRules: true,
        removeDuplicateFontRules: true,
        removeDuplicateMediaBlocks: true,
        removeDuplicateRules: true,
      },
    },
  });

  let minifiedCss = postcss([
    sortMediaQueries({
      sort: 'desktop-first',
      onlyTopLevel: true,
    }),
  ]).process(css, { from: undefined }).css;

  minifiedCss = cleanCSS.minify(minifiedCss).styles;

  return postcss([lightningcss()])
    .process(minifiedCss, {
      from: undefined,
    })
    .css.trim();
};

export function getSharedCssAssetsPaths(
  cssAssetsByPage: Record<string, string[]>,
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const pageAssets of Object.values(cssAssetsByPage)) {
    for (const asset of pageAssets) {
      if (seen.has(asset)) {
        duplicates.add(asset);
      } else {
        seen.add(asset);
      }
    }
  }

  return Array.from(duplicates);
}

const writeFileAsync = promisify(fs.writeFile);

export async function outputFileAsync(
  file: string,
  data: string | NodeJS.ArrayBufferView,
) {
  const dir = path.dirname(file);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return writeFileAsync(file, data);
}

export const resolveHtmlFilePath = (dist: string, pageUrl: string) =>
  path.resolve(dist, pageUrl.replace(/(^\/*)|(\/*$)/, ''), 'index.html');
