#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { runBatch } from './runner.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('tts-gen')
  .usage('$0 --in <file.json> --out <dir> | --text "一句话" --out <dir>')
  .option('in', {
    alias: 'i',
    type: 'string',
    describe: 'Input JSON file. Supported: array of strings OR array of objects with { id?, text }',
  })
  .option('text', {
    type: 'string',
    describe: 'Single text input (bypass JSON file). When set, --in is ignored.',
  })
  .option('out', {
    alias: 'o',
    type: 'string',
    default: 'out',
    describe: 'Output directory',
  })
  .option('voice', {
    type: 'string',
    default: 'zh-CN-XiaoxiaoNeural',
    describe: 'Edge TTS voice name',
  })
  .option('format', {
    type: 'string',
    default: 'mp3',
    choices: ['mp3', 'wav'],
    describe: 'Audio format. (edge-tts supports mp3; wav is produced by converting mp3 via ffmpeg if available)',
  })
  .option('rate', {
    type: 'string',
    default: '+0%',
    describe: 'Rate, e.g. "+0%" or "-10%" (edge-tts --rate)',
  })
  .option('pitch', {
    type: 'string',
    default: '+0Hz',
    describe: 'Pitch, e.g. "+0Hz" or "-50Hz" (edge-tts --pitch)',
  })
  .option('concurrency', {
    alias: 'c',
    type: 'number',
    default: 3,
    describe: 'Max concurrent synth jobs',
  })
  .option('prefix', {
    type: 'string',
    default: 'tts',
    describe: 'Filename prefix (e.g. tts_0001.mp3)',
  })
  .option('manifest', {
    type: 'string',
    default: 'manifest.json',
    describe: 'Manifest filename (written under --out)',
  })
  .option('overwrite', {
    type: 'boolean',
    default: false,
    describe: 'Overwrite existing audio files',
  })
  .option('edgeTtsBin', {
    type: 'string',
    default: 'edge-tts',
    describe: 'edge-tts executable (in PATH). Install: pipx install edge-tts or pip install edge-tts',
  })
  .check((args) => {
    if (!args.in && !args.text) {
      throw new Error('Either --in or --text is required');
    }
    return true;
  })
  .help()
  .strict()
  .parse();

const outDir = path.resolve(argv.out);

let payload;
if (argv.text) {
  // 单句模式：payload 就是一条字符串数组
  payload = [String(argv.text)];
} else {
  const inputPath = path.resolve(argv.in);
  const raw = await fs.readFile(inputPath, 'utf8');
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse JSON: ${inputPath}`);
    process.exit(2);
  }
}

const { results, manifest } = await runBatch({
  input: payload,
  outDir,
  voice: argv.voice,
  format: argv.format,
  rate: argv.rate,
  pitch: argv.pitch,
  concurrency: argv.concurrency,
  prefix: argv.prefix,
  overwrite: argv.overwrite,
  edgeTtsBin: argv.edgeTtsBin,
});

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, argv.manifest), JSON.stringify(manifest, null, 2), 'utf8');

const failed = results.filter(r => !r.ok);
if (failed.length) {
  console.error(`Done with failures: ${failed.length}/${results.length}`);
  process.exit(1);
}

console.log(`Done: ${results.length} files -> ${outDir}`);
