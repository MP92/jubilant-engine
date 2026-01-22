import throttle from 'lodash/throttle';

function defineVwUnitCssVar() {
  const updateVwVar = throttle(
    () => {
      const vw = document.documentElement.clientWidth / 100;
      document.documentElement.style.setProperty('--vw', `${vw}px`);
    },
    500,
    { leading: true, trailing: true },
  );

  new ResizeObserver(updateVwVar).observe(document.documentElement);
}

export default defineVwUnitCssVar;
