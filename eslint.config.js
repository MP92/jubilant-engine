import tsEslint from 'typescript-eslint';
import eslintJs from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginAstro from 'eslint-plugin-astro';
import ignores from './eslintignore.js';
import globals from 'globals';

export default defineConfig(
  {
    ignores,
  },
  eslintJs.configs.recommended,
  ...tsEslint.configs.recommended,
  tsEslint.configs.eslintRecommended,
  ...eslintPluginAstro.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2022,
      },
    },
  },
  {
    rules: {
      // override/add rules settings here, such as:
      // "astro/no-set-html-directive": "error"
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true },
      ],
      '@typescript-eslint/triple-slash-reference': 0,
    },
  },
);
