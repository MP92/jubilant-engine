import KeenSlider from 'keen-slider';
import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';
import type { KeenSliderOptions } from './types';
// import bulletsPlugin from './plugins/bulletsPlugin';
import bulletsWithTrackPlugin from './plugins/bulletsWithTrackPlugin';
import arrowsPlugin from './plugins/arrowsPlugin';
import scaleAdjacentSlides from './plugins/scaleAdjacentSlides';
import './keen-slider.scss';

class KeenSliderWrapper {
  slidesEl: HTMLElement;
  bulletsEl: HTMLElement | null = null;
  arrowPrevEl: HTMLElement | null = null;
  arrowNextEl: HTMLElement | null = null;
  sliderInstance: KeenSliderInstance;

  constructor(private rootEl: HTMLElement) {
    this.slidesEl = this.rootEl.querySelector<HTMLElement>(
      '[data-js-slider-slides]',
    )!;
    this.bulletsEl = this.rootEl.querySelector<HTMLElement>(
      '[data-js-slider-bullets]',
    );
    this.arrowPrevEl = this.rootEl.querySelector<HTMLElement>(
      '[data-js-slider-arrow-prev]',
    );
    this.arrowNextEl = this.rootEl.querySelector<HTMLElement>(
      '[data-js-slider-arrow-next]',
    );

    if (!this.slidesEl) {
      throw new Error('Missing slides element');
    }

    if (!this.arrowPrevEl !== !this.arrowNextEl) {
      throw new Error('Missing one of arrow elements');
    }

    this.sliderInstance = this.initSlider();
  }

  resolveSliderOptions() {
    return {
      ...JSON.parse(this.rootEl.dataset.jsSliderOptions ?? '{}'),
    } as KeenSliderOptions;
  }

  resolveVisibleBulletsCount() {
    return this.rootEl.dataset.jsSliderVisibleBullets
      ? +this.rootEl.dataset.jsSliderVisibleBullets
      : null;
  }

  initSlider() {
    const sliderOptions = this.resolveSliderOptions();

    const plugins: KeenSliderPlugin[] = [];

    if (this.bulletsEl) {
      const visibleBulletsCount = this.resolveVisibleBulletsCount();
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
      .querySelectorAll<HTMLElement>('[data-js-slider]')
      .forEach((sliderEl) => new KeenSliderWrapper(sliderEl));
  }
}

export default KeenSliderCollection;
