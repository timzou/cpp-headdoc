import assert from 'node:assert/strict';
import Mocha from 'mocha';
import * as vscode from 'vscode';
import { DocumentationService } from '../../src/documentationService.ts';

const extensionId = 'TimZou.cpp-headdoc';
const fixtureRoot = vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '');
const sourceUri = vscode.Uri.joinPath(fixtureRoot, 'src', 'DeviceController.cpp');
const emptyUri = vscode.Uri.joinPath(fixtureRoot, 'src', 'Empty.cpp');
const headerUri = vscode.Uri.joinPath(fixtureRoot, 'include', 'DeviceController.hpp');
const virtualSourceUri = vscode.Uri.parse('doclens-test:/src/Remote.cpp');
const virtualHeaderUri = vscode.Uri.parse('doclens-test:/include/Remote.hpp');
const virtualSource = 'bool Remote::read() const\n{\n    return true;\n}\n';
const virtualHeader = '/** @brief 远程工作区文档 */\nbool read() const;\n';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 20_000 });
  mocha.suite.emit('pre-require', globalThis, 'integration', mocha);
  defineTests();
  await new Promise<void>((resolve, reject) => {
    mocha.run((failures) => failures === 0 ? resolve() : reject(new Error(`${failures} integration test(s) failed.`)));
  });
}

function defineTests(): void {
  suite('C++ HeadDoc integration', () => {
    const disposables: vscode.Disposable[] = [];

    suiteSetup(async () => {
      disposables.push(
        vscode.workspace.registerTextDocumentContentProvider('doclens-test', {
          provideTextDocumentContent: (uri) => uri.path.endsWith('.hpp') ? virtualHeader : virtualSource,
        }),
        vscode.languages.registerDocumentSymbolProvider([
          { language: 'cpp', scheme: 'file' },
          { language: 'cpp', scheme: 'doclens-test' },
        ], {
          provideDocumentSymbols: (document) => symbolsFor(document),
        }),
        vscode.languages.registerDeclarationProvider([
          { language: 'cpp', scheme: 'file' },
          { language: 'cpp', scheme: 'doclens-test' },
        ], {
          provideDeclaration: async (document, position) => await declarationsFor(document, position),
        }),
      );
      const extension = vscode.extensions.getExtension(extensionId);
      assert.ok(extension, `Extension ${extensionId} was not found.`);
      await extension.activate();
    });

    suiteTeardown(() => disposables.forEach((item) => { item.dispose(); }));

    test('activates in the Extension Host', () => {
      assert.equal(vscode.extensions.getExtension(extensionId)?.isActive, true);
    });

    test('resolves a compact collapsed CodeLens summary from the header', async () => {
      const lenses = await codeLenses(sourceUri);
      const lens = lenses.find((item) => item.command?.title.includes('启动 FPGA 数据采集'));
      assert.ok(lens?.command);
      assert.match(lens.command.title, /^\$\(chevron-right\) \$\(book\)/);
      assert.equal(lens.command.command, 'cppHeadDoc.toggleInlineDocumentation');
      assert.match(lens.command.title, /sampleRate/);
      assert.match(lens.command.title, /(返回值|Returns)/);
    });

    test('provides full safe hover documentation', async () => {
      const document = await openCpp(sourceUri);
      const position = document.positionAt(document.getText().indexOf('startAcquisition'));
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', sourceUri, position);
      const markdown = hovers.flatMap((hover) => hover.contents).map((item) => typeof item === 'string' ? item : item.value).join('\n');
      assert.match(markdown, /采样频率/);
      assert.match(markdown, /启动成功返回/);
    });

    test('opens the optional readonly Markdown preview', async () => {
      const lens = (await codeLenses(sourceUri)).find((item) => item.command?.title.includes('启动 FPGA'));
      assert.ok(lens?.command);
      await vscode.commands.executeCommand('cppHeadDoc.openMarkdownPreview', lens.command.arguments?.[0]);
      const document = await waitFor(() => vscode.workspace.textDocuments.find((item) => item.uri.scheme === 'cpp-head-doc'));
      assert.ok(document);
      assert.match(document.getText(), /DeviceController::startAcquisition/);
      assert.match(document.getText(), /DeviceController\.hpp/);
    });

    test('jumps to the selected header declaration', async () => {
      const lens = (await codeLenses(sourceUri)).find((item) => item.command?.title.includes('启动 FPGA'));
      const resolved: unknown = lens?.command?.arguments?.[0];
      assert.ok(resolved);
      await vscode.commands.executeCommand('cppHeadDoc.goToDeclaration', resolved);
      assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), headerUri.toString());
      assert.match(vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection) ?? '', /startAcquisition/);
    });

    test('refreshes summaries after an in-memory header edit', async () => {
      const header = await openCpp(headerUri);
      const original = '启动 FPGA 数据采集';
      const updated = '刷新后的采集摘要';
      const range = rangeOfText(header, original);
      assert.ok(range);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(headerUri, range, updated);
      assert.equal(await vscode.workspace.applyEdit(edit), true);
      await delay(500);
      assert.ok((await codeLenses(sourceUri)).some((item) => item.command?.title.includes(updated)));
      const restore = new vscode.WorkspaceEdit();
      const updatedRange = rangeOfText(header, updated);
      assert.ok(updatedRange);
      restore.replace(headerUri, updatedRange, original);
      assert.equal(await vscode.workspace.applyEdit(restore), true);
    });

    test('hides the CodeLens for an undocumented function', async () => {
      const lenses = await codeLenses(sourceUri);
      const undocumented = lenses.find((item) => item.range.start.line === 12);
      assert.equal(undocumented?.command?.command, 'cppHeadDoc.noop');
      assert.equal(undocumented?.command?.title, '');
    });

    test('selects the header candidate from multiple declarations', async () => {
      const lenses = await codeLenses(sourceUri);
      assert.ok(lenses.some((item) => item.command?.title.includes('停止数据采集')));
    });

    test('returns no CodeLens when providers return an empty symbol list', async () => {
      assert.deepEqual(await codeLenses(emptyUri), []);
    });

    test('resolves documentation through a non-file URI scheme', async () => {
      const document = await vscode.workspace.openTextDocument(virtualSourceUri);
      await vscode.languages.setTextDocumentLanguage(document, 'cpp');
      const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', virtualSourceUri, 10) ?? [];
      assert.ok(lenses.some((item) => item.command?.title.includes('远程工作区文档')));
    });

    test('honors a cancelled language-service request', async () => {
      const document = await openCpp(sourceUri);
      const service = new DocumentationService(() => undefined);
      const source = new vscode.CancellationTokenSource();
      source.cancel();
      assert.deepEqual(await service.getSymbols(document, source.token), []);
      source.dispose();
    });

    test('check setup command completes with the mock language service', async () => {
      await openCpp(sourceUri);
      await vscode.commands.executeCommand('cppHeadDoc.checkSetup');
    });
  });
}

