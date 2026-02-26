import type { KeenSliderInstance, KeenSliderPlugin } from 'keen-slider';
import './bulletsPlugin.scss';

const DEFAULT_BULLET_CLASS_NAME = 'keen-slider-bullets__item';
const ACTIVE_CLASS = 'is-active';
const HIDDEN_CLASS = 'hidden';

const ADJACENT_BULLETS_COUNT_DEFAULT = 3;

const resolveBulletClassNames = (bulletsEl: HTMLElement) => {
  const bulletClassNames = [DEFAULT_BULLET_CLASS_NAME];

  const customBulletClassName = bulletsEl.children[0]?.classList.item(0);

  if (customBulletClassName) {
    bulletClassNames.push(customBulletClassName);
  }

  return bulletClassNames;
};

const resolveAdjacentBulletsCount = (visibleBulletsCount?: number | null) =>
  visibleBulletsCount
    ? Math.floor(visibleBulletsCount / 2)
    : ADJACENT_BULLETS_COUNT_DEFAULT;

export default (
  bulletsEl: HTMLElement,
  visibleBulletsCount?: number | null,
) => {
  const bulletClassNames = resolveBulletClassNames(bulletsEl);
  const adjacentBulletsCount = resolveAdjacentBulletsCount(visibleBulletsCount);

  const resolveShiftRatio = (activeSlide: number, maxSlide: number) => {
    if (bulletsEl.classList.contains('keen-slider-bullets--left')) {
      return (
        100 *
        (adjacentBulletsCount - Math.max(activeSlide, adjacentBulletsCount))
      );
    }

    if (bulletsEl.classList.contains('keen-slider-bullets--right')) {
      return -100 * Math.min(activeSlide + adjacentBulletsCount, maxSlide);
    }

    return -100 * activeSlide;
  };

  return function (slider: KeenSliderInstance) {
    let lastMaxIdx = -1;

    const updateClasses = () => {
      const activeSlide = slider.track.details.rel;

      const translateX = resolveShiftRatio(
        activeSlide,
        slider.track.details.maxIdx,
      );

      bulletsEl.style.transform = `translateX(${translateX}%)`;

      Array.from(bulletsEl.children).forEach((bullet, idx) => {
        const diff = Math.abs(idx - activeSlide);

        bullet.classList.toggle(ACTIVE_CLASS, diff === 0);
        bullet.classList.toggle(HIDDEN_CLASS, diff > adjacentBulletsCount);
      });
    };

    const createBullets = () => {
      lastMaxIdx = slider.track.details.maxIdx;

      slider.track.details.slides.forEach((_e, idx) => {
        if (idx <= slider.track.details.maxIdx) {
          const bullet = document.createElement('button');
          bullet.classList.add(...bulletClassNames);
          bullet.addEventListener('click', () => slider.moveToIdx(idx));

          bulletsEl.appendChild(bullet);
        }
      });
    };

    const removeBullets = () =>
      [...bulletsEl.children].forEach((child) => child.remove());

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
