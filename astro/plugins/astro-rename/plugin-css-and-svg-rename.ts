import type { OutputBundle } from 'rollup';
import type { Plugin } from 'vite';
import type Renamer from './Renamer';
import { getAssetSource } from './utils';

export default (renamer: Renamer): Plugin => ({
  name: 'vite-plugin-css-and-svg-rename',
  generateBundle(_, bundle: OutputBundle) {
    // First handle CSS assets to populate renamingMap
    for (const [name, asset] of Object.entries(bundle)) {
      if (asset.type === 'asset' && /\.(css|scss|sass)$/.test(name)) {
        asset.source = renamer.renameClassesInCss(
          renamer.renameVarsInCss(getAssetSource(asset)),
        );
      }
    }

    // And only then handle other assets
    for (const [name, asset] of Object.entries(bundle)) {
      if (asset.type === 'asset' && name.endsWith('.svg')) {
        asset.source = renamer.renameClassesInHtml(
          renamer.renameVarsInHtml(getAssetSource(asset)),
        );
      }
    }
  },
});
