import path from 'node:path';

const aliases: Record<string, string> = {
  '@': path.resolve('./src'),
  '@styles': path.resolve('./src/styles'),
  '@fonts': path.resolve('./src/fonts'),
  '@img': path.resolve('./src/img'),
};

export default aliases;
