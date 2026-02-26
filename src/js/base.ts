// import defineVwUnitCssVar from './functions/defineVwUnit.ts';
// import KeenSliderCollection from './modules/keenSlider';

if (import.meta.env.MODE === 'development') {
  const { default: useDevScrollbarWidth } = await import(
    './functions/useDevScrollbarWidth.ts'
  );

  useDevScrollbarWidth();
}

// defineVwUnitCssVar();

// new KeenSliderCollection();
