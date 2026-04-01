import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import MyImage from './MyImage.astro';
import MyPicture from './MyPicture.astro';
import { Icon } from 'astro-icon/components';
import importImg from './functions/importImg';

export type { AstroComponentFactory as AstroComponent };

export { MyImage, MyPicture, Icon as SvgIcon, importImg };

export type { ImgSrc } from './types';
