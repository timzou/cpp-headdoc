import * as vscode from 'vscode';
import { fileExtension, getConfig, isSourceUri, type LogLevel } from './config.ts';
import { DocumentationService, type ResolvedDocumentation } from './documentationService.ts';
import { HeaderDocCodeLensProvider, HeaderDocHoverProvider } from './providers.ts';
import { RefreshService } from './refresh.ts';
import { normalizeDeclarations } from './symbols.ts';
import { DocumentationContentProvider } from './virtualDocument.ts';
import { InlineDocumentationController } from './inlineComments.ts';

const selector: vscode.DocumentSelector = [
  { scheme: '*', language: 'cpp' },
  { scheme: '*', language: 'c' },
];

class Logger implements vscode.Disposable {
  readonly #channel = vscode.window.createOutputChannel('C++ HeadDoc');

  write(level: 'error' | 'info' | 'debug', message: string, error?: unknown): void {
    const configured = getConfig(vscode.window.activeTextEditor?.document.uri).logLevel;
    if (!enabled(configured, level)) return;
    const detail = error instanceof Error ? `: ${error.message}${configured === 'debug' && error.stack ? `\n${error.stack}` : ''}` : '';
    this.#channel.appendLine(`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${detail}`);
  }

  show(): void { this.#channel.show(true); }
  append(value: string): void { this.#channel.appendLine(value); }
  dispose(): void { this.#channel.dispose(); }
}

function enabled(configured: LogLevel, level: 'error' | 'info' | 'debug'): boolean {
  const rank: Record<LogLevel, number> = { off: 0, error: 1, info: 2, debug: 3 };
  return rank[configured] >= rank[level];
}

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger();
  const service = new DocumentationService((level, message, error) => logger.write(level, message, error));
  const inlineComments = new InlineDocumentationController(service);
  const codeLens = new HeaderDocCodeLensProvider(service, (target) => inlineComments.isExpanded(target));
  const hover = new HeaderDocHoverProvider(service);
  const virtualDocuments = new DocumentationContentProvider(service);
  const refresh = new RefreshService(service, codeLens, virtualDocuments, inlineComments);

  context.subscriptions.push(
    logger,
    codeLens,
    inlineComments,
    inlineComments.onDidChange(() => codeLens.refresh()),
    virtualDocuments,
    refresh,
    vscode.languages.registerCodeLensProvider(selector, codeLens),
    vscode.languages.registerHoverProvider(selector, hover),
    vscode.workspace.registerTextDocumentContentProvider('cpp-head-doc', virtualDocuments),
    vscode.commands.registerCommand('cppHeadDoc.noop', () => undefined),
    vscode.commands.registerCommand('cppHeadDoc.refresh', () => {
      refresh.refreshNow();
      void vscode.window.showInformationMessage(vscode.l10n.t('C++ HeadDoc refreshed.'));
    }),
    vscode.commands.registerCommand('cppHeadDoc.toggle', async () => {
      try {
        const current = getConfig(vscode.window.activeTextEditor?.document.uri).enabled;
        await vscode.workspace.getConfiguration('cppHeadDoc').update('enabled', !current, vscode.ConfigurationTarget.Workspace);
        refresh.refreshNow();
        void vscode.window.showInformationMessage(current
          ? vscode.l10n.t('C++ HeadDoc disabled for this workspace.')
          : vscode.l10n.t('C++ HeadDoc enabled for this workspace.'));
      } catch (error) {
        logger.write('error', 'Unable to update the workspace setting.', error);
        void vscode.window.showErrorMessage(vscode.l10n.t('C++ HeadDoc could not update the workspace setting.'));
      }
    }),
    vscode.commands.registerCommand('cppHeadDoc.showDocumentation', async (argument?: unknown) => {
      try {
        const resolved = resolveArgument(argument, inlineComments) ?? await resolveAtCursor(service);
        if (resolved) inlineComments.show(resolved);
        else void vscode.window.showInformationMessage(vscode.l10n.t('No header documentation was found at the current function.'));
      } catch (error) {
        logger.write('error', 'Unable to show inline documentation.', error);
        void vscode.window.showErrorMessage(vscode.l10n.t('C++ HeadDoc could not show the inline documentation.'));
      }
    }),
    vscode.commands.registerCommand('cppHeadDoc.toggleInlineDocumentation', async (argument?: unknown) => {
      try {
        const resolved = resolveArgument(argument, inlineComments) ?? await resolveAtCursor(service);
        if (resolved) inlineComments.toggle(resolved);
        else void vscode.window.showInformationMessage(vscode.l10n.t('No header documentation was found at the current function.'));
      } catch (error) {
        logger.write('error', 'Unable to toggle inline documentation.', error);
        void vscode.window.showErrorMessage(vscode.l10n.t('C++ HeadDoc could not toggle the inline documentation.'));
      }
    }),
    vscode.commands.registerCommand('cppHeadDoc.openMarkdownPreview', async (argument?: unknown) => {
      try {
        const resolved = resolveArgument(argument, inlineComments) ?? await resolveAtCursor(service);
        if (resolved) await virtualDocuments.show(resolved);
        else void vscode.window.showInformationMessage(vscode.l10n.t('No header documentation was found at the current function.'));
      } catch (error) {
        logger.write('error', 'Unable to open the Markdown preview.', error);
        void vscode.window.showErrorMessage(vscode.l10n.t('C++ HeadDoc could not open the Markdown preview.'));
      }
    }),
    vscode.commands.registerCommand('cppHeadDoc.goToDeclaration', async (argument?: unknown) => {
      try {
        const inlineResolved = inlineComments.resolvedFor(argument);
        if (inlineResolved) {
          await virtualDocuments.goToDeclaration(inlineResolved);
          return;
        }
        if (argument instanceof vscode.Uri || isResolvedDocumentation(argument)) {
          await virtualDocuments.goToDeclaration(argument);
          return;
        }
        const resolved = await resolveAtCursor(service);
        if (resolved) await virtualDocuments.goToDeclaration(resolved);
        else await virtualDocuments.goToDeclaration();
      } catch (error) {
        logger.write('error', 'Unable to open the header declaration.', error);
        void vscode.window.showErrorMessage(vscode.l10n.t('C++ HeadDoc could not open the header declaration.'));
      }
    }),
    vscode.commands.registerCommand('cppHeadDoc.checkSetup', async () => {
      await checkSetup(service, logger);
    }),
  );
}

function resolveArgument(
  value: unknown,
  inlineComments: InlineDocumentationController,
): ResolvedDocumentation | undefined {
  return isResolvedDocumentation(value) ? value : inlineComments.resolvedFor(value);
}

async function resolveAtCursor(service: DocumentationService): Promise<ResolvedDocumentation | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isSourceUri(editor.document.uri)) return undefined;
  const source = new vscode.CancellationTokenSource();
  try {
    const symbols = await service.getSymbols(editor.document, source.token);
    const position = editor.selection.active;
    const symbol = symbols.find((candidate) => candidate.selectionRange.contains(position))
      ?? symbols.find((candidate) => candidate.range.contains(position));
    return symbol ? await service.resolve(editor.document, symbol, source.token) : undefined;
  } finally {
    source.dispose();
  }
}

