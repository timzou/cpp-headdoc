import type {
  InlineCommentTextSize,
  MarkdownDocumentInput,
  ParsedDocumentation,
  SummaryOptions,
} from './model.ts';

export function truncateGraphemes(value: string, maximum: number): string {
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)];
  if (segments.length <= maximum) return value;
  return `${segments.slice(0, Math.max(1, maximum - 1)).map((segment) => segment.segment).join('').trimEnd()}…`;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatCompactSummary(documentation: ParsedDocumentation, options: SummaryOptions): string {
  const parts: string[] = [];
  if (documentation.brief) parts.push(oneLine(documentation.brief));
  if (options.style !== 'brief' && options.showParameters) {
    for (const parameter of documentation.parameters) {
      parts.push(`${parameter.name}：${oneLine(parameter.description)}`);
    }
  }
  if (options.style === 'briefAndTags' && options.showReturnValue && documentation.returns) {
    parts.push(`返回：${oneLine(documentation.returns)}`);
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

export function formatInlineComment(input: MarkdownDocumentInput, size: InlineCommentTextSize): string {
  const doc = input.documentation;
  const lines: string[] = [`<code>${escapeHtml(input.signature || input.qualifiedName)}</code>`];
  const item = (label: string, value: string): string => `<code>${escapeHtml(label)}</code> — ${escapeHtml(value)}`;
  const section = (label: string, values: readonly string[]): void => {
    if (values.length > 0) lines.push(`<strong>${escapeHtml(label)}：</strong> ${values.join('　')}`);
  };

  if (doc.brief) lines.push(`<strong>${escapeHtml(doc.brief)}</strong>`);
  for (const detail of doc.details) lines.push(escapeHtml(detail));
  if (doc.parameters.length > 0) {
    section('参数', doc.parameters.map((parameter, index) => {
      const direction = parameter.direction ? ` [${escapeHtml(parameter.direction)}]` : '';
      return `${parameterMarker(index)} ${item(`${parameter.name}${direction}`, parameter.description)}`;
    }));
  }
  section('模板参数', doc.templateParameters.map((parameter, index) =>
    `${parameterMarker(index)} ${item(parameter.name, parameter.description)}`));
  if (doc.returns) section('返回', [escapeHtml(doc.returns)]);
  section('返回状态', doc.returnValues.map((entry) => item(entry.value, entry.description)));
  section('异常', doc.throws.map((entry) => item(entry.type, entry.description)));
  section('注意', doc.notes.map(escapeHtml));
  section('警告', doc.warnings.map(escapeHtml));
  if (doc.deprecated) section('弃用', [escapeHtml(doc.deprecated)]);
  section('参见', doc.seeAlso.map(escapeHtml));
  lines.push(`<small>声明：<code>${escapeHtml(input.declarationLabel)}</code></small>`);
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

export function formatMarkdown(input: MarkdownDocumentInput, includeMetadata = true): string {
  const doc = input.documentation;
  const output: string[] = [`### \`${escapeMarkdownInline(input.qualifiedName)}\``, ''];
  if (includeMetadata) {
    output.push(`**声明：** \`${escapeMarkdownInline(input.declarationLabel)}\``, '');
    if (input.signature) output.push('```cpp', input.signature.replace(/```/g, ''), '```', '');
  }
  if (doc.brief) output.push(escapeMarkdownInline(doc.brief), '');
  for (const detail of doc.details) output.push(renderParagraph(detail), '');
  output.push(...section('参数', doc.parameters.map((item) => {
    const direction = item.direction ? ` \`${item.direction}\`` : '';
    return `- \`${escapeMarkdownInline(item.name)}\`${direction}：${escapeMarkdownInline(item.description)}`;
  })));
  output.push(...section('模板参数', doc.templateParameters.map((item) =>
    `- \`${escapeMarkdownInline(item.name)}\`：${escapeMarkdownInline(item.description)}`)));
  if (doc.returns) output.push(...section('返回值', [escapeMarkdownInline(doc.returns)]));
  output.push(...section('返回状态', doc.returnValues.map((item) =>
    `- \`${escapeMarkdownInline(item.value)}\`：${escapeMarkdownInline(item.description)}`)));
  output.push(...section('异常', doc.throws.map((item) =>
    `- \`${escapeMarkdownInline(item.type)}\`：${escapeMarkdownInline(item.description)}`)));
  output.push(...section('注意', doc.notes.map((value) => `> ${escapeMarkdownInline(value)}`)));
  output.push(...section('警告', doc.warnings.map((value) => `> **警告：** ${escapeMarkdownInline(value)}`)));
  if (doc.deprecated) output.push(...section('弃用', [`> ${escapeMarkdownInline(doc.deprecated)}`]));
  output.push(...section('参见', doc.seeAlso.map((value) => `- ${escapeMarkdownInline(value)}`)));
  return `${output.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
