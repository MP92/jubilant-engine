// @ts-check
import path from 'node:path';
import slash from 'slash';
import { defineConfig } from 'astro/config';
import compressor from 'astro-compressor';
import favicons from 'astro-favicons';
import icon from 'astro-icon';
import astroCssImages from './astro/plugins/astro-css-images';
import astroRename from './astro/plugins/astro-rename';
import astroFont from './astro/plugins/astro-font';
// import astroCritical from './astro/plugins/astro-critical';
import pxToRemPlugin from './astro/vite-plugins/plugin-pxtorem';
import viteImageOptimizerPlugin from './astro/vite-plugins/plugin-vite-image-optimizer';
import groupMq from './astro/vite-plugins/plugin-group-mq';
import sassGlob from './astro/vite-plugins/plugin-sass-glob';
import { siteName, cacheDir } from './astro/config';

const rootPath = slash(path.resolve('.'));

const PROD_BASE_URL = '/jubilant-engine/';

const resolveBaseUrl = () =>
  process.env.NODE_ENV === 'production' ? PROD_BASE_URL : '/';

// https://astro.build/config
export default defineConfig({
  base: resolveBaseUrl(),
  cacheDir,
  output: 'static',
  build: {
    assets: 'assets',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
  },
  integrations: [
    astroFont(),
    favicons({
      name: siteName,
      short_name: siteName,
      icons: {
        favicons: true,
        android: false,
        appleIcon: false,
        appleStartup: false,
        windows: false,
        yandex: false,
      },
    }),
    icon({
      iconDir: 'src/sprite-icons',
    }),
    astroRename({
      postcss: {
        except: [
          'scrollbar-width',
          'vw',
          'keen-slider',
          'keen-slider__slide',
          'swiper',
          'swiper-wrapper',
          'swiper-slide',
        ],
      },
      forceRename: [
        'slider-navigation__bullet',
        'slider-navigation__bullet--active',
        'slider__scrollbar-drag',
      ],
    }),
    astroCssImages(rootPath),
    // astroCritical(),
    compressor({ zstd: false }),
  ],
  vite: {
    build: {
      assetsInlineLimit: 2048,
    },
    plugins: [
      sassGlob(),
      viteImageOptimizerPlugin,
      pxToRemPlugin({
        propList: ['*'],
        atRules: ['media'],
      }),
      groupMq,
    ],
  },
});
