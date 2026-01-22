const viewportSizes = [
  {
    width: 1920,
    height: 1080,
  },
  {
    width: 1440,
    height: 900,
  },
  {
    width: 1024,
    height: 1366,
  },
  {
    width: 768,
    height: 1024,
  },
  {
    width: 390,
    height: 844,
  },
];

const keepSelectors = [
  ':root',
  'body:not(.loaded)',
  'html.locked',
  // state selectors in the upper part of pages
  // '.btn-burger.is-active',
  // '.btn-burger.is-active:before',
  // '.btn-burger.is-active:after',
];

export { viewportSizes, keepSelectors };
