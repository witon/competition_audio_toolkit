#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { mergeFiles } from './merge.js';
import path from 'node:path';
import { readFileList } from '../shared/io.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('audio-merge')
  .usage('$0 --in <list.json> --out merged.mp3')
  .option('in', { alias: 'i', type: 'string', demandOption: true, describe: 'JSON file: array of file paths' })
  .option('out', { alias: 'o', type: 'string', default: 'merged.mp3' })
  .option('format', { type: 'string', choices: ['mp3','wav'], default: 'mp3' })
  .help()
  .strict()
  .parse();

const listPath = path.resolve(argv.in);
const outPath = path.resolve(argv.out);

let files;
try {
  files = await readFileList(listPath);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

await mergeFiles(files, outPath, { format: argv.format });
console.log('Merged ->', outPath);
