const baseFontSize = parseInt(
  getComputedStyle(document.documentElement).fontSize,
);

const pxToRem = (pixels: number) => pixels / baseFontSize;

export default pxToRem;
