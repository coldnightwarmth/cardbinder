import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createCardPreviewLoader } from '../../card-preview-loader.mjs';
import { createPreview } from './build.mjs';
import { optimizeAvatar, parseGlb, writeGlb } from './optimize-avatar.mjs';

const source = 'https://cards.test/assets/cards/0000/card-1.webp?v=1';
const preview = 'https://cards.test/assets/card-previews/aa/example.webp';
function harness(fetchManifest) {
  return createCardPreviewLoader({ baseUrl: 'https://cards.test/', manifests: { 'assets/cards/0000/': 'assets/card-previews/manifests/cards.json' }, fetchManifest });
}
test('preview requests deduplicate manifests and require exact source versions', async () => {
  let requests = 0;
  const loader = harness(async () => { requests++; return { 'assets/cards/0000/card-1.webp?v=1': 'assets/card-previews/aa/example.webp' }; });
  assert.deepEqual(await Promise.all([loader.urlFor(source), loader.urlFor(source)]), [preview, preview]);
  assert.equal(requests, 1);
  assert.equal(await loader.urlFor(source.replace('v=1', 'v=2')), source.replace('v=1', 'v=2'));
  assert.equal(await loader.urlFor(source, { width: 500 }), source);
  assert.equal(await loader.urlFor(source.replace('cards.test', 'external.test')), source.replace('cards.test', 'external.test'));
});
test('missing manifests and assets recover with original images', async () => {
  const failedManifest = harness(async () => { throw new Error('offline'); });
  assert.equal(await failedManifest.load(source, async url => url), source);
  const loader = harness(async () => ({ 'assets/cards/0000/card-1.webp?v=1': 'assets/card-previews/aa/example.webp' }));
  const calls = [];
  const image = async url => { calls.push(url); if (url === preview) throw new Error('404'); return url; };
  assert.equal(await loader.load(source, image), source);
  assert.equal(await loader.load(source, image), source);
  assert.deepEqual(calls, [preview, source, source]);
});
test('unlisted cards do not request manifests; original errors still reject', async () => {
  const loader = harness(() => assert.fail('unexpected manifest request'));
  await assert.rejects(loader.load('https://cards.test/assets/custom/new.webp', async () => { throw new Error('original unavailable'); }), /original unavailable/);
});
test('static previews keep full aspect and transparent regions', async () => {
  const input = await sharp({ create: { width: 520, height: 728, channels: 4, background: '#0000' } }).composite([{ input: { create: { width: 260, height: 364, channels: 4, background: '#ed4343' } }, left: 130, top: 182 }]).png().toBuffer();
  const output = await createPreview(input);
  const { info, data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 260); assert.equal(info.height, 364);
  assert.equal(data[3], 0); assert.equal(data[(182 * 260 + 130) * 4 + 3], 255);
});
test('sprite previews preserve atlas layout without colors bleeding across frames', async () => {
  const input = await sharp({ create: { width: 800, height: 560, channels: 4, background: '#00ff00' } }).composite([{ input: { create: { width: 400, height: 560, channels: 4, background: '#ff0000' } }, left: 0, top: 0 }]).png().toBuffer();
  const output = await createPreview(input, { columns: 2, rows: 1 });
  const { info, data } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 520); assert.equal(info.height, 364);
  assert.ok(data[(100 * info.width + 258) * 3] > 230);
  assert.ok(data[(100 * info.width + 261) * 3 + 1] > 230);
});
test('lossless avatar rewrite preserves RGBA pixels and non-image buffers', async () => {
  const atlas = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#396eddaa' } }).png({ compressionLevel: 0 }).toBuffer();
  const geometry = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const bin = Buffer.concat([geometry, atlas]);
  const json = { asset: { version: '2.0' }, buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: geometry.length }, { buffer: 0, byteOffset: geometry.length, byteLength: atlas.length }], images: [{ bufferView: 1, mimeType: 'image/png' }], textures: [{ source: 0 }], animations: [{ name: 'Walk', channels: [], samplers: [] }] };
  const optimized = await optimizeAvatar(writeGlb(json, bin));
  const result = parseGlb(optimized.buffer);
  assert.deepEqual(result.bin.subarray(0, 8), geometry);
  assert.deepEqual(result.json.animations, json.animations);
  assert.deepEqual(result.json.textures[0].extensions.EXT_texture_webp, { source: 0 });
  assert.equal(optimized.images[0].pixelIdentical, true);
});
