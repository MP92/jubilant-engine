import type {
  ASTPath,
  ASTNode,
  Collection,
  Identifier,
  JSCodeshift,
  Literal,
  Property,
  RestElement,
  SpreadElement,
  TemplateLiteral,
  CallExpression,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'jscodeshift';
import type { ExpressionKind } from 'ast-types/gen/kinds';
import type {
  RenamingMap,
  ClassListMethod,
  FunctionCallsGeneratorParams,
  ObjectMethodCallsGeneratorParams,
  ExprWithCondition,
  Scope,
  FunctionDeclOrExpr,
} from './types';
import { ValueType } from './types';
import { escapeRegExp } from '../utils';

const CLASS_LIST_METHODS: ClassListMethod[] = [
  'add',
  'remove',
  'contains',
  'toggle',
  'replace',
];

const isFuncExpr = (type: string) =>
  ['FunctionExpression', 'ArrowFunctionExpression'].includes(type);

const isClassSelector = (str: string) => str.startsWith('.');

const isFirst = (i: number) => i === 0;

const isLast = (arr: unknown[], i: number) => arr.length - i <= 1;

const quasiValue = (tl: TemplateLiteral, index: number) =>
  tl.quasis[index].value.raw;

const isConcatenatedWithOtherExprs = (tl: TemplateLiteral, exprIdx: number) =>
  (quasiValue(tl, exprIdx) === '' && !isFirst(exprIdx)) ||
  (quasiValue(tl, exprIdx + 1) === '' && !isLast(tl.expressions, exprIdx));

const isConcatenatedWithQuasis = (tl: TemplateLiteral, exprIdx: number) =>
  quasiValue(tl, exprIdx).match(/[^\s'"]$/) ||
  quasiValue(tl, exprIdx + 1).match(/^[^\s'"]/);

const isPartialClassNameExpr = (tl: TemplateLiteral, exprIdx: number) =>
  isConcatenatedWithOtherExprs(tl, exprIdx) ||
  isConcatenatedWithQuasis(tl, exprIdx);

const isPartialClassSelectorExpr = (tl: TemplateLiteral, exprIdx: number) =>
  quasiValue(tl, exprIdx + 1).match(/^[^\s.,]/);

const resolveSelectorCond = (tl: TemplateLiteral, index: number) =>
  quasiValue(tl, index).endsWith('.')
    ? (val: string) => !isClassSelector(val)
    : isClassSelector;

export function getNonPartialClassNameExpressions(
  tl: TemplateLiteral,
  type: ValueType,
): ExprWithCondition[] {
  const expressions: ExprWithCondition[] = [];

  if ([ValueType.CLASS_STRING, ValueType.XPATH].includes(type)) {
    tl.expressions.forEach((expr, index) => {
      if (!isPartialClassNameExpr(tl, index)) {
        expressions.push([expr]);
      }
    });
  } else if (type === ValueType.SELECTOR) {
    tl.expressions.forEach((expr, index) => {
      if (!isPartialClassSelectorExpr(tl, index)) {
        const cond = resolveSelectorCond(tl, index);

        expressions.push([expr, cond]);
      }
    });
  }

  return expressions;
}

function replaceXpathClassNames(xpath: string, renamingMap: RenamingMap) {
  let result = xpath;

  for (const [oldClass, newClass] of Object.entries(renamingMap)) {
    const regex = new RegExp(
      `(@class\\s*=\\s*|contains\\s*\\(\\s*@class\\s*,\\s*)(['"])${escapeRegExp(oldClass)}\\2(\\s*\\)?)`,
      'g',
    );
    result = result.replace(regex, `$1$2${newClass}$2$3`);
  }

  return result;
}

function replaceSelectorClassNames(selector: string, renamingMap: RenamingMap) {
  let result = selector;

  for (const [oldClass, newClass] of Object.entries(renamingMap)) {
    const regex = new RegExp(`\\.${escapeRegExp(oldClass)}(?![\\w-])`, 'g');
    result = result.replace(regex, `.${newClass}`);
  }

  return result;
}

const isXPathExpression = (str: string) =>
  str.match(/\[\s*(@class\s*=|contains\s*\(\s*@class\s*,)/);

const hasClassSelector = (str: string) => str.includes('.');

export function replaceClassNames(
  classStrOrSelOrXPath: string,
  renamingMap: RenamingMap,
) {
  if (isXPathExpression(classStrOrSelOrXPath)) {
    return replaceXpathClassNames(classStrOrSelOrXPath, renamingMap);
  }

  if (hasClassSelector(classStrOrSelOrXPath)) {
    return replaceSelectorClassNames(classStrOrSelOrXPath, renamingMap);
  }

  return classStrOrSelOrXPath
    .split(' ')
    .map((cls) => renamingMap[cls] || cls)
    .join(' ');
}

export function findClassLists(j: JSCodeshift, root: Collection) {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'classList' },
      },
      property: {
        type: 'Identifier',
        name: (name: string) =>
          CLASS_LIST_METHODS.includes(name as ClassListMethod),
      },
    },
  });
}

export function findClassNameAssignments(j: JSCodeshift, root: Collection) {
  return root.find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'className' },
    },
  });
}

