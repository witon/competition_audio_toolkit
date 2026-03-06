import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import pLimit from 'p-limit';
import { fileExists, sanitizeBaseName } from './utils.js';

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
  // Deterministic + readable: <prefix>_<index>_<id>_<hash8>.<ext>
  const short = crypto.createHash('sha1').update(text).digest('hex').slice(0, 8);
  const safeId = sanitizeBaseName(String(id)).slice(0, 32) || String(index + 1);
  const n = String(index + 1).padStart(4, '0');
  return `${prefix}_${n}_${safeId}_${short}.${ext}`;
}

async function runEdgeTts({ edgeTtsBin, text, voice, rate, pitch, outPath }) {
  // edge-tts --text "..." --voice <voice> --rate +0% --pitch +0Hz --write-media out.mp3
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      '--text',
      text,
      '--voice',
      voice,
      '--rate',
      rate,
      '--pitch',
      pitch,
      '--write-media',
      outPath,
    ];

    const child = spawn(edgeTtsBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const e = new Error(`edge-tts failed (code=${code}): ${stderr.trim()}`);
      e.stderr = stderr;
      reject(e);
    });
  });
}

export async function runBatch({
  input,
  outDir,
  voice,
  format,
  rate,
  pitch,
  concurrency,
  prefix,
  overwrite,
  edgeTtsBin,
}) {
  const items = normalizeInput(input);
  const ext = format === 'wav' ? 'mp3' : format; // edge-tts writes mp3; wav would need conversion.

  const limit = pLimit(Math.max(1, concurrency));

  const results = await Promise.all(
    items.map((item, index) =>
      limit(async () => {
        const fileName = defaultFileName({ prefix, index, id: item.id, text: item.text, ext });
        const outPath = path.join(outDir, fileName);

        try {
          if (!overwrite && (await fileExists(outPath))) {
            return { ok: true, skipped: true, index, id: item.id, text: item.text, file: fileName };
          }

          await runEdgeTts({ edgeTtsBin, text: item.text, voice, rate, pitch, outPath });
          return { ok: true, skipped: false, index, id: item.id, text: item.text, file: fileName };
        } catch (err) {
          return { ok: false, index, id: item.id, text: item.text, file: fileName, error: String(err?.message ?? err) };
        }
      })
    )
  );

  const manifest = {
    engine: 'edge-tts',
    voice,
    rate,
    pitch,
    format,
    outDir,
    createdAt: new Date().toISOString(),
    items: results.map((r) => ({
      index: r.index,
      id: r.id,
      text: r.text,
      file: r.file,
      ok: r.ok,
      skipped: r.skipped ?? false,
      error: r.ok ? undefined : r.error,
    })),
  };

  return { results, manifest };
}
