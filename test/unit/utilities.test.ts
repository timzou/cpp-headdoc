import assert from 'node:assert/strict';
import { describe, it } from 'mocha';

import {
  clampNumber,
  containsFunctionBody,
  LruCache,
  normalizeExtensions,
  Semaphore,
} from '../../src/utilities.ts';

describe('LruCache', () => {
  it('evicts the least recently used entry and promotes reads', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.get('a'), 1);
    cache.set('c', 3);

    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('c'), 3);
    assert.deepEqual([...cache.keys()], ['a', 'c']);
  });

  it('supports replacement, resize, deletion, and clearing', () => {
    const cache = new LruCache<string, string>(3);
    cache.set('a', 'old');
    cache.set('b', 'two');
    cache.set('a', 'new');
    assert.equal(cache.get('a'), 'new');
    assert.deepEqual([...cache.keys()], ['b', 'a']);

    cache.set('c', 'three');
    cache.set('d', 'four');
    cache.resize(2);
    assert.equal(cache.size, 2);
    assert.deepEqual([...cache.keys()], ['c', 'd']);
    assert.equal(cache.delete('c'), true);
    assert.equal(cache.delete('missing'), false);
    cache.clear();
    assert.equal(cache.size, 0);
  });
});

describe('Semaphore', () => {
  it('keeps concurrent operations at or below the configured maximum', async () => {
    const semaphore = new Semaphore(2);
    const started = [false, false, false];
    const releases: Array<() => void> = [];
    let active = 0;
    let peak = 0;

    const task = (index: number): Promise<void> => semaphore.run(async () => {
      started[index] = true;
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => releases[index] = resolve);
      active -= 1;
    });

    const first = task(0);
    const second = task(1);
    const third = task(2);
    await Promise.resolve();
    assert.deepEqual(started, [true, true, false]);
    assert.equal(active, 2);

    releases[0]?.();
    await first;
    await Promise.resolve();
    assert.equal(started[2], true);
    assert.equal(active, 2);

    releases[1]?.();
    releases[2]?.();
    await Promise.all([second, third]);
    assert.equal(active, 0);
    assert.equal(peak, 2);
  });

  it('releases a slot when an operation rejects', async () => {
    const semaphore = new Semaphore(1);
    const failed = semaphore.run(() => Promise.reject(new Error('failure')));

    await assert.rejects(failed, /failure/);
    assert.equal(await semaphore.run(() => Promise.resolve(42)), 42);
  });
});

describe('Configuration values', () => {
  it('clamps finite numbers and restores invalid values', () => {
    assert.equal(clampNumber(12.6, 40, 5, 100), 13);
    assert.equal(clampNumber(-1, 40, 5, 100), 5);
    assert.equal(clampNumber(999, 40, 5, 100), 100);
    assert.equal(clampNumber(Number.NaN, 40, 5, 100), 40);
    assert.equal(clampNumber('12', 40, 5, 100), 40);
  });

  it('normalizes, deduplicates, and restores extension lists', () => {
    assert.deepEqual(normalizeExtensions(['HPP', '.h', ' .HPP ', '', 1], ['.h']), ['.hpp', '.h']);
    assert.deepEqual(normalizeExtensions([], ['.h', '.hpp']), ['.h', '.hpp']);
    assert.deepEqual(normalizeExtensions('cpp', ['.cpp']), ['.cpp']);
  });
});

describe('Function body detection', () => {
  it('distinguishes definitions from declarations and ignores braces in text', () => {
    assert.equal(containsFunctionBody('bool run(int value);'), false);
    assert.equal(containsFunctionBody('bool run(int value) { return value > 0; }'), true);
    assert.equal(containsFunctionBody('bool run(const char* value = "{");'), false);
    assert.equal(containsFunctionBody('bool run() /* { */ noexcept { return true; }'), true);
  });
});
