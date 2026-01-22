import cssnano from 'cssnano';
import lightningcss from 'postcss-lightningcss';

export default ({ env }) => {
  return {
    plugins: [
      cssnano({
        preset: [
          'default',
          {
            // lightningcss already do this
            normalizeDisplayValues: false,
          },
        ],
      }),
      env === 'production' ? lightningcss() : false,
    ],
  };
};
