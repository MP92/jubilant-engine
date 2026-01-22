import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import slash from 'slash';
import sharp from 'sharp';
import { cacheDir } from '../../config';
import { urlSearchParamsToString } from './utils';

const srcFormats = ['jpg', 'jpeg', 'png'];
const targetFormats = ['webp', 'avif'];

function parseImgUrl(imgSrc: string) {
  const [srcImgPath, queryStr] = imgSrc.split('?') as [string, string];
  const fromExt = srcImgPath.split('.').pop()!;

  const queryParams = new URLSearchParams(queryStr);
  const toExt = queryParams.get('as')!;
  queryParams.delete('as');

  return { srcImgPath, fromExt, toExt, queryParams };
}

const checkImageFormats = (fromExt: string, toExt: string) =>
  fromExt &&
  srcFormats.includes(fromExt) &&
  toExt &&
  targetFormats.includes(toExt) &&
  fromExt !== toExt;

function resolveTargetImageUrl(
  srcImgPath: string,
  fromExt: string,
  toExt: string,
) {
  const targetFileFullName = srcImgPath.replace(
    new RegExp(`\\.${fromExt}$`),
    `.${toExt}`,
  );

  return `/${cacheDir}/converted/` + targetFileFullName.replace(/^\/+/, '');
}

async function convertImg(
  origImageName: string,
  targetImagePath: string,
  toExt: string,
) {
  if (!existsSync(path.dirname(targetImagePath))) {
    mkdirSync(path.dirname(targetImagePath), { recursive: true });
  }

  const sharpStream = sharp(slash(path.join('src', origImageName)));

  if (toExt === 'webp') {
    sharpStream.webp();
  } else if (toExt === 'avif') {
    sharpStream.avif();
  }

  await sharpStream.toFile(targetImagePath);
}

export default async (origImgSrc: string) => {
  const { srcImgPath, fromExt, toExt, queryParams } = parseImgUrl(origImgSrc);

  if (!checkImageFormats(fromExt, toExt)) {
    return {};
  }

  const convertedImageUrl = resolveTargetImageUrl(srcImgPath, fromExt, toExt);
  const convertedImagePath = slash(path.join('.', convertedImageUrl));

  if (!existsSync(convertedImagePath)) {
    await convertImg(srcImgPath, convertedImagePath, toExt);
  }

  const queryStr =
    queryParams.size > 0 ? '?' + urlSearchParamsToString(queryParams) : '';

  return {
    srcImgPath: srcImgPath + queryStr,
    convertedImagePath: convertedImagePath + queryStr,
  };
};
