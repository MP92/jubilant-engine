import type { GetImageResult, ImageOutputFormat, ImageMetadata } from 'astro';
import type { LocalImageProps, RemoteImageProps } from 'astro:assets';
import { isESMImportedImage, resolveSrc } from 'astro/assets/utils';
import type { HTMLAttributes } from 'astro/types';

export type MyLocalImageProps = Omit<LocalImageProps, 'src'> & {
  src: SrcProp;
};

export type MyPictureProps = (MyLocalImageProps | RemoteImageProps) & {
  formats?: ImageOutputFormat[];
  fallbackFormat?: ImageOutputFormat;
  pictureAttributes?: HTMLAttributes<'picture'>;
  imgClass?: string;
  srcMd?: SrcProp;
  srcSm?: SrcProp;
  maxWidthMd?: number;
  maxWidthSm?: number;
  emptyAt?: string;
};

export type SrcProp =
  | string
  | ImageMetadata
  | Promise<{
      default: ImageMetadata;
    }>;

export type ImageParams = {
  src: string | ImageMetadata;
  widths?: number[];
  maxWidth?: number;
  minWidth?: number;
};

export type EmptyAt = {
  cond: string;
  width: number;
};

export type ImgSource = {
  src: string;
  srcset: string;
  type?: string;
  media?: string;
  attributes: Record<string, string>;
};

type ResolveImageParamsArg = {
  props: MyPictureProps;
  srcMdProp: SrcProp | null;
  srcSmProp: SrcProp | null;
  maxWidthMd: number | null;
  maxWidthSm: number | null;
  emptyAt: EmptyAt | null;
};

const LIMITED_RESOLUTIONS = [640, 768, 828, 1080, 1280, 1668, 1920, 2048, 2560];

export const EMPTY_SRC =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export const resolveFallbackFormat = (
  imgSrc: string | ImageMetadata,
  fallbackFormatProp?: ImageOutputFormat,
) => {
  const defaultFallbackFormat = 'png' as const;

  // Certain formats don't want PNG fallbacks:
  // - GIF will typically want to stay as a gif, either for animation or for the lower amount of colors
  // - SVGs can't be converted to raster formats in most cases
  // - JPEGs compress photographs and high-noise images better than PNG in most cases
  // For those, we'll use the original format as the fallback instead.
  const specialFormatsFallback = ['gif', 'svg', 'jpg', 'jpeg'];

  if (
    !fallbackFormatProp &&
    isESMImportedImage(imgSrc) &&
    specialFormatsFallback.includes(imgSrc.format)
  ) {
    return imgSrc.format;
  }

  return fallbackFormatProp ?? defaultFallbackFormat;
};

export const resolveEmptyAt = (emptyAtStr: string): EmptyAt | null => {
  const m = emptyAtStr.match(/^(\D+)\s*(\d+)$/);

  if (m && m.length > 2) {
    return {
      cond: m[1],
      width: +m[2],
    };
  }

  return null;
};

export const filterSrcSet = (image: GetImageResult, emptyAt: EmptyAt) => {
  const srcSetValues = image.srcSet.values;

  const filteredSrcSetValues = srcSetValues.filter((value) => {
    if (!value.transform.width) {
      return true;
    }

    if (emptyAt.cond === '<') {
      return value.transform.width >= emptyAt.width;
    }
    if (emptyAt.cond === '<=') {
      return value.transform.width > emptyAt.width;
    }
    if (emptyAt.cond === '>') {
      return value.transform.width <= emptyAt.width;
    }
    if (emptyAt.cond === '>=') {
      return value.transform.width < emptyAt.width;
    }

    return true;
  });

  if (!filteredSrcSetValues.length) {
    image.srcSet.values = [srcSetValues[srcSetValues.length - 1]];
  } else {
    image.srcSet.values = filteredSrcSetValues;
  }
};

