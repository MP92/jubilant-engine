import type { Config } from './types';
import { cacheDir } from '../../config';

export const fontsDir = '_fonts';

export const commonFontConfig: Partial<Config> = {
  src: [],
  fetch: true,
  verbose: true,
  cacheDir,
  display: 'swap',
};
