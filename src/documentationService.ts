import * as vscode from 'vscode';
import { fileExtension, getConfig } from './config.ts';
import { extractDoxygenBefore, parseDoxygen } from './doxygen.ts';
import type { ParsedDocumentation } from './model.ts';
import {
  executeDocumentSymbols,
  type ImplementationSymbol,
  normalizeDeclarations,
  normalizeSymbols,
  rankDeclarations,
} from './symbols.ts';
import { LruCache, Semaphore } from './utilities.ts';

export interface DocumentationTarget {
  sourceUri: string;
  symbolName: string;
  line: number;
  character: number;
}

export interface ResolvedDocumentation {
  target: DocumentationTarget;
  qualifiedName: string;
  signature: string;
  sourceUri: vscode.Uri;
  sourceVersion: number;
  declaration: vscode.Location;
  declarationLabel: string;
  headerVersion: number;
  commentRange: vscode.Range;
  documentation: ParsedDocumentation;
}

export type LogWriter = (level: 'error' | 'info' | 'debug', message: string, error?: unknown) => void;

export class DocumentationService {
  readonly #semaphore = new Semaphore(6);
  readonly #symbolCache = new LruCache<string, readonly ImplementationSymbol[]>(100);
  readonly #documentationCache = new LruCache<string, ResolvedDocumentation>(500);
  readonly #inFlight = new Map<string, Promise<ResolvedDocumentation | undefined>>();

  constructor(private readonly log: LogWriter) {}

  async getSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<readonly ImplementationSymbol[]> {
    if (token.isCancellationRequested) return [];
    const key = `${document.uri.toString()}@${document.version}`;
    const cached = this.#symbolCache.get(key);
    if (cached) {
      this.log('debug', `Symbol cache hit: ${displayUri(document.uri)}`);
      return cached;
    }
    try {
      const symbols = normalizeSymbols(await executeDocumentSymbols(document), document);
      if (!token.isCancellationRequested) this.#symbolCache.set(key, symbols);
      return token.isCancellationRequested ? [] : symbols;
    } catch (error) {
      this.log('error', `Document symbols failed: ${displayUri(document.uri)}`, error);
      return [];
    }
  }

  async resolve(
    document: vscode.TextDocument,
    symbol: ImplementationSymbol,
    token: vscode.CancellationToken,
  ): Promise<ResolvedDocumentation | undefined> {
    if (token.isCancellationRequested) return undefined;
    const config = getConfig(document.uri);
    this.#documentationCache.resize(config.maxCacheEntries);
    const key = `${document.uri.toString()}@${document.version}:${symbol.key}`;
    const cached = this.#documentationCache.get(key);
    if (cached) {
      this.log('debug', `Documentation cache hit: ${displayUri(document.uri)}:${symbol.range.start.line + 1}`);
      return cached;
    }
    let promise = this.#inFlight.get(key);
    if (!promise) {
      promise = this.#semaphore.run(async () => await this.#resolveUncached(document, symbol));
      this.#inFlight.set(key, promise);
      void promise.finally(() => this.#inFlight.delete(key));
    }
    const result = await promise;
    if (token.isCancellationRequested || document.version !== result?.sourceVersion) return undefined;
    if (result) this.#documentationCache.set(key, result);
    return result;
  }

  async resolveTarget(target: DocumentationTarget, token: vscode.CancellationToken): Promise<ResolvedDocumentation | undefined> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(target.sourceUri));
      const symbols = await this.getSymbols(document, token);
      const exact = symbols.find((symbol) => symbol.name === target.symbolName
        && symbol.selectionRange.start.line === target.line
        && symbol.selectionRange.start.character === target.character);
      const nearest = exact ?? symbols
        .filter((symbol) => symbol.name === target.symbolName)
        .sort((left, right) => Math.abs(left.selectionRange.start.line - target.line) - Math.abs(right.selectionRange.start.line - target.line))[0];
      return nearest ? await this.resolve(document, nearest, token) : undefined;
    } catch (error) {
      this.log('error', 'Unable to resolve the documentation target.', error);
      return undefined;
    }
  }

  clear(): void {
    this.#symbolCache.clear();
    this.#documentationCache.clear();
  }

  invalidate(uri: vscode.Uri): void {
    void uri;
    this.clear();
  }

  async #resolveUncached(
    document: vscode.TextDocument,
    symbol: ImplementationSymbol,
  ): Promise<ResolvedDocumentation | undefined> {
    const started = performance.now();
    try {
      const result = await vscode.commands.executeCommand<
        vscode.Location | readonly vscode.Location[] | readonly vscode.LocationLink[] | undefined
      >('vscode.executeDeclarationProvider', document.uri, symbol.selectionRange.start);
      const config = getConfig(document.uri);
      const declarations = normalizeDeclarations(result).filter((location) => !(location.uri.toString() === document.uri.toString()
        && location.range.contains(symbol.selectionRange.start)));
      const declaration = rankDeclarations(declarations.map((location) => ({
        location,
        sourceUri: document.uri,
        headerExtensions: config.headerExtensions,
      })))[0];
      if (!declaration) return undefined;

      const header = await vscode.workspace.openTextDocument(declaration.uri);
      const extracted = extractDoxygenBefore(header.getText(), declaration.range.start.line, config.maxCommentSearchLines);
      if (!extracted) return undefined;
      const documentation = parseDoxygen(extracted.raw);
      if (!documentation) return undefined;
      const signature = collapseSignature(document.getText(symbol.range));
      const target: DocumentationTarget = {
        sourceUri: document.uri.toString(),
        symbolName: symbol.name,
        line: symbol.selectionRange.start.line,
        character: symbol.selectionRange.start.character,
      };
      const resolved: ResolvedDocumentation = {
        target,
        qualifiedName: cleanSymbolName(symbol.name),
        signature,
        sourceUri: document.uri,
        sourceVersion: document.version,
        declaration,
        declarationLabel: declarationLabel(declaration),
        headerVersion: header.version,
        commentRange: new vscode.Range(extracted.startLine, 0, extracted.endLine, (header.lineAt(extracted.endLine).text).length),
        documentation,
      };
      this.log('debug', `Resolved ${displayUri(document.uri)}:${symbol.selectionRange.start.line + 1} in ${Math.round(performance.now() - started)} ms`);
      return resolved;
    } catch (error) {
      this.log('error', `Declaration resolution failed: ${displayUri(document.uri)}:${symbol.selectionRange.start.line + 1}`, error);
      return undefined;
    }
  }
}

function collapseSignature(value: string): string {
  const body = value.indexOf('{');
  const signature = (body >= 0 ? value.slice(0, body) : value).replace(/\s+/g, ' ').trim();
  return signature.length > 500 ? `${signature.slice(0, 499)}…` : signature;
}

function cleanSymbolName(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*(?:const|noexcept|override|final|->.*)?\s*$/, '').trim() || value;
}

function declarationLabel(location: vscode.Location): string {
  const folder = vscode.workspace.getWorkspaceFolder(location.uri);
  const path = folder ? vscode.workspace.asRelativePath(location.uri, false) : `${location.uri.scheme}:${location.uri.path}`;
  return `${path}:${location.range.start.line + 1}`;
}

function displayUri(uri: vscode.Uri): string {
  return vscode.workspace.getWorkspaceFolder(uri)
    ? vscode.workspace.asRelativePath(uri, false)
    : `${uri.scheme}:${fileExtension(uri) || '(resource)'}`;
}
