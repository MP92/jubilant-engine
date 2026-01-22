import type { Plugin, UserConfig, CSSOptions } from 'vite';
import type { Plugin as PostCssPlugin } from 'postcss';
import type { PxtoremOptions } from '@minko-fe/postcss-pxtorem';
import pxToRem from '@minko-fe/postcss-pxtorem';
import postcssLoadConfig from 'postcss-load-config';

const isObject = (value: CSSOptions['postcss']) =>
  Object.prototype.toString.call(value) === '[object Object]';

const loadPostCssConfig = async (
  config: UserConfig,
  postCssOptions: CSSOptions['postcss'],
  pxToRemPlugin: PostCssPlugin,
) => {
  const searchPath =
    typeof postCssOptions === 'string' ? postCssOptions : config.root;

  const result = await postcssLoadConfig({}, searchPath);

  result.plugins.push(pxToRemPlugin);

  return {
    css: {
      postcss: result,
    },
  };
};

export default (options: PxtoremOptions = {}): Plugin => {
  return {
    name: 'vite-plugin-pxtorem',
    apply: 'build',
    async config(config: UserConfig) {
      const postCssOptions = config.css?.postcss;

      const pxToRemPlugin = pxToRem(options);

      const cssConfig = {
        css: {
          postcss: {
            plugins: [pxToRemPlugin],
          },
        },
      };

      if (isObject(postCssOptions)) {
        return cssConfig;
      }

      try {
        return await loadPostCssConfig(config, postCssOptions, pxToRemPlugin);
      } catch {
        // not found postcss config
        return cssConfig;
      }
    },
  };
};
