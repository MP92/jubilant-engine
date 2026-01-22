import type { OutputAsset } from 'rollup';

export const getAssetSource = (asset: OutputAsset): string =>
  Buffer.isBuffer(asset.source)
    ? asset.source.toString()
    : (asset.source as string);
