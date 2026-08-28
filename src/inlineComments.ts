import * as vscode from 'vscode';
import { getConfig, isSourceUri } from './config.ts';
import type { DocumentationService, DocumentationTarget, ResolvedDocumentation } from './documentationService.ts';
import { formatInlineComment } from './formatting.ts';
import type { ImplementationSymbol } from './symbols.ts';

interface ThreadEntry {
  thread: vscode.CommentThread;
  resolved: ResolvedDocumentation;
}

export class InlineDocumentationController implements vscode.Disposable {
  readonly #controller = vscode.comments.createCommentController('cppHeadDoc.inlineDocumentation', 'C++ HeadDoc');
  readonly #changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.#changed.event;
  readonly #threads = new Map<string, ThreadEntry>();
  readonly #subscriptions: vscode.Disposable[] = [];
  #timer: NodeJS.Timeout | undefined;
  #request: vscode.CancellationTokenSource | undefined;

  constructor(private readonly service: DocumentationService) {
    this.#subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => this.schedule(editor)),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => this.schedule(event.textEditor)),
      vscode.workspace.onDidCloseTextDocument((document) => this.removeDocument(document.uri)),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('cppHeadDoc')) this.refresh();
      }),
    );
    this.schedule(vscode.window.activeTextEditor);
  }

  schedule(editor: vscode.TextEditor | undefined): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.update(editor), 120);
  }

  refresh(): void {
    this.#request?.cancel();
    this.#request?.dispose();
    this.#request = undefined;
    this.#threads.forEach(({ thread }) => thread.dispose());
    this.#threads.clear();
    this.schedule(vscode.window.activeTextEditor);
    this.#changed.fire();
  }

  isExpanded(target: DocumentationTarget): boolean {
    return this.#threads.get(targetKey(target))?.thread.collapsibleState === vscode.CommentThreadCollapsibleState.Expanded
      || (!this.#threads.has(targetKey(target)) && getConfig(vscode.Uri.parse(target.sourceUri)).inlineCommentsExpanded);
  }

  resolvedFor(value: unknown): ResolvedDocumentation | undefined {
    for (const entry of this.#threads.values()) {
      if (entry.thread === value) return entry.resolved;
    }
    return undefined;
  }

  show(resolved: ResolvedDocumentation): void {
    const entry = this.upsert(resolved);
    entry.thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    this.#changed.fire();
  }

  toggle(resolved: ResolvedDocumentation): void {
    const entry = this.upsert(resolved);
    entry.thread.collapsibleState = entry.thread.collapsibleState === vscode.CommentThreadCollapsibleState.Expanded
      ? vscode.CommentThreadCollapsibleState.Collapsed
      : vscode.CommentThreadCollapsibleState.Expanded;
    this.#changed.fire();
  }

  async update(editor: vscode.TextEditor | undefined): Promise<void> {
    this.#timer = undefined;
    if (!editor) return;
    const config = getConfig(editor.document.uri);
    if (!config.enabled || !config.showInlineComments || !isSourceUri(editor.document.uri, config)) {
      this.removeDocument(editor.document.uri);
      return;
    }

    this.#request?.cancel();
    this.#request?.dispose();
    const request = new vscode.CancellationTokenSource();
    this.#request = request;
    const symbols = await this.service.getSymbols(editor.document, request.token);
    if (request.token.isCancellationRequested) return;
    const visible = visibleSymbols(symbols, editor.visibleRanges);
    const visibleKeys = new Set(visible.map((symbol) => symbolKey(editor.document.uri, symbol)));
    for (const [key, entry] of this.#threads) {
      if (entry.resolved.sourceUri.toString() === editor.document.uri.toString() && !visibleKeys.has(key)) {
        entry.thread.dispose();
        this.#threads.delete(key);
      }
    }
    await Promise.all(visible.map(async (symbol) => {
      const resolved = await this.service.resolve(editor.document, symbol, request.token);
      if (resolved && !request.token.isCancellationRequested) this.upsert(resolved);
    }));
  }

  private upsert(resolved: ResolvedDocumentation): ThreadEntry {
    const key = targetKey(resolved.target);
    const existing = this.#threads.get(key);
    const comment = createComment(resolved);
    if (existing) {
      existing.resolved = resolved;
      existing.thread.range = anchorRange(resolved);
      existing.thread.comments = [comment];
      return existing;
    }
    const thread = this.#controller.createCommentThread(resolved.sourceUri, anchorRange(resolved), [comment]);
    thread.canReply = false;
    thread.contextValue = 'cppHeadDoc.readonlyDocumentation';
    const initialState = getConfig(resolved.sourceUri).inlineCommentsExpanded
      ? vscode.CommentThreadCollapsibleState.Expanded
      : vscode.CommentThreadCollapsibleState.Collapsed;
    thread.collapsibleState = initialState;
    const entry = { thread, resolved };
    this.#threads.set(key, entry);
    if (initialState === vscode.CommentThreadCollapsibleState.Expanded) {
      setTimeout(() => {
        if (this.#threads.get(key)?.thread === thread) {
          thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        }
      }, 50);
    }
    return entry;
  }

  private removeDocument(uri: vscode.Uri): void {
    for (const [key, entry] of this.#threads) {
      if (entry.resolved.sourceUri.toString() === uri.toString()) {
        entry.thread.dispose();
        this.#threads.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#request?.cancel();
    this.#request?.dispose();
    this.#threads.forEach(({ thread }) => thread.dispose());
    this.#threads.clear();
    this.#subscriptions.splice(0).forEach((subscription) => { subscription.dispose(); });
    this.#changed.dispose();
    this.#controller.dispose();
  }
}

function visibleSymbols(symbols: readonly ImplementationSymbol[], ranges: readonly vscode.Range[]): ImplementationSymbol[] {
  if (ranges.length === 0) return [...symbols];
  return symbols.filter((symbol) => ranges.some((range) => {
    const start = Math.max(0, range.start.line - 2);
    const end = range.end.line + 2;
    return symbol.range.end.line >= start && symbol.range.start.line <= end;
  }));
}

function createComment(resolved: ResolvedDocumentation): vscode.Comment {
  const config = getConfig(resolved.sourceUri);
  const body = new vscode.MarkdownString(formatInlineComment({
    qualifiedName: resolved.qualifiedName,
    signature: resolved.signature,
    declarationLabel: resolved.declarationLabel,
    documentation: resolved.documentation,
  }, config.inlineCommentTextSize));
  body.isTrusted = false;
  body.supportHtml = true;
  body.supportThemeIcons = false;
  return {
    body,
    mode: vscode.CommentMode.Preview,
    author: { name: 'C++ HeadDoc' },
    contextValue: 'cppHeadDoc.readonlyDocumentation',
  };
}

function anchorRange(resolved: ResolvedDocumentation): vscode.Range {
  const line = Math.max(0, resolved.target.line - 1);
  return new vscode.Range(line, 0, line, 0);
}

function targetKey(target: DocumentationTarget): string {
  return `${target.sourceUri}:${target.line}:${target.character}:${target.symbolName}`;
}

function symbolKey(uri: vscode.Uri, symbol: ImplementationSymbol): string {
  return targetKey({
    sourceUri: uri.toString(),
    symbolName: symbol.name,
    line: symbol.selectionRange.start.line,
    character: symbol.selectionRange.start.character,
  });
}
