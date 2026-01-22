declare module '@/core' {
  type CoreAssets = {
    MyImage: typeof import('../core/MyImage.astro').default;
    MyPicture: typeof import('../core/MyPicture.astro').default;
    SvgIcon: typeof import('astro-icon/components').Icon;
  };

  type Functions = {
    importImg: typeof import('../core/functions/importImg.ts').default;
  };

  export const { MyImage, MyPicture, SvgIcon }: CoreAssets;

  export const { importImg }: Functions;

  export type { ImgSrc } from '../core/types';
}
