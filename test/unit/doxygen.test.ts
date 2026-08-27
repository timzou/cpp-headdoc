import assert from 'node:assert/strict';
import { describe, it } from 'mocha';

import {
  cleanDoxygenComment,
  extractDoxygenBefore,
  parseDoxygen,
} from '../../src/doxygen.ts';

describe('Doxygen cleaning and parsing', () => {
  it('accepts block comments and both line-comment styles', () => {
    const block = parseDoxygen('/**\n * @brief Block brief\n * Details.\n */');
    const slash = parseDoxygen('/// @brief Slash brief\n/// More details.');
    const bang = parseDoxygen('//! @brief Bang brief\n//! More details.');

    assert.equal(block?.brief, 'Block brief Details.');
    assert.deepEqual(block?.details, []);
    assert.equal(slash?.brief, 'Slash brief More details.');
    assert.deepEqual(slash?.details, []);
    assert.equal(bang?.brief, 'Bang brief More details.');
    assert.deepEqual(bang?.details, []);
  });

  it('uses the first prose paragraph as the brief when @brief is absent', () => {
    const documentation = parseDoxygen('/**\n * 第一段摘要。\n * 仍属于摘要。\n *\n * 第二段详情。\n * - 一个列表项\n */');

    assert.ok(documentation);
    assert.equal(documentation.brief, '第一段摘要。 仍属于摘要。');
    assert.deepEqual(documentation.details, ['第二段详情。', '- 一个列表项']);
  });

  it('preserves Chinese text and parses multiline parameters, directions, and template parameters', () => {
    const documentation = parseDoxygen(`/**
 * @brief 配置采集通道
 * @param [in,out] buffer 输入并输出的缓冲区
 *   第二行说明也属于参数。
 * @param count 样本数量
 * @tparam Sample 样本类型
 */`);

    assert.ok(documentation);
    assert.deepEqual(documentation.parameters, [
      { name: 'buffer', direction: 'in,out', description: '输入并输出的缓冲区 第二行说明也属于参数。' },
      { name: 'count', description: '样本数量' },
    ]);
    assert.deepEqual(documentation.templateParameters, [
      { name: 'Sample', description: '样本类型' },
    ]);
  });

  it('parses return values and the remaining supported tags', () => {
    const documentation = parseDoxygen(`/**
 * @brief 读取设备状态
 * @returns 返回整体状态。
 * @retval ready 设备已就绪
 * @throws std::runtime_error 设备不可用
 * @note 调用前应完成初始化。
 * @warning 此操作可能阻塞。
 * @deprecated 请改用 readStatusV2。
 * @see readStatusV2
 */`);

    assert.ok(documentation);
    assert.equal(documentation.returns, '返回整体状态。');
    assert.deepEqual(documentation.returnValues, [{ value: 'ready', description: '设备已就绪' }]);
    assert.deepEqual(documentation.throws, [{ type: 'std::runtime_error', description: '设备不可用' }]);
    assert.deepEqual(documentation.notes, ['调用前应完成初始化。']);
    assert.deepEqual(documentation.warnings, ['此操作可能阻塞。']);
    assert.equal(documentation.deprecated, '请改用 readStatusV2。');
    assert.deepEqual(documentation.seeAlso, ['readStatusV2']);
  });

  it('supports exception as an alias for throws', () => {
    const documentation = parseDoxygen('/// @exception IOError 读取失败');

    assert.deepEqual(documentation?.throws, [{ type: 'IOError', description: '读取失败' }]);
  });

  it('rejects ordinary comments as documentation', () => {
    assert.deepEqual(cleanDoxygenComment('/* ordinary comment */'), []);
    assert.equal(parseDoxygen('/* ordinary comment */'), undefined);
    assert.equal(parseDoxygen('// ordinary comment'), undefined);
    assert.equal(parseDoxygen('/// documentation\n// ordinary comment'), undefined);
  });
});

describe('Doxygen extraction before declarations', () => {
  it('extracts adjacent block and mixed line comments with zero-based line bounds', () => {
    const text = [
      '/** Block documentation. */',
      '',
      'void first();',
      '',
      '/// Line documentation.',
      '//! Additional line documentation.',
      'void second();',
    ].join('\n');

    assert.deepEqual(extractDoxygenBefore(text, 2, 40), {
      raw: '/** Block documentation. */',
      startLine: 0,
      endLine: 0,
    });
    assert.deepEqual(extractDoxygenBefore(text, 6, 40), {
      raw: '/// Line documentation.\n//! Additional line documentation.',
      startLine: 4,
      endLine: 5,
    });
  });

  it('does not cross ordinary comments or code boundaries', () => {
    assert.equal(extractDoxygenBefore('/// stale docs\n// ordinary comment\nvoid f();', 2, 40), undefined);
    assert.equal(extractDoxygenBefore('/// stale docs\nif (ready) {\nvoid f();', 2, 40), undefined);
    assert.equal(extractDoxygenBefore('/* ordinary */\nvoid f();', 1, 40), undefined);
  });

  it('honors the maximum search window and requires a complete block comment', () => {
    const lineText = '/// too far away\n\nvoid f();';
    assert.equal(extractDoxygenBefore(lineText, 2, 1), undefined);
    assert.equal(extractDoxygenBefore(lineText, 2, 2)?.raw, '/// too far away');

    const incomplete = '/**\n * docs\nvoid f();';
    assert.equal(extractDoxygenBefore(incomplete, 2, 40), undefined);
  });
});
