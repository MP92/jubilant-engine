// import defineVwUnitCssVar from './functions/defineVwUnit.ts';
// import KeenSliderCollection from './modules/keenSlider';
import SwiperSliderCollection from './modules/swiper';
import TabsCollection from './modules/tabs';
import VideoPlayerCollection from './modules/video-player';
import accordion from './modules/accordion';
import SelectCollection from './modules/select';

if (import.meta.env.MODE === 'development') {
  const { default: useDevScrollbarWidth } = await import(
    './functions/useDevScrollbarWidth.ts'
  );

  await useDevScrollbarWidth();
}

// defineVwUnitCssVar();

// new KeenSliderCollection();
new SwiperSliderCollection();

new TabsCollection();

new VideoPlayerCollection();

accordion();

new SelectCollection();
