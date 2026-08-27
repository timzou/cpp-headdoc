import type {
  DocumentationException,
  DocumentationParameter,
  DocumentationReturnValue,
  ExtractedComment,
  ParameterDirection,
  ParsedDocumentation,
} from './model.ts';

const tagPattern = /^\s*[@\\](brief|param|tparam|return|returns|retval|note|warning|throws|exception|deprecated|see)\b(.*)$/i;

interface PendingTag {
  name: string;
  head: string;
  lines: string[];
}

export function cleanDoxygenComment(raw: string): string[] {
  const trimmed = raw.trim();
  if (/^\/\*[*!]([\s\S]*?)\*\/$/.test(trimmed)) {
    return trimmed
      .replace(/^\/\*[*!]\s?/, '')
      .replace(/\s*\*\/$/, '')
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\* ?/, '').trimEnd());
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.every((line) => /^\s*(?:\/\/\/|\/\/!)/.test(line))) {
    return lines.map((line) => line.replace(/^\s*(?:\/\/\/|\/\/!)\s?/, '').trimEnd());
  }
  return [];
}

function compact(lines: readonly string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function paragraphs(lines: readonly string[]): string[] {
  const result: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    const value = compact(current);
    if (value) result.push(value);
    current = [];
  };
  for (const line of lines) {
    const value = line.trim();
    if (!value) {
      flush();
    } else if (/^[-*+]\s+/.test(value)) {
      flush();
      result.push(value);
    } else {
      current.push(value);
    }
  }
  flush();
  return result;
}

function parseParameter(head: string, lines: readonly string[]): DocumentationParameter | undefined {
  const match = head.trim().match(/^\[(in|out|in\s*,\s*out)\]\s*([^\s]+)\s*(.*)$/i)
    ?? head.trim().match(/^([^\s]+)\s*(.*)$/);
  if (!match) return undefined;
  const hasDirection = match.length === 4;
  const direction = hasDirection ? match[1]?.replace(/\s+/g, '').toLowerCase() as ParameterDirection : undefined;
  const name = (hasDirection ? match[2] : match[1])?.trim() ?? '';
  const first = (hasDirection ? match[3] : match[2]) ?? '';
  if (!name) return undefined;
  const description = compact([first, ...lines]);
  return direction ? { name, direction, description } : { name, description };
}

export function parseDoxygen(raw: string): ParsedDocumentation | undefined {
  const lines = cleanDoxygenComment(raw);
  if (lines.length === 0) return undefined;

  const preamble: string[] = [];
  const parameters: DocumentationParameter[] = [];
  const templateParameters: DocumentationParameter[] = [];
  const returnValues: DocumentationReturnValue[] = [];
  const exceptions: DocumentationException[] = [];
  const notes: string[] = [];
  const warnings: string[] = [];
  const seeAlso: string[] = [];
  let brief = '';
  let returns: string | undefined;
  let deprecated: string | undefined;
  let pending: PendingTag | undefined;

  const flush = (): void => {
    if (!pending) return;
    const value = compact([pending.head, ...pending.lines]);
    switch (pending.name) {
      case 'brief': brief = value; break;
      case 'param': {
        const parameter = parseParameter(pending.head, pending.lines);
        if (parameter) parameters.push(parameter);
        break;
      }
      case 'tparam': {
        const parameter = parseParameter(pending.head, pending.lines);
        if (parameter) templateParameters.push(parameter);
        break;
      }
      case 'return':
      case 'returns': returns = value; break;
      case 'retval': {
        const match = pending.head.trim().match(/^([^\s]+)\s*(.*)$/);
        if (match?.[1]) returnValues.push({ value: match[1], description: compact([match[2] ?? '', ...pending.lines]) });
        break;
      }
      case 'throws':
      case 'exception': {
        const match = pending.head.trim().match(/^([^\s]+)\s*(.*)$/);
        if (match?.[1]) exceptions.push({ type: match[1], description: compact([match[2] ?? '', ...pending.lines]) });
        break;
      }
      case 'note': if (value) notes.push(value); break;
      case 'warning': if (value) warnings.push(value); break;
      case 'deprecated': deprecated = value; break;
      case 'see': if (value) seeAlso.push(value); break;
    }
    pending = undefined;
  };

  for (const line of lines) {
    const match = line.match(tagPattern);
    if (match?.[1]) {
      flush();
      pending = { name: match[1].toLowerCase(), head: (match[2] ?? '').trim(), lines: [] };
    } else if (pending?.name === 'brief' && !line.trim()) {
      flush();
      preamble.push('');
    } else if (pending) {
      pending.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  flush();

  const prose = paragraphs(preamble);
  if (!brief) brief = prose.shift() ?? '';
  const result: ParsedDocumentation = {
    rawText: lines.join('\n').trim(),
    brief,
    details: prose,
    parameters,
    templateParameters,
    returnValues,
    throws: exceptions,
    notes,
    warnings,
    seeAlso,
  };
  if (returns) result.returns = returns;
  if (deprecated) result.deprecated = deprecated;
  return result;
}

function hasBoundary(line: string): boolean {
  const stripped = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
  return /[;{}]/.test(stripped);
}

export function extractDoxygenBefore(
  text: string,
  declarationLine: number,
  maxLines: number,
): ExtractedComment | undefined {
  const lines = text.split(/\r?\n/);
  const floor = Math.max(0, declarationLine - maxLines);
  let index = Math.min(declarationLine - 1, lines.length - 1);

  while (index >= floor) {
    const line = lines[index] ?? '';
    const value = line.trim();
    if (!value) {
      index -= 1;
      continue;
    }
    if (/^(?:\/\/\/|\/\/!)/.test(value)) {
      const end = index;
      while (index - 1 >= floor && /^\s*(?:\/\/\/|\/\/!)/.test(lines[index - 1] ?? '')) index -= 1;
      return { raw: lines.slice(index, end + 1).join('\n'), startLine: index, endLine: end };
    }
    if (value.includes('*/')) {
      const end = index;
      while (index >= floor && !/\/\*[*!]/.test(lines[index] ?? '')) index -= 1;
      if (index >= floor) {
        return { raw: lines.slice(index, end + 1).join('\n'), startLine: index, endLine: end };
      }
      return undefined;
    }
    if (hasBoundary(value) || /^\/\//.test(value) || /^\/\*(?![*!])/.test(value)) return undefined;
    index -= 1;
  }
  return undefined;
}
