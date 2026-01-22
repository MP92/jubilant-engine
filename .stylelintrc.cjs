module.exports = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-html'],
  rules: {
    'selector-class-pattern': [
      '^[a-z]([-]?[a-z0-9]+)*(__[a-z0-9]([-]?[a-z0-9]+)*)?(--[a-z0-9]([-]?[a-z0-9]+)*)?$',
      {
        resolveNestedSelectors: true,
        message: function expected(selectorValue) {
          return `Expected class selector "${selectorValue}" to match BEM CSS pattern https://en.bem.info/methodology/css. Selector validation tool: https://regexr.com/3apms`;
        },
      },
    ],
    'declaration-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'scss/at-function-pattern': [
      '^_?(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message: 'Expected function name to be kebab-case',
      },
    ],
    'scss/at-mixin-pattern': [
      '^_?(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message: 'Expected mixin name to be kebab-case',
      },
    ],
    'at-rule-empty-line-before': [
      'always',
      {
        except: ['blockless-after-blockless', 'first-nested'],
        ignore: ['after-comment'],
        ignoreAtRules: ['after-comment', 'else', 'include'],
      },
    ],
    'value-keyword-case': [
      'lower',
      {
        ignoreKeywords: ['currentColor'],
      },
    ],
    'custom-property-pattern': [
      '^([a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message: (name) =>
          `Expected custom property name "${name}" to be kebab-case`,
      },
    ],
    'no-duplicate-selectors': null,
    'scss/operator-no-newline-after': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'media-feature-range-notation': null,
  },
};
