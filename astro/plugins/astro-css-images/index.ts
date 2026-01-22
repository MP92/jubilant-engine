import astroConvertCssImages from './astro-convert-css-images';
import astroRestoreCssImages from './astro-restore-css-images';
import astroFixDuplicateCssImagesUrls from './astro-fix-duplicate-css-images-urls';

export default (rootPath: string) => {
  return [
    astroConvertCssImages(rootPath),
    astroRestoreCssImages(),
    astroFixDuplicateCssImagesUrls(),
  ];
};
