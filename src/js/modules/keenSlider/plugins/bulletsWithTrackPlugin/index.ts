import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';
import './bulletsWithTrackPlugin.scss';

const VISIBLE_BULLETS_COUNT_DEFAULT = 3;

const TRACK_CLASS_NAME = 'keen-slider-bullets__track';
const DEFAULT_BULLET_CLASS_NAME = 'keen-slider-bullets__item';
const ACTIVE_CLASS = 'is-active';

const resolveBulletClassNames = (bulletsEl: HTMLElement) => {
  const bulletClassNames = [DEFAULT_BULLET_CLASS_NAME];

  const customBulletClassName = bulletsEl.children[0]?.classList.item(0);

  if (customBulletClassName) {
    bulletClassNames.push(customBulletClassName);
  }

  return bulletClassNames;
};

const createTrackElement = (bulletsEl: HTMLElement) => {
  const trackEl = document.createElement('div');

  trackEl.classList.add(TRACK_CLASS_NAME);

  [...bulletsEl.children].forEach((child) => child.remove());

  bulletsEl.appendChild(trackEl);

  return trackEl;
};

export default (
  bulletsEl: HTMLElement,
  visibleBulletsCount?: number | null,
) => {
  visibleBulletsCount = visibleBulletsCount || VISIBLE_BULLETS_COUNT_DEFAULT;

  const applyVisibleBulletsCount = () => {
    const ratio = visibleBulletsCount - 1;

    bulletsEl.style.maxWidth = `calc(var(--bullet-active-size) + (var(--bullet-size) + var(--bullets-gap)) * ${ratio})`;
  };

  const init = () => {
    const bulletClassNames = resolveBulletClassNames(bulletsEl);

    const trackEl = createTrackElement(bulletsEl);

    applyVisibleBulletsCount();

    return { bulletClassNames, trackEl };
  };

  return function (slider: KeenSliderInstance) {
    const { bulletClassNames, trackEl } = init();

    let lastMaxIdx = -1;

    const activeSlideIndex = () => slider.track.details.rel;

    const updateTrackOffset = () => {
      const activeSlide = activeSlideIndex();

      const startPos =
        Math.floor(visibleBulletsCount / 2) + (visibleBulletsCount % 2) - 1;

      const offsetLimit =
        slider.track.details.maxIdx - Math.floor(visibleBulletsCount / 2);

      const ratio = Math.min(
        Math.max(activeSlide - startPos, 0),
        Math.max(offsetLimit - startPos, 0),
      );

      const translateX = `calc(-1 * (var(--bullet-size) + var(--bullets-gap)) * ${ratio})`;

      trackEl.style.transform = `translateX(${translateX})`;
    };

    const updateClasses = () => {
      updateTrackOffset();

      Array.from(trackEl.children).forEach((bullet, idx) => {
        const diff = Math.abs(idx - activeSlideIndex());

        bullet.classList.toggle(ACTIVE_CLASS, diff === 0);
      });
    };

    const createBullets = () => {
      lastMaxIdx = slider.track.details.maxIdx;

      slider.track.details.slides.forEach((_e, idx) => {
        if (idx <= slider.track.details.maxIdx) {
          const bullet = document.createElement('button');
          bullet.classList.add(...bulletClassNames);
          bullet.addEventListener('click', () => slider.moveToIdx(idx));

          trackEl.appendChild(bullet);
        }
      });
    };

    const removeBullets = () =>
      [...trackEl.children].forEach((child) => child.remove());

    const updateBullets = () => {
      if (lastMaxIdx === slider.track.details.maxIdx) {
        return;
      }

      removeBullets();
      createBullets();
      updateClasses();
    };

    slider.on('created', updateBullets);
    slider.on('slideChanged', updateClasses);
    slider.on('optionsChanged', updateBullets);
    slider.on('detailsChanged', updateBullets);
    slider.on('destroyed', removeBullets);
  } as KeenSliderPlugin;
};
