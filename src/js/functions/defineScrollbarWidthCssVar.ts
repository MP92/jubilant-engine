import throttle from 'lodash/throttle';

const cssVarName = '--scrollbar-width';

function defineScrollbarWidthCssVar() {
  const updateScrollbarWidthVar = throttle(
    () => {
      const scrollbarWidth = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth,
      );

      document.documentElement.style.setProperty(
        cssVarName,
        `${scrollbarWidth}px`,
      );
    },
    500,
    { leading: true, trailing: true },
  );

  new ResizeObserver(updateScrollbarWidthVar).observe(document.documentElement);

  return cssVarName;
}

export default defineScrollbarWidthCssVar;
