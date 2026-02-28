import KeenSlider from 'keen-slider';
import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';
import type { KeenSliderOptions } from './types';
// import bulletsPlugin from './plugins/bulletsPlugin';
import bulletsWithTrackPlugin from './plugins/bulletsWithTrackPlugin';
import arrowsPlugin from './plugins/arrowsPlugin';
import scaleAdjacentSlides from './plugins/scaleAdjacentSlides';
import './keen-slider.scss';
import getDataAttrParams from '@/js/utils/getDataAttrParams';

const selectors = {
  root: '[data-js-slider]',
  slides: '[data-js-slider-slides]',
  bullets: '[data-js-slider-bullets]',
  arrowPrev: '[data-js-slider-arrow-prev]',
  arrowNext: '[data-js-slider-arrow-next]',
};

const resolveVisibleBulletsCount = ({
  visibleBulletsCount,
}: KeenSliderOptions) => (visibleBulletsCount ? +visibleBulletsCount : null);

class KeenSliderWrapper {
  slidesEl: HTMLElement;
  bulletsEl: HTMLElement | null = null;
  arrowPrevEl: HTMLElement | null = null;
  arrowNextEl: HTMLElement | null = null;
  sliderInstance: KeenSliderInstance;

  constructor(private rootEl: HTMLElement) {
    this.slidesEl = this.rootEl.querySelector<HTMLElement>(selectors.slides)!;
    this.bulletsEl = this.rootEl.querySelector<HTMLElement>(selectors.bullets);
    this.arrowPrevEl = this.rootEl.querySelector<HTMLElement>(
      selectors.arrowPrev,
    );
    this.arrowNextEl = this.rootEl.querySelector<HTMLElement>(
      selectors.arrowNext,
    );

    if (!this.slidesEl) {
      throw new Error('Missing slides element');
    }

    if (!this.arrowPrevEl !== !this.arrowNextEl) {
      throw new Error('Missing one of arrow elements');
    }

    this.sliderInstance = this.initSlider();
  }

  initSlider() {
    const sliderOptions = getDataAttrParams(
      this.rootEl,
      selectors.root,
    ) as KeenSliderOptions;

    const plugins: KeenSliderPlugin[] = [];

    if (this.bulletsEl) {
      const visibleBulletsCount = resolveVisibleBulletsCount(sliderOptions);
      plugins.push(bulletsWithTrackPlugin(this.bulletsEl, visibleBulletsCount));
    }

    if (this.arrowPrevEl && this.arrowNextEl) {
      plugins.push(arrowsPlugin(this.arrowPrevEl, this.arrowNextEl));
    }

    if (sliderOptions.adjacentSlidesScale) {
      plugins.push(scaleAdjacentSlides(sliderOptions.adjacentSlidesScale));
    }

    return new KeenSlider(this.slidesEl, sliderOptions, plugins);
  }
}

class KeenSliderCollection {
  constructor() {
    document
      .querySelectorAll<HTMLElement>(selectors.root)
      .forEach((sliderEl) => new KeenSliderWrapper(sliderEl));
  }
}

export default KeenSliderCollection;