async function checkSetup(service: DocumentationService, logger: Logger): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  logger.append(vscode.l10n.t('--- Setup check ---'));
  if (!editor) {
    logger.append(vscode.l10n.t('Active editor: unavailable'));
    logger.show();
    void vscode.window.showWarningMessage(vscode.l10n.t('Open a C or C++ source file before checking setup.'));
    return;
  }
  const document = editor.document;
  const config = getConfig(document.uri);
  const codeLensEnabled = vscode.workspace.getConfiguration('editor', document.uri).get('codeLens', true);
  logger.append(vscode.l10n.t('Language: {0}', document.languageId));
  logger.append(vscode.l10n.t('Extension enabled: {0}', String(config.enabled)));
  logger.append(vscode.l10n.t('Editor CodeLens enabled: {0}', String(codeLensEnabled)));
  logger.append(vscode.l10n.t('Source extension: {0} ({1})', fileExtension(document.uri),
    isSourceUri(document.uri, config) ? vscode.l10n.t('supported') : vscode.l10n.t('unsupported')));
  const source = new vscode.CancellationTokenSource();
  try {
    const symbols = await service.getSymbols(document, source.token);
    logger.append(vscode.l10n.t('Function definitions: {0}', String(symbols.length)));
    if (symbols[0]) {
      const declarations = normalizeDeclarations(await vscode.commands.executeCommand<
        vscode.Location | readonly vscode.Location[] | readonly vscode.LocationLink[] | undefined
      >('vscode.executeDeclarationProvider', document.uri, symbols[0].selectionRange.start));
      logger.append(vscode.l10n.t('Declaration candidates: {0}', String(declarations.length)));
    }
    logger.show();
    const ready = config.enabled && codeLensEnabled && isSourceUri(document.uri, config) && symbols.length > 0;
    void vscode.window.showInformationMessage(ready
      ? vscode.l10n.t('C++ HeadDoc setup is ready.')
      : vscode.l10n.t('C++ HeadDoc setup needs attention. See the output channel.'));
  } catch (error) {
    logger.write('error', 'Setup check failed', error);
    logger.show();
    void vscode.window.showWarningMessage(vscode.l10n.t('Setup check could not query the current C/C++ language service.'));
  } finally {
    source.dispose();
  }
}

function isResolvedDocumentation(value: unknown): value is ResolvedDocumentation {
  return typeof value === 'object' && value !== null
    && 'documentation' in value
    && 'declaration' in value
    && 'target' in value;
}

export function deactivate(): void {}
