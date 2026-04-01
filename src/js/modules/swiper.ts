import Swiper from 'swiper';
import { Navigation, Pagination, Scrollbar } from 'swiper/modules';
import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';
import type { SwiperOptions } from 'swiper/types';
import getDataAttrParams from '../utils/getDataAttrParams';

type Params = {
  sliderOptions: SwiperOptions;
  navigationElementId?: string;
};

const selectors = {
  root: '[data-js-slider]',
  swiper: '[data-js-slider-swiper]',
  navigation: '[data-js-slider-navigation]',
  bullets: '[data-js-slider-bullets]',
  arrowPrev: '[data-js-slider-arrow-prev]',
  arrowNext: '[data-js-slider-arrow-next]',
  scrollbar: '[data-js-slider-scrollbar]',
};

class SwiperSlider {
  swiperEl: HTMLElement;
  navigationEl: HTMLElement | null = null;
  bulletsEl: HTMLElement | null = null;
  arrowPrevEl: HTMLElement | null = null;
  arrowNextEl: HTMLElement | null = null;
  scrollbarEl: HTMLElement | null = null;
  sliderInstance: Swiper;
  params: Params;

  constructor(private rootEl: HTMLElement) {
    this.params = getDataAttrParams(this.rootEl, selectors.root);

    this.swiperEl = this.rootEl.querySelector<HTMLElement>(selectors.swiper)!;
    this.navigationEl = this.params.navigationElementId
      ? document.getElementById(this.params.navigationElementId)
      : this.rootEl.querySelector<HTMLElement>(selectors.navigation);

    if (this.navigationEl) {
      this.bulletsEl = this.navigationEl.querySelector<HTMLElement>(
        selectors.bullets,
      );
      this.arrowPrevEl = this.navigationEl.querySelector<HTMLElement>(
        selectors.arrowPrev,
      );
      this.arrowNextEl = this.navigationEl.querySelector<HTMLElement>(
        selectors.arrowNext,
      );
    }

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
    const { sliderOptions } = this.params;

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
