import fs from 'node:fs/promises';
import path from 'node:path';

// Read input that can be: array of strings OR manifest with .items[].file
export async function readFileList(inputPath) {
  const abs = path.resolve(inputPath);
  const raw = await fs.readFile(abs, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${abs}`);
  }

  if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
    return parsed.map((p) => path.resolve(path.dirname(abs), p));
  }

  if (parsed && Array.isArray(parsed.items)) {
    return parsed.items.map((it) => path.resolve(path.dirname(abs), it.file));
  }

  throw new Error('Input must be an array of file paths OR a manifest with .items[]');
}
