import type { Font } from 'fontkit';

export type FontEntry = {
  style?: string;
  weight?: string;
  metadata: Font;
};

export type FontMetrics = {
  fallbackFont: string;
  sizeAdjust: string;
  ascentOverride: string;
  descentOverride: string;
  lineGapOverride: string;
};

type GlobalValues = 'inherit' | 'initial' | 'revert' | 'revert-layer' | 'unset';

export interface Source {
  path: string;
  preload?: boolean;
  css?: Record<string, string>;
  // https://developer.mozilla.org/en-US/docs/Web/CSS/font-style
  style:
    | 'normal'
    | 'italic'
    | 'oblique'
    | `oblique ${number}deg`
    | GlobalValues
    | (string & {});
  // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
  weight?:
    | 'normal'
    | 'bold'
    | 'lighter'
    | 'bolder'
    | GlobalValues
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
    | (string & {})
    | (number & {});
}

export interface Config {
  name: string;
  src: Source[];
  fetch?: boolean;
  verbose?: boolean;
  selector?: string;
  preload?: boolean;
  cacheDir?: string;
  basePath?: string;
  fallbackName?: string;
  googleFontsURL?: string;
  cssVariable?: string | boolean;
  fallback: 'serif' | 'sans-serif' | 'monospace';
  // https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
  display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' | (string & {});
  subsets?: string[];
}

export interface Props {
  config: Partial<Config>[];
}
