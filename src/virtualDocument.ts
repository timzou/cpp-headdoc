import * as vscode from 'vscode';
import type { DocumentationService, DocumentationTarget, ResolvedDocumentation } from './documentationService.ts';
import { formatMarkdown } from './formatting.ts';
import { LruCache } from './utilities.ts';

interface VirtualEntry {
  target: DocumentationTarget;
  fallback: ResolvedDocumentation;
}

export class DocumentationContentProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
  readonly #changed = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.#changed.event;
  readonly #entries = new LruCache<string, VirtualEntry>(100);
  #lastUri: vscode.Uri | undefined;

  constructor(private readonly service: DocumentationService) {}

  async show(resolved: ResolvedDocumentation): Promise<void> {
    const id = crypto.randomUUID();
    const uri = vscode.Uri.from({ scheme: 'cpp-head-doc', path: `/${id}/${safeName(resolved.qualifiedName)}.md` });
    this.#entries.set(id, { target: resolved.target, fallback: resolved });
    this.#lastUri = uri;
    await vscode.commands.executeCommand('vscode.openWith', uri, 'vscode.markdown.preview.editor');
  }

  async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
    const entry = this.#entries.get(idFromUri(uri));
    if (!entry) return '# C++ HeadDoc\n\nDocumentation is no longer available.\n';
    const resolved = await this.service.resolveTarget(entry.target, token) ?? entry.fallback;
    entry.fallback = resolved;
    return formatMarkdown({
      qualifiedName: resolved.qualifiedName,
      signature: resolved.signature,
      declarationLabel: resolved.declarationLabel,
      documentation: resolved.documentation,
    });
  }

  async goToDeclaration(argument?: vscode.Uri | ResolvedDocumentation): Promise<void> {
    let resolved: ResolvedDocumentation | undefined;
    if (argument && !(argument instanceof vscode.Uri)) {
      resolved = argument;
    } else {
      const uri = argument instanceof vscode.Uri ? argument : this.#lastUri;
      const entry = uri ? this.#entries.get(idFromUri(uri)) : undefined;
      if (entry) {
        const source = new vscode.CancellationTokenSource();
        try {
          resolved = await this.service.resolveTarget(entry.target, source.token) ?? entry.fallback;
        } finally {
          source.dispose();
        }
      }
    }
    if (!resolved) return;
    const document = await vscode.workspace.openTextDocument(resolved.declaration.uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    editor.selection = new vscode.Selection(resolved.declaration.range.start, resolved.declaration.range.end);
    editor.revealRange(resolved.declaration.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  refresh(): void {
    for (const id of [...this.#entries.keys()]) {
      const entry = this.#entries.get(id);
      if (entry) this.#changed.fire(vscode.Uri.from({ scheme: 'cpp-head-doc', path: `/${id}/${safeName(entry.fallback.qualifiedName)}.md` }));
    }
  }

  dispose(): void {
    this.#entries.clear();
    this.#changed.dispose();
  }
}

function idFromUri(uri: vscode.Uri): string {
  return uri.path.split('/').filter(Boolean)[0] ?? '';
}

function safeName(value: string): string {
  return encodeURIComponent(value.replace(/[^\p{L}\p{N}_~.-]+/gu, '_').slice(0, 80) || 'documentation');
}