export function findSetClassAttributes(j: JSCodeshift, root: Collection) {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'setAttribute' },
    },
    arguments: [{ type: 'Literal', value: 'class' }],
  });
}

export function findGetElementsByClassName(j: JSCodeshift, root: Collection) {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'getElementsByClassName' },
    },
  });
}

export function findQuerySelectors(j: JSCodeshift, root: Collection) {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: {
        type: 'Identifier',
        name: (name: string) =>
          ['querySelector', 'querySelectorAll'].includes(name),
      },
    },
  });
}

export function findXPathExpressions(j: JSCodeshift, root: Collection) {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'evaluate' },
    },
    arguments: [
      {
        type: (type: string) =>
          ['StringLiteral', 'Literal', 'TemplateLiteral'].includes(type),
      },
    ],
  });
}

function getFuncName(scope: Scope) {
  const node = scope.path.node;

  if (node.type === 'FunctionDeclaration') {
    return node.id?.name ?? null;
  }

  if (isFuncExpr(node.type) && scope.path.parentPath) {
    const parentNode = scope.path.parentPath.node;

    // Variable declarations: const fn = function() {}
    if (
      parentNode.type === 'VariableDeclarator' &&
      parentNode.id.type === 'Identifier'
    ) {
      return parentNode.id.name ?? null;
    }

    // Assignments: fn = function() {}
    if (
      parentNode.type === 'AssignmentExpression' &&
      parentNode.left.type === 'Identifier'
    ) {
      return parentNode.left.name ?? null;
    }
  }

  return null;
}

export function getIIFEInfo(argName: string, scope: Scope) {
  const path = scope.path;
  const node = scope.path.node;

  if (isFuncExpr(node.type) && path.parentPath) {
    const parentNode = path.parentPath.node;

    if (parentNode.type === 'CallExpression' && parentNode.callee === node) {
      const argIndex = getFuncParamIndex(argName, scope);
      const restArgIndex = getFuncRestParamIndex(argName, scope);

      if (argIndex >= 0 || restArgIndex >= 0) {
        return {
          callExpression: parentNode,
          argIndex,
          restArgIndex,
        };
      }
    }
  }

  return null;
}

export function getFuncInfo(argName: string, scope: Scope) {
  const node = scope.path.node as FunctionDeclOrExpr;

  if (
    ![
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ].includes(node.type)
  ) {
    return null;
  }

  const name = getFuncName(scope);

  const argIndex = getFuncParamIndex(argName, scope);
  const restArgIndex = getFuncRestParamIndex(argName, scope);

  return argIndex >= 0 || restArgIndex >= 0
    ? {
        type: node.type,
        name,
        node,
        argIndex,
        restArgIndex,
      }
    : null;
}

function getObjectVarDeclNode(path: ASTPath<Property>) {
  if (path.parentPath.node.type !== 'ObjectExpression') {
    return null;
  }

  const varDeclPath =
    path.parentPath.parentPath?.node.type === 'ObjectExpression'
      ? path.parentPath.parentPath.parentPath
      : path.parentPath.parentPath;

  return varDeclPath?.node ?? null;
}

