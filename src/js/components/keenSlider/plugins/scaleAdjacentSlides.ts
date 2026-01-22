import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';

const parseScaleValue = (rawScaleValue: unknown) => {
  const parsedValue = parseFloat(rawScaleValue + '');

  if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue < 1) {
    return parsedValue;
  }

  return null;
};

const resolveTransformOrigin = (activeSlideAbs: number, slideAbs: number) => {
  const diff = slideAbs - activeSlideAbs;

  return (
    {
      [-1]: 'right',
      [1]: 'left',
    }[diff] ?? ''
  );
};

export const scaleAdjacentSlides = (rawScaleValue: unknown) => {
  const scaleValue = parseScaleValue(rawScaleValue);

  return function (slider: KeenSliderInstance) {
    if (!scaleValue) {
      return;
    }

    slider.on('detailsChanged', (s: KeenSliderInstance) => {
      const {
        abs: activeSlideAbs,
        rel: activeSlideIdx,
        slides,
      } = s.track.details;

      s.slides.forEach((element, idx) => {
        const { abs } = slides[idx];

        const transform = idx !== activeSlideIdx ? `scale(${scaleValue})` : '';
        const transformOrigin = resolveTransformOrigin(activeSlideAbs, abs);

        for (const childElement of element.children) {
          (childElement as HTMLElement).style.transformOrigin = transformOrigin;
          (childElement as HTMLElement).style.transform = transform;
        }
      });
    });
  } as KeenSliderPlugin;
};
