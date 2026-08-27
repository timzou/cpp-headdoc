export class LruCache<K, V> {
  readonly #values = new Map<K, V>();

  constructor(private maximum: number) {}

  get size(): number { return this.#values.size; }

  get(key: K): V | undefined {
    const value = this.#values.get(key);
    if (value === undefined) return undefined;
    this.#values.delete(key);
    this.#values.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.#values.delete(key);
    this.#values.set(key, value);
    while (this.#values.size > this.maximum) {
      const oldest = this.#values.keys().next().value;
      if (oldest === undefined) break;
      this.#values.delete(oldest);
    }
  }

  delete(key: K): boolean { return this.#values.delete(key); }
  clear(): void { this.#values.clear(); }
  keys(): IterableIterator<K> { return this.#values.keys(); }

  resize(maximum: number): void {
    this.maximum = maximum;
    while (this.#values.size > maximum) {
      const oldest = this.#values.keys().next().value;
      if (oldest === undefined) break;
      this.#values.delete(oldest);
    }
  }
}

export class Semaphore {
  #active = 0;
  readonly #waiting: Array<() => void> = [];

  constructor(private readonly maximum: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#active >= this.maximum) await new Promise<void>((resolve) => this.#waiting.push(resolve));
    this.#active += 1;
    try {
      return await operation();
    } finally {
      this.#active -= 1;
      this.#waiting.shift()?.();
    }
  }
}

export function clampNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.round(value)))
    : fallback;
}

export function normalizeExtensions(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => item.startsWith('.') ? item : `.${item}`))];
  return normalized.length > 0 ? normalized : [...fallback];
}

export function containsFunctionBody(text: string): boolean {
  let state: 'normal' | 'line' | 'block' | 'string' | 'char' = 'normal';
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < text.length; index += 1) {
    const value = text[index] ?? '';
    const next = text[index + 1] ?? '';
    if (state === 'line') {
      if (value === '\n') state = 'normal';
      continue;
    }
    if (state === 'block') {
      if (value === '*' && next === '/') { state = 'normal'; index += 1; }
      continue;
    }
    if (state === 'string' || state === 'char') {
      if (value === '\\') { index += 1; continue; }
      if ((state === 'string' && value === '"') || (state === 'char' && value === "'")) state = 'normal';
      continue;
    }
    if (value === '/' && next === '/') { state = 'line'; index += 1; continue; }
    if (value === '/' && next === '*') { state = 'block'; index += 1; continue; }
    if (value === '"') { state = 'string'; continue; }
    if (value === "'") { state = 'char'; continue; }
    if (value === '(') parentheses += 1;
    else if (value === ')') parentheses = Math.max(0, parentheses - 1);
    else if (value === '[') brackets += 1;
    else if (value === ']') brackets = Math.max(0, brackets - 1);
    else if (value === '{' && parentheses === 0 && brackets === 0) return true;
    else if (value === ';' && parentheses === 0 && brackets === 0) return false;
  }
  return false;
}
