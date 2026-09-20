import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import * as THREE from "../../vendor/three.module.min.js";
import { createShowroomCache } from "../../showroom-cache.mjs";

const source = readFileSync(new URL("../../app.js", import.meta.url), "utf8");

function section(first, next) {
  const start = source.indexOf(first);
  const end = source.indexOf(next, start + first.length);
  assert.ok(start >= 0 && end > start, `Missing implementation: ${first}`);
  return source.slice(start, end);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("card and binder image consumers share a request, promote priority, and wait for decode", async () => {
  const images = [];
  class Image {
    fetchPriority = "auto";
    decodingWork = deferred();
    constructor() { images.push(this); }
    decode() { return this.decodingWork.promise; }
  }
  const context = vm.createContext({ Image, textureImageLoads: new Map() });
  vm.runInContext(section("function loadTextureImage(", "async function loadHighPriorityTexture("), context);
  const first = context.loadTextureImage("card.webp");
  const foreground = context.loadTextureImage("card.webp", { fetchPriority: "high" });
  assert.equal(first, foreground);
  assert.equal(images.length, 1);
  assert.equal(images[0].fetchPriority, "high");
  assert.equal(images[0].crossOrigin, "anonymous");
  assert.equal(images[0].decoding, "async");
  let ready = false;
  first.then(() => { ready = true; });
  const loading = images[0].onload();
  await Promise.resolve();
  assert.equal(ready, false, "onload must not resolve before the decode completes");
  images[0].decodingWork.resolve();
  await loading;
  assert.equal(await first, images[0]);
  assert.equal(context.textureImageLoads.size, 0, "completed images must not create an unbounded cache");
  assert.equal(images[0].onload, null);
});

test("image load failures can retry, and decode rejection retains the loaded-image fallback", async () => {
  const images = [];
  class Image {
    fetchPriority = "auto";
    constructor() { images.push(this); }
    decode() { return Promise.reject(new Error("decode unavailable")); }
  }
  const context = vm.createContext({ Image, textureImageLoads: new Map() });
  vm.runInContext(section("function loadTextureImage(", "async function loadHighPriorityTexture("), context);
  const first = context.loadTextureImage("card.webp");
  images[0].onerror();
  await assert.rejects(first, /Unable to load texture/);
  const retry = context.loadTextureImage("card.webp");
  assert.equal(images.length, 2);
  await images[1].onload();
  assert.equal(await retry, images[1]);
  assert.equal(context.textureImageLoads.size, 0);
});

test("gallery batches yield during node creation and resume without dropping or reordering cards", () => {
  for (const deadline of [{ didTimeout: true }, { didTimeout: false, timeRemaining: () => 0 }]) {
    let elapsed = 0;
    const appended = [];
    const document = {
      createDocumentFragment: () => ({ nodes: [], append(node) { this.nodes.push(node); } }),
      createElement: tag => {
        elapsed += 0.6;
        return { tag, dataset: {}, children: [], setAttribute() {}, append(child) { this.children.push(child); } };
      },
    };
    const context = vm.createContext({
      document, performance: { now: () => elapsed }, GALLERY_RENDER_TIME_BUDGET_MS: 4,
      CARDS: Array.from({ length: 20 }, (_, index) => ({ title: `Card ${index}` })),
      cardAssetUrl: card => `${card.title}.webp`,
      els: { galleryGrid: { insertBefore: fragment => appended.push(...fragment.nodes) } },
    });
    vm.runInContext(section("function appendGalleryCardRange(", "function beginGalleryIncrementalRender("), context);
    const indexes = Array.from({ length: 20 }, (_, index) => index);
    let end = context.appendGalleryCardRange(indexes, 0, indexes.length, 3, null, deadline);
    assert.ok(end > 0 && end < indexes.length, "a busy main thread must make bounded forward progress");
    while (end < indexes.length) end = context.appendGalleryCardRange(indexes, end, indexes.length, 3, null, deadline);
    assert.deepEqual(appended.map(card => Number(card.dataset.cardIndex)), indexes);
    assert.deepEqual(appended.map(card => card.children[0].children[0].loading), indexes.map(index => index < 3 ? "eager" : "lazy"));
  }
});

test("gallery hover stops requesting frames at its target, resumes on movement, and resets on exit", () => {
  const frames = [];
  const style = new Map();
  const classes = new Set();
  const card = {
    isConnected: true,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 140 }),
    classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
    style: { setProperty: (key, value) => style.set(key, value), removeProperty: key => style.delete(key) },
  };
  const context = vm.createContext({
    galleryTiltFrame: 0, galleryTiltStates: new Map(), activeGalleryTiltCard: null,
    GALLERY_CARD_TILT_SPRING: 0.14, GALLERY_CARD_TILT_DAMPING: 0.76,
    GALLERY_CARD_TILT_SETTLE_EPSILON: 0.02,
    GALLERY_CARD_TILT_MAX_X_DEG: 12.5, GALLERY_CARD_TILT_MAX_Y_DEG: 15.5,
    requestAnimationFrame: callback => { frames.push(callback); return 1; },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  });
  vm.runInContext(section("function updateGalleryCardTiltTarget(", "function clearGalleryCardTilts("), context);
  const settle = () => {
    let count = 0;
    while (frames.length && count++ < 200) frames.shift()();
    assert.ok(count < 200, "resting hover must not keep the animation loop alive");
    assert.equal(context.galleryTiltFrame, 0);
  };
  context.updateGalleryCardTiltTarget(card, { clientX: 90, clientY: 20 });
  settle();
  assert.equal(style.get("--gallery-card-tilt-y"), "6.200deg");
  assert.equal(classes.has("is-gallery-tilting"), true);
  context.updateGalleryCardTiltTarget(card, { clientX: 10, clientY: 120 });
  settle();
  assert.equal(style.get("--gallery-card-tilt-y"), "-6.200deg");
  context.releaseGalleryCardTilt(card);
  settle();
  assert.equal(style.size, 0);
  assert.equal(classes.size, 0);
  assert.equal(context.galleryTiltStates.size, 0);
});

