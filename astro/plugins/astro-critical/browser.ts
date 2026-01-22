import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

export async function launchBrowser() {
  if (!browserPromise) {
    await puppeteer.trimCache();

    browserPromise = puppeteer.launch({
      browser: 'chrome',
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--ignore-certificate-errors',
        // '--disable-dev-shm-usage',
      ],
      dumpio: false,
      headless: true,
      devtools: false,
      // slowMo: 1000,
    });
  }

  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) {
    return Promise.resolve();
  }

  return browserPromise
    .then((b) => b.close())
    .then(() => (browserPromise = null));
}
