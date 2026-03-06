import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readFileList } from './io.js';

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'io-test-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('shared/readFileList', () => {
  it('reads simple string array and resolves relative paths', async () => {
    await withTempDir(async (dir) => {
      const jsonPath = path.join(dir, 'list.json');
      const audioA = path.join(dir, 'a.mp3');
      const audioB = path.join(dir, 'sub', 'b.mp3');
      await fs.mkdir(path.dirname(audioB), { recursive: true });
      await fs.writeFile(audioA, 'dummy');
      await fs.writeFile(audioB, 'dummy');

      await fs.writeFile(jsonPath, JSON.stringify(['a.mp3', 'sub/b.mp3']), 'utf8');

      const result = await readFileList(jsonPath);
      expect(result).toEqual([audioA, audioB]);
    });
  });

  it('reads manifest.items[].file', async () => {
    await withTempDir(async (dir) => {
      const jsonPath = path.join(dir, 'manifest.json');
      const audioA = path.join(dir, 'a.mp3');
      await fs.writeFile(audioA, 'dummy');

      await fs.writeFile(
        jsonPath,
        JSON.stringify({ items: [{ file: 'a.mp3' }] }),
        'utf8',
      );

      const result = await readFileList(jsonPath);
      expect(result).toEqual([audioA]);
    });
  });

  it('throws on invalid JSON shape', async () => {
    await withTempDir(async (dir) => {
      const jsonPath = path.join(dir, 'bad.json');
      await fs.writeFile(jsonPath, JSON.stringify({ foo: 'bar' }), 'utf8');
      await expect(readFileList(jsonPath)).rejects.toThrow(/Input must be an array of file paths/);
    });
  });
});
