import type { AstroIntegration } from 'astro';
import { existsSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontsDir } from './config';

export default function astroFont(): AstroIntegration {
  let publicDirectory = './public';

  return {
    name: 'astro-font',
    hooks: {
      'astro:build:setup': ({ vite }) => {
        const { publicDir } = vite;
        if (publicDir) publicDirectory = publicDir;
      },
      'astro:build:done': async ({ dir }) => {
        function findAndCopyFontDirs(currentDir: string, relPath: string = '') {
          const entries = readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);
            const relativePath = join(relPath, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === fontsDir) {
                const targetPath = fileURLToPath(new URL(relativePath, dir));
                cpSync(fullPath, targetPath, { recursive: true });
              } else findAndCopyFontDirs(fullPath, relativePath);
            }
          }
        }
        if (existsSync(publicDirectory)) findAndCopyFontDirs(publicDirectory);
      },
    },
  };
}
