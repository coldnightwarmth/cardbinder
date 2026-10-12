import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'assets/card-previews');
const WIDTH = 260;
const QUALITY = 85;
const VERSION = `w${WIDTH}-q${QUALITY}-v1`;
const revision = process.env.CARD_PREVIEW_REF || 'HEAD';
const check = process.argv.includes('--check');
const limit = Number(process.env.CARD_PREVIEW_LIMIT || 0);
const concurrency = Math.max(1, Math.min(8, Number(process.env.CARD_PREVIEW_WORKERS || 4)));
const hash = buffer => createHash('sha256').update(buffer).digest('hex').slice(0, 20);
const exists = path => stat(path).then(info => info.size > 0, () => false);

// Read one Git object at a time on each pipe. Originals remain sparse-excluded;
// no multi-gigabyte checkout or duplicate original archive is needed.
class GitBlobs {
  constructor() {
    this.process = spawn('git', ['cat-file', '--batch'], { cwd: ROOT });
    this.buffer = Buffer.alloc(0);
    this.waiter = null;
    this.failure = null;
    this.process.stdout.on('data', data => { this.buffer = Buffer.concat([this.buffer, data]); this.flush(); });
    this.process.on('error', error => { this.failure = error; this.flush(); });
    this.process.on('exit', code => { if (this.waiter) { this.failure = new Error(`git cat-file exited ${code}`); this.flush(); } });
    this.process.stderr.on('data', data => process.stderr.write(data));
  }
  flush() {
    if (!this.waiter) return;
    if (this.failure) { this.waiter.reject(this.failure); this.waiter = null; return; }
    const end = this.buffer.indexOf(10);
    if (end < 0) return;
    const header = this.buffer.subarray(0, end).toString();
    const size = Number(header.split(' ')[2]);
    if (!Number.isFinite(size)) { this.waiter.reject(new Error(`Invalid Git blob: ${header}`)); this.waiter = null; return; }
    if (this.buffer.length < end + 1 + size + 1) return;
    const data = this.buffer.subarray(end + 1, end + 1 + size);
    this.buffer = this.buffer.subarray(end + 1 + size + 1);
    this.waiter.resolve(data); this.waiter = null;
  }
  read(id) {
    if (this.waiter) throw new Error('Concurrent reads on a Git blob pipe');
    return new Promise((resolve, reject) => { this.waiter = { resolve, reject }; this.process.stdin.write(id + '\n'); this.flush(); });
  }
  close() { this.process.stdin.end(); }
}

export async function createPreview(input, sprite = null) {
  const metadata = await sharp(input).metadata();
  // Never turn a real animated file into a still image.
  if ((metadata.pages || 1) > 1) throw new Error('Animated file must retain its original playback path');
  if (!sprite) return sharp(input).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY, alphaQuality: 100, effort: 5 }).toBuffer();
  const { columns, rows } = sprite;
  if (!(columns > 0 && rows > 0) || metadata.width % columns || metadata.height % rows) throw new Error('Sprite atlas dimensions are not frame aligned');
  const sourceWidth = metadata.width / columns, sourceHeight = metadata.height / rows;
  const width = Math.min(WIDTH, sourceWidth), height = Math.max(1, Math.round(width * sourceHeight / sourceWidth));
  const composite = [];
  // Resize each frame independently so sharp's sampling never crosses frames.
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const frame = await sharp(input).extract({ left: x * sourceWidth, top: y * sourceHeight, width: sourceWidth, height: sourceHeight }).resize(width, height).png().toBuffer();
    composite.push({ input: frame, left: x * width, top: y * height });
  }
  return sharp({ create: { width: width * columns, height: height * rows, channels: 4, background: '#0000' } }).composite(composite).webp({ quality: QUALITY, alphaQuality: 100, effort: 5 }).toBuffer();
}

