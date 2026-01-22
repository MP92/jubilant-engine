import type { ImageTransform } from 'astro';

export type AssetsGlobalStaticImagesList = Map<
  string,
  {
    originalSrcPath: string | undefined;
    transforms: AstroImageTransforms;
  }
>;

export type AstroImageTransforms = Map<
  string,
  {
    finalPath: string;
    transform: ImageTransform;
  }
>;
