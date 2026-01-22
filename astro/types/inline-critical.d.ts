declare module 'inline-critical' {
  interface Options {
    /**
     * Whether to remove the inlined styles from any stylesheets referenced in the HTML.
     * @default false
     */
    extract?: boolean;

    /**
     * Stylesheets to ignore when inlining.
     * @default []
     * @example [/bootstrap/]
     */
    ignore?: string | RegExp | Array<string | RegExp>;

    /**
     * Paths to use in the `href` tag of the `link` elements.
     * @default false
     */
    replaceStylesheets?: string[] | false;

    /**
     * The position of the `noscript` fallback.
     * * `body`: end of body
     * * `head`: end of head
     * * `false`: no `noscript`
     * @default 'body'
     */
    noscript?: 'body' | 'head' | false;

    /** Loading strategy for stylesheets */
    strategy?: 'polyfill' | 'swap' | 'media' | 'body';

    /**
     * The path to be used when extracting styles to find the files references by `href` attributes.
     * @default process.cwd
     */
    basePath?: string;

    /** The selector for the element used by loadCSS as a reference for inlining. */
    selector?: string;

    /**
     * Whether to add loadCSS if it's not already loaded.
     * @default true
     */
    polyfill?: boolean;
  }

  function inline(
    html: string | Buffer,
    styles: string | Buffer,
    options?: Options,
  ): Buffer;

  export default inline;
}
