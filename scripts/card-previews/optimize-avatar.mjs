import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export function parseGlb(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error('Invalid GLB 2 container');
  const chunks = [];
  for (let offset = 12; offset < buffer.length;) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) }); offset += 8 + length;
  }
  if (chunks.length !== 2 || chunks[0].type !== 0x4e4f534a || chunks[1].type !== 0x004e4942) throw new Error('Expected JSON and BIN chunks only');
  return { json: JSON.parse(chunks[0].data.toString()), bin: chunks[1].data };
}

export function writeGlb(json, bin) {
  const jsonData = Buffer.from(JSON.stringify(json));
  const jsonPadded = Buffer.alloc(Math.ceil(jsonData.length / 4) * 4, 32); jsonData.copy(jsonPadded);
  const binPadded = Buffer.alloc(Math.ceil(bin.length / 4) * 4); bin.copy(binPadded);
  const output = Buffer.alloc(12 + 8 + jsonPadded.length + 8 + binPadded.length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonPadded.length, 12); output.writeUInt32LE(0x4e4f534a, 16); jsonPadded.copy(output, 20);
  const offset = 20 + jsonPadded.length;
  output.writeUInt32LE(binPadded.length, offset); output.writeUInt32LE(0x004e4942, offset + 4); binPadded.copy(output, offset + 8);
  return output;
}

export async function optimizeAvatar(buffer) {
  const { json, bin } = parseGlb(buffer);
  if (json.buffers?.length !== 1 || json.buffers[0].uri || json.bufferViews.some(view => view.buffer !== 0)) throw new Error('Expected one embedded buffer');
  const replacements = new Map(), images = [];
  for (const [index, image] of (json.images || []).entries()) {
    if (image.mimeType !== 'image/png' || image.bufferView == null) continue;
    const view = json.bufferViews[image.bufferView], source = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const webp = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer();
    if (webp.length >= source.length) continue;
    const before = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const after = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (before.info.width !== after.info.width || before.info.height !== after.info.height || !before.data.equals(after.data)) throw new Error('Lossless atlas comparison failed');
    replacements.set(image.bufferView, webp);
    image.mimeType = 'image/webp';
    for (const texture of json.textures || []) if (texture.source === index) {
      delete texture.source;
      texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: index } };
    }
    images.push({ name: image.name, width: before.info.width, height: before.info.height, originalBytes: source.length, optimizedBytes: webp.length, pixelIdentical: true });
  }
  if (!images.length) return { buffer, images };
  json.extensionsUsed = [...new Set([...(json.extensionsUsed || []), 'EXT_texture_webp'])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired || []), 'EXT_texture_webp'])];
  const chunks = []; let offset = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    const bytes = replacements.get(index) || bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded); chunks.push(padded);
    view.byteOffset = offset; view.byteLength = bytes.length; offset += padded.length;
  }
  json.buffers[0].byteLength = offset;
  return { buffer: writeGlb(json, Buffer.concat(chunks)), images };
}

async function main() {
  const path = fileURLToPath(new URL('../../assets/models/showroom-character/blue-fin-character.glb', import.meta.url));
  const original = await readFile(path), result = await optimizeAvatar(original);
  const before = parseGlb(original), after = parseGlb(result.buffer);
  const imageViews = new Set(before.json.images.map(image => image.bufferView));
  for (let index = 0; index < before.json.bufferViews.length; index++) {
    if (imageViews.has(index)) continue;
    const a = before.json.bufferViews[index], b = after.json.bufferViews[index];
    if (!before.bin.subarray(a.byteOffset || 0, (a.byteOffset || 0) + a.byteLength).equals(after.bin.subarray(b.byteOffset || 0, (b.byteOffset || 0) + b.byteLength))) throw new Error(`Geometry or animation buffer changed: ${index}`);
  }
  for (const key of ['nodes', 'meshes', 'skins', 'animations', 'materials', 'accessors']) {
    if (JSON.stringify(before.json[key]) !== JSON.stringify(after.json[key])) throw new Error(`GLB structure changed: ${key}`);
  }
  if (result.buffer.length < original.length) await writeFile(path, result.buffer);
  console.log(JSON.stringify({ originalBytes: original.length, optimizedBytes: result.buffer.length, images: result.images, unchanged: ['geometry', 'normals', 'UVs', 'materials', 'skeletons', 'weights', 'all animation clips'] }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))) await main();