test("binder uploads are budgeted before hidden-page display and retain the render fallback", () => {
  for (const fails of [false, true]) {
    let elapsed = 0;
    const uploads = [];
    const textures = [{}, {}, {}];
    const meshes = textures.map((texture, cardIndex) => ({
      material: { opacity: 0 }, userData: { cardIndex, textureLoading: true },
    }));
    const queue = textures.map((texture, position) => ({ texture, position, token: 7 }));
    const scheduled = [];
    const context = vm.createContext({
      performance: { now: () => elapsed }, binderTextureApplyFrame: 1,
      binderTextureApplyQueue: queue, binderTextureApplyPositions: new Set([0, 1, 2]),
      galleryOpen: true, isBinderMode: true, binderRoot: {}, els: { binderPanel: { hidden: false } },
      BINDER_TEXTURE_APPLY_IDLE_BUDGET: 2, BINDER_TEXTURE_APPLY_TIME_BUDGET_MS: 4,
      BINDER_TEXTURE_APPLY_BATCH_DELAY_MS: 34, BINDER_TEXTURE_APPLY_DEFER_MS: 120,
      binderCardMeshByPosition: new Map(meshes.map((mesh, index) => [index, mesh])),
      binderBuildToken: 7, CARDS: [{}, {}, {}],
      binderRenderer: { initTexture: texture => {
        uploads.push(texture); elapsed += 5;
        if (fails) throw new Error("driver refused eager upload");
      } },
      shouldDeferBinderTextureEntry: () => false,
      requestBinderTextureApplyFlush: delay => scheduled.push(delay),
      startBinderRenderLoop() {}, pumpBinderTextureQueue() {},
      getBinderPageOpacityForPosition: () => 0, getBinderUnloadedCardOpacity: () => 0,
      prepareTextureForImmediateDisplay() {}, applyBinderCardAspectFit() {},
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    });
    vm.runInContext(section("function flushBinderTextureApplyQueue(", "function clearBinderTextureApplyQueue("), context);
    context.flushBinderTextureApplyQueue(0);
    assert.equal(uploads.length, 1, "an expensive upload must defer the next one");
    assert.equal(queue.length, 2);
    assert.equal(meshes[0].material.map, textures[0], "the normal renderer remains a fallback after upload failure");
    assert.equal(meshes[0].userData.textureLoaded, true);
    assert.equal(meshes[0].material.opacity, 0, "warming a hidden page must not reveal it");
    assert.deepEqual(scheduled, [34]);
    context.flushBinderTextureApplyQueue(5);
    context.flushBinderTextureApplyQueue(10);
    assert.equal(queue.length, 0);
    assert.equal(uploads.length, 3);
  }
});

