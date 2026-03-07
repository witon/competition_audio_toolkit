import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ffmpeg } from '../shared/ffmpeg.js';

export function resolveOutputOptions(format = 'mp3') {
  if (format === 'wav') {
    return {
      format: 'wav',
      codec: 'pcm_s16le',
    };
  }

  return {
    format: 'mp3',
    codec: 'libmp3lame',
  };
}

export async function mergeFiles(inputs, outPath, { format = 'mp3' } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('inputs must be a non-empty array');
  }

  for (const inputFile of inputs) {
    await fs.access(inputFile);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audiomerge-'));
  const listFile = path.join(tmpDir, 'list.txt');
  const lines = inputs.map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listFile, lines, 'utf8');

  const { format: outFormat, codec } = resolveOutputOptions(format);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-y'])
        .format(outFormat)
        .audioCodec(codec)
        .on('error', (err, _stdout, stderr) => reject(new Error(err.message + '\n' + stderr)))
        .on('end', () => resolve())
        .save(outPath);
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
