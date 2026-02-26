import j from 'jscodeshift';
import type {
  Collection,
  TemplateLiteral,
  CallExpression,
  ASTNode,
} from 'jscodeshift';
import type { RenamingMap, RenameArgParams, Scope } from './types';
import { ValueType } from './types';
import {
  findClassLists,
  findClassNameAssignments,
  findSetClassAttributes,
  getFuncCallsGenerator,
  getObjectMethodCallsGenerator,
  getArrOrObjAccessInfo,
  getFuncInfo,
  getIIFEInfo,
  getObjMethodInfo,
  findGetElementsByClassName,
  findQuerySelectors,
  replaceClassNames,
  findXPathExpressions,
  getNonPartialClassNameExpressions,
  getFunctionReturnValues,
  findFuncDeclaration,
  findFuncExpression,
  getIIFE,
  findVarDeclarator,
  findArrayModifyMethodCalls,
  findArrayIndexAssignments,
  findVarDeclaratorInDestructuring,
  findAssignmentsToVar,
  renameCssVar,
} from './jscodeshift-utils';
import { escapeRegExp } from '../utils';

export default class JsRenamer {
  private root: Collection;

  constructor(
    private renamingMap: RenamingMap,
    jsCode: string,
  ) {
    this.root = j(jsCode);
  }

  renameClasses() {
    return this.renameClassLists()
      .renameClassNameAssignments()
      .renameSetClassAttributes()
      .renameGetElementsByClassName()
      .renameQuerySelectors()
      .renameXPathExpressions()
      .renameHTMLStrings();
  }

