#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { trimFiles } from './trim.js';
import path from 'node:path';
import { readFileList } from '../shared/io.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('audio-trim')
  .usage('$0 --in <list.json> --outdir trimmed --threshold -40 --duration 0.3')
  .option('in', { alias: 'i', type: 'string', demandOption: true, describe: 'JSON file: array of file paths OR manifest' })
  .option('outdir', { alias: 'o', type: 'string', default: 'trimmed', describe: 'Output directory' })
  .option('threshold', { type: 'number', default: -40, describe: 'Silence threshold in dB (negative)' })
  .option('silenceduration', { type: 'number', default: 0.3, describe: 'Duration (s) silence must be continuous to count' })
  .option('manifest', { type: 'string', default: 'trimmed.manifest.json', describe: 'Manifest filename to write under --outdir' })
  .help()
  .strict()
  .parse();

const listPath = path.resolve(argv.in);
const outDir = path.resolve(argv.outdir);

let files;
try {
  files = await readFileList(listPath);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const results = await trimFiles(files, outDir, {
  threshold: argv.threshold,
  silenceduration: argv.silenceduration,
});

// 写出一个简单的 manifest，便于后续 merge / 其他工具消费
const manifest = {
  kind: 'audio-trim',
  sourceList: path.basename(listPath),
  outDir,
  threshold: argv.threshold,
  silenceduration: argv.silenceduration,
  createdAt: new Date().toISOString(),
  items: results
    .filter((r) => r.ok)
    .map((r, index) => ({
      index,
      file: r.out,
      source: r.file,
      ok: true,
    })),
};

await fs.mkdir(outDir, { recursive: true }).catch(() => {});
await fs.writeFile(path.join(outDir, argv.manifest), JSON.stringify(manifest, null, 2), 'utf8');

console.log('Done. Results:', results);

