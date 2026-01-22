import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default ViteImageOptimizer({
  svg: {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupNumericValues: false,
            cleanupIds: false,
            convertColors: {
              convertCase: false, // Must be disabled to avoid corrupting CSS variables like `fill="var(--Cb)"`
            },
          },
          convertPathData: false,
        },
      },
      'sortAttrs',
      {
        name: 'addAttributesToSVGElement',
        params: {
          attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
        },
      },
      'removeDoctype',
      'removeXMLProcInst',
      // 'minifyStyles',
      'sortDefsChildren',
    ],
  },
  gif: {
    effort: 10.0,
  },
  tiff: {
    compression: 'lzw',
  },
  png: {
    quality: 80,
    compressionLevel: 9.0,
    palette: true,
  },
  jpeg: {
    quality: 80,
    // chromaSubsampling: "4:4:4",
    mozjpeg: true,
    trellisQuantisation: true,
    overshootDeringing: true,
    optimiseScans: true,
  },
  jpg: {
    quality: 80,
    // chromaSubsampling: "4:4:4",
    mozjpeg: true,
    trellisQuantisation: true,
    overshootDeringing: true,
    optimiseScans: true,
  },
  webp: {
    effort: 6.0,
    lossless: true,
  },
  avif: {
    // chromaSubsampling: "4:4:4",
    effort: 9.0,
    lossless: true,
  },
});
