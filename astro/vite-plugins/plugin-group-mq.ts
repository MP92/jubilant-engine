import type { OutputBundle } from 'rollup';
import type { Plugin } from 'vite';
import postcss from 'postcss';
import lightningcss from 'postcss-lightningcss';
import sortMediaQueries from 'postcss-sort-media-queries';

export default {
  name: 'vite-plugin-group-mq',
  generateBundle(_, bundle: OutputBundle) {
    for (const [name, asset] of Object.entries(bundle)) {
      if (asset.type === 'asset' && /\.(css|scss|sass)$/.test(name)) {
        asset.source = asset.source
          .toString()
          .split(/#group-mq\s*\{\s*top:\s*0;?\s*}/)
          .map(
            (css) =>
              postcss([
                sortMediaQueries({
                  sort: 'desktop-first',
                  onlyTopLevel: true,
                }),
                lightningcss(),
              ]).process(css, { from: undefined }).css,
          )
          .join('\n');
      }
    }
  },
} as Plugin;
