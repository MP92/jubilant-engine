import Swiper from 'swiper';
import { Navigation, Pagination, Scrollbar } from 'swiper/modules';
import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';
import type { SwiperOptions } from 'swiper/types';
import getDataAttrParams from '../utils/getDataAttrParams';

const selectors = {
  root: '[data-js-slider]',
  swiper: '[data-js-slider-swiper]',
  bullets: '[data-js-slider-bullets]',
  arrowPrev: '[data-js-slider-arrow-prev]',
  arrowNext: '[data-js-slider-arrow-next]',
  scrollbar: '[data-js-slider-scrollbar]',
};

class SwiperSlider {
  swiperEl: HTMLElement;
  bulletsEl: HTMLElement | null = null;
  arrowPrevEl: HTMLElement | null = null;
  arrowNextEl: HTMLElement | null = null;
  scrollbarEl: HTMLElement | null = null;
  sliderInstance: Swiper;

  constructor(private rootEl: HTMLElement) {
    this.swiperEl = this.rootEl.querySelector<HTMLElement>(selectors.swiper)!;
    this.bulletsEl = this.rootEl.querySelector<HTMLElement>(selectors.bullets);
    this.arrowPrevEl = this.rootEl.querySelector<HTMLElement>(
      selectors.arrowPrev,
    );
    this.arrowNextEl = this.rootEl.querySelector<HTMLElement>(
      selectors.arrowNext,
    );
    this.scrollbarEl = this.rootEl.querySelector<HTMLElement>(
      selectors.scrollbar,
    );

    if (!this.swiperEl) {
      throw new Error('Missing swiper element');
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
    ) as SwiperOptions;

    if (this.bulletsEl) {
      sliderOptions.modules = [...(sliderOptions.modules ?? []), Pagination];
      sliderOptions.pagination = {
        ...(typeof sliderOptions.pagination === 'object'
          ? sliderOptions.pagination
          : {}),
        el: this.bulletsEl,
      };
    }

    if (this.arrowPrevEl && this.arrowNextEl) {
      sliderOptions.modules = [...(sliderOptions.modules ?? []), Navigation];

      sliderOptions.navigation = {
        prevEl: this.arrowPrevEl,
        nextEl: this.arrowNextEl,
      };
    }

    if (this.scrollbarEl) {
      sliderOptions.modules = [...(sliderOptions.modules ?? []), Scrollbar];
      sliderOptions.scrollbar = {
        ...(typeof sliderOptions.scrollbar === 'object'
          ? sliderOptions.scrollbar
          : {}),
        el: this.scrollbarEl,
      };
    }

    return new Swiper(this.swiperEl, sliderOptions);
  }
}

class SwiperSliderCollection {
  constructor() {
    document
      .querySelectorAll<HTMLElement>(selectors.root)
      .forEach((sliderEl) => new SwiperSlider(sliderEl));
  }
}

export default SwiperSliderCollection;
