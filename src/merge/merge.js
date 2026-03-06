import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ffmpeg } from '../shared/ffmpeg.js';

export async function mergeFiles(inputs, outPath, { format='mp3' } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('inputs must be a non-empty array');

  // Check files exist
  for (const f of inputs) {
    await fs.access(f);
  }

  // Create a temporary concat list file for ffmpeg
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audiomerge-'));
  const listFile = path.join(tmpDir, 'list.txt');
  const lines = inputs.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listFile, lines, 'utf8');

  return new Promise((resolve, reject) => {
    // Use concat demuxer. Re-encode to mp3 to avoid codec/container issues.
    const command = ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-y'])
      .audioCodec('libmp3lame')
      .on('start', (cmd) => {})
      .on('error', (err, stdout, stderr) => reject(new Error(err.message + '\n' + stderr)))
      .on('end', async () => {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {}
        resolve();
      })
      .save(outPath);
  });
}
