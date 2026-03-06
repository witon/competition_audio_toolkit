import path from 'node:path';
import fs from 'node:fs/promises';
import { ffmpeg } from '../shared/ffmpeg.js';

export async function trimFiles(files, outDir, { threshold = -40, silenceduration = 0.3 } = {}) {
  const results = [];
  for (const f of files) {
    const base = path.basename(f);
    const outPath = path.join(outDir, base);
    try {
      await fs.access(f);
    } catch (e) {
      results.push({ file: f, ok: false, error: 'not found' });
      continue;
    }

    // ffmpeg silenceremove: remove silence at start and end
    // at=start: 'silenceremove=start_periods: start_duration:start_threshold'
    // but easier: use two passes with silenceremove=start and silenceremove=stop

    const startFilter = `silenceremove=start_periods=1:start_duration=${silenceduration}:start_threshold=${threshold}dB`;
    const endFilter = `silenceremove=stop_periods=1:stop_duration=${silenceduration}:stop_threshold=${threshold}dB`;

    // chain: first remove start, write temp, then remove end
    const tmp = outPath + '.tmp.mp3';
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(f)
          .audioCodec('libmp3lame')
          .format('mp3')
          .audioFilters(startFilter)
          .on('error', (err, stdout, stderr) => reject(new Error(err.message + '\n' + stderr)))
          .on('end', () => resolve())
          .save(tmp);
      });

      await new Promise((resolve, reject) => {
        ffmpeg(tmp)
          .audioCodec('libmp3lame')
          .format('mp3')
          .audioFilters(endFilter)
          .on('error', (err, stdout, stderr) => reject(new Error(err.message + '\n' + stderr)))
          .on('end', () => resolve())
          .save(outPath);
      });

      await fs.rm(tmp, { force: true });
      results.push({ file: f, out: outPath, ok: true });
    } catch (err) {
      results.push({ file: f, ok: false, error: String(err) });
    }
  }
  return results;
}
