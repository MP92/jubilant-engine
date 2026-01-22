import fs from 'node:fs';
import { removeDuplicateStyles, minifyCss, outputFileAsync } from '../utils';

export const appendRestCss = (
  restCss: Record<string, string>,
  otherRestCss: Record<string, string>,
) => {
  for (const cssAsset in otherRestCss) {
    if (!(cssAsset in restCss)) {
      restCss[cssAsset] = otherRestCss[cssAsset];
      continue;
    }

    const extraCss = removeDuplicateStyles(otherRestCss[cssAsset], [
      restCss[cssAsset],
    ]).trim();

    restCss[cssAsset] += extraCss;
  }

  return restCss;
};

export const normalizeSharedRestCss = (
  sharedCssAssetsPaths: string[],
  restCss: Record<string, string>,
) => {
  for (const sharedCssAssetPath of sharedCssAssetsPaths) {
    if (!restCss[sharedCssAssetPath]) {
      throw Error(
        `Shared css asset '${sharedCssAssetPath}' was not found in restCss object.`,
      );
    }

    const origCss = fs.readFileSync(sharedCssAssetPath).toString();

    const criticalCss = removeDuplicateStyles(origCss, [
      restCss[sharedCssAssetPath],
    ]);

    restCss[sharedCssAssetPath] = removeDuplicateStyles(origCss, [criticalCss]);
  }

  return restCss;
};

export const minifyRestCss = (restCss: Record<string, string>) => {
  for (const cssPath in restCss) {
    restCss[cssPath] = minifyCss(restCss[cssPath]);
  }

  return restCss;
};

export const saveRestCss = async (restCss: Record<string, string>) => {
  return Promise.all(
    Object.entries(restCss).map(([cssAssetPath, cssAssetContents]) =>
      outputFileAsync(cssAssetPath, cssAssetContents),
    ),
  );
};