test("instanced showroom pages retain every page transform, bounds, shadows, and picking", () => {
  const context = vm.createContext({
    THREE, ACTIVE_COLLECTION_ID: "test", BINDER_CLOSED_COVER_CENTER_X: 2,
    BINDER_COVER_Z: 0.1, BINDER_COVER_THICKNESS: 0.04,
    BINDER_PAGE_WIDTH: 4, BINDER_PAGE_HEIGHT: 6, BINDER_PAGE_SLOTS: 18,
    createBinderCoverShellModel: () => ({
      shell: new THREE.Group(), coverHeight: 6.2,
      walletCoverArtwork: {}, walletBackCoverArtwork: {},
      leftCover: { material: new THREE.MeshStandardMaterial() },
      rightCover: { material: new THREE.MeshStandardMaterial() },
      spine: { material: new THREE.MeshStandardMaterial() },
    }),
    applyBinderShellClosureGeometry() {},
  });
  vm.runInContext([
    section("function createShowroomBinderModel(", "async function prepareRestoredLazyData("),
    section("function createRoundedCoreGeometry(", "function createBinderCoverPanelGeometry("),
    section("function createRoundedShape(", "function addPaperNoise("),
  ].join("\n"), context);
  for (const cardCount of [1, 18, 19, 120, 10000]) {
    const model = context.createShowroomBinderModel(null, cardCount);
    const pages = model.children[0].children[0];
    const count = Math.min(10, Math.max(1, Math.ceil(cardCount / 18)));
    assert.equal(pages.isInstancedMesh, true);
    assert.equal(pages.count, count);
    assert.equal(pages.castShadow, true);
    assert.equal(pages.receiveShadow, true);
    const legacy = new THREE.Group();
    for (let index = 0; index < count; index++) {
      const matrix = new THREE.Matrix4();
      pages.getMatrixAt(index, matrix);
      const expected = new THREE.Matrix4().makeTranslation(2, 0, -0.20 + index * 0.023);
      matrix.elements.forEach((value, offset) => assert.ok(Math.abs(value - expected.elements[offset]) < 1e-6));
      const leaf = new THREE.Mesh(pages.geometry, pages.material);
      leaf.position.set(2, 0, -0.20 + index * 0.023);
      legacy.add(leaf);
    }
    // Compare both stacks in the same local coordinate system, independent of the cover shell.
    pages.removeFromParent(); pages.updateMatrixWorld(true); legacy.updateMatrixWorld(true);
    const actualBounds = new THREE.Box3().setFromObject(pages);
    const expectedBounds = new THREE.Box3().setFromObject(legacy);
    assert.ok(actualBounds.min.distanceTo(expectedBounds.min) < 1e-6);
    assert.ok(actualBounds.max.distanceTo(expectedBounds.max) < 1e-6);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(2, 0, 2), new THREE.Vector3(0, 0, -1));
    const hit = raycaster.intersectObject(pages)[0];
    const priorHit = raycaster.intersectObject(legacy)[0];
    assert.ok(hit && priorHit);
    assert.ok(Math.abs(hit.distance - priorHit.distance) < 1e-6);
    pages.dispose(); pages.geometry.dispose(); pages.material.dispose();
  }
});

async function createArtworkBridgeHarness({ artworkEnabled = true, compositionGate = null } = {}) {
  const composed = new Map();
  const disposed = new Set();
  const createTexture = (address, surface) => {
    const texture = new THREE.Texture({ address, surface, width: 1024, height: 1400 });
    texture.addEventListener("dispose", () => disposed.add(texture));
    const key = `${address}:${surface}`;
    const textures = composed.get(key) || [];
    textures.push(texture);
    composed.set(key, textures);
    return texture;
  };
  const context = vm.createContext({
    createShowroomCache,
    BINDER_COVER_OUTER_X: 4, BINDER_COVER_SPINE_WIDTH: 0.2,
    BINDER_PAGE_HEIGHT: 6, BINDER_COVER_VERTICAL_OVERHANG: 0.2,
    BINDER_SIDE_SLOTS: 9, COMMUNITY_COVER_COLLECTION_ORDER: [],
    WALLET_PUBLIC_API_BASE_URL: "https://example.test/api", CARDS: [],
    getPublicWalletBinder: async (base, address) => ({ cover: { address, artworkEnabled }, cardOrder: [], tradeCardIds: [] }),
    fetchLiveWalletHoldingsPayload: async () => ({ mints: [], cardRefs: [], swagPackAssets: [] }),
    normalizeBinderCoverSettings: settings => settings,
    getBinderCoverSurfaceTextureKey: (settings, surface) => settings.artworkEnabled ? `${settings.address}:${surface}` : "",
    createBinderCoverSurfaceTexture: async (settings, surface) => {
      if (compositionGate && settings.address === "primary") await compositionGate.promise;
      return createTexture(settings.address, surface);
    },
    createShowroomInsideTexture: async settings => createTexture(settings.address, "inside"),
    createShowroomBinderModel: artwork => ({ artwork, userData: {} }),
    ensureAllCollectionCards: async () => [],
    addWalletCardMatches() {}, getCardMatchesForMints: () => [], getCardMatchesForReferences: () => [],
    orderWalletCardIndexes: indexes => indexes,
    primeWalletBinderRoute() {}, refreshWalletBinderCoverRendering() {},
    normalizeWalletSwagPackAssets: assets => assets,
    applyWalletCardFilter() {}, setGalleryOpen() {}, setBinderTableView() {}, scheduleWalletHoldingsRefresh() {},
  });
  // Use the real cache; only replace the module import in this isolated VM.
  vm.runInContext(section("async function createShowroomBridge(", "async function createShowroomInsideTexture(")
    .replace('  const { createShowroomCache } = await import("./showroom-cache.mjs");', ""), context);
  return { bridge: await context.createShowroomBridge(), context, composed, disposed };
}

