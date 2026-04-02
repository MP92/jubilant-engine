import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import favicons, { type Options } from 'astro-favicons';
import { walkFiles } from './utils';

export default function astroFavicons(options?: Options): AstroIntegration[] {
  let base = '/';

  return [
    favicons(options),
    {
      name: 'fix-favicons-base',
      hooks: {
        'astro:config:done': ({ config }) => {
          base = config.base ?? '/';
        },
        'astro:build:done': async ({ dir }) => {
          const dist = fileURLToPath(dir);

          try {
            for await (const file of walkFiles(dist)) {
              if (!file.endsWith('.html')) {
                continue;
              }

              let html = await readFile(file, 'utf-8');

              html = html.replace(
                /href="\/(favicons|favicon)/g,
                `href="${base}$1`,
              );
              html = html.replace(
                /content="\/(favicons|favicon)/g,
                `content="${base}$1`,
              );

              await writeFile(file, html, {
                encoding: 'utf8',
                flag: 'w',
              });
            }
          } catch (e) {
            console.error(e);
          }
        },
      },
    },
  ];
}
