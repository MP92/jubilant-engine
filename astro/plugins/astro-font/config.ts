import type { Config } from './types';
import { cacheDir } from '../../config';

export const fontsDir = '_fonts';

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

export const commonFontConfig: Partial<Config> = {
  src: [],
  fetch: true,
  verbose: true,
  cacheDir,
  display: 'swap',
};