test("simultaneous showroom model and prefetch share cover composition while owning independent texture handles", async () => {
  const compositionGate = deferred();
  const { bridge, context, composed, disposed } = await createArtworkBridgeHarness({ compositionGate });
  const entry = { walletAddress: "primary", supportedCardCount: 2 };
  const modelPromise = bridge.model(entry);
  const prefetchPromise = bridge.prefetch(entry);
  compositionGate.resolve();
  const [model] = await Promise.all([modelPromise, prefetchPromise]);
  await bridge.open(entry);
  const frontOwner = composed.get("primary:front")[0];
  const backOwner = composed.get("primary:back")[0];
  const viewerFront = context.binderWalletCoverArtworkTexture;
  const viewerBack = context.binderWalletBackCoverArtworkTexture;
  const viewerInside = context.binderIntroNoteTexture;
  assert.equal(composed.get("primary:front").length, 1);
  assert.equal(composed.get("primary:back").length, 1);
  assert.equal(composed.get("primary:inside").length, 1);
  for (const [owner, floorTexture, viewerTexture] of [
    [frontOwner, model.artwork.front, viewerFront],
    [backOwner, model.artwork.back, viewerBack],
  ]) {
    assert.notEqual(floorTexture, owner);
    assert.notEqual(viewerTexture, owner);
    assert.notEqual(floorTexture, viewerTexture);
    assert.equal(floorTexture.source, owner.source);
    assert.equal(viewerTexture.source, owner.source);
  }
  assert.deepEqual(Array.from(model.userData.ownedTextures), [model.artwork.front, model.artwork.back]);
  let floorDisposed = 0, viewerDisposed = 0;
  model.userData.ownedTextures.forEach(texture => texture.addEventListener("dispose", () => floorDisposed++));
  [viewerFront, viewerBack, viewerInside].forEach(texture => texture.addEventListener("dispose", () => viewerDisposed++));
  // Evict the primary wallet from both artwork caches while its floor model and viewer remain visible.
  for (let index = 0; index < 17; index++) await bridge.prefetch({ walletAddress: `later-${index}` });
  assert.equal(disposed.has(frontOwner), true);
  assert.equal(disposed.has(backOwner), true);
  assert.equal(disposed.has(composed.get("primary:inside")[0]), true);
  assert.equal(floorDisposed, 0);
  assert.equal(viewerDisposed, 0);
  assert.equal(model.artwork.front.image.address, "primary");
  assert.equal(viewerFront.image.address, "primary");
  assert.equal(viewerInside.image.surface, "inside");
  model.userData.ownedTextures.forEach(texture => texture.dispose());
  assert.equal(floorDisposed, 2);
  assert.equal(viewerDisposed, 0, "floor eviction must not dispose the opened viewer's handles");
  assert.equal(viewerBack.image.width, 1024);
});

test("blank showroom covers stay blank on the floor and create valid textures for the opened viewer", async () => {
  const { bridge, context, composed } = await createArtworkBridgeHarness({ artworkEnabled: false });
  const entry = { walletAddress: "blank", supportedCardCount: 1 };
  const [model] = await Promise.all([bridge.model(entry), bridge.prefetch(entry)]);
  assert.equal(model.artwork.front, null);
  assert.equal(model.artwork.back, null);
  assert.equal(model.userData.ownedTextures.length, 0);
  await bridge.open(entry);
  assert.ok(context.binderWalletCoverArtworkTexture.isTexture);
  assert.ok(context.binderWalletBackCoverArtworkTexture.isTexture);
  assert.ok(context.binderIntroNoteTexture.isTexture);
  assert.equal(context.binderWalletCoverArtworkSource, "");
  assert.equal(context.binderWalletBackCoverArtworkSource, "");
  assert.equal(composed.get("blank:front").length, 1);
  assert.equal(composed.get("blank:back").length, 1);
});
