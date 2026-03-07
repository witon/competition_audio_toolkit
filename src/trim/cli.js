#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { trimFiles } from './trim.js';
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
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const results = await trimFiles(files, outDir, {
  threshold: argv.threshold,
  silenceduration: argv.silenceduration,
});

const successItems = results
  .filter((result) => result.ok)
  .map((result, index) => ({
    index,
    file: result.out,
    source: result.file,
    ok: true,
  }));

const manifest = {
  kind: 'audio-trim',
  sourceList: path.basename(listPath),
  outDir,
  threshold: argv.threshold,
  silenceduration: argv.silenceduration,
  createdAt: new Date().toISOString(),
  items: successItems,
};

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, argv.manifest), JSON.stringify(manifest, null, 2), 'utf8');

const failedCount = results.length - successItems.length;
if (failedCount > 0) {
  console.error(`Trim completed with failures: ${failedCount}/${results.length}`);
  process.exit(1);
}

console.log(`Trim completed: ${successItems.length}/${results.length} files -> ${outDir}`);
