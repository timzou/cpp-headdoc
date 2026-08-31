import type {
  InlineCommentTextSize,
  MarkdownDocumentInput,
  ParsedDocumentation,
  SummaryOptions,
} from './model.ts';

export interface FormattingLabels {
  parameters: string;
  templateParameters: string;
  returns: string;
  returnValues: string;
  throws: string;
  notes: string;
  warnings: string;
  warningPrefix: string;
  deprecated: string;
  seeAlso: string;
  declaration: string;
}

export const englishFormattingLabels: FormattingLabels = {
  parameters: 'Parameters',
  templateParameters: 'Template parameters',
  returns: 'Returns',
  returnValues: 'Return values',
  throws: 'Exceptions',
  notes: 'Notes',
  warnings: 'Warnings',
  warningPrefix: 'Warning',
  deprecated: 'Deprecated',
  seeAlso: 'See also',
  declaration: 'Declaration',
};

export function truncateGraphemes(value: string, maximum: number): string {
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)];
  if (segments.length <= maximum) return value;
  return `${segments.slice(0, Math.max(1, maximum - 1)).map((segment) => segment.segment).join('').trimEnd()}…`;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatCompactSummary(
  documentation: ParsedDocumentation,
  options: SummaryOptions,
  labels: FormattingLabels = englishFormattingLabels,
): string {
  const parts: string[] = [];
  if (documentation.brief) parts.push(oneLine(documentation.brief));
  if (options.style !== 'brief' && options.showParameters) {
    for (const parameter of documentation.parameters) {
      parts.push(`${parameter.name}：${oneLine(parameter.description)}`);
    }
  }
  if (options.style === 'briefAndTags' && options.showReturnValue && documentation.returns) {
    parts.push(`${labels.returns}: ${oneLine(documentation.returns)}`);
  }
  return truncateGraphemes(parts.join(' · '), options.maxLength);
}

export function escapeMarkdownInline(value: string): string {
  const cleaned = [...value].filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
  }).join('');
  return cleaned.split(/(`[^`\r\n]+`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) return part;
    return part.replace(/[\\[\]()*_<>#`]/g, '\\$&');
  }).join('');
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function formatInlineComment(
  input: MarkdownDocumentInput,
  size: InlineCommentTextSize,
  includeSignature = true,
  labels: FormattingLabels = englishFormattingLabels,
): string {
  const doc = input.documentation;
  const lines: string[] = includeSignature ? [`<code>${escapeHtml(input.signature || input.qualifiedName)}</code>`] : [];
  const item = (label: string, value: string): string => `<code>${escapeHtml(label)}</code> — ${escapeHtml(value)}`;
  const section = (label: string, values: readonly string[]): void => {
    if (values.length > 0) lines.push(`<strong>${escapeHtml(label)}：</strong> ${values.join('　')}`);
  };

  if (doc.brief) lines.push(`<strong>${escapeHtml(doc.brief)}</strong>`);
  for (const detail of doc.details) lines.push(escapeHtml(detail));
  if (doc.parameters.length > 0) {
    section(labels.parameters, doc.parameters.map((parameter, index) => {
      const direction = parameter.direction ? ` [${escapeHtml(parameter.direction)}]` : '';
      return `${parameterMarker(index)} ${item(`${parameter.name}${direction}`, parameter.description)}`;
    }));
  }
  section(labels.templateParameters, doc.templateParameters.map((parameter, index) =>
    `${parameterMarker(index)} ${item(parameter.name, parameter.description)}`));
  if (doc.returns) section(labels.returns, [escapeHtml(doc.returns)]);
  section(labels.returnValues, doc.returnValues.map((entry) => item(entry.value, entry.description)));
  section(labels.throws, doc.throws.map((entry) => item(entry.type, entry.description)));
  section(labels.notes, doc.notes.map(escapeHtml));
  section(labels.warnings, doc.warnings.map(escapeHtml));
  if (doc.deprecated) section(labels.deprecated, [escapeHtml(doc.deprecated)]);
  section(labels.seeAlso, doc.seeAlso.map(escapeHtml));
  lines.push(`<small>${escapeHtml(labels.declaration)}: <code>${escapeHtml(input.declarationLabel)}</code></small>`);
  const content = lines.join('<br>');
  if (size === 'small') return `<p><small>${content}</small></p>`;
  if (size === 'large') return `<h4>${content}</h4>`;
  return `<p>${content}</p>`;
}

function parameterMarker(index: number): string {
  const markers = ['🔵', '🟢', '🟠', '🟣', '🟡', '🔴'];
  return markers[index % markers.length] ?? '•';
}

function renderParagraph(value: string): string {
  const list = value.match(/^[-*+]\s+(.*)$/);
  return list ? `- ${escapeMarkdownInline(list[1] ?? '')}` : escapeMarkdownInline(value);
}

function section(title: string, values: readonly string[]): string[] {
  return values.length > 0 ? [`#### ${title}`, '', ...values, ''] : [];
}

export function formatMarkdown(
  input: MarkdownDocumentInput,
  includeMetadata = true,
  labels: FormattingLabels = englishFormattingLabels,
): string {
  const doc = input.documentation;
  const output: string[] = [`### \`${escapeMarkdownInline(input.qualifiedName)}\``, ''];
  if (includeMetadata) {
    output.push(`**${escapeMarkdownInline(labels.declaration)}:** \`${escapeMarkdownInline(input.declarationLabel)}\``, '');
    if (input.signature) output.push('```cpp', input.signature.replace(/```/g, ''), '```', '');
  }
  if (doc.brief) output.push(escapeMarkdownInline(doc.brief), '');
  for (const detail of doc.details) output.push(renderParagraph(detail), '');
  output.push(...section(labels.parameters, doc.parameters.map((item) => {
    const direction = item.direction ? ` \`${item.direction}\`` : '';
    return `- \`${escapeMarkdownInline(item.name)}\`${direction}：${escapeMarkdownInline(item.description)}`;
  })));
  output.push(...section(labels.templateParameters, doc.templateParameters.map((item) =>
    `- \`${escapeMarkdownInline(item.name)}\`：${escapeMarkdownInline(item.description)}`)));
  if (doc.returns) output.push(...section(labels.returns, [escapeMarkdownInline(doc.returns)]));
  output.push(...section(labels.returnValues, doc.returnValues.map((item) =>
    `- \`${escapeMarkdownInline(item.value)}\`：${escapeMarkdownInline(item.description)}`)));
  output.push(...section(labels.throws, doc.throws.map((item) =>
    `- \`${escapeMarkdownInline(item.type)}\`：${escapeMarkdownInline(item.description)}`)));
  output.push(...section(labels.notes, doc.notes.map((value) => `> ${escapeMarkdownInline(value)}`)));
  output.push(...section(labels.warnings, doc.warnings.map((value) => `> **${escapeMarkdownInline(labels.warningPrefix)}:** ${escapeMarkdownInline(value)}`)));
  if (doc.deprecated) output.push(...section(labels.deprecated, [`> ${escapeMarkdownInline(doc.deprecated)}`]));
  output.push(...section(labels.seeAlso, doc.seeAlso.map((value) => `- ${escapeMarkdownInline(value)}`)));
  return `${output.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
