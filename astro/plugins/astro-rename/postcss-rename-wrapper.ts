import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import with type assertions
export const postcssRename =
  require('postcss-rename') as typeof import('postcss-rename');
export const postcssVarRename =
  require('postcss-rename/variable') as typeof import('postcss-rename/variable');

// Export the types
export type { Options as PostcssRenameOptions } from 'postcss-rename';

export type { Options as PostcssVariableRenameOptions } from 'postcss-rename/variable';
