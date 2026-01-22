import path from 'node:path';
import { fileURLToPath } from 'node:url';
import slash from 'slash';
import { Table } from 'console-table-printer';
import type { OutputBundle } from 'rollup';
import type { AstroIntegration } from 'astro';
import convertImg from './convert-img';
import { collectCssImageAssetsRenameMap, replaceCssImgUrls } from './utils';

export default (rootPath: string) => {
  const convertedToOrigPathsMap = new Map<string, string>();

  const printStats = (replacedCssImgUrls: Map<string, string>) => {
    if (convertedToOrigPathsMap.size > 0) {
      const stats = Array.from(convertedToOrigPathsMap).map(
        ([builtAssetName, cssOriginalSrcPath]) => ({
          originalSrcPath: cssOriginalSrcPath,
          builtAssetName,
          renamedTo: replacedCssImgUrls.get(builtAssetName) || '-',
        }),
      );

      new Table({ title: 'Converted CSS Images' }).addRows(stats).printTable();
    }
  };

  const resolveId = async (id: string) => {
    if (/[?&]as=.*$/.test(id)) {
      const relSrc = id.replace(/^@img\//, 'img/');

      const { srcImgPath, convertedImagePath } = await convertImg(relSrc);

      if (convertedImagePath) {
        const originalSrcPath = slash(
          path.resolve(rootPath, `./src/${srcImgPath}`),
        );

        convertedToOrigPathsMap.set(convertedImagePath, originalSrcPath);

        return { id: slash(path.resolve(rootPath, convertedImagePath)) };
      }
    }

    id = id.replace(/^@img\//, './src/img/');

    return { id: slash(path.resolve(rootPath, id)) };
  };

  return {
    name: 'astro-convert-css-images',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'vite-plugin-css-images',
                enforce: 'pre',
                config() {
                  return {
                    resolve: {
                      alias: [
                        {
                          find: /(^@img.*$)/i,
                          replacement: '$1',
                          customResolver: { resolveId },
                        },
                      ],
                    },
                  };
                },
                generateBundle(_, bundle: OutputBundle) {
                  for (const [, asset] of Object.entries(bundle)) {
                    if (asset.type !== 'asset' || !asset.originalFileNames[0]) {
                      continue;
                    }

                    const originalSrcPath = convertedToOrigPathsMap.get(
                      asset.originalFileNames[0],
                    );

                    if (originalSrcPath) {
                      const assetFileName =
                        '/' + asset.fileName.replace(/^\//, '');

                      convertedToOrigPathsMap.set(
                        assetFileName,
                        originalSrcPath,
                      );

                      convertedToOrigPathsMap.delete(
                        asset.originalFileNames[0],
                      );
                    }
                  }
                },
              },
            ],
          },
        });
      },
      'astro:build:done': async ({ dir }) => {
        const dist = fileURLToPath(dir);

        const cssImageAssetsRenameMap = collectCssImageAssetsRenameMap(
          convertedToOrigPathsMap,
          globalThis.astroAsset.staticImages!,
        );

        const replacedCssImgUrls = await replaceCssImgUrls(
          dist,
          cssImageAssetsRenameMap,
        );

        printStats(replacedCssImgUrls);
      },
    },
  } as AstroIntegration;
};
