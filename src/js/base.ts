// import defineVwUnitCssVar from './functions/defineVwUnit.ts';
// import KeenSliderCollection from './modules/keenSlider';
import SwiperSliderCollection from './modules/swiper';
import TabsCollection from './modules/tabs';

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