export function getObjMethodInfo(argName: string, scope: Scope) {
  const path = scope.path;
  const node = scope.path.node as FunctionDeclOrExpr;

  let methodName: string | null = null;
  let objectName: string | null = null;

  if (isFuncExpr(node.type) && path.parentPath) {
    const parentNode = path.parentPath.node;

    // Object literal methods: { method() {} }
    if (
      parentNode.type === 'Property' &&
      parentNode.key.type === 'Identifier' &&
      parentNode.value === node
    ) {
      const varDeclNode = getObjectVarDeclNode(path.parentPath);

      if (
        varDeclNode.type === 'VariableDeclarator' &&
        varDeclNode.id.type === 'Identifier'
      ) {
        objectName = varDeclNode.id.name;
        methodName = parentNode.key.name;
      }
    }
    // Object property assignments: obj.fn = function() {}
    else if (
      parentNode.type === 'AssignmentExpression' &&
      parentNode.left.type === 'MemberExpression' &&
      parentNode.left.property.type === 'Identifier'
    ) {
      if (parentNode.left.object.type === 'Identifier') {
        objectName = parentNode.left.object.name;
        methodName = parentNode.left.property.name;
      }
    }
  }

  if (objectName && methodName) {
    const argIndex = getFuncParamIndex(argName, scope);
    const restArgIndex = getFuncRestParamIndex(argName, scope);

    if (argIndex >= 0 || restArgIndex >= 0) {
      return {
        objectName,
        methodName,
        argIndex,
        restArgIndex,
        node,
      };
    }
  }

  return null;
}

function getFuncParamIndex(argName: string, scope: Scope) {
  const node = scope.path.node;

  return 'params' in node
    ? node.params?.findIndex(
        (param) => param.type === 'Identifier' && param.name === argName,
      )
    : -1;
}

function getFuncRestParamIndex(argName: string, scope: Scope) {
  const node = scope.path.node;

  return 'params' in node
    ? node.params?.findIndex((param) => {
        return (
          param.type === 'RestElement' &&
          param.argument.type === 'Identifier' &&
          param.argument.name === argName
        );
      })
    : -1;
}

export function* getFuncCallsGenerator(
  j: JSCodeshift,
  { node, name, type, scope }: FunctionCallsGeneratorParams,
) {
  const callPaths = j((scope.parent ?? scope).path).find(j.CallExpression, {
    callee: { type: 'Identifier', name },
  });

  for (const callPath of callPaths.paths()) {
    const funcDeclOrExprNode =
      type === 'FunctionDeclaration'
        ? (findFuncDeclaration(j, name, callPath.scope)?.node ?? null)
        : (findFuncExpression(j, name, callPath.scope)?.node ?? null);

    if (funcDeclOrExprNode === node) {
      yield callPath.node;
    }
  }
}

export function* getObjectMethodCallsGenerator(
  j: JSCodeshift,
  { node, objectName, methodName, scope }: ObjectMethodCallsGeneratorParams,
) {
  const callPaths = j((scope.parent ?? scope).path).find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: objectName },
      property: { type: 'Identifier', name: methodName },
    },
  });

  for (const callPath of callPaths.paths()) {
    const objMethodExpression = findObjMethodExpressionNode(
      j,
      objectName,
      methodName,
      callPath.scope,
    );

    if (objMethodExpression === node) {
      yield callPath.node;
    }
  }
}

export function findFuncDeclaration(
  j: JSCodeshift,
  name: string,
  startScope: Scope,
) {
  let scope: Scope | null = startScope;

  while (scope) {
    const funcDeclarators = j(scope.path).find(j.FunctionDeclaration, {
      id: { type: 'Identifier', name },
    });

    if (funcDeclarators.length) {
      return {
        node: funcDeclarators.paths()[0].node,
        scope: funcDeclarators.paths()[0].scope,
      };
    }

    scope = scope.parent;
  }

  return null;
}

export function findFuncExpression(
  j: JSCodeshift,
  varName: string,
  startScope: Scope,
) {
  let scope: Scope | null = startScope;

  while (scope) {
    const varDeclarators = j(scope.path).find(j.VariableDeclarator, {
      id: { type: 'Identifier', name: varName },
      init: {
        type: isFuncExpr,
      },
    });

    if (varDeclarators.length) {
      return {
        node: varDeclarators.paths()[0].value.init as
          | FunctionExpression
          | ArrowFunctionExpression,
        scope: varDeclarators.paths()[0].get('init').scope,
      };
    }

    const assignmentExprs = j(scope.path).find(j.AssignmentExpression, {
      left: { type: 'Identifier', name: varName },
      right: {
        type: isFuncExpr,
      },
    });

    if (assignmentExprs.length) {
      return {
        node: assignmentExprs.paths()[0].value.right as
          | FunctionExpression
          | ArrowFunctionExpression,
        scope: assignmentExprs.paths()[0].get('right').scope,
      };
    }

    scope = scope.parent;
  }

  return null;
}

function findNodePath(j: JSCodeshift, node: ASTNode) {
  let resultPath: ASTPath | null = null;

  j(node).forEach((path) => {
    if (path.value === node) {
      resultPath = path;
    }
  });

  return resultPath as ASTPath | null;
}

