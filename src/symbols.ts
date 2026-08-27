import * as vscode from 'vscode';
import { fileExtension } from './config.ts';
import { containsFunctionBody } from './utilities.ts';

export interface ImplementationSymbol {
  name: string;
  kind: vscode.SymbolKind;
  range: vscode.Range;
  selectionRange: vscode.Range;
  key: string;
}

const functionKinds = new Set([
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Operator,
]);

function isDocumentSymbol(value: vscode.DocumentSymbol | vscode.SymbolInformation): value is vscode.DocumentSymbol {
  return 'selectionRange' in value && 'children' in value;
}

function symbolKey(name: string, range: vscode.Range): string {
  return `${name}:${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
}

export function normalizeSymbols(
  values: readonly (vscode.DocumentSymbol | vscode.SymbolInformation)[],
  document: vscode.TextDocument,
): ImplementationSymbol[] {
  const result: ImplementationSymbol[] = [];
  const visit = (value: vscode.DocumentSymbol | vscode.SymbolInformation): void => {
    if (isDocumentSymbol(value)) {
      if (functionKinds.has(value.kind) && containsFunctionBody(document.getText(value.range))) {
        result.push({
          name: value.name,
          kind: value.kind,
          range: value.range,
          selectionRange: value.selectionRange,
          key: symbolKey(value.name, value.range),
        });
      }
      value.children.forEach(visit);
    } else if (value.location.uri.toString() === document.uri.toString()
      && functionKinds.has(value.kind)
      && containsFunctionBody(document.getText(value.location.range))) {
      result.push({
        name: value.name,
        kind: value.kind,
        range: value.location.range,
        selectionRange: value.location.range,
        key: symbolKey(value.name, value.location.range),
      });
    }
  };
  values.forEach(visit);
  return result.sort((left, right) => left.range.start.compareTo(right.range.start));
}

export async function executeDocumentSymbols(
  document: vscode.TextDocument,
): Promise<readonly (vscode.DocumentSymbol | vscode.SymbolInformation)[]> {
  return await vscode.commands.executeCommand<readonly (vscode.DocumentSymbol | vscode.SymbolInformation)[] | undefined>(
    'vscode.executeDocumentSymbolProvider',
    document.uri,
  ) ?? [];
}

export function normalizeDeclarations(
  value: vscode.Location | readonly vscode.Location[] | readonly vscode.LocationLink[] | undefined,
): vscode.Location[] {
  if (!value) return [];
  const values: readonly (vscode.Location | vscode.LocationLink)[] = value instanceof vscode.Location ? [value] : value;
  return values.map((item) => 'targetUri' in item
    ? new vscode.Location(item.targetUri, item.targetSelectionRange ?? item.targetRange)
    : item);
}

export interface DeclarationRankInput {
  location: vscode.Location;
  sourceUri: vscode.Uri;
  headerExtensions: readonly string[];
}

function workspaceRank(uri: vscode.Uri): number {
  return vscode.workspace.getWorkspaceFolder(uri) ? 0 : 1;
}

export function rankDeclarations(inputs: readonly DeclarationRankInput[]): vscode.Location[] {
  const extensionOrder = new Map(['.hpp', '.h', '.hh', '.hxx'].map((value, index) => [value, index]));
  return inputs
    .filter(({ location, headerExtensions }) => headerExtensions.includes(fileExtension(location.uri)))
    .sort((left, right) => {
      const leftSame = left.location.uri.toString() === left.sourceUri.toString() ? 1 : 0;
      const rightSame = right.location.uri.toString() === right.sourceUri.toString() ? 1 : 0;
      return leftSame - rightSame
        || workspaceRank(left.location.uri) - workspaceRank(right.location.uri)
        || (extensionOrder.get(fileExtension(left.location.uri)) ?? 99) - (extensionOrder.get(fileExtension(right.location.uri)) ?? 99)
        || left.location.uri.toString().localeCompare(right.location.uri.toString())
        || left.location.range.start.compareTo(right.location.range.start);
    })
    .map(({ location }) => location);
}
