import type { KeenSliderOptions as OriginalKeenSliderOptions } from 'keen-slider';

export type KeenSliderOptions = OriginalKeenSliderOptions & {
  visibleBulletsCount?: number;
  adjacentSlidesScale?: number;
};
