import { readFile } from 'node:fs/promises';
import { Table } from 'console-table-printer';
import type { AstroIntegration } from 'astro';
import { walkFiles } from '../utils';
import {
  copyCssImages,
  findCssImgUrls,
  restoreMissingCssImages,
} from './utils';

export default () => {
  let copiedCssImgPaths: Map<string, string>;

  const printStats = (restoredImages: string[]) => {
    if (restoredImages.length > 0) {
      const stats = restoredImages.map((name) => ({ name }));

      new Table({ title: 'Restored CSS Images' }).addRows(stats).printTable();
    }
  };

  return {
    name: 'astro-restore-css-images',
    hooks: {
      'astro:build:setup': async ({ vite }) => {
        if (!vite.build?.outDir) {
          return;
        }

        for await (const file of walkFiles(vite.build.outDir)) {
          if (!file.match(/\.(html|css)$/)) {
            continue;
          }

          const content = await readFile(file, 'utf-8');

          const cssImgNames = findCssImgUrls(content);

          copiedCssImgPaths = await copyCssImages(
            vite.build.outDir,
            cssImgNames,
          );
        }
      },
      'astro:build:done': async () => {
        const restoredImages = restoreMissingCssImages(copiedCssImgPaths);

        printStats(restoredImages);
      },
    },
  } as AstroIntegration;
};
