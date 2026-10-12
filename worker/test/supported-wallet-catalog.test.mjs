import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {
 SUPPORTED_CARD_COLLECTION_RANGES, SUPPORTED_CARD_MINT_INDEX, SUPPORTED_CARD_REFERENCE_INDEX,
 SUPPORTED_WALLET_CATALOG_VERSION as serverVersion, SUPPORTED_WALLET_CARD_COUNT as serverCount,
} from '../src/supported-card-index.js';
import {SUPPORTED_WALLET_CATALOG_VERSION, SUPPORTED_WALLET_CARD_COUNT} from '../../supported-wallet-catalog.mjs';
import {countSupportedWalletCards, summarizeSupportedWalletCards} from '../src/live-data.js';

const mints = new Map(), references = new Map();
for (let i = 0; i < SUPPORTED_CARD_MINT_INDEX.length; i += 2) {
 const index = SUPPORTED_CARD_MINT_INDEX[i + 1];
 if (!mints.has(index)) mints.set(index, SUPPORTED_CARD_MINT_INDEX[i]);
}
for (let i = 0; i < SUPPORTED_CARD_REFERENCE_INDEX.length; i += 2) {
 const [collection, number] = SUPPORTED_CARD_REFERENCE_INDEX[i].split(':');
 references.set(SUPPORTED_CARD_REFERENCE_INDEX[i + 1], [collection, Number(number), 'owned-mint']);
}

test('generated wallet catalog matches all current source manifests and preserves lookup payloads', async () => {
 const generator = fileURLToPath(new URL('../scripts/build-supported-card-index.mjs', import.meta.url));
 await promisify(execFile)(process.execPath, [generator, '--check']);
 assert.equal(serverVersion, SUPPORTED_WALLET_CATALOG_VERSION);
 assert.equal(serverCount, SUPPORTED_WALLET_CARD_COUNT);
 const hash = createHash('sha256').update(JSON.stringify([
  SUPPORTED_CARD_COLLECTION_RANGES, SUPPORTED_CARD_MINT_INDEX, SUPPORTED_CARD_REFERENCE_INDEX,
 ])).digest('hex');
 assert.equal(hash, serverVersion);
 assert.match(serverVersion, /^[a-f0-9]{64}$/);
});

test('collection ranges are contiguous and every supported card maps to its source collection', () => {
 let previousEnd = 0;
 for (const [collection, start, end] of SUPPORTED_CARD_COLLECTION_RANGES) {
  assert.equal(start, previousEnd); assert.ok(end > start); previousEnd = end;
  for (let index = start; index < end; index++) {
   const mint = mints.get(index), reference = references.get(index);
   const summary = summarizeSupportedWalletCards({mints: mint ? [mint, mint] : [], cardRefs: reference ? [reference, reference] : []});
   assert.equal(summary.supportedCardCount, 1, `${collection} ${index}`);
   assert.deepEqual(summary.supportedCollectionIds, [collection]);
   assert.equal(summary.supportedCatalogVersion, serverVersion);
  }
 }
 assert.equal(previousEnd, serverCount);
});

test('mixed holdings produce unique collection hints in catalog order without changing card counts', () => {
 const ranges = [...SUPPORTED_CARD_COLLECTION_RANGES].reverse();
 const holdings = {
  mints: ranges.flatMap(([, start, end]) => [...mints].filter(([index]) => index >= start && index < end).slice(0, 2).map(([, mint]) => mint)),
  cardRefs: ranges.map(([, start]) => references.get(start)).filter(Boolean),
 };
 const summary = summarizeSupportedWalletCards(holdings);
 assert.deepEqual(summary.supportedCollectionIds, SUPPORTED_CARD_COLLECTION_RANGES.map(([id]) => id));
 assert.equal(summary.supportedCardCount, countSupportedWalletCards(holdings));
 assert.equal(summary.supportedCollectionIds.length, new Set(summary.supportedCollectionIds).size);
});

test('unknown holdings and invalid reference numbers cannot invent collection hints', () => {
 for (const holdings of [undefined, {}, {mints: ['unrelated'], cardRefs: [['clear', 999999, 'unknown'], ['unknown', 1, 'x']]}]) {
  assert.deepEqual(summarizeSupportedWalletCards(holdings), {supportedCardCount: 0, supportedCollectionIds: [], supportedCatalogVersion: serverVersion});
 }
});
