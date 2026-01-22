import { resolveSrc } from 'astro/assets/utils';
import { importImg } from '@/core';
import type { SrcProp } from './myPicture';

export const resolveImgSrc = (src: SrcProp) => {
  if (typeof src === 'string' && src.startsWith('@img/')) {
    return importImg(src);
  }

  return src;
};

export const resolveImgWidth = async (
  src: SrcProp,
  width?: number | `${number}`,
) => {
  if (!width) {
    return width;
  }

  src = await resolveSrc(src);

  if (typeof src === 'string') {
    return width;
  }

  const widthRatio = parseFloat(width + '');

  if (Number.isFinite(widthRatio) && widthRatio >= 0 && widthRatio < 1) {
    return src.width * widthRatio;
  }

  return width;
};
