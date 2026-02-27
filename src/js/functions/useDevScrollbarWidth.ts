import throttle from 'lodash/throttle';

const cssVarName = '--dev-scrollbar-width';

function getScrollbarWidth() {
  if (!navigator.userAgent.includes('Mobile') || window.innerWidth <= 1024) {
    return '0';
  }

  return window.chrome ? '15px' : '17px';
}

const updateScrollbarWidth = throttle(
  () => {
    setTimeout(
      () =>
        document.documentElement.style.setProperty(
          cssVarName,
          getScrollbarWidth(),
        ),
      0,
    );
  },
  500,
  { leading: true, trailing: true },
);

async function useDevScrollbarWidth() {
  document.querySelector('body')!.style.marginRight = `var(${cssVarName})`;

  new ResizeObserver(updateScrollbarWidth).observe(document.documentElement);

  return new Promise((resolve) => setTimeout(resolve, 200));
}

export default useDevScrollbarWidth;
