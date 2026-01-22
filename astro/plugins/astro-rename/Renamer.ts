import postcss from 'postcss';
import type { RenamingMap } from './types.ts';
import type { PostcssRenameOptions as RenamingOptions } from './postcss-rename-wrapper.ts';
import { postcssRename, postcssVarRename } from './postcss-rename-wrapper.ts';
import {
  RE_CLASS_HTML,
  RE_VAR_DEF,
  RE_VAR_DEF_HTML_ATTR,
  RE_VAR_REF,
  RE_VAR_REF_HTML_ATTR,
  RE_VAR_REF_HTML_ATTR_NO_QUOTE,
  RE_VAR_REF_JS,
} from './regex.ts';
import JsRenamer from './JsRenamer.ts';

export default class Renamer {
  renamingMap: RenamingMap = {};

  constructor(private postcssRenameOptions: RenamingOptions = {}) {}

  private outputMapCallback = (map: RenamingMap) => {
    this.renamingMap = {
      ...this.renamingMap,
      ...map,
    };

    this.postcssRenameOptions.outputMapCallback?.(map);
  };

  renameClassesInCss(css: string): string {
    return postcss([
      postcssRename({
        ...this.postcssRenameOptions,
        outputMapCallback: this.outputMapCallback,
      }),
    ]).process(css, {
      from: undefined,
    }).css;
  }

  renameVarsInCss(css: string): string {
    return postcss([
      postcssVarRename({
        ...this.postcssRenameOptions,
        outputMapCallback: this.outputMapCallback,
      }),
    ]).process(css, {
      from: undefined,
    }).css;
  }

  renameClassesInHtml(html: string): string {
    return html.replace(RE_CLASS_HTML, (_, quote, classes) => {
      const shortened = classes
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((c: string) => this.renamingMap[c] || c)
        .join(' ');

      return `class=${quote}${shortened}${quote}`;
    });
  }

  private renameVarRefs(css: string) {
    return css.replace(
      RE_VAR_REF,
      (_, start: string, name: string, nested: string) => {
        const end: string = nested ? this.renameVarRefs(nested) : '';
        return start + (this.renamingMap[name] || name) + end;
      },
    );
  }

  private renameVarDefs(css: string) {
    return css.replace(RE_VAR_DEF, (_, prefix: string, name: string) => {
      return (prefix || '') + '--' + (this.renamingMap[name] || name);
    });
  }

  private renameVarRefsInNonQuotedHtmlAttrs(html: string) {
    return html.replace(
      RE_VAR_REF_HTML_ATTR_NO_QUOTE,
      (fullAttr: string, attrValue: string) =>
        fullAttr.replace(attrValue, this.renameVarRefs(attrValue)),
    );
  }

  private renameVarRefsInQuotedHtmlAttrs(html: string) {
    return html.replace(
      RE_VAR_REF_HTML_ATTR,
      (fullAttr: string, _quote, attrValue: string) =>
        fullAttr.replace(attrValue, this.renameVarRefs(attrValue)),
    );
  }

  private renameVarDefsInQuotedHtmlAttrs(html: string) {
    return html.replace(
      RE_VAR_DEF_HTML_ATTR,
      (fullAttr: string, _quote, attrValue: string) =>
        fullAttr.replace(attrValue, this.renameVarDefs(attrValue)),
    );
  }

  renameVarsInHtml(html: string): string {
    return this.renameVarDefsInQuotedHtmlAttrs(
      this.renameVarRefsInQuotedHtmlAttrs(
        this.renameVarRefsInNonQuotedHtmlAttrs(html),
      ),
    );
  }

  renameClassesAndVarsInJs(js: string): string {
    js = this.renameVarDefs(js).replace(
      RE_VAR_REF_JS,
      (m, _: string, name: string) =>
        m.replace(name, this.renamingMap[name] || name),
    );

    const jsRenamer = new JsRenamer(this.renamingMap, js);

    return jsRenamer.renameClasses().renameCssVars().toSourceCode();
  }
}
