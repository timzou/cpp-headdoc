import * as vscode from 'vscode';
import type { FormattingLabels } from './formatting.ts';

export function localizedFormattingLabels(): FormattingLabels {
  return {
    parameters: vscode.l10n.t('Parameters'),
    templateParameters: vscode.l10n.t('Template parameters'),
    returns: vscode.l10n.t('Returns'),
    returnValues: vscode.l10n.t('Return values'),
    throws: vscode.l10n.t('Exceptions'),
    notes: vscode.l10n.t('Notes'),
    warnings: vscode.l10n.t('Warnings'),
    warningPrefix: vscode.l10n.t('Warning'),
    deprecated: vscode.l10n.t('Deprecated'),
    seeAlso: vscode.l10n.t('See also'),
    declaration: vscode.l10n.t('Declaration'),
  };
}
