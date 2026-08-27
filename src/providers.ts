import * as vscode from 'vscode';
import { getConfig, isSourceUri } from './config.ts';
import type { DocumentationService, ResolvedDocumentation } from './documentationService.ts';
import { formatCompactSummary, formatMarkdown } from './formatting.ts';
import type { ImplementationSymbol } from './symbols.ts';

class HeaderDocCodeLens extends vscode.CodeLens {
  constructor(
    range: vscode.Range,
    readonly sourceUri: vscode.Uri,
    readonly sourceVersion: number,
    readonly symbol: ImplementationSymbol,
  ) {
    super(range);
  }
}

export class HeaderDocCodeLensProvider implements vscode.CodeLensProvider<HeaderDocCodeLens>, vscode.Disposable {
  readonly #changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.#changed.event;

  constructor(private readonly service: DocumentationService) {}

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<HeaderDocCodeLens[]> {
    const config = getConfig(document.uri);
    if (!config.enabled || !config.showCodeLens || !isSourceUri(document.uri, config)) return [];
    const symbols = await this.service.getSymbols(document, token);
    return symbols.map((symbol) => new HeaderDocCodeLens(
      new vscode.Range(symbol.selectionRange.start, symbol.selectionRange.start),
      document.uri,
      document.version,
      symbol,
    ));
  }

  async resolveCodeLens(codeLens: HeaderDocCodeLens, token: vscode.CancellationToken): Promise<HeaderDocCodeLens> {
    try {
      const document = await vscode.workspace.openTextDocument(codeLens.sourceUri);
      if (document.version !== codeLens.sourceVersion) return hideCodeLens(codeLens);
      const resolved = await this.service.resolve(document, codeLens.symbol, token);
      if (!resolved) return hideCodeLens(codeLens);
      const config = getConfig(document.uri);
      const summary = formatCompactSummary(resolved.documentation, {
        style: config.summaryStyle,
        maxLength: config.maxSummaryLength,
        showParameters: config.showParametersInCodeLens,
        showReturnValue: config.showReturnValueInCodeLens,
      });
      if (summary) {
        codeLens.command = {
          command: 'cppHeaderDocLens.showDocumentation',
          title: `$(chevron-right) $(book) ${summary}`,
          tooltip: 'Open full header documentation',
          arguments: [resolved],
        };
      }
      return summary ? codeLens : hideCodeLens(codeLens);
    } catch {
      return hideCodeLens(codeLens);
    }
  }

  refresh(): void { this.#changed.fire(); }
  dispose(): void { this.#changed.dispose(); }
}

function hideCodeLens(codeLens: HeaderDocCodeLens): HeaderDocCodeLens {
  codeLens.command = {
    command: 'cppHeaderDocLens.noop',
    title: '',
  };
  return codeLens;
}

export class HeaderDocHoverProvider implements vscode.HoverProvider {
  constructor(private readonly service: DocumentationService) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    const config = getConfig(document.uri);
    if (!config.enabled || !config.showHover || !isSourceUri(document.uri, config)) return undefined;
    const symbol = (await this.service.getSymbols(document, token))
      .find((candidate) => candidate.selectionRange.contains(position));
    if (!symbol) return undefined;
    const resolved = await this.service.resolve(document, symbol, token);
    return resolved ? hoverFor(resolved) : undefined;
  }
}

function hoverFor(resolved: ResolvedDocumentation): vscode.Hover {
  const value = new vscode.MarkdownString(formatMarkdown({
    qualifiedName: resolved.qualifiedName,
    signature: resolved.signature,
    declarationLabel: resolved.declarationLabel,
    documentation: resolved.documentation,
  }, false));
  value.isTrusted = false;
  value.supportHtml = false;
  value.supportThemeIcons = false;
  return new vscode.Hover(value);
}
