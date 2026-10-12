import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardPreviewLoader} from '../../card-preview-loader.mjs';

const baseUrl = 'https://cards.test/';
const source = 'assets/test/cards/card-1.webp?v=1';
const second = 'assets/test/cards/card-2.webp?v=1';
const manifestUrl = 'assets/previews/test.json';
const manifests = {'assets/test/cards/': manifestUrl};
const entries = {[source]: 'assets/previews/card-1.webp', [second]: 'assets/previews/card-2.webp'};
const preview = new URL(entries[source], baseUrl).href;
const deferred = () => {
 let resolve, reject;
 const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
 return {promise, resolve, reject};
};

function fixture(fetchManifest) {
 let time = 0;
 return {
  loader: createCardPreviewLoader({baseUrl, manifests, fetchManifest, now: () => time, retryDelay: 30000}),
  advance(ms) {time += ms;},
 };
}

test('concurrent card previews share one manifest and keep successful metadata cached', async () => {
 const gate = deferred(), urls = [];
 const {loader} = fixture(url => {urls.push(url); return gate.promise;});
 const first = loader.urlFor(source), next = loader.urlFor(second);
 await Promise.resolve();
 assert.deepEqual(urls, [new URL(manifestUrl, baseUrl).href]);
 gate.resolve(entries);
 assert.deepEqual(await Promise.all([first, next]), [preview, new URL(entries[second], baseUrl).href]);
 assert.equal(await loader.urlFor(source), preview);
 assert.equal(urls.length, 1);
});

test('timed-out manifests use originals immediately during cooldown and recover with one later request', async () => {
 let calls = 0;
 const gate = deferred();
 const {loader, advance} = fixture(() => {calls++; return calls === 1 ? gate.promise : entries;});
 const first = loader.urlFor(source), next = loader.urlFor(second);
 gate.reject(new DOMException('Timed out', 'AbortError'));
 assert.deepEqual(await Promise.all([first, next]), [source, second]);
 for (let i = 0; i < 20; i++) assert.equal(await loader.urlFor(source), source);
 assert.equal(calls, 1);
 advance(29999); assert.equal(await loader.urlFor(source), source);
 advance(1);
 assert.deepEqual(await Promise.all([loader.urlFor(source), loader.urlFor(second)]), [preview, new URL(entries[second], baseUrl).href]);
 assert.equal(calls, 2);
});

test('failed preview images fall back to original art and can recover without refreshing the page', async () => {
 let requests = [], fail = true, manifestCalls = 0;
 const {loader, advance} = fixture(() => {manifestCalls++; return entries;});
 const load = async url => {requests.push(url); if (url === preview && fail) throw Error('Temporary image error'); return {url};};
 assert.deepEqual(await loader.load(source, load), {url: source});
 assert.deepEqual(requests, [preview, source]);
 requests = [];
 assert.deepEqual(await loader.load(source, load), {url: source});
 assert.deepEqual(requests, [source]);
 advance(30000); fail = false; requests = [];
 assert.deepEqual(await loader.load(source, load), {url: preview});
 assert.deepEqual(requests, [preview]);
 assert.equal(manifestCalls, 1, 'image failure must not discard valid collection metadata');
});

test('high-resolution, remote, unmatched and missing entries retain original loading behavior', async () => {
 let calls = 0;
 const {loader} = fixture(() => {calls++; return entries;});
 for (const url of ['https://other.test/assets/test/cards/card-1.webp?v=1', 'unmapped.webp']) {
  assert.equal(await loader.urlFor(url), url);
 }
 assert.equal(await loader.urlFor(source, {width: 1000}), source);
 assert.equal(calls, 0);
 assert.equal(await loader.urlFor('assets/test/cards/missing.webp'), 'assets/test/cards/missing.webp');
 assert.equal(calls, 1);
});

test('malformed and repeatedly failing manifests remain retryable without request loops', async () => {
 for (const invalid of [null, [], 'invalid']) {
  let calls = 0;
  const {loader, advance} = fixture(() => {calls++; return calls < 3 ? invalid : entries;});
  assert.equal(await loader.urlFor(source), source);
  advance(30000);
  assert.equal(await loader.urlFor(source), source);
  for (let i = 0; i < 10; i++) assert.equal(await loader.urlFor(source), source);
  assert.equal(calls, 2);
  advance(30000); assert.equal(await loader.urlFor(source), preview);
  assert.equal(calls, 3);
 }
});

test('failure of the original artwork still rejects rather than hiding a broken card', async () => {
 const {loader} = fixture(() => entries);
 const requested = [];
 await assert.rejects(loader.load(source, async url => {requested.push(url); throw Error('Not available');}), /Not available/);
 assert.deepEqual(requested, [preview, source]);
});
