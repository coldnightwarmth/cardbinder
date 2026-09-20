import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';

const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
function navigation({ touch = true, evil = false } = {}) {
  const context = vm.createContext({
    THREE, navigator: { maxTouchPoints: touch ? 1 : 0 },
    BINDER_COLUMNS: 3, BINDER_ROWS: 3, BINDER_SIDE_SLOTS: 9, BINDER_PAGE_SLOTS: 18,
    BINDER_SINGLE_PAGE_COVER_SIDE: -1,
    BINDER_FOCUS_SWIPE_MIN_DISTANCE: 32, BINDER_FOCUS_SWIPE_MAX_OFF_AXIS_RATIO: .6,
    binderVisibleIndexes: Array.from({ length: 54 }, (_, i) => i), binderPageCount: 3,
    binderFocusPosition: -1, binderTargetTurn: 0, binderTargetClosure: -1,
    binderTurn: 0, binderClosure: -1, binderSinglePageSide: -1,
    binderSinglePageSideTouched: false, binderOuterFlipState: null,
    binderSpreadPreparationToken: 0, binderPreparingSpread: false, binderBendDirection: 1,
    binderLastOpenTap: null,
    clamp: (n, low, high) => Math.max(low, Math.min(high, n)),
    usesEvilBinderPresentation: () => evil,
    isBinderSinglePageView: () => true,
    isTouchLikePointer: event => event.pointerType === 'touch',
    updateBinderPageControls() {}, startBinderRenderLoop() {}, updateBinderAnimation() {},
    markBinderInteractionActive() {}, beginBinderOuterFlip() {},
  });
  context.isBinderFocused = () => context.binderFocusPosition >= 0;
  context.focusBinderPosition = position => { context.binderFocusPosition = position; };
  context.setBinderClosureTarget = closure => { context.binderTargetClosure = closure; };
  for (const [start, end] of [
    ['function getBinderTargetClosedSide(', 'function setBinderClosureTarget('],
    ['function handleBinderClosureNavigation(', 'function beginBinderOuterFlip('],
    ['function turnBinderSinglePage(', 'function turnBinderPage('],
    ['function getBinderTurnForPosition(', 'function getBinderSinglePageSideForPosition('],
    ['function showBinderSinglePageSide(', 'function isBinderSinglePageView('],
    ['function getBinderTotalPageSides(', 'function getBinderSinglePageCenterX('],
    ['function getBinderFocusedGridPosition(', 'async function jumpFocusedBinderCard('],
    ['function handleFocusedBinderSwipe(', 'function handleBinderSinglePageSwipe('],
  ]) vm.runInContext(section(start, end), context);
  return context;
}

test('focused grid coordinates match the actual front and turned-back page placement', () => {
  const context = navigation();
  Object.assign(context, {
    BINDER_PAGE_INNER_MARGIN: .3, BINDER_CELL_WIDTH: 1, BINDER_GRID_GAP: .1,
    BINDER_PAGE_HEIGHT: 6, BINDER_PAGE_VERTICAL_MARGIN: .3, BINDER_CELL_HEIGHT: 1.5,
  });
  vm.runInContext(section('function getBackSideSlot(', 'function addBinderPageSheets('), context);
  const spread = [];
  for (const back of [true, false]) {
    const page = new THREE.Group();
    page.rotation.y = back ? -Math.PI : 0;
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      const cell = context.createBinderCell(row, column);
      page.add(cell.group);
      const position = back ? 9 + context.getBackSideSlot(row, column) : 18 + row * 3 + column;
      spread.push({ position, cell: cell.group, row });
    }
    page.updateMatrixWorld(true);
  }
  for (let row = 0; row < 3; row++) {
    const ordered = spread.filter(cell => cell.row === row).sort((a, b) =>
      a.cell.getWorldPosition(new THREE.Vector3()).x - b.cell.getWorldPosition(new THREE.Vector3()).x);
    ordered.forEach(({ position }, column) => {
      const spot = context.getBinderFocusedGridPosition(position);
      assert.equal(spot.spreadColumn, column);
      assert.equal(context.getBinderPositionForSpreadSpot(spot), position);
    });
  }
});

test('touch swipes keep their left-page behavior and move consistently across the spine and right page', () => {
  const context = navigation();
  const swipe = (dx, dy = 0) => context.handleFocusedBinderSwipe(
    { startX: 200, startY: 300 }, { clientX: 200 + dx, clientY: 300 + dy, pointerType: 'touch' });
  for (let row = 0; row < 3; row++) {
    const positions = [9, 10, 11, 18, 19, 20].map(n => n + row * 3);
    context.binderFocusPosition = positions[0];
    for (const expected of positions.slice(1)) {
      assert.equal(swipe(-70), true);
      assert.equal(context.binderFocusPosition, expected);
    }
    for (const expected of positions.slice(0, -1).reverse()) {
      swipe(70);
      assert.equal(context.binderFocusPosition, expected);
    }
  }
  for (const first of [9, 18]) {
    context.binderFocusPosition = first;
    swipe(0, -70); assert.equal(context.binderFocusPosition, first + 3);
    swipe(0, 70); assert.equal(context.binderFocusPosition, first);
    assert.equal(swipe(5), false);
    assert.equal(context.binderFocusPosition, first);
  }
});

test('touch opening a non-Evil binder skips to page 1 but retains both directions through the inside cover', () => {
  const context = navigation();
  context.turnBinderSinglePage(1);
  assert.equal(context.binderTargetClosure, 0);
  assert.equal(context.getBinderSinglePageSide(), 0);
  assert.equal(context.binderTargetTurn, 0);
  context.turnBinderSinglePage(-1);
  assert.equal(context.getBinderSinglePageSide(), -1);
  assert.equal(context.binderTargetClosure, 0, 'inside cover remains open');
  context.turnBinderSinglePage(1);
  assert.equal(context.getBinderSinglePageSide(), 0);
  context.turnBinderSinglePage(-1);
  context.turnBinderSinglePage(-1);
  assert.equal(context.binderTargetClosure, -1, 'the next backward step closes the binder');
});

test('Evil Biscuit and non-touch opening retain the inside cover, and later page turns retain their order', () => {
  for (const options of [{ evil: true }, { touch: false }]) {
    const context = navigation(options);
    context.turnBinderSinglePage(1);
    assert.equal(context.binderTargetClosure, 0);
    assert.equal(context.getBinderSinglePageSide(), -1);
    for (let side = 0; side < 6; side++) {
      context.turnBinderSinglePage(1);
      assert.equal(context.getBinderSinglePageSide(), side);
    }
    context.turnBinderSinglePage(1);
    assert.equal(context.binderTargetClosure, 1);
  }
});
