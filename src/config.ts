import * as vscode from 'vscode';
import type { InlineCommentTextSize, SummaryStyle } from './model.ts';
import { clampNumber, normalizeExtensions } from './utilities.ts';

const defaultHeaders = ['.h', '.hpp', '.hh', '.hxx'];
const defaultSources = ['.c', '.cc', '.cpp', '.cxx'];
const summaryStyles: readonly SummaryStyle[] = ['brief', 'briefAndParams', 'briefAndTags'];
const inlineCommentTextSizes: readonly InlineCommentTextSize[] = ['small', 'medium', 'large'];
export type LogLevel = 'off' | 'error' | 'info' | 'debug';
const logLevels: readonly LogLevel[] = ['off', 'error', 'info', 'debug'];

export interface ExtensionConfig {
  enabled: boolean;
  showCodeLens: boolean;
  showHover: boolean;
  showInlineComments: boolean;
  inlineCommentsExpanded: boolean;
  inlineCommentTextSize: InlineCommentTextSize;
  summaryStyle: SummaryStyle;
  maxSummaryLength: number;
  showParametersInCodeLens: boolean;
  showReturnValueInCodeLens: boolean;
  headerExtensions: string[];
  sourceExtensions: string[];
  maxCommentSearchLines: number;
  debounceMs: number;
  maxCacheEntries: number;
  logLevel: LogLevel;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

export function getConfig(resource?: vscode.Uri): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('cppHeadDoc', resource);
  return {
    enabled: config.get('enabled', true),
    showCodeLens: config.get('showCodeLens', true),
    showHover: config.get('showHover', true),
    showInlineComments: config.get('showInlineComments', true),
    inlineCommentsExpanded: config.get('inlineCommentsExpanded', false),
    inlineCommentTextSize: enumValue(config.get('inlineCommentTextSize'), inlineCommentTextSizes, 'medium'),
    summaryStyle: enumValue(config.get('summaryStyle'), summaryStyles, 'briefAndTags'),
    maxSummaryLength: clampNumber(config.get('maxSummaryLength'), 180, 40, 500),
    showParametersInCodeLens: config.get('showParametersInCodeLens', true),
    showReturnValueInCodeLens: config.get('showReturnValueInCodeLens', true),
    headerExtensions: normalizeExtensions(config.get('headerExtensions'), defaultHeaders),
    sourceExtensions: normalizeExtensions(config.get('sourceExtensions'), defaultSources),
    maxCommentSearchLines: clampNumber(config.get('maxCommentSearchLines'), 40, 5, 500),
    debounceMs: clampNumber(config.get('debounceMs'), 300, 50, 5000),
    maxCacheEntries: clampNumber(config.get('maxCacheEntries'), 500, 20, 5000),
    logLevel: enumValue(config.get('logLevel'), logLevels, 'error'),
  };
}

export function fileExtension(uri: vscode.Uri): string {
  const path = uri.path.toLowerCase();
  const slash = path.lastIndexOf('/');
  const dot = path.lastIndexOf('.');
  return dot > slash ? path.slice(dot) : '';
}

export function isSourceUri(uri: vscode.Uri, config = getConfig(uri)): boolean {
  return config.sourceExtensions.includes(fileExtension(uri));
}

export function isTrackedUri(uri: vscode.Uri, config = getConfig(uri)): boolean {
  const extension = fileExtension(uri);
  return config.sourceExtensions.includes(extension) || config.headerExtensions.includes(extension);
}