export const resolveMediaAttr = (
  emptyAt: EmptyAt | null,
  maxWidth?: number,
) => {
  let minWidth = null;

  if (emptyAt) {
    if (emptyAt.cond.startsWith('<')) {
      minWidth = emptyAt.width;

      if (emptyAt.cond === '<=') {
        minWidth += 0.1;
      }
    } else if (!maxWidth || maxWidth > emptyAt.width) {
      maxWidth = emptyAt.width;

      if (emptyAt.cond === '>=') {
        maxWidth -= 0.1;
      }
    }
  }

  if (maxWidth && minWidth) {
    return `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
  }

  if (maxWidth) {
    return `(max-width: ${maxWidth}px)`;
  }

  if (minWidth) {
    return `(min-width: ${minWidth}px)`;
  }

  return null;
};

export const resolveImageParams = async ({
  props,
  srcMdProp,
  srcSmProp,
  maxWidthMd,
  maxWidthSm,
  emptyAt,
}: ResolveImageParamsArg): Promise<
  ImageParams & { md?: ImageParams; sm?: ImageParams }
> => {
  const originalSrc = await resolveSrc(props.src);

  const result = {
    src: originalSrc,
  } as ImageParams & { md?: ImageParams; sm?: ImageParams };

  const widths =
    props.layout === 'full-width'
      ? (props.widths ?? LIMITED_RESOLUTIONS)
      : null;

  const mdImageParams = await _resolveSmallerImageParams(
    srcMdProp,
    maxWidthMd,
    widths,
    originalSrc,
  );

  const smImageParams = await _resolveSmallerImageParams(
    srcSmProp,
    maxWidthSm,
    widths,
    mdImageParams?.src ?? originalSrc,
  );

  if (widths) {
    result.widths = filterWidths(
      widths,
      mdImageParams?.widths ?? smImageParams?.widths ?? [],
    );
  }

  if (
    mdImageParams &&
    !isOverlappedByEmptyImage(
      emptyAt,
      mdImageParams.maxWidth || 0,
      smImageParams?.maxWidth || 0,
    )
  ) {
    if (mdImageParams.widths) {
      mdImageParams.widths = filterWidths(
        mdImageParams.widths,
        smImageParams?.widths ?? [],
      );
    }

    result.md = mdImageParams;
  }

  if (
    smImageParams &&
    !isOverlappedByEmptyImage(emptyAt, smImageParams.maxWidth || 0)
  ) {
    result.sm = smImageParams;
  }

  return result;
};

const filterWidths = (widths: number[], widthsToExclude: number[]) =>
  widths.filter((w) => !widthsToExclude.includes(w));

const _resolveSmallerImageParams = async (
  srcProp: SrcProp | null,
  maxWidth: number | null,
  allWidths: number[] | null,
  largerImgSrc: string | ImageMetadata,
): Promise<ImageParams | null> => {
  const src = srcProp ? await resolveSrc(srcProp) : null;

  if (
    src &&
    typeof src === 'object' &&
    typeof largerImgSrc === 'object' &&
    (src.width < largerImgSrc.width ||
      (maxWidth && maxWidth < largerImgSrc.width))
  ) {
    maxWidth = maxWidth || src.width;

    const imageParams = {
      src,
      maxWidth,
    } as ImageParams;

    if (allWidths) {
      const widthLimit = Math.min(maxWidth, src.width);

      imageParams.widths = [
        ...allWidths.filter((w) => w < widthLimit),
        widthLimit,
      ];
    }

    return imageParams;
  }

  return null;
};

const isOverlappedByEmptyImage = (
  emptyAt: EmptyAt | null,
  maxWidth: number,
  minWidth = 0,
) => {
  if (!emptyAt) {
    return false;
  }

  if (emptyAt.cond === '<') {
    return maxWidth < emptyAt.width;
  }
  if (emptyAt.cond === '<=') {
    return maxWidth <= emptyAt.width;
  }
  if (emptyAt.cond === '>') {
    return minWidth > emptyAt.width;
  }
  if (emptyAt.cond === '>=') {
    return minWidth >= emptyAt.width;
  }

  throw new Error('Unknown emptyAt condition.');
};

export const srcSetToString = (
  ...images: (GetImageResult | null | undefined)[]
) => {
  const values = images.map((image) => image?.srcSet.values ?? []).flat();

  return values.map(({ url, descriptor }) => `${url} ${descriptor}`).join(', ');
};
