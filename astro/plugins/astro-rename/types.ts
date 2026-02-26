import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  ASTPath,
} from 'jscodeshift';
import type { ExpressionKind, TSTypeKind } from 'ast-types/gen/kinds';
import type { PostcssRenameOptions } from './postcss-rename-wrapper';

export type AstroRenameOptions = {
  postcss: PostcssRenameOptions;
  forceRename?: string[];
};

export type RenamingMap = { [originalName: string]: string };

export type ClassListMethod =
  | 'add'
  | 'remove'
  | 'contains'
  | 'toggle'
  | 'replace';

export type FunctionDeclOrExpr =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression;

export interface Scope {
  path: ASTPath;
  parent: Scope | null;
}

export interface FunctionCallsGeneratorParams {
  node: FunctionDeclOrExpr;
  name: string;
  type: string;
  scope: Scope;
}

export interface ObjectMethodCallsGeneratorParams {
  node: FunctionDeclOrExpr;
  objectName: string;
  methodName: string;
  scope: Scope;
}

export interface RenameArgParams {
  type: ValueType;
  scope: Scope;
  argIndex?: number;
  key?: number | string;
  cond?: ValueCondition;
}

export enum ValueType {
  CLASS_STRING,
  SELECTOR,
  XPATH,
}

export type ValueCondition = (val: string) => boolean;

export type ExprWithCondition =
  | [ExpressionKind | TSTypeKind, ValueCondition]
  | [ExpressionKind | TSTypeKind];
