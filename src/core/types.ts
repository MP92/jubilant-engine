import type { ImageMetadata } from 'astro';

export type ImgSrc =
  | ImageMetadata
  | Promise<{
      default: ImageMetadata;
    }>;
