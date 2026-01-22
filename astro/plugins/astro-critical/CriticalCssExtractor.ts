import fs from 'node:fs';
import Crittr from 'crittr';
import type { Browser } from 'puppeteer';
import { launchBrowser, closeBrowser } from './browser';
import { removeDuplicateStyles, minifyCss } from './utils';
import { keepSelectors } from './config';

const crittrConfigBase = {
  minifyCriticalCss: false,
  pageLoadTimeout: 20000,
  outputRemainingCss: false,
  browser: {
    isCacheEnabled: false,
    isJsEnabled: true,
  },
  keepSelectors,
};

function getOriginalCssParts(
  criticalCssArr: string[],
  cssFile: string,
): [string, string] {
  const originalCss = fs.readFileSync(cssFile, 'utf8').toString();

  const restCss = removeDuplicateStyles(originalCss, criticalCssArr);

  const criticalCss = minifyCss(removeDuplicateStyles(originalCss, [restCss]));

  return [criticalCss, restCss];
}

class CriticalCssExtractor {
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private baseUrl: string,
    private viewportSizes: { width: number; height: number }[],
  ) {}

  #resolveUrl(url: string) {
    return new URL(url, this.baseUrl).href;
  }

  #requestPage(url: string, cssFiles: string[], width: number, height: number) {
    if (!this.browserPromise) {
      this.browserPromise = launchBrowser();
    }

    url = this.#resolveUrl(url);

    return Crittr({
      ...crittrConfigBase,
      urls: [url],
      css: cssFiles,
      device: {
        width,
        height,
      },
      puppeteer: {
        browser: this.browserPromise,
      },
    });
  }

  async #getAllViewportsCriticalCss(url: string, cssFiles: string[]) {
    const resultsPromises = this.viewportSizes.map(({ width, height }) =>
      this.#requestPage(url, cssFiles, width, height),
    );

    const results = await Promise.all(resultsPromises);

    return results
      .map(({ critical }) => critical.trim())
      .filter((critical) => critical.length > 0);
  }

  async run(
    url: string,
    cssFiles: string[],
  ): Promise<[string, Record<string, string>]> {
    const criticalCssArr = await this.#getAllViewportsCriticalCss(
      url,
      cssFiles,
    );

    if (!Array.isArray(cssFiles) || cssFiles.length <= 0) {
      return [minifyCss(criticalCssArr.join('')), {}];
    }

    const origCssPartsEntries = cssFiles.map((cssFile) => [
      cssFile,
      getOriginalCssParts(criticalCssArr, cssFile),
    ]);

    const criticalCss = origCssPartsEntries
      .map(([, [criticalCss]]) => criticalCss)
      .join('');

    const restCss = Object.fromEntries(
      origCssPartsEntries.map(([cssFile, [, nonCriticalCss]]) => [
        cssFile,
        nonCriticalCss,
      ]),
    ) as Record<string, string>;

    return [criticalCss, restCss];
  }

  closeBrowser() {
    return closeBrowser().then((this.browserPromise = null));
  }
}

export default CriticalCssExtractor;
