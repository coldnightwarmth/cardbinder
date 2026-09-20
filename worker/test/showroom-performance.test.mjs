import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';

const source = readFileSync(new URL('../../showroom.js', import.meta.url), 'utf8');

function implementation(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Could not locate ${start}`);
  return source.slice(first, last);
}

function assertVector(actual, expected, message) {
  assert.ok(actual.distanceTo(expected) < 1e-9, message);
}

test('frozen showroom descendants retain their local pose throughout pickup and return', async () => {
  const scene = new THREE.Scene();
  scene.updateMatrix();
  scene.matrixAutoUpdate = false;
  const group = new THREE.Group();
  group.position.set(3, .838, -5);
  group.rotation.set(-Math.PI / 2, 0, 1.5);
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  scene.add(group);
  const model = new THREE.Group();
  model.scale.setScalar(.13);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(5, 7));
  cover.position.set(.24, .06, .57);
  cover.rotation.y = .4;
  model.add(cover);
  group.add(model);
  const home = group.position.clone();
  const rotation = group.quaternion.clone();
  const destination = new THREE.Vector3(-1.3, 1.4, 2.1);
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.set(-.35, .8, 0);
  const frames = [];
  let renders = 0;
  const context = vm.createContext({
    THREE, scene, camera,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => frames.push(callback),
    pickupPosition: () => destination,
    renderShowroom: () => { renders++; scene.updateMatrixWorld(); },
  });
  vm.runInContext(implementation('  function freezeModel(', '  const uploadedTextures='), context);
  vm.runInContext(implementation('  function tween(', '  async function open('), context);
  context.freezeModel(model);
  scene.updateMatrixWorld();
  const localMatrices = [];
  model.traverse(object => {
    assert.equal(object.matrixAutoUpdate, false);
    assert.equal(object.matrixWorldAutoUpdate, true);
    localMatrices.push([object, object.matrix.clone()]);
  });
  const item = { group, home, rotation };
  const pickup = context.tween(item);
  frames.shift()(275);
  scene.updateMatrixWorld();
  assertVector(group.position, home.clone().lerp(destination, .5), 'halfway pickup position');
  const expectedWorld = group.matrixWorld.clone().multiply(model.matrix).multiply(cover.matrix);
  assert.deepEqual(cover.matrixWorld.elements, expectedWorld.elements);
  frames.shift()(550);
  await pickup;
  assertVector(cover.getWorldPosition(new THREE.Vector3()), new THREE.Vector3().setFromMatrixPosition(
    group.matrixWorld.clone().multiply(model.matrix).multiply(cover.matrix),
  ), 'cover follows the frozen parent matrix at the pickup endpoint');
  assertVector(group.position, destination, 'pickup endpoint');
  assert.ok(group.quaternion.angleTo(camera.quaternion) < 1e-7);
  const returning = context.tween(item, true);
  frames.shift()(550);
  await returning;
  assertVector(group.position, home, 'return endpoint');
  assert.ok(group.quaternion.angleTo(rotation) < 1e-7);
  assert.equal(renders, 2, 'each exact endpoint is painted');
  for (const [object, matrix] of localMatrices) assert.deepEqual(object.matrix.elements, matrix.elements);
});

test('table templates share buffers and retain every vertex at each table position', () => {
  const utils = readFileSync(new URL('../../vendor/BufferGeometryUtils.js', import.meta.url), 'utf8');
  const merger = vm.createContext({ ...THREE, console });
  vm.runInContext(utils.slice(utils.indexOf('function mergeGeometries('), utils.indexOf('export function deepCloneAttribute(')), merger);
  const scene = new THREE.Scene();
  const tables = [];
  const context = vm.createContext({
    THREE, scene, tables, mergeGeometries: merger.mergeGeometries,
    wood: new THREE.MeshStandardMaterial(),
    metal: new THREE.MeshStandardMaterial(),
    trim: new THREE.MeshStandardMaterial(),
  });
  vm.runInContext(implementation('  function box(', '  function createEvilTableGhost('), context);
  vm.runInContext(implementation('  function roundedSlab(', '  const modelQueue='), context);
  const seats = [[-1, 0], [1, 0], [-1, 12], [1, 39]];
  for (const [side, row] of seats) context.addTable(side, row);
  scene.updateMatrixWorld();
  assert.equal(scene.children.length, seats.length * 4);
  const templates = scene.children.slice(0, 4);
  for (let table = 0; table < seats.length; table++) {
    const [side, row] = seats[table];
    assert.deepEqual({ ...tables[table] }, { x: side * 3, z: -row * 5 });
    for (let part = 0; part < 4; part++) {
      const mesh = scene.children[table * 4 + part];
      const template = templates[part];
      assert.equal(mesh.geometry, template.geometry, 'identical table parts reuse one geometry');
      assert.equal(mesh.material, template.material, 'theme materials remain shared');
      assert.equal(mesh.matrixAutoUpdate, false);
      assert.ok(mesh.geometry.boundingSphere, 'culling bounds are ready before first render');
      const positions = template.geometry.attributes.position;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const local = new THREE.Vector3().fromBufferAttribute(positions, vertex);
        const actual = local.clone().applyMatrix4(mesh.matrixWorld);
        const expected = local.add(new THREE.Vector3(side * 3, 0, -row * 5));
        assertVector(actual, expected, 'template vertices retain world placement');
      }
    }
  }
  const woodBounds = new THREE.Box3().setFromObject(templates[0]);
  assert.ok(Math.abs(woodBounds.min.x - (-3 - .85 - .006)) < 1e-6);
  assert.ok(Math.abs(woodBounds.max.z - (2.25 + .006)) < 1e-6);
});

function createPicker(binders) {
  const camera = new THREE.PerspectiveCamera(65, 1, .05, 600);
  const ray = new THREE.Raycaster();
  let casts = 0;
  const intersect = ray.intersectObjects.bind(ray);
  ray.intersectObjects = (...args) => { casts++; return intersect(...args); };
  const context = vm.createContext({ THREE, camera, binders, ray, sceneDirty: true, portal: { inside: false, nearThreshold: false } });
  vm.runInContext(implementation('  const pickTargets=', "  window.addEventListener('scene-transition-start'"), context);
  return { context, camera, ray, casts: () => casts };
}

function binderAt(z, { x = 0, scale = 1, rotation = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  group.add(new THREE.Mesh(new THREE.CircleGeometry(.5, 48), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  const item = { group, home: group.position.clone() };
  group.traverse(object => { object.userData.binder = item; });
  return item;
}

test('showroom picking reuses exact hits and invalidates on pointer, camera, and model changes', () => {
  const item = binderAt(-2);
  const { context, camera, casts } = createPicker([item]);
  const center = new THREE.Vector2();
  assert.equal(context.pickBinder(center), item);
  context.sceneDirty = false;
  const initial = casts();
  for (let frame = 0; frame < 120; frame++) assert.equal(context.pickBinder(center), item);
  assert.equal(casts(), initial, 'stationary frames do not repeat triangle intersections');
  assert.equal(context.pickBinder(new THREE.Vector2(.9, .9)), null);
  assert.equal(casts(), initial + 1);
  assert.equal(context.pickBinder(center), item);
  camera.position.x = 2;
  assert.equal(context.pickBinder(center), null);
  camera.position.x = 0;
  assert.equal(context.pickBinder(center), item);
  camera.rotation.y = Math.PI;
  assert.equal(context.pickBinder(center), null);
  camera.rotation.y = 0;
  assert.equal(context.pickBinder(center), item);
  const beforeReplacement = casts();
  item.group.children[0].position.x = 2;
  context.sceneDirty = true;
  assert.equal(context.pickBinder(center), null, 'new model transforms are updated before raycasting');
  assert.equal(casts(), beforeReplacement + 1);
  context.sceneDirty = false;
  context.pickBinder(center);
  assert.equal(casts(), beforeReplacement + 1);
});

test('showroom picking retains exact silhouettes, nearest-hit ordering, and reach across transformed binders', () => {
  const far = binderAt(-2.4, { scale: 1.2, rotation: .4 });
  const near = binderAt(-1.6, { x: .15, scale: .8, rotation: -.35 });
  const unreachable = binderAt(-3.1, { x: -.7 });
  const binders = [far, unreachable, near];
  const { context, camera } = createPicker(binders);
  const baseline = new THREE.Raycaster();
  baseline.far = 2.7;
  for (let x = -.8; x <= .8; x += .08) for (let y = -.7; y <= .7; y += .07) {
    const point = new THREE.Vector2(x, y);
    camera.updateMatrixWorld();
    for (const item of binders) item.group.updateWorldMatrix(true, true);
    baseline.setFromCamera(point, camera);
    const expected = baseline.intersectObjects(binders.map(item => item.group), true)[0]?.object.userData.binder || null;
    assert.equal(context.pickBinder(point), expected);
  }
  assert.equal(context.pickBinder(new THREE.Vector2()), near, 'nearest cover wins regardless of directory order');
  const isolated = binderAt(-2);
  const picker = createPicker([isolated]);
  picker.camera.updateMatrixWorld();
  const corner = new THREE.Vector3(.45, .45, -2).project(picker.camera);
  assert.equal(picker.context.pickBinder(new THREE.Vector2(corner.x, corner.y)), null, 'empty silhouette corners remain unclickable');
  isolated.group.position.z = -3;
  isolated.home.z = -3;
  picker.context.sceneDirty = true;
  assert.equal(picker.context.pickBinder(new THREE.Vector2()), null, 'reach stays limited to 2.7 meters');
});

function createModelScheduler(extra = {}) {
  const context = vm.createContext({
    THREE, active: null, busy: false, portal: { inside: false, nearThreshold: false }, document: { hidden: false },
    camera: new THREE.PerspectiveCamera(), scene: new THREE.Scene(), ...extra,
    renderer: { initTexture() {}, compileAsync: async () => {}, ...extra.renderer },
  });
  vm.runInContext(implementation('  const modelQueue=', '  function addBinder('), context);
  return context;
}

test('showroom model work runs one task per frame and pauses during browsing, transitions, and hidden tabs', async () => {
  const context = createModelScheduler();
  const completed = [];
  const first = context.scheduleModelWork(() => { completed.push('first'); return 42; });
  const second = context.scheduleModelWork(() => completed.push('second'));
  for (const state of ['active', 'busy', 'hidden']) {
    if (state === 'hidden') context.document.hidden = true;
    else context[state] = true;
    context.flushModelWork();
    assert.equal(completed.length, 0, `${state} defers builds and uploads`);
    if (state === 'hidden') context.document.hidden = false;
    else context[state] = false;
  }
  context.portal.nearThreshold=true;
  context.flushModelWork();
  assert.equal(completed.length,0,'doorway crossings defer builds and uploads');
  context.portal.nearThreshold=false;
  context.flushModelWork();
  assert.deepEqual(completed, ['first']);
  assert.equal(await first, 42);
  context.flushModelWork();
  await second;
  assert.deepEqual(completed, ['first', 'second']);
  const failure = context.scheduleModelWork(() => { throw new Error('upload failed'); });
  const rejection = assert.rejects(failure, /upload failed/);
  const recovered = context.scheduleModelWork(() => completed.push('recovered'));
  context.flushModelWork();
  await rejection;
  context.flushModelWork();
  await recovered;
  assert.equal(completed.at(-1), 'recovered');
});

test('model texture preparation uploads each version once, with distinct uploads on separate frames', async () => {
  const uploads = [];
  const context = createModelScheduler({ renderer: { initTexture: texture => uploads.push(texture) } });
  const front = new THREE.Texture();
  const back = new THREE.Texture();
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial({ map: front, emissiveMap: front })));
  model.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: back })));
  const prepared = context.prepareModel(model);
  assert.equal(uploads.length, 0);
  context.flushModelWork();
  assert.deepEqual(uploads, [front]);
  await Promise.resolve();
  context.flushModelWork();
  await Promise.resolve();
  context.flushModelWork();
  await prepared;
  assert.deepEqual(uploads, [front, back]);
  const cached = context.prepareModel(model);
  context.flushModelWork();
  await cached;
  assert.equal(uploads.length, 2, 'shared textures already uploaded by this renderer are reused');
  front.needsUpdate = true;
  const updated = context.prepareModel(model);
  context.flushModelWork();
  await Promise.resolve();
  context.flushModelWork();
  await updated;
  assert.deepEqual(uploads, [front, back, front], 'changed texture contents are uploaded again');
});

test('nearby model discovery and workers stay paused until the show floor resumes', () => {
  const item = { home: new THREE.Vector3(0, 0, -2), entry: {} };
  let loads = 0;
  const context = createModelScheduler({
    binders: [item], camera: new THREE.PerspectiveCamera(),
    performance: { now: () => 1000 },
    bridge: { model: () => { loads++; return new Promise(() => {}); } },
  });
  for (const state of ['active', 'busy', 'hidden']) {
    if (state === 'hidden') context.document.hidden = true;
    else context[state] = true;
    context.updateNearbyModels();
    context.pumpModels();
    assert.equal(loads, 0);
    assert.equal(item.modelQueued, undefined);
    if (state === 'hidden') context.document.hidden = false;
    else context[state] = false;
  }
  context.updateNearbyModels();
  assert.equal(loads, 1);
  assert.equal(item.modelQueued, true);
  context.updateNearbyModels();
  assert.equal(loads, 1, 'an in-flight model is not fetched twice');
});
