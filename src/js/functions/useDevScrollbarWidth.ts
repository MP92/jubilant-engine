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

function useDevScrollbarWidth() {
  new ResizeObserver(updateScrollbarWidth).observe(document.documentElement);

  document.querySelector('body')!.style.marginRight = `var(${cssVarName})`;
}

export default useDevScrollbarWidth;
