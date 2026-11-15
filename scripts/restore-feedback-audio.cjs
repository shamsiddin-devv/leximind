const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const [ffmpeg, input, destination] = process.argv.slice(2);
if (!ffmpeg || !input || !destination) {
  throw Error(
    'Usage: node scripts/restore-feedback-audio.cjs <ffmpeg> <original-mp3-dir> <output-dir>',
  );
}

const rate = 48_000;
const sourcePath = join(
  __dirname,
  '..',
  'assets',
  'feedback-audio',
  'sources.json',
);
const sources = JSON.parse(readFileSync(sourcePath, 'utf8'));
const bands = {
  faah: [70, 11500],
  shocked: [35, 13500],
  dexter: [60, 11000],
  spider: [38, 14000],
  chicken: [78, 10500],
  encourage: [68, 11500],
  alert: [45, 12500],
  galaxy: [36, 11500],
  bruh: [62, 11200],
  'huh-cat': [72, 11500],
  'vine-boom': [23, 10000],
};

function execute(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', ...args], {
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw Error(result.error?.message ?? result.stderr.toString());
  }
  return result;
}

function decode(path, filter = 'anull') {
  const pcm = execute([
    '-loglevel',
    'error',
    '-i',
    path,
    '-map',
    '0:a:0',
    '-af',
    filter,
    '-ar',
    String(rate),
    '-ac',
    '1',
    '-c:a',
    'pcm_f32le',
    '-f',
    'f32le',
    'pipe:1',
  ]).stdout;
  return Float64Array.from({ length: pcm.length / 4 }, (_, index) =>
    pcm.readFloatLE(index * 4),
  );
}

const db = (amplitude) => 20 * Math.log10(Math.max(amplitude, 1e-7));
const round = (value) => Number(value.toFixed(2));
function analyze(samples) {
  let power = 0,
    peak = 0;
  for (const sample of samples) {
    power += sample ** 2;
    peak = Math.max(peak, Math.abs(sample));
  }
  const frames = [];
  for (let offset = 0; offset + 960 <= samples.length; offset += 960) {
    let energy = 0;
    for (let i = offset; i < offset + 960; i++) energy += samples[i] ** 2;
    frames.push(energy / 960);
  }
  frames.sort((a, b) => a - b);
  const activity = frames.filter(
    (energy) => db(Math.sqrt(energy)) >= db(peak) - 30,
  );
  return {
    peak,
    rmsDbfs: db(Math.sqrt(power / samples.length)),
    activeDbfs: activity.length
      ? db(Math.sqrt(activity.reduce((sum, x) => sum + x, 0) / activity.length))
      : db(Math.sqrt(power / samples.length)),
    quietDbfs: db(Math.sqrt(frames[Math.floor(frames.length * 0.1)] ?? 0)),
  };
}

function bandLevel(path, filter) {
  return analyze(decode(path, filter)).rmsDbfs;
}

function wave(samples, gain) {
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  const scale = 32767 * 10 ** (gain / 20);
  samples.forEach((sample, i) =>
    wav.writeInt16LE(Math.round(sample * scale), 44 + i * 2),
  );
  return wav;
}

function truePeak(path) {
  const measurement = execute([
    '-i',
    path,
    '-af',
    'ebur128=peak=true',
    '-f',
    'null',
    '-',
  ]).stderr.toString();
  const summary = measurement.slice(measurement.lastIndexOf('True peak:'));
  const peak = summary.match(/Peak:\s+(-?[\d.]+) dBFS/);
  if (!peak) throw Error('Could not measure true peak.');
  return Number(peak[1]);
}

mkdirSync(destination, { recursive: true });
for (const [id, [highpass, lowpass]] of Object.entries(bands)) {
  const original = resolve(input, id + '.mp3');
  const target = resolve(destination, id + '.wav');
  const before = analyze(decode(original));
  const filters = [`highpass=f=${highpass}`, `lowpass=f=${lowpass}`];
  const useDenoise =
    sources[id].durationSeconds > 0.75 &&
    before.quietDbfs > -65 &&
    before.quietDbfs < -33 &&
    before.activeDbfs - before.quietDbfs > 17;
  if (useDenoise)
    filters.push(`afftdn=nr=6:nf=${Math.round(before.quietDbfs)}`);
  const samples = decode(original, filters.join(','));
  // Only the edge fades and frequency cleanup change the waveform's shape.
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.min(1, i / 384, (samples.length - 1 - i) / 1152);
  }
  const filtered = analyze(samples);
  let gain = Math.min(-19 - filtered.activeDbfs, -4.05 - db(filtered.peak), 8);
  writeFileSync(target, wave(samples, gain));
  let tp = truePeak(target);
  if (tp > -3) {
    gain -= tp + 3.1;
    writeFileSync(target, wave(samples, gain));
    tp = truePeak(target);
  }
  const after = analyze(decode(target));
  const hissBand = 'highpass=f=12000';
  const rumbleBand = 'lowpass=f=45';
  const bandChange = (filter) =>
    round(
      bandLevel(target, filter) -
        after.rmsDbfs -
        (bandLevel(original, filter) - before.rmsDbfs),
    );
  sources[id] = {
    title: sources[id].title,
    source: sources[id].source,
    sourceAudio: sources[id].sourceAudio,
    sha256: createHash('sha256').update(readFileSync(target)).digest('hex'),
    durationSeconds: Number((samples.length / rate).toFixed(3)),
    samplePeakDbfs: round(db(after.peak)),
    truePeakDbtp: tp,
    activeRmsDbfs: round(after.activeDbfs),
    highBandChangeDb: bandChange(hissBand),
    rumbleBandChangeDb: bandChange(rumbleBand),
    filters,
  };
  console.log(
    id,
    sources[id].samplePeakDbfs,
    tp,
    sources[id].highBandChangeDb,
    sources[id].rumbleBandChangeDb,
  );
}
writeFileSync(
  join(destination, 'sources.json'),
  JSON.stringify(sources, null, 2) + '\n',
);
