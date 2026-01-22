import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, renameSync, rmSync } from 'node:fs';
import slash from 'slash';
import { escapeRegExp, walkFiles } from '../utils';
import type {
  AssetsGlobalStaticImagesList,
  AstroImageTransforms,
} from './types';

export const urlSearchParamsToString = (urlSearchParams: URLSearchParams) =>
  urlSearchParams.toString().replace(/=(?=&|$)/g, '');

export const findCssImgUrls = (code: string) =>
  code
    .matchAll(/url\((['"]?)([^'")]+)\1\)/g)
    .map((m) => m[2])
    .filter((maybePath) => existsSync(maybePath))
    .toArray();

export const copyCssImages = async (dist: string, cssImgNames: string[]) => {
  const copiedCssImgPaths = new Map<string, string>();

  for (const imgName of cssImgNames) {
    const imgPath = slash(path.join(dist, imgName));

    copiedCssImgPaths.set(imgPath, imgPath + '_CSS');
  }

  await Promise.all(
    copiedCssImgPaths
      .entries()
      .map(([imgPath, copyImgPath]) => copyFile(imgPath, copyImgPath)),
  );

  return copiedCssImgPaths;
};

export const restoreMissingCssImages = (
  copiedCssImgPaths: Map<string, string>,
) => {
  const restoredImages = [];

  for (const [origPath, copiedPath] of copiedCssImgPaths) {
    if (existsSync(origPath)) {
      rmSync(copiedPath);
    } else {
      renameSync(copiedPath, origPath);

      restoredImages.push(origPath);
    }
  }

  return restoredImages;
};

export const replaceCssImgUrls = async (
  dist: string,
  cssImgAssetsUrlsMap: Map<string, string>,
) => {
  const replacedCssImgUrls = new Map<string, string>();

  try {
    for await (const file of walkFiles(dist)) {
      if (!file.match(/\.(html|css)$/)) {
        continue;
      }

      let content = await readFile(file, 'utf-8');

      for (const [srcPath, finalPath] of cssImgAssetsUrlsMap) {
        const regExp = new RegExp(
          `url\\((['"]?)${escapeRegExp(srcPath)}\\1\\)`,
          'g',
        );

        if (regExp.test(content)) {
          replacedCssImgUrls.set(srcPath, finalPath);

          content = content.replace(regExp, `url(${finalPath})`);
        }
      }

      await writeFile(file, content, {
        encoding: 'utf8',
        flag: 'w',
      });
    }
  } catch {
    console.error(`\u001b[31mDist directory doesn't exist.\u001b[39m`);
  }

  return replacedCssImgUrls;
};

export const findAstroImageRenameInfo = (
  astroImageTransforms: AstroImageTransforms,
  srcFormat?: string,
) => {
  for (const [, { finalPath, transform }] of astroImageTransforms) {
    const { src, width, height, format } = transform;

    if (
      typeof src !== 'string' &&
      width === src.width &&
      height === src.height &&
      format === (srcFormat ?? src.format)
    ) {
      return { srcPath: src.src, finalPath };
    }
  }

  return null;
};

export const collectAstroImageAssetsRenameMap = (
  staticImages: AssetsGlobalStaticImagesList,
) => {
  const astroImageAssetsRenameMap = new Map<string, string>();

  for (const [, imageAsset] of staticImages ?? []) {
    const imageRenameInfo = findAstroImageRenameInfo(imageAsset.transforms);

    if (imageRenameInfo) {
      if (astroImageAssetsRenameMap.has(imageRenameInfo.srcPath)) {
        throw new Error(
          `Duplicate image asset for '${imageRenameInfo.srcPath}'`,
        );
      }

      astroImageAssetsRenameMap.set(
        imageRenameInfo.srcPath,
        imageRenameInfo.finalPath,
      );
    }
  }

  return astroImageAssetsRenameMap;
};

export const collectCssImageAssetsRenameMap = (
  convertedToOrigPathsMap: Map<string, string>,
  staticImages: AssetsGlobalStaticImagesList,
) => {
  const cssImageAssetsRenameMap = new Map<string, string>();

  for (const [builtAssetName, cssOriginalSrcPath] of convertedToOrigPathsMap) {
    const cssImgFormat = builtAssetName.split('.').pop();

    const foundEntry =
      [...(staticImages ?? [])].find(
        ([, { originalSrcPath }]) => originalSrcPath === cssOriginalSrcPath,
      ) ?? null;

    if (!foundEntry) {
      continue;
    }

    const imageRenameInfo = findAstroImageRenameInfo(
      foundEntry[1].transforms,
      cssImgFormat,
    );

    if (imageRenameInfo) {
      cssImageAssetsRenameMap.set(builtAssetName, imageRenameInfo.finalPath);
    }
  }

  return cssImageAssetsRenameMap;
};
