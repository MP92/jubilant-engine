import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import Queue from 'run-queue';
import inlineCritical from 'inline-critical';
import { startPreviewServer } from './previewServer';
import CriticalCssExtractor from './CriticalCssExtractor';
import {
  getCssAssetsMap,
  fixCssReducedMotionValues,
  outputFileAsync,
  resolveHtmlFilePath,
  getSharedCssAssetsPaths,
} from './utils';
import {
  appendRestCss,
  minifyRestCss,
  normalizeSharedRestCss,
  saveRestCss,
} from './helpers/rest-css';
import { viewportSizes } from './config';

export default function astroCritical(): AstroIntegration {
  async function extractCriticalCss(
    dist: string,
    cssAssetsByPage: Record<string, string[]>,
  ) {
    const restCss: Record<string, string> = {};

    const pageUrls = Object.keys(cssAssetsByPage);

    const { previewServer, baseUrl } = await startPreviewServer();

    const criticalCssExtractor = new CriticalCssExtractor(
      baseUrl,
      viewportSizes,
    );

    async function extractPageCriticalCss(
      pageUrl: string,
      cssAssets: string[],
    ) {
      console.log(`Generating critical CSS for ${pageUrl}`);

      const [criticalCss, extractedRestCss] = await criticalCssExtractor.run(
        pageUrl,
        cssAssets,
      );

      appendRestCss(restCss, extractedRestCss);

      await embedCriticalCss(dist, criticalCss, pageUrl);
    }

    const queue = new Queue({
      maxConcurrency: pageUrls.length,
    });

    for (const pageUrl of pageUrls) {
      queue.add(1, extractPageCriticalCss, [
        pageUrl,
        cssAssetsByPage[pageUrl] ?? [],
      ]);
    }

    try {
      await queue.run();

      return restCss;
    } finally {
      await Promise.all([
        criticalCssExtractor.closeBrowser(),
        previewServer.stop(),
      ]);
    }
  }

  async function embedCriticalCss(
    dist: string,
    criticalCss: string,
    pageUrl: string,
  ) {
    if (criticalCss.length <= 0) {
      return;
    }

    const htmlFilePath = resolveHtmlFilePath(dist, pageUrl);

    const htmlPageContents = fs.readFileSync(htmlFilePath).toString();

    let inlined: Buffer | string = inlineCritical(
      htmlPageContents,
      criticalCss,
      {
        basePath: dist,
        extract: false,
        strategy: 'media',
      },
    );

    inlined = fixCssReducedMotionValues(inlined);

    await outputFileAsync(htmlFilePath, inlined);
  }

  return {
    name: 'astro-critical',
    hooks: {
      'astro:build:done': async ({ dir, assets }) => {
        const dist = fileURLToPath(dir);

        const cssAssetsByPage = await getCssAssetsMap(dist, assets);

        const restCss = await extractCriticalCss(dist, cssAssetsByPage);

        if (Object.keys(restCss).length > 0) {
          const sharedCssAssetsPaths = getSharedCssAssetsPaths(cssAssetsByPage);

          minifyRestCss(normalizeSharedRestCss(sharedCssAssetsPaths, restCss));

          await saveRestCss(restCss);
        }
      },
    },
  };
}
