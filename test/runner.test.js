import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { sanitizeBaseName } from '../src/shared/fs.js';

// 复制 runner.js 中的纯函数逻辑来测试输入规范和命名规则
function normalizeInput(input) {
  if (!Array.isArray(input)) throw new Error('Input JSON must be an array');

  return input.map((item, idx) => {
    if (typeof item === 'string') {
      // 支持简单字符串："文本内容"
      // 也支持带文件名前缀："filename::文本内容"
      const raw = String(item);
      const marker = '::';
      if (raw.includes(marker)) {
        const [maybeId, ...rest] = raw.split(marker);
        const idPart = maybeId.trim();
        const textPart = rest.join(marker).trim();
        if (!textPart) throw new Error(`Item at index ${idx} missing text after "${marker}"`);
        const id = idPart || String(idx + 1);
        return { id, text: textPart };
      }
      return { id: String(idx + 1), text: raw };
    }
    if (item && typeof item === 'object') {
      const text = item.text;
      const id = item.id ?? String(idx + 1);
      if (typeof text !== 'string') throw new Error(`Item at index ${idx} missing string .text`);
      return { id: String(id), text };
    }
    throw new Error(`Unsupported item type at index ${idx}`);
  });
}

function defaultFileName({ prefix, index, id, text, ext }) {
  const short = crypto.createHash('sha1').update(text).digest('hex').slice(0, 8);
  const safeId = sanitizeBaseName(String(id)).slice(0, 32) || String(index + 1);
  const n = String(index + 1).padStart(4, '0');
  return `${prefix}_${n}_${safeId}_${short}.${ext}`;
}

describe('tts normalizeInput', () => {
  it('handles array of strings', () => {
    const input = ['hello', 'world'];
    const out = normalizeInput(input);
    expect(out).toEqual([
      { id: '1', text: 'hello' },
      { id: '2', text: 'world' },
    ]);
  });

  it('supports "filename::text" syntax for custom id/filename', () => {
    const input = ['greeting::你好，世界', '  ::无自定义文件名，同索引  '];
    const out = normalizeInput(input);
    expect(out).toEqual([
      { id: 'greeting', text: '你好，世界' },
      { id: '2', text: '无自定义文件名，同索引' },
    ]);
  });

  it('handles array of objects with id', () => {
    const input = [
      { id: 'a', text: 'foo' },
      { id: 'b', text: 'bar' },
    ];
    const out = normalizeInput(input);
    expect(out).toEqual([
      { id: 'a', text: 'foo' },
      { id: 'b', text: 'bar' },
    ]);
  });

  it('auto-fills id when missing', () => {
    const input = [{ text: 'foo' }, { text: 'bar' }];
    const out = normalizeInput(input);
    expect(out).toEqual([
      { id: '1', text: 'foo' },
      { id: '2', text: 'bar' },
    ]);
  });

  it('throws on invalid item', () => {
    // @ts-expect-error
    expect(() => normalizeInput([123])).toThrow(/Unsupported item type/);
  });
});

describe('tts defaultFileName', () => {
  it('generates deterministic, readable file names', () => {
    const name1 = defaultFileName({
      prefix: 'tts',
      index: 0,
      id: 'intro line',
      text: '你好，世界',
      ext: 'mp3',
    });
    const name2 = defaultFileName({
      prefix: 'tts',
      index: 0,
      id: 'intro line',
      text: '你好，世界',
      ext: 'mp3',
    });

    expect(name1).toBe(name2);
    expect(name1.startsWith('tts_0001_')).toBe(true);
    expect(name1.endsWith('.mp3')).toBe(true);
  });
});
