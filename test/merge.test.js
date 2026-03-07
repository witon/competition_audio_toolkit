import { describe, expect, it } from 'vitest';
import { resolveOutputOptions } from '../src/merge/merge.js';

describe('merge/resolveOutputOptions', () => {
  it('returns mp3 options by default', () => {
    expect(resolveOutputOptions()).toEqual({
      format: 'mp3',
      codec: 'libmp3lame',
    });
  });

  it('returns wav options for wav format', () => {
    expect(resolveOutputOptions('wav')).toEqual({
      format: 'wav',
      codec: 'pcm_s16le',
    });
  });
});
