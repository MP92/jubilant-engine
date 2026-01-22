import { fileURLToPath } from 'node:url';
import { Table } from 'console-table-printer';
import type { AstroIntegration } from 'astro';
import { collectAstroImageAssetsRenameMap, replaceCssImgUrls } from './utils';

export default () => {
  const printStats = (replacedCssImgUrls: Map<string, string>) => {
    if (replacedCssImgUrls.size > 0) {
      const stats = Array.from(replacedCssImgUrls).map(
        ([initialName, finalName]) => ({
          initialName,
          finalName,
        }),
      );

      new Table({ title: 'Renamed duplicate CSS Images' })
        .addRows(stats)
        .printTable();
    }
  };

  return {
    name: 'astro-fix-duplicate-css-images-urls',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const dist = fileURLToPath(dir);

        const astroImageAssetsRenameMap = collectAstroImageAssetsRenameMap(
          globalThis.astroAsset.staticImages!,
        );

        const replacedCssImgUrls = await replaceCssImgUrls(
          dist,
          astroImageAssetsRenameMap,
        );

        printStats(replacedCssImgUrls);
      },
    },
  } as AstroIntegration;
};