  renameCssVars() {
    // replace template strings containing interpolated variables like `--${primaryColor}`
    this.root.find(j.TemplateLiteral).forEach((path) => {
      const quasis = path.node.quasis;
      const exprs = path.node.expressions;

      if (!exprs.length) {
        return;
      }

      quasis.forEach((quasi, index) => {
        if (quasi.value.raw === '--' && index < exprs.length) {
          const nextQuasiVal = quasis[index + 1].value.raw;

          if (nextQuasiVal === '' || nextQuasiVal.match(/^[:\s]/)) {
            this.renameArgClasses(exprs[index], {
              type: ValueType.CLASS_STRING,
              scope: path.scope,
            });
          }
        }
      });
    });

    // cases like:
    // element.style.setProperty('--active-btn-width', '100px');
    // element.style.setProperty(cssVars.activeBtnWidth, '100px');
    this.root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: 'setProperty' },
        },
      })
      .forEach((path) => {
        this.renameArgClasses(path.node.arguments[0], {
          type: ValueType.CLASS_STRING,
          scope: path.scope,
          cond: (val) => val.startsWith('--'),
        });
      });

    return this;
  }

  toSourceCode() {
    return this.root.toSource();
  }

  private renameTemplateLiteralClasses(
    arg: TemplateLiteral,
    cond: (val: string) => boolean,
  ) {
    arg.quasis.forEach((quasi) => {
      const newValue = cond(quasi.value.raw)
        ? replaceClassNames(quasi.value.raw, this.renamingMap)
        : quasi.value.raw;

      if (newValue !== quasi.value.raw) {
        quasi.value.raw = newValue;
        quasi.value.cooked = newValue;
      }
    });
  }

  private _replaceFuncArgClassNames(
    funcCallExpr: CallExpression,
    argIndex: number,
    restArgIndex: number,
    argParams: RenameArgParams,
  ) {
    if (argIndex >= 0) {
      const arg = funcCallExpr.arguments[argIndex];

      if (arg) {
        this.renameArgClasses(arg, { ...argParams, argIndex });
      }
    } else if (restArgIndex >= 0) {
      funcCallExpr.arguments.slice(restArgIndex).forEach(
        (arg) =>
          arg &&
          this.renameArgClasses(arg, {
            type: argParams.type,
            scope: argParams.scope,
          }),
      );
    }
  }

  private replaceIIFEArgClasses(argName: string, argParams: RenameArgParams) {
    const iifeInfo = getIIFEInfo(argName, argParams.scope);

    if (iifeInfo !== null) {
      this._replaceFuncArgClassNames(
        iifeInfo.callExpression,
        iifeInfo.argIndex,
        iifeInfo.restArgIndex,
        argParams,
      );
    }

    return iifeInfo !== null;
  }

  private replaceSingleFuncArgClasses(
    argName: string,
    argParams: RenameArgParams,
  ) {
    const funcInfo = getFuncInfo(argName, argParams.scope);

    if (funcInfo?.name) {
      const funcCalls = getFuncCallsGenerator(j, {
        ...funcInfo,
        scope: argParams.scope,
      });

      for (const callExpr of funcCalls) {
        this._replaceFuncArgClassNames(
          callExpr,
          funcInfo.argIndex,
          funcInfo.restArgIndex,
          argParams,
        );
      }
    }

    return !!funcInfo?.name;
  }

  private replaceObjMethodArgClasses(
    argName: string,
    argParams: RenameArgParams,
  ) {
    const objMethodInfo = getObjMethodInfo(argName, argParams.scope);

    if (objMethodInfo?.objectName) {
      const objMethodCalls = getObjectMethodCallsGenerator(j, {
        objectName: objMethodInfo.objectName,
        methodName: objMethodInfo.methodName,
        node: objMethodInfo.node,
        scope: argParams.scope,
      });

      for (const callExpr of objMethodCalls) {
        this._replaceFuncArgClassNames(
          callExpr,
          objMethodInfo.argIndex,
          objMethodInfo.restArgIndex,
          argParams,
        );
      }
    }

    return !!objMethodInfo?.objectName;
  }

  private renameArrayModifyCallsAndAssignments(
    varName: string,
    argParams: RenameArgParams,
  ) {
    const arrayMethodCalls = findArrayModifyMethodCalls(
      j,
      varName,
      argParams.scope,
    );

    arrayMethodCalls.forEach((path) => {
      for (const arg of path.node.arguments) {
        this.renameArgClasses(arg, argParams);
      }
    });

    const arrayIndexAssignments = findArrayIndexAssignments(
      j,
      varName,
      argParams.scope,
    );

    arrayIndexAssignments.forEach((path) =>
      this.renameArgClasses(path.value.right, argParams),
    );
  }

  private renameVarAssignments(varName: string, argParams: RenameArgParams) {
    const varAssignments = findAssignmentsToVar(j, varName, argParams.scope);

    varAssignments.forEach((path) =>
      this.renameArgClasses(path.node.right, argParams),
    );

    if (
      varAssignments.some((path) => j.ArrayExpression.check(path.node.right))
    ) {
      this.renameArrayModifyCallsAndAssignments(varName, argParams);
    }

    return varAssignments.length > 0;
  }

  private replaceFuncArgClassNames(
    argName: string,
    argParams: RenameArgParams,
  ) {
    if (argParams.argIndex === undefined) {
      return false;
    }

    return (
      this.replaceIIFEArgClasses(argName, argParams) ||
      this.replaceSingleFuncArgClasses(argName, argParams) ||
      this.replaceObjMethodArgClasses(argName, argParams)
    );
  }

  private replaceVarClassNames(varName: string, argParams: RenameArgParams) {
    const varDeclarator = findVarDeclarator(j, varName, argParams.scope);

    if (varDeclarator?.init) {
      this.renameArgClasses(varDeclarator.init, argParams);

      if (j.ArrayExpression.check(varDeclarator.init)) {
        this.renameArrayModifyCallsAndAssignments(varName, argParams);
      }
    }

    return !!varDeclarator;
  }

  private replaceDestructuredVarClassNames(
    varOrArgName: string,
    scope: Scope,
    argParams: RenameArgParams,
  ) {
    const destructuredDeclarator = findVarDeclaratorInDestructuring(
      j,
      varOrArgName,
      scope,
    );

    if (destructuredDeclarator?.init) {
      this.renameArgClasses(destructuredDeclarator.init, {
        ...argParams,
        scope,
      });
    }

    return !!destructuredDeclarator;
  }

  private replaceVarOrFuncArgClassNames(
    varOrArgName: string,
    argParams: RenameArgParams,
  ) {
    let scope: Scope | null = argParams.scope;

    while (scope) {
      const varRenamed =
        this.replaceFuncArgClassNames(varOrArgName, { ...argParams, scope }) ||
        this.replaceVarClassNames(varOrArgName, { ...argParams, scope });

      const assignmentsRenamed = this.renameVarAssignments(varOrArgName, {
        ...argParams,
        scope,
      });

      const destructuredVarRenamed = this.replaceDestructuredVarClassNames(
        varOrArgName,
        scope,
        argParams,
      );

      if (varRenamed || assignmentsRenamed || destructuredVarRenamed) {
        break;
      }

      scope = scope.parent;
    }

    return this;
  }

  private renameArgClasses(
    arg: ASTNode | null,
    { type, scope, argIndex, key, cond }: RenameArgParams,
  ) {
    if (!arg) {
      return;
    }

    cond = cond || (() => true);

    if (j.SpreadElement.check(arg)) {
      arg = arg.argument;
    }

    if (j.StringLiteral.check(arg) || j.Literal.check(arg)) {
      if (typeof arg.value === 'string' && cond(arg.value)) {
        if (arg.value.startsWith('--')) {
          arg.value = renameCssVar(arg.value, this.renamingMap);
        } else {
          arg.value = replaceClassNames(arg.value, this.renamingMap);
        }
      }
    } else if (j.TemplateLiteral.check(arg)) {
      const expressionsWithConditions = getNonPartialClassNameExpressions(
        arg,
        type,
      );

      expressionsWithConditions.forEach(([expr, cond]) =>
        this.renameArgClasses(expr, { type, scope, cond }),
      );

      this.renameTemplateLiteralClasses(arg, cond);
    } else if (j.ArrayExpression.check(arg)) {
      if (typeof key === 'number') {
        this.renameArgClasses(arg.elements[key], { type, scope, cond });
      } else {
        arg.elements.forEach((element) =>
          this.renameArgClasses(element, { type, scope, cond }),
        );
      }
    } else if (j.ObjectExpression.check(arg)) {
      if (typeof key === 'string') {
        arg.properties.forEach((prop) => {
          if (
            prop.type === 'Property' &&
            'name' in prop.key &&
            prop.key.name === key
          ) {
            this.renameArgClasses(prop.value, { type, scope, cond });
          }
        });
      }
    } else if (j.SequenceExpression.check(arg)) {
      this.renameArgClasses(arg.expressions[arg.expressions.length - 1], {
        type,
        scope,
        key,
        cond,
      });
    } else if (j.Identifier.check(arg)) {
      this.replaceVarOrFuncArgClassNames(arg.name, {
        type,
        scope,
        argIndex,
        key,
        cond,
      });
    } else if (j.MemberExpression.check(arg)) {
      // Array access: ['load', 'reset'][0], arr[0]
      // Object access: {prop: 'value'}.prop, {prop: 'value'}['prop'], obj.prop, obj['prop']

      const { varName, key } = getArrOrObjAccessInfo(j, arg);

      if (key !== undefined) {
        if (varName) {
          this.replaceVarOrFuncArgClassNames(varName, {
            type,
            scope,
            key,
            cond,
          });
        } else {
          this.renameArgClasses(arg.object, { type, scope, key, cond });
        }
      }
    } else if (j.ConditionalExpression.check(arg)) {
      // Ternary expressions like `i > 10 ? 'load' : clsName`
      this.renameArgClasses(arg.consequent, { type, scope, cond });
      this.renameArgClasses(arg.alternate, { type, scope, cond });
    } else if (
      j.LogicalExpression.check(arg) &&
      ['??', '||'].includes(arg.operator)
    ) {
      // Nullish coalescing expressions like `a ?? b` and `a || b`
      this.renameArgClasses(arg.left, { type, scope, cond });
      this.renameArgClasses(arg.right, { type, scope, cond });
    } else if (j.CallExpression.check(arg)) {
      // function return values

      let fnNode, fnScope;

      if (j.Identifier.check(arg.callee)) {
        ({ node: fnNode, scope: fnScope } =
          findFuncDeclaration(j, arg.callee.name, scope) ||
          findFuncExpression(j, arg.callee.name, scope) ||
          {});
      } else {
        ({ node: fnNode, scope: fnScope } = getIIFE(j, arg) || {});
      }

      if (fnNode && fnScope) {
        const returnValues = getFunctionReturnValues(j, fnNode);

        for (const returnValue of returnValues) {
          this.renameArgClasses(returnValue, {
            type,
            scope: fnScope,
            key,
            cond,
          });
        }
      }
    }
  }

  private renameClassLists() {
    findClassLists(j, this.root).forEach((path) =>
      path.node.arguments.forEach((arg) =>
        this.renameArgClasses(arg, {
          type: ValueType.CLASS_STRING,
          scope: path.scope,
        }),
      ),
    );
    return this;
  }

  private renameClassNameAssignments() {
    findClassNameAssignments(j, this.root).forEach((path) =>
      this.renameArgClasses(path.node.right, {
        type: ValueType.CLASS_STRING,
        scope: path.scope,
      }),
    );
    return this;
  }

  private renameSetClassAttributes() {
    findSetClassAttributes(j, this.root).forEach((path) =>
      this.renameArgClasses(path.node.arguments[1], {
        type: ValueType.CLASS_STRING,
        scope: path.scope,
      }),
    );
    return this;
  }

  private renameGetElementsByClassName() {
    findGetElementsByClassName(j, this.root).forEach((path) =>
      this.renameArgClasses(path.node.arguments[0], {
        type: ValueType.CLASS_STRING,
        scope: path.scope,
      }),
    );
    return this;
  }

  private renameQuerySelectors() {
    findQuerySelectors(j, this.root).forEach((path) =>
      this.renameArgClasses(path.node.arguments[0], {
        type: ValueType.SELECTOR,
        scope: path.scope,
      }),
    );
    return this;
  }

  private renameXPathExpressions() {
    findXPathExpressions(j, this.root).forEach((path) =>
      this.renameArgClasses(path.node.arguments[0], {
        type: ValueType.XPATH,
        scope: path.scope,
      }),
    );
    return this;
  }

  private replaceClassesInHTML(str: string) {
    return str.replace(/class\s*=\s*(["'])(.*?)\1/g, (_, quote, content) => {
      const newContent = content
        .split(/\s+/)
        .filter(Boolean)
        .map((cls: string) => replaceClassNames(cls, this.renamingMap))
        .join(' ');
      return `class=${quote}${newContent}${quote}`;
    });
  }

  private renameTemplateLiteralHTML(arg: TemplateLiteral) {
    let classAttrOpenedQuote: string | null;

    arg.quasis.forEach((quasi) => {
      if (quasi.value.raw.match(/class\s*=\s*(["'])(.*?)\1/g)) {
        quasi.value.raw = this.replaceClassesInHTML(quasi.value.raw);
        quasi.value.cooked = this.replaceClassesInHTML(
          quasi.value.cooked || quasi.value.raw,
        );
      }

      const replaceClassStr = ({
        htmlPart,
        classStr,
        atEnd = false,
      }: {
        htmlPart: string;
        classStr: string;
        atEnd?: boolean;
      }) => {
        const regex = new RegExp(
          (!atEnd ? '^' : '') + escapeRegExp(htmlPart) + (atEnd ? '$' : ''),
        );

        quasi.value.raw = quasi.value.raw.replace(
          regex,
          htmlPart.replace(
            classStr,
            replaceClassNames(classStr, this.renamingMap),
          ),
        );
        quasi.value.cooked = quasi.value.raw;
      };

      if (classAttrOpenedQuote) {
        const m = quasi.value.raw.match(
          new RegExp(
            `^([^${classAttrOpenedQuote}]*)(${classAttrOpenedQuote})?`,
          ),
        );

        if (m) {
          if (m[2] === classAttrOpenedQuote) {
            classAttrOpenedQuote = null;
          }

          replaceClassStr({ htmlPart: m[0], classStr: m[1] });
        }
      }

      if (!classAttrOpenedQuote) {
        const m = quasi.value.raw.match(/class\s*=\s*(["'])([^"']*)$/);

        if (m) {
          classAttrOpenedQuote = m[1];

          replaceClassStr({ htmlPart: m[0], classStr: m[2], atEnd: true });
        }
      }
    });
  }

  private renameHTMLStrings() {
    // Find all string literals and template literals
    this.root.find(j.Literal).forEach((path) => {
      if (
        typeof path.node.value === 'string' &&
        /class\s*=\s*["']/.test(path.node.value)
      ) {
        path.node.value = this.replaceClassesInHTML(path.node.value);
      }
    });

    this.root.find(j.TemplateLiteral).forEach((path) => {
      const rawContent = path.node.quasis
        .map((quasi) => quasi.value.raw)
        .join('');

      if (!/class\s*=\s*["']/.test(rawContent)) {
        return;
      }

      const expressionsWithConditions = getNonPartialClassNameExpressions(
        path.node,
        ValueType.CLASS_STRING,
      );

      expressionsWithConditions.forEach(([expr, cond]) =>
        this.renameArgClasses(expr, {
          type: ValueType.CLASS_STRING,
          scope: path.scope,
          cond,
        }),
      );

      this.renameTemplateLiteralHTML(path.node);
    });

    return this;
  }
}
