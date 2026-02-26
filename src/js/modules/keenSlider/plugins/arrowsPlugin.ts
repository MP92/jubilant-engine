import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';

export default (arrowPrevEl: HTMLElement, arrowNextEl: HTMLElement) => {
  return function (slider: KeenSliderInstance) {
    const updateClasses = () => {
      const slide = slider.track.details.rel;

      if (slide === 0) {
        arrowPrevEl.classList.add('disabled');
      } else {
        arrowPrevEl.classList.remove('disabled');
      }

      if (slide === slider.track.details.slides.length - 1) {
        arrowNextEl.classList.add('disabled');
      } else {
        arrowNextEl.classList.remove('disabled');
      }
    };

    const initArrows = () => {
      arrowPrevEl.addEventListener('click', () => slider.prev());
      arrowNextEl.addEventListener('click', () => slider.next());
    };

    slider.on('created', () => {
      initArrows();
      updateClasses();
    });

    slider.on('slideChanged', updateClasses);
    slider.on('optionsChanged', updateClasses);
    slider.on('detailsChanged', updateClasses);
  } as KeenSliderPlugin;
};
