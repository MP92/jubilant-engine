import type { Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';
import c from 'ansi-colors';

export interface PluginOptions {
  ignorePaths?: string[];
}

const isSassOrScss = (filename: string) =>
  !fs.statSync(filename).isDirectory() &&
  path.extname(filename).match(/\.s[ac]ss/i);

const checkDirectoriesExist = (assetDir: string, globPattern: string) => {
  // Do directories exist matching the glob pattern?
  const globPatternWithoutWildcard = globPattern.split('*')[0];

  if (globPatternWithoutWildcard.length) {
    const dirsExist = fs.existsSync(
      path.join(assetDir, globPatternWithoutWildcard),
    );

    if (!dirsExist) {
      console.warn(
        c.yellow(
          `Sass Glob Import: Directories don't exist for the glob pattern "${globPattern}"`,
        ),
      );
    }
  }
};

const normalizeFilePath = (assetDir: string, filePath: string) =>
  path.relative(assetDir, filePath).replace(/\\/g, '/').replace(/^\//, '');

const getGlobFileNames = (assetDir: string, globPattern: string) =>
  globSync(path.join(assetDir, globPattern), {
    cwd: assetDir,
    windowsPathsNoEscape: true,
  }).sort((a, b) => a.localeCompare(b, 'en'));

export default function sassGlob({
  ignorePaths = [],
}: PluginOptions = {}): Plugin {
  // Regular expressions to match against
  const FILE_REGEX = /\.s[c|a]ss(\?(direct|inline))?$/;
  const IMPORT_REGEX =
    /([ \t]*(?:\/[*/].*)?)@(forward|use|import)\s+["']([^"']+\*(?:\.s[ac]ss)?)["'](\s+as\s+(?:[a-zA-Z]+|\*))?;?([ \t]*(?:.*\*\/)?)/;

  ignorePaths = ignorePaths ?? [];

  const transform = (assetContents: string, assetPath: string): string => {
    const assetFileName = path.basename(assetPath);
    const assetDir = path.dirname(assetPath);

    const isSass = path.extname(assetFileName).match(/\.sass/i);

    let result;

    while ((result = IMPORT_REGEX.exec(assetContents)) !== null) {
      const [
        importRule,
        startComment,
        importType,
        globPattern,
        namespaceAlias,
        endComment,
      ] = result;

      const isOneLineComment = startComment.startsWith('//');

      checkDirectoriesExist(assetDir, globPattern);

      const imports: string[] = [];

      const files = getGlobFileNames(assetDir, globPattern);

      files.forEach((fileName) => {
        if (!isSassOrScss(fileName)) {
          return;
        }

        fileName = normalizeFilePath(assetDir, fileName);

        const isIgnore = ignorePaths.some((ignorePath: string) =>
          minimatch(fileName, ignorePath),
        );

        if (!isIgnore) {
          imports.push(
            (isOneLineComment ? '// ' : '') +
              `@${importType} "${fileName}"` +
              (namespaceAlias ?? '') +
              (isSass ? '' : ';'),
          );
        }
      });

      if (startComment) {
        imports.unshift(startComment);
      }

      if (endComment) {
        imports.push(endComment);
      }

      const replaceString = imports.join('\n');
      assetContents = assetContents.replace(importRule, replaceString);
    }

    return assetContents;
  };

  return {
    name: 'sass-glob',
    enforce: 'pre',
    transform(src: string, id: string) {
      const result = {
        code: src,
        map: null,
      };

      if (FILE_REGEX.test(id)) {
        result.code = transform(src, id);
      }

      return result;
    },
  };
}
