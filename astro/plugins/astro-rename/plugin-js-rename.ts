import type { OutputBundle, SourceMap } from 'rollup';
import type { Plugin } from 'vite';
import { SourceMapConsumer } from 'source-map';
import type Renamer from './Renamer';

type ModuleCodePosition = {
  source: string;
  line: number;
  startColumn: number;
  endColumn?: number;
};

async function collectModulesDistCodePositions(map: SourceMap) {
  const modulesDistCodePositions: Record<string, ModuleCodePosition> = {};

  await SourceMapConsumer.with(map, null, (consumer) => {
    let prevModuleSource: string | null = null;

    return consumer.eachMapping((mapping) => {
      const source = mapping.source;

      if (!modulesDistCodePositions[source]) {
        modulesDistCodePositions[source] = {
          source,
          line: mapping.generatedLine - 1,
          startColumn: mapping.generatedColumn,
        };

        if (prevModuleSource && prevModuleSource !== source) {
          if (!modulesDistCodePositions[prevModuleSource]) {
            throw new Error(`Previous module '${prevModuleSource}' not found.`);
          }

          modulesDistCodePositions[prevModuleSource].endColumn =
            mapping.generatedColumn;
        }

        prevModuleSource = source;
      }
    });
  });

  const modulesDistCodePositionsArr = Object.values(modulesDistCodePositions);

  if (modulesDistCodePositionsArr[0]?.startColumn > 0) {
    modulesDistCodePositionsArr.unshift({
      source: 'node_modules/any',
      line: 0,
      startColumn: 0,
      endColumn: modulesDistCodePositionsArr[0].startColumn,
    });
  }

  return modulesDistCodePositionsArr;
}

export default (
  renamer: Renamer,
  sourcemapType: boolean | 'inline' | 'hidden',
): Plugin => {
  function renameClassesAndVars(
    distCode: string,
    modulesDistCodePositions: ModuleCodePosition[],
  ) {
    const distCodeLines = distCode.split(/\n/);

    const handledDistCodeLines: string[] = [];

    for (const position of modulesDistCodePositions) {
      let distModuleCode = distCodeLines[position.line].slice(
        position.startColumn,
        position.endColumn,
      );

      if (!position.source.includes('node_modules')) {
        const endsWithComma = distModuleCode.endsWith(',');

        if (endsWithComma) {
          distModuleCode = distModuleCode.replace(/,$/, ';');
        }

        distModuleCode = renamer.renameClassesAndVarsInJs(distModuleCode);

        if (endsWithComma) {
          distModuleCode = distModuleCode.replace(/;$/, ',');
        }
      }

      handledDistCodeLines[position.line] ??= '';
      handledDistCodeLines[position.line] += distModuleCode;
    }

    appendDistCode(
      distCodeLines,
      handledDistCodeLines,
      modulesDistCodePositions,
    );

    return handledDistCodeLines.join('\n');
  }

  function appendDistCode(
    distCodeLines: string[],
    handledDistCodeLines: string[],
    modulesDistCodePositions: ModuleCodePosition[],
  ) {
    const lastModulesLine =
      modulesDistCodePositions[modulesDistCodePositions.length - 1].line;

    if (sourcemapType !== false) {
      for (let i = lastModulesLine + 1; i < distCodeLines.length; i++) {
        handledDistCodeLines[i] = distCodeLines[i];
      }
    } else {
      handledDistCodeLines.push('');
    }
  }

  return {
    name: 'vite-plugin-js-rename',
    async generateBundle(_, bundle: OutputBundle) {
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === 'chunk' &&
          /^assets\/.+[cm]?js$/.test(asset.fileName)
        ) {
          if (!asset.map) {
            throw new Error(`Asset ${asset.fileName} has no source map data.`);
          }

          const modulesDistCodePositions =
            await collectModulesDistCodePositions(asset.map);

          asset.code = renameClassesAndVars(
            asset.code,
            modulesDistCodePositions,
          );
        }
      }
    },
  };
};
