import postcss from 'postcss';
import type { AstroRenameOptions, RenamingMap } from './types';
import type { PostcssRenameOptions as RenamingOptions } from './postcss-rename-wrapper';
import { postcssRename, postcssVarRename } from './postcss-rename-wrapper';
import {
  RE_CLASS_HTML,
  RE_VAR_DEF,
  RE_VAR_DEF_HTML_ATTR,
  RE_VAR_REF,
  RE_VAR_REF_HTML_ATTR,
  RE_VAR_REF_HTML_ATTR_NO_QUOTE,
} from './regex';
import JsRenamer from './JsRenamer';

export default class Renamer {
  private postcssRenameOptions: RenamingOptions;
  private forceRename: string[];

  renamingMap: RenamingMap = {};

  constructor(options: AstroRenameOptions) {
    this.postcssRenameOptions = options.postcss;

    this.forceRename = options.forceRename ?? [];
  }

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
    const resultHtml = html.replace(RE_CLASS_HTML, (_, quote, classes) => {
      const shortened = classes
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((c: string) => this.renamingMap[c] || c)
        .join(' ');

      return `class=${quote}${shortened}${quote}`;
    });

    return this.forceRenameClassesAndVars(resultHtml);
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

  private forceRenameClassesAndVars(str: string) {
    if (this.forceRename.length === 0) {
      return str;
    }

    const escapedKeys = Object.keys(this.renamingMap)
      .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => {
        if (b.length !== a.length) {
          return b.length - a.length;
        }
        return b.localeCompare(a);
      });

    const pattern = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'g');

    return str.replace(pattern, (match) =>
      this.forceRename.includes(match) ? this.renamingMap[match] : match,
    );
  }

  renameClassesAndVarsInJs(js: string): string {
    js = this.renameVarDefs(js).replace(
      RE_VAR_REF,
      (m, _: string, name: string) => {
        return m.replace(name, this.renamingMap[name] || name);
      },
    );

    const jsRenamer = new JsRenamer(this.renamingMap, js);

    js = jsRenamer.renameClasses().renameCssVars().toSourceCode();

    return this.forceRenameClassesAndVars(js);
  }
}