export function getIIFE(j: JSCodeshift, callExpr: CallExpression) {
  const calleeNode = j.ParenthesizedExpression.check(callExpr.callee)
    ? callExpr.callee.expression
    : callExpr.callee;

  if (
    ['FunctionExpression', 'ArrowFunctionExpression'].includes(calleeNode.type)
  ) {
    const callExpressionPath = findNodePath(j, callExpr);

    if (callExpressionPath) {
      const calleePath = callExpressionPath.get('callee');

      if (calleePath.value === calleeNode) {
        return {
          node: calleeNode as FunctionExpression | ArrowFunctionExpression,
          scope: calleePath.scope,
        };
      } else if (j.ParenthesizedExpression.check(calleePath.value)) {
        const innerPath = calleePath.get('expression');

        if (innerPath.value === calleeNode) {
          return {
            node: calleeNode as FunctionExpression | ArrowFunctionExpression,
            scope: innerPath.scope,
          };
        }
      }
    }
  }

  return null;
}

function findObjMethodExpressionNode(
  j: JSCodeshift,
  objectName: string,
  methodName: string,
  startScope: Scope,
) {
  let scope: Scope | null = startScope;

  while (scope) {
    const methodAssignments = j(scope.path).find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: objectName },
        property: { type: 'Identifier', name: methodName },
      },
      right: {
        type: isFuncExpr,
      },
    });

    if (methodAssignments.length) {
      return methodAssignments.paths()[0].value.right;
    }

    // Object literal methods: { method() {} }
    const objectMethods = j(scope.path)
      .find(j.Property, {
        key: { type: 'Identifier', name: methodName },
        value: {
          type: isFuncExpr,
        },
      })
      .filter((path) => {
        const varDeclNode = getObjectVarDeclNode(path);

        return (
          varDeclNode?.type === 'VariableDeclarator' &&
          varDeclNode.id.type === 'Identifier' &&
          varDeclNode.id.name === objectName
        );
      });

    if (objectMethods.length) {
      return objectMethods.paths()[0].value.value;
    }

    scope = scope.parent;
  }

  return null;
}

export function getArrOrObjAccessInfo(
  j: JSCodeshift,
  arg: ExpressionKind | SpreadElement | RestElement,
) {
  if (
    j.MemberExpression.check(arg) &&
    ['Identifier', 'ArrayExpression', 'ObjectExpression'].includes(
      arg.object.type,
    ) &&
    ['Identifier', 'Literal', 'StringLiteral'].includes(arg.property.type)
  ) {
    const varName = (arg.object as Identifier).name;
    const key =
      arg.property.type === 'Identifier'
        ? arg.property.name
        : ((arg.property as Literal).value as number | string);

    return { varName, key };
  }

  return {};
}

export function getFunctionReturnValues(
  j: JSCodeshift,
  funcNode: FunctionDeclOrExpr,
): ExpressionKind[] {
  if (
    [
      'FunctionExpression',
      'ArrowFunctionExpression',
      'FunctionDeclaration',
    ].includes(funcNode.type)
  ) {
    if (
      funcNode.type === 'ArrowFunctionExpression' &&
      funcNode.body.type !== 'BlockStatement'
    ) {
      return [funcNode.body];
    } else if (funcNode.body.type === 'BlockStatement') {
      const returnStatements = j(funcNode).find(j.ReturnStatement);

      return returnStatements
        .paths()
        .filter((path) => !!path.node.argument)
        .map((path) => path.node.argument!);
    }
  }

  return [];
}

export function findVarDeclarator(
  j: JSCodeshift,
  varName: string,
  scope: Scope,
) {
  const varDeclarators = j(scope.path).find(j.VariableDeclarator, {
    id: { type: 'Identifier', name: varName },
  });

  const foundPath = varDeclarators.paths().find((path) => path.scope === scope);

  return foundPath?.value ?? null;
}

export function findArrayModifyMethodCalls(
  j: JSCodeshift,
  varName: string,
  scope: Scope,
) {
  return j(scope.path).find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: {
        type: 'Identifier',
        name: (name: string) => ['push', 'unshift', 'splice'].includes(name),
      },
      object: {
        type: 'Identifier',
        name: varName,
      },
    },
  });
}

export function findArrayIndexAssignments(
  j: JSCodeshift,
  varName: string,
  scope: Scope,
) {
  return j(scope.path).find(j.AssignmentExpression, {
    left: {
      type: 'MemberExpression',
      object: {
        type: 'Identifier',
        name: varName,
      },
      property: {
        type: (type: string) => ['Literal', 'Identifier'].includes(type),
      },
    },
  });
}
