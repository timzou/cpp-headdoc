import assert from 'node:assert/strict';
import { describe, it } from 'mocha';

import { parseDoxygen } from '../../src/doxygen.ts';
import {
  escapeMarkdownInline,
  formatCompactSummary,
  formatMarkdown,
  truncateGraphemes,
} from '../../src/formatting.ts';

describe('Formatting', () => {
  it('truncates by Unicode grapheme clusters and keeps the ellipsis inside the limit', () => {
    assert.equal(truncateGraphemes('甲👩‍💻乙', 3), '甲👩‍💻乙');
    assert.equal(truncateGraphemes('甲👩‍💻乙', 2), '甲…');
    assert.equal(truncateGraphemes('👩‍💻', 1), '👩‍💻');
  });

  it('supports brief, parameter, and tag summary styles with independent switches', () => {
    const documentation = parseDoxygen(`/**
 * @brief 启动采集
 * @param rate 采样率
 * @return 是否成功
 */`);

    assert.ok(documentation);
    assert.equal(formatCompactSummary(documentation, {
      style: 'brief', maxLength: 100, showParameters: true, showReturnValue: true,
    }), '启动采集');
    assert.equal(formatCompactSummary(documentation, {
      style: 'briefAndParams', maxLength: 100, showParameters: true, showReturnValue: true,
    }), '启动采集 · rate：采样率');
    assert.equal(formatCompactSummary(documentation, {
      style: 'briefAndTags', maxLength: 100, showParameters: true, showReturnValue: true,
    }), '启动采集 · rate：采样率 · 返回：是否成功');
    assert.equal(formatCompactSummary(documentation, {
      style: 'briefAndTags', maxLength: 100, showParameters: false, showReturnValue: true,
    }), '启动采集 · 返回：是否成功');
    assert.equal(formatCompactSummary(documentation, {
      style: 'briefAndTags', maxLength: 100, showParameters: true, showReturnValue: false,
    }), '启动采集 · rate：采样率');
  });

  it('escapes Markdown punctuation while preserving inline code and removing controls', () => {
    const escaped = escapeMarkdownInline('a [b] *c* _d_ <e> #f \\g `x*y` \u0000');

    assert.ok(escaped.includes('\\[b\\]'));
    assert.ok(escaped.includes('\\*c\\*'));
    assert.ok(escaped.includes('\\_d\\_'));
    assert.ok(escaped.includes('\\<e\\>'));
    assert.ok(escaped.includes('\\#f'));
    assert.ok(escaped.includes('`x*y`'));
    assert.equal(escaped.includes('\u0000'), false);
  });

  it('renders safe Markdown sections, normalized lists, directions, and all documentation tags', () => {
    const documentation = parseDoxygen(`/**
 * @brief 带有 [标记] 与 \`inline *code*\`
 *
 * * 列表项 [需要转义]
 * @param [out] result 结果 [对象]
 * @tparam T 类型参数
 * @return 返回说明
 * @retval ok 成功
 * @throws Error 失败
 * @note 注意 [内容]
 * @warning 警告 *内容*
 * @deprecated 使用新接口
 * @see otherFunction()
 */`);

    assert.ok(documentation);
    const markdown = formatMarkdown({
      qualifiedName: 'Device::run',
      signature: 'bool run() {\n  ```\n}',
      declarationLabel: 'bool run()',
      documentation,
    });

    assert.match(markdown, /^### `Device::run`/);
    assert.match(markdown, /\*\*声明：\*\* `bool run\\\(\\\)`/);
    assert.match(markdown, /```cpp\nbool run\(\) \{\n\x20{2}\n\}/);
    assert.ok(markdown.includes('带有 \\[标记\\] 与 `inline *code*`'));
    assert.ok(markdown.includes('- 列表项 \\[需要转义\\]'));
    assert.doesNotMatch(markdown, /\* 列表项/);
    assert.ok(markdown.includes('- `result` `out`：结果 \\[对象\\]'));
    assert.match(markdown, /#### 模板参数[\s\S]*- `T`：类型参数/);
    assert.match(markdown, /#### 返回值[\s\S]*返回说明/);
    assert.match(markdown, /#### 返回状态[\s\S]*- `ok`：成功/);
    assert.match(markdown, /#### 异常[\s\S]*- `Error`：失败/);
    assert.ok(markdown.includes('#### 注意\n\n> 注意 \\[内容\\]'));
    assert.ok(markdown.includes('#### 警告\n\n> **警告：** 警告 \\*内容\\*'));
    assert.match(markdown, /#### 弃用[\s\S]*> 使用新接口/);
    assert.match(markdown, /#### 参见[\s\S]*- otherFunction\\\(\\\)/);
    assert.equal(markdown.includes('```\n}'), false);
  });

  it('can omit metadata from the Markdown document', () => {
    const documentation = parseDoxygen('/// @brief 只有摘要');
    assert.ok(documentation);

    const markdown = formatMarkdown({
      qualifiedName: 'ns::f',
      signature: 'void f();',
      declarationLabel: 'void f()',
      documentation,
    }, false);

    assert.equal(markdown, '### `ns::f`\n\n只有摘要\n');
  });
});