async function openCpp(uri: vscode.Uri): Promise<vscode.TextDocument> {
  let document = await vscode.workspace.openTextDocument(uri);
  if (document.languageId !== 'cpp') document = await vscode.languages.setTextDocumentLanguage(document, 'cpp');
  await vscode.window.showTextDocument(document);
  return document;
}

async function codeLenses(uri: vscode.Uri): Promise<vscode.CodeLens[]> {
  await openCpp(uri);
  return await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', uri, 50) ?? [];
}

function symbolsFor(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  if (document.uri.toString() === virtualSourceUri.toString()) {
    const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    const offset = document.getText().indexOf('read');
    const selection = new vscode.Range(document.positionAt(offset), document.positionAt(offset + 4));
    return [new vscode.DocumentSymbol('Remote::read', '', vscode.SymbolKind.Method, range, selection)];
  }
  if (document.uri.toString() !== sourceUri.toString()) return [];
  return [
    createSymbol(document, 'DeviceController::startAcquisition', 'bool DeviceController::startAcquisition', 'bool DeviceController::stopAcquisition'),
    createSymbol(document, 'DeviceController::stopAcquisition', 'bool DeviceController::stopAcquisition', 'bool DeviceController::undocumented'),
    createSymbol(document, 'DeviceController::undocumented', 'bool DeviceController::undocumented', undefined),
  ];
}

function createSymbol(document: vscode.TextDocument, name: string, start: string, next: string | undefined): vscode.DocumentSymbol {
  const text = document.getText();
  const startOffset = text.indexOf(start);
  const endOffset = next ? text.indexOf(next) : text.length;
  const nameOffset = text.indexOf(name.split('::').at(-1) ?? name, startOffset);
  const range = new vscode.Range(document.positionAt(startOffset), document.positionAt(Math.max(startOffset, endOffset - 1)));
  const selection = new vscode.Range(document.positionAt(nameOffset), document.positionAt(nameOffset + (name.split('::').at(-1)?.length ?? name.length)));
  return new vscode.DocumentSymbol(name, '', vscode.SymbolKind.Method, range, selection);
}

async function declarationsFor(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[]> {
  if (document.uri.toString() === virtualSourceUri.toString()) {
    const header = await vscode.workspace.openTextDocument(virtualHeaderUri);
    const range = rangeOfText(header, 'read');
    assert.ok(range);
    return [new vscode.Location(virtualHeaderUri, range)];
  }
  if (document.uri.toString() !== sourceUri.toString()) return [];
  const sourceLine = document.lineAt(position.line).text;
  const name = ['startAcquisition', 'stopAcquisition', 'undocumented'].find((candidate) => sourceLine.includes(candidate));
  if (!name) return [];
  const header = await vscode.workspace.openTextDocument(headerUri);
  const range = rangeOfText(header, name);
  assert.ok(range);
  return [new vscode.Location(sourceUri, new vscode.Range(position, position)), new vscode.Location(headerUri, range)];
}

function rangeOfText(document: vscode.TextDocument, value: string): vscode.Range | undefined {
  const offset = document.getText().indexOf(value);
  return offset < 0 ? undefined : new vscode.Range(document.positionAt(offset), document.positionAt(offset + value.length));
}

async function waitFor<T>(read: () => T | undefined, timeout = 5000): Promise<T | undefined> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await delay(50);
  }
  return undefined;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
