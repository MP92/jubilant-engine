import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import type { AstroRenameOptions } from './types';
import { walkFiles } from '../utils';
import Renamer from './Renamer';
import pluginCssAndSvgRename from './plugin-css-and-svg-rename';
import pluginJsRename from './plugin-js-rename';

async function removeSourcemapFiles(dist: string) {
  for await (const file of walkFiles(join(dist, 'assets'))) {
    if (file.endsWith('.js.map')) {
      rmSync(file);
    }
  }
}

const renameInlinedJs = (renamer: Renamer, content: string) =>
  content.replace(
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    (outerContent, innerContent) => {
      if (innerContent) {
        return outerContent.replace(
          innerContent,
          renamer.renameClassesAndVarsInJs(innerContent),
        );
      }

      return outerContent;
    },
  );

export default function astroRename(
  options: AstroRenameOptions = { postcss: {} },
): AstroIntegration {
  options.postcss = {
    strategy: import.meta.env.PROD ? 'minimal' : 'debug',
    ...options.postcss,
  };

  const renamer = new Renamer(options);

  let origViteBuildSourcemap: boolean | 'inline' | 'hidden' = false;

  return {
    name: 'astro-rename',
    hooks: {
      'astro:config:setup': ({ updateConfig, config }) => {
        origViteBuildSourcemap = config.vite.build?.sourcemap ?? false;

        updateConfig({
          vite: {
            build: {
              sourcemap: origViteBuildSourcemap || 'hidden',
            },
            plugins: [
              pluginCssAndSvgRename(renamer),
              pluginJsRename(renamer, origViteBuildSourcemap),
            ],
          },
        });
      },
      'astro:build:done': async ({ dir }) => {
        const dist = fileURLToPath(dir);

        if (!origViteBuildSourcemap) {
          await removeSourcemapFiles(dist);
        }

        try {
          for await (const file of walkFiles(dist)) {
            if (!file.endsWith('.html')) {
              continue;
            }

            let content = await readFile(file, 'utf-8');

            content = renamer.renameVarsInHtml(
              renamer.renameClassesInHtml(content),
            );

            content = renameInlinedJs(renamer, content);

            await writeFile(file, content, {
              encoding: 'utf8',
              flag: 'w',
            });
          }
        } catch (e) {
          console.error(e);
        }
      },
    },
  };
}
