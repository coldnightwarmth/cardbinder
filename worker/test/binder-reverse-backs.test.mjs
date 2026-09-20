import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');

function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}

function opacityContext() {
  const binderCardMeshByPosition = new Map();
  const context = vm.createContext({
    BINDER_CARD_LOAD_FADE_MS: 280,
    BINDER_CARD_PLACEHOLDER_OPACITY: 0.24,
    binderCardMeshByPosition,
    clamp: (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value)),
    easeInOutCubic: value => value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2,
    isShowroomCardHeld: () => false,
    getBinderUnloadedCardOpacity: pageOpacity => pageOpacity * 0.24,
  });
  vm.runInContext(section(
    'function isBinderBackSourceReady(',
    'function getBinderUnloadedCardOpacity(',
  ), context);
  return context;
}

test('paired binder cells create reverse card backs for both page faces', () => {
  const pageSource = section('function createBinderPage(', 'function addClearBinderPageBacking(');
  assert.match(pageSource, /frontCardIndex,\s*-1,\s*backOffset,\s*frontOffset/);
  assert.match(pageSource, /backCardIndex,\s*1,\s*frontOffset,\s*backOffset/);
});

test('reverse card backs only appear after their source card has loaded', () => {
  const context = opacityContext();
  const reverseBack = {
    userData: {
      binderBackRevealPosition: 8,
      binderBackSourcePosition: 1,
    },
  };

  assert.equal(context.getBinderBackRevealOpacity(reverseBack, 0.75, 100), 0);
  context.binderCardMeshByPosition.set(1, {
    userData: {
      binderCard: true,
      cardIndex: 2,
      textureLoaded: false,
      textureLoadFailed: false,
    },
  });
  assert.equal(context.getBinderBackRevealOpacity(reverseBack, 0.75, 100), 0);
  context.binderCardMeshByPosition.get(1).userData.textureLoaded = true;
  assert.equal(context.getBinderBackRevealOpacity(reverseBack, 0.75, 100), 0.75);
  context.binderCardMeshByPosition.get(1).userData.textureLoadFailed = true;
  assert.equal(context.getBinderBackRevealOpacity(reverseBack, 0.75, 100), 0);
});

test('loading fronts stay visible until the reverse-side card is ready', () => {
  const context = opacityContext();
  const reverseBack = {
    userData: {
      binderBackRevealPosition: 8,
      binderBackSourcePosition: 1,
    },
  };
  const loadingFront = { userData: { binderReverseBackMesh: reverseBack } };

  assert.equal(context.getBinderLoadingCardOpacity(loadingFront, 0.75), 0.18);
  context.binderCardMeshByPosition.set(1, {
    userData: {
      binderCard: true,
      cardIndex: 2,
      textureLoaded: true,
      textureLoadFailed: false,
    },
  });
  assert.equal(context.getBinderLoadingCardOpacity(loadingFront, 0.75), 0);
});

test('ready reverse card backs fade away as loaded front artwork fades in', () => {
  const context = opacityContext();
  const reverseBack = {
    userData: {
      binderBackRevealPosition: 2,
      binderBackSourcePosition: 1,
    },
  };
  context.binderCardMeshByPosition.set(1, {
    userData: {
      binderCard: true,
      cardIndex: 3,
      textureLoaded: true,
      textureLoadFailed: false,
    },
  });
  const coveringCard = {
    userData: {
      cardIndex: 4,
      textureLoaded: true,
      textureLoadFailed: false,
      textureFadeComplete: false,
      textureFadeStartedAt: 100,
    },
  };
  context.binderCardMeshByPosition.set(2, coveringCard);
  const midway = context.getBinderBackRevealOpacity(reverseBack, 1, 240);
  assert.ok(midway > 0 && midway < 1);
  coveringCard.userData.textureFadeComplete = true;
  assert.equal(context.getBinderBackRevealOpacity(reverseBack, 1, 400), 0);
});