async function build() {
  const files = (await readdir(ROOT)).filter(name => name.endsWith('-data.js')).sort();
  const sources = new Map(), counts = {};
  const add = (source, sprite = null) => {
    if (typeof source !== 'string' || !source.startsWith('assets/') || /\.\./.test(source)) return;
    sources.set(source, { source, path: source.split('?')[0], sprite });
  };
  for (const file of files) {
    const module = await import(pathToFileURL(join(ROOT, file)));
    for (const value of Object.values(module)) if (Array.isArray(value)) {
      const cards = value.filter(card => card?.file);
      if (!cards.length) continue;
      const collection = cards[0].collection || (file === 'cardnft-data.js' ? 'cardnft1' : file.replace('-data.js', ''));
      counts[collection] = cards.length;
      for (const card of cards) { add(card.file); if (card.animation?.sprite) add(card.animation.sprite.file, card.animation.sprite); }
    }
  }
  const { CARD_NFT_ANIMATED_SPRITES } = await import(pathToFileURL(join(ROOT, 'cardnft-animated-sprites.js')));
  for (const sprite of Object.values(CARD_NFT_ANIMATED_SPRITES)) add(sprite.file, sprite);
  const tree = execFileSync('git', ['ls-tree', '-r', '-l', revision, 'assets'], { cwd: ROOT, maxBuffer: 24 * 1024 * 1024, encoding: 'utf8' });
  const blobs = new Map(tree.split('\n').map(line => {
    const match = line.match(/^\d+ blob ([\da-f]+)\s+(\d+)\t(.+)$/);
    return match && [match[3], { id: match[1], bytes: Number(match[2]) }];
  }).filter(Boolean));
  const tasks = [...sources.values()].sort((a, b) => a.source.localeCompare(b.source));
  const missing = tasks.filter(task => !blobs.has(task.path));
  const available = tasks.filter(task => blobs.has(task.path)).slice(0, limit || Infinity);
  const previous = check ? JSON.parse(await readFile(join(OUT, 'metrics.json'), 'utf8')) : null;
  const manifests = {}, metrics = { width: WIDTH, quality: QUALITY, cards: counts, generated: 0, sourceBytes: 0, previewBytes: 0, missing: missing.map(task => task.source), skipped: [], animatedAtlases: 0 };
  await mkdir(OUT, { recursive: true });
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    const reader = new GitBlobs();
    try {
      while (cursor < available.length) {
        const task = available[cursor++], blob = blobs.get(task.path);
        const digest = hash(`${blob.id}:${VERSION}:${JSON.stringify(task.sprite ? { columns: task.sprite.columns, rows: task.sprite.rows } : null)}`);
        const asset = `assets/card-previews/${digest.slice(0, 2)}/${digest}.webp`;
        const destination = join(ROOT, asset);
        if (!(await exists(destination))) {
          const knownSkip = previous?.skipped?.find(entry => entry.source === task.source && entry.blob === blob.id);
          if (knownSkip) { metrics.skipped.push(knownSkip); continue; }
          if (check) throw new Error(`Missing generated preview: ${asset}`);
          const input = await reader.read(blob.id);
          let output;
          try { output = await createPreview(input, task.sprite); }
          catch (error) {
            metrics.skipped.push({ source: task.source, blob: blob.id, reason: error.message });
            console.warn(`Using original for ${task.source}: ${error.message}`);
            continue;
          }
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination + '.tmp', output);
          await rename(destination + '.tmp', destination);
        }
        if (check) {
          let dimensions;
          try { dimensions = await sharp(destination).metadata(); await sharp(destination).raw().toBuffer(); }
          catch (error) { throw new Error(`Invalid preview ${asset}: ${error.message}`); }
          const columns = task.sprite?.columns || 1, rows = task.sprite?.rows || 1;
          if (dimensions.width / columns > WIDTH || dimensions.width % columns || dimensions.height % rows) throw new Error(`Invalid dimensions: ${asset}`);
        }
        const prefix = task.path.slice(0, task.path.lastIndexOf('/') + 1);
        (manifests[prefix] ||= {})[task.source] = asset;
        const previewBytes = (await stat(destination)).size;
        metrics.generated++; metrics.sourceBytes += blob.bytes; metrics.previewBytes += previewBytes;
        if (task.sprite) metrics.animatedAtlases++;
        if (metrics.generated % 1000 === 0) console.log(`${metrics.generated}/${available.length}: ${(metrics.previewBytes / 1048576).toFixed(1)} MiB previews`);
      }
    } finally { reader.close(); }
  }));
  const index = {};
  for (const prefix of Object.keys(manifests).sort()) {
    const sorted = Object.fromEntries(Object.entries(manifests[prefix]).sort(([a], [b]) => a.localeCompare(b)));
    const body = JSON.stringify(sorted) + '\n', asset = `assets/card-previews/manifests/${hash(body)}.json`;
    index[prefix] = asset;
    if (!check) { await mkdir(dirname(join(ROOT, asset)), { recursive: true }); await writeFile(join(ROOT, asset), body); }
    else if (await readFile(join(ROOT, asset), 'utf8') !== body) throw new Error(`Manifest mismatch: ${asset}`);
  }
  const indexCode = `// Generated by scripts/card-previews/build.mjs. Original artwork remains the fallback.\nexport const CARD_PREVIEW_WIDTH = ${WIDTH};\nexport const CARD_PREVIEW_MANIFESTS = ${JSON.stringify(index, null, 2)};\n`;
  const countsCode = `// Generated from collection manifests; this tiny file does not load card records.\nexport const COLLECTION_CARD_COUNTS = ${JSON.stringify(counts, null, 2)};\n`;
  for (const [file, body] of [['card-preview-index.mjs', indexCode], ['collection-card-counts.mjs', countsCode]]) {
    if (!check) await writeFile(join(ROOT, file), body);
    else if (await readFile(join(ROOT, file), 'utf8') !== body) throw new Error(`Generated file mismatch: ${file}`);
  }
  metrics.skipped.sort((a, b) => a.source.localeCompare(b.source));
  if (!check) await writeFile(join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  console.log(JSON.stringify(metrics, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))) await build();
