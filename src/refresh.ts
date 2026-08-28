import * as vscode from 'vscode';
import { getConfig, isTrackedUri } from './config.ts';
import type { DocumentationService } from './documentationService.ts';
import type { HeaderDocCodeLensProvider } from './providers.ts';
import type { DocumentationContentProvider } from './virtualDocument.ts';
import type { InlineDocumentationController } from './inlineComments.ts';

export class RefreshService implements vscode.Disposable {
  readonly #subscriptions: vscode.Disposable[] = [];
  readonly #watchers: vscode.FileSystemWatcher[] = [];
  #timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly service: DocumentationService,
    private readonly codeLens: HeaderDocCodeLensProvider,
    private readonly virtualDocuments: DocumentationContentProvider,
    private readonly inlineComments: InlineDocumentationController,
  ) {
    this.#subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => this.changed(event.document.uri)),
      vscode.workspace.onDidSaveTextDocument((document) => this.changed(document.uri)),
      vscode.workspace.onDidCreateFiles((event) => event.files.forEach((uri) => this.changed(uri))),
      vscode.workspace.onDidDeleteFiles((event) => event.files.forEach((uri) => this.changed(uri))),
      vscode.workspace.onDidRenameFiles((event) => event.files.forEach(({ oldUri, newUri }) => {
        this.changed(oldUri);
        this.changed(newUri);
      })),
      vscode.window.onDidChangeActiveTextEditor((editor) => this.schedule(editor?.document.uri)),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('cppHeadDoc')) {
          this.rebuildWatchers();
          this.refreshNow();
        }
      }),
    );
    this.rebuildWatchers();
  }

  changed(uri: vscode.Uri): void {
    if (!isTrackedUri(uri)) return;
    this.service.invalidate(uri);
    this.schedule(uri);
  }

  schedule(resource?: vscode.Uri): void {
    if (this.#timer) clearTimeout(this.#timer);
    const selected = resource ?? vscode.window.activeTextEditor?.document.uri;
    this.#timer = setTimeout(() => this.refreshNow(), getConfig(selected).debounceMs);
  }

  refreshNow(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.service.clear();
    this.codeLens.refresh();
    this.virtualDocuments.refresh();
    this.inlineComments.refresh();
  }

  rebuildWatchers(): void {
    this.#watchers.splice(0).forEach((watcher) => { watcher.dispose(); });
    const resources = vscode.workspace.workspaceFolders?.map((folder) => folder.uri)
      ?? [vscode.window.activeTextEditor?.document.uri];
    const extensions = new Set(resources.flatMap((resource) => {
      const config = getConfig(resource);
      return [...config.headerExtensions, ...config.sourceExtensions];
    }));
    for (const extension of extensions) {
      const watcher = vscode.workspace.createFileSystemWatcher(`**/*${extension}`);
      watcher.onDidCreate((uri) => this.changed(uri));
      watcher.onDidChange((uri) => this.changed(uri));
      watcher.onDidDelete((uri) => this.changed(uri));
      this.#watchers.push(watcher);
    }
  }

  dispose(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#watchers.splice(0).forEach((watcher) => { watcher.dispose(); });
    this.#subscriptions.splice(0).forEach((subscription) => { subscription.dispose(); });
  }
}
