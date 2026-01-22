import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/img/**/*.{jpeg,jpg,png,webp,avif,gif,svg}',
);

const normalizeImgUrl = (url: string) => url.replace(/^@img\//, '/src/img/');

export default function importImg(url: string) {
  url = normalizeImgUrl(url);

  if (!images[url])
    throw new Error(
      `"${url}" does not exist in glob: "/src/img/**/*.{jpeg,jpg,png,webp,avif,gif,svg}"`,
    );

  return images[url]();
}
