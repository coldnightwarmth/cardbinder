import test from 'node:test';
import assert from 'node:assert/strict';
import { seatFor, canWalkAt, facingStart } from '../../showroom-layout.mjs';

test('wallet and collection rows grow independently with three nearest-first seats per table', () => {
  for (const side of [-1, 1]) {
    const seats = new Set(), tables = new Map();
    for (let i = 0; i < 600; i++) {
      const seat = seatFor(i, side);
      assert.equal(seat.side, side);
      assert.equal(seat.slot, 2 - i % 3);
      const key = `${seat.side}:${seat.row}`;
      seats.add(`${key}:${seat.slot}`);
      tables.set(key, (tables.get(key) || 0) + 1);
    }
    assert.equal(seats.size, 600);
    assert.equal(tables.size, 200);
    assert.ok([...tables.values()].every(count => count === 3));
    assert.deepEqual(seatFor(600, side), {side,row:200,slot:2});
  }
  assert.deepEqual(seatFor(0), {side:-1,row:0,slot:2});
});

test('walking preserves the central aisle and blocks tables while allowing the open floor', () => {
  const tables = [{x:-3,z:0},{x:3,z:0},{x:-3,z:-5},{x:3,z:-5}];
  assert.ok(canWalkAt(0,3.5,-13,tables));
  for(let z = 3; z > -12; z--) assert.ok(canWalkAt(0,z,-13,tables));
  for(const {x,z} of tables) assert.equal(canWalkAt(x,z,-13,tables),false);
  assert.equal(canWalkAt(7,0,-13,tables),true);
  assert.equal(canWalkAt(0,8,-13,tables),true);
  assert.equal(canWalkAt(0,-13,-13,tables),true);
  assert.equal(canWalkAt(0,-14,-23,tables),true);
});


test('binders stay aligned toward the aisle with stable subtle variation', () => {
  const angles = new Set();
  for (const x of [-3, 3]) for (let index = 0; index < 100; index++) {
    const z = -index * 1.4;
    const angle = facingStart(x, z, index);
    const straight = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    assert.ok(Math.abs(angle - straight) <= .06);
    assert.equal(angle, facingStart(x, z, index));
    angles.add(angle);
  }
  assert.equal(angles.size, 200);
});

import { createShowroomCache } from '../../showroom-cache.mjs';
test('prefetch shares in-flight requests, expires results, and retries failures', async () => {
  let time = 0, calls = 0;
  const get = createShowroomCache(async key => {
    calls++;
    if (key === 'failure') throw new Error('offline');
    return key;
  }, {ttl: 100, now: () => time});
  const first = get('wallet');
  assert.equal(get('wallet'), first);
  assert.equal(await first, 'wallet');
  await get('wallet'); assert.equal(calls, 1);
  time = 101; await get('wallet'); assert.equal(calls, 2);
  await assert.rejects(get('failure'));
  await assert.rejects(get('failure'));
  assert.equal(calls, 4);
});

import * as THREE from '../../vendor/three.module.min.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('pickup cover projects onto the viewer target from different player poses and viewport shapes', () => {
  const source = readFileSync(new URL('../../showroom.js', import.meta.url), 'utf8');
  const implementation = source.slice(source.indexOf('  function pickupPosition('), source.indexOf('  function tween('));
  for (const aspect of [.52, 1, 16/9, 2.4]) for (const yaw of [-1.2, 0, 1.1]) {
    const camera = new THREE.PerspectiveCamera(65, aspect, .05, 600);
    camera.position.set(-1.6, 1.65, -3.8);
    camera.rotation.order = 'YXZ'; camera.rotation.set(-.48, yaw, 0);
    camera.updateMatrixWorld(true);
    const group = new THREE.Group(), model = new THREE.Group();
    group.position.set(3, .838, -5); group.rotation.set(-Math.PI/2, 0, 1.5);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.67, .94));
    face.name = 'showroom-front-cover'; face.position.set(.031, .007, .075);
    model.add(face); group.add(model);
    const frame = {center:{x:.025,y:.13},top:{x:.025,y:.83},bottom:{x:.025,y:-.57}};
    const context = vm.createContext({ THREE, camera, bridge:{pickupFrame:()=>frame} });
    vm.runInContext(implementation, context);
    const destination = context.pickupPosition({group,model});
    group.position.copy(destination);group.quaternion.copy(camera.quaternion);group.updateMatrixWorld(true);
    for (const [y,target] of [[0,frame.center],[.47,frame.top],[-.47,frame.bottom]]) {
      const projected=face.localToWorld(new THREE.Vector3(0,y,0)).project(camera);
      assert.ok(Math.abs(projected.x-target.x)<1e-10, 'horizontal alignment');
      assert.ok(Math.abs(projected.y-target.y)<1e-10, 'vertical alignment');
    }
  }
});

test('pickup measures the settled closed-cover pose, not the reset gallery pose', () => {
  const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
  const implementation = source.slice(source.indexOf('    pickupFrame: () => {'), source.indexOf('    close: () => {', source.indexOf('    pickupFrame: () => {')));
  let settled=false;
  const calls=[];
  const context=vm.createContext({
    THREE, height:7.286, innerWidth:1200, innerHeight:800,
    resizeBinderRenderer:()=>calls.push('resize'),
    renderBinderSceneOnce:options=>{assert.equal(options.immediateCamera,true);settled=true;calls.push('render');},
    binderScene:{updateMatrixWorld:()=>{}},
    binderCamera:(()=>{const camera=new THREE.PerspectiveCamera(34,1.5,.1,100);camera.position.z=15;return camera;})(),
    binderShellState:{walletCoverArtwork:{localToWorld:point=>{assert.ok(settled,'must render final pose before projecting');return point;}}},
    els:{binderCanvas:{getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})}},
  });
  vm.runInContext(`const bridge = { ${implementation} }; bridge.pickupFrame();`,context);
  assert.deepEqual(calls,['resize','render']);
});

test('shared public-directory filter excludes empty wallets and checks missing summaries', async () => {
  const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
  const implementation=source.slice(source.indexOf('async function getNonemptyWalletBinderDirectoryEntries('),source.indexOf('async function getWalletBinderDirectoryCardCount('));
  const checked=[];
  const context=vm.createContext({
    walletBinderDirectoryToken:42, WALLET_BINDER_DIRECTORY_HOLDINGS_CONCURRENCY:4,
    ensureAllCollectionCards:async()=>{},console:{warn:()=>{}},
    getWalletBinderDirectoryCardCount:async address=>{
      checked.push(address);
      if(address.startsWith('offline'))throw new Error('offline');
      return address==='live-full'?2:0;
    },
  });
  vm.runInContext(implementation,context);
  const entries=[
    {walletAddress:'empty',supportedCardCount:0,savedCardCount:20},
    {walletAddress:'full',supportedCardCount:3},
    {walletAddress:'live-empty'}, {walletAddress:'live-full'},
    {walletAddress:'offline-empty',savedCardCount:0},
    {walletAddress:'offline-saved',savedCardCount:4},
  ];
  const result=await context.getNonemptyWalletBinderDirectoryEntries(entries);
  assert.deepEqual(Array.from(result,entry=>entry.walletAddress),['full','live-full','offline-saved']);
  assert.equal(checked.includes('empty'),false);
  const later=await context.getNonemptyWalletBinderDirectoryEntries([{walletAddress:'full',supportedCardCount:0}]);
  assert.equal(later.length,0);
});

test('mouse capture recovers after Escape rejection and clears stale fallback state', async () => {
  const source=readFileSync(new URL('../../showroom.js',import.meta.url),'utf8');
  const implementation=source.slice(source.indexOf('  function lock(resuming=false)'),source.indexOf("  canvas.addEventListener('pointermove'"));
  const handlers={},button={},canvas={};
  let reject,requests=0;
  canvas.requestPointerLock=()=>{requests++;return new Promise((resolve,fail)=>{reject=fail;});};
  const document={pointerLockElement:null,addEventListener:(name,handler)=>handlers[name]=handler};
  const context=vm.createContext({canvas,document,hud:{querySelector:()=>button},status:{},keys:new Set(),
    touchMode:false,leave:{hidden:true},active:null,busy:false,lockRequest:0,fallback:false,dragging:false,dragged:false});
  vm.runInContext(implementation,context);
  context.lock();reject({name:'SecurityError'});await Promise.resolve();
  assert.equal(context.fallback,true);
  context.lock();document.pointerLockElement=canvas;handlers.pointerlockchange();
  assert.equal(context.fallback,false);
  document.pointerLockElement=null;handlers.pointerlockchange();
  context.lock();reject({name:'NotAllowedError'});await Promise.resolve();
  assert.equal(context.fallback,false,'temporary Escape rejection must not enable drag mode');
  context.lock();document.pointerLockElement=canvas;handlers.pointerlockchange();
  assert.equal(context.fallback,false);assert.equal(button.hidden,true);assert.equal(requests,4);
});

test('touch joystick movement is analog and camera-relative', () => {
  const source=readFileSync(new URL('../../showroom.js',import.meta.url),'utf8');
  const implementation=source.slice(source.indexOf('  function move(dt)'),source.indexOf('  const pickTargets'));
  const camera={position:{x:0,z:0},rotation:{y:0}};
  const context=vm.createContext({
    THREE,camera,columns:{selecting:false},keys:new Set(),touchMove:{x:0,y:-.5},
    portal:{move(dx,dz){camera.position.x+=dx;camera.position.z+=dz;}},
  });
  vm.runInContext(implementation,context);
  context.move(1);
  assert.ok(Math.abs(camera.position.x)<1e-10);
  assert.ok(Math.abs(camera.position.z+1.35)<1e-10);
  camera.position.x=0;camera.position.z=0;context.touchMove.x=.25;context.touchMove.y=0;
  context.move(1);
  assert.ok(Math.abs(camera.position.x-.675)<1e-10);
  assert.ok(Math.abs(camera.position.z)<1e-10);
});

test('touch showroom supports drag look, centered highlighting, and tap-to-open', () => {
  const source=readFileSync(new URL('../../showroom.js',import.meta.url),'utf8');
  assert.match(source,/id="showroomTouchJoystick"/);
  assert.match(source,/event\.pointerType==='touch'/);
  assert.match(source,/camera\.rotation\.y-=dx\*\.0034/);
  assert.match(source,/touchBinderAt\(event\.clientX,event\.clientY\) \|\| hovered/);
  assert.match(source,/fallback && !touchMode && !dragging \? mousePoint : center/);
});

test('showroom background taps put down a binder but binder taps stay in the viewer', () => {
  const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
  const implementation=source.slice(
    source.indexOf('function shouldPutDownShowroomBinderFromTap('),
    source.indexOf('function onBinderPointerCancel('),
  );
  const shell=new THREE.Group();
  shell.add(new THREE.Mesh(new THREE.BoxGeometry(2,3,.1)));
  const root=new THREE.Group();
  root.add(shell);
  const camera=new THREE.PerspectiveCamera(50,1.5,.1,100);
  camera.position.z=5;
  camera.lookAt(0,0,0);
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
  const context=vm.createContext({
    IS_SHOWROOM:true, document:{body:{classList:{contains:()=>false}}},
    isBinderFocusView:()=>false, isBinderTableViewActive:()=>false,
    binderCardViewTransitionActive:false, binderOuterFlipState:null,
    binderEvilTableSwapState:null, binderShellState:{shell}, binderRoot:root,
    binderCamera:camera, binderRaycaster:raycaster,
    setBinderRaycasterFromEvent:({clientX,clientY})=>{
      pointer.set(clientX/1200*2-1,1-clientY/800*2);
      raycaster.setFromCamera(pointer,camera);
    },
  });
  vm.runInContext(implementation,context);
  assert.equal(context.shouldPutDownShowroomBinderFromTap({clientX:600,clientY:400}),false);
  assert.equal(context.shouldPutDownShowroomBinderFromTap({clientX:40,clientY:40}),true);
  context.isBinderFocusView=()=>true;
  assert.equal(context.shouldPutDownShowroomBinderFromTap({clientX:40,clientY:40}),false);
  context.isBinderFocusView=()=>false;
  context.document.body.classList.contains=()=>true;
  assert.equal(context.shouldPutDownShowroomBinderFromTap({clientX:40,clientY:40}),false);
});

test('showroom has the taller eye line and animated particle figure behind the evil table', () => {
  const source=readFileSync(new URL('../../showroom.js',import.meta.url),'utf8');
  assert.match(source,/camera\.position\.set\(0, 1\.72, 3\.5\)/);
  assert.match(source,/new THREE\.Points\(geometry,material\)/);
  assert.match(source,/ghost\.name='evil-biscuit-table-ghost'/);
  assert.match(source,/ghost\.position\.set\(4\.28,0,\.04\)/);
  assert.match(source,/evilTableGhost\.material\.uniforms\.time\.value=now\*\.001/);
});


import { createResolutionBudget } from '../../showroom-performance.mjs';
test('adaptive resolution is bounded, recovers, and ignores suspended frames', () => {
  const budget=createResolutionBudget(2);
  for(let i=0;i<1000;i++) budget.sample(1000);
  assert.ok(Math.abs(budget.ratio-2)<1e-9);
  for(let i=0;i<3000;i++) budget.sample(30);
  assert.ok(Math.abs(budget.ratio-1)<1e-9);
  for(let i=0;i<10000;i++) budget.sample(16);
  assert.ok(Math.abs(budget.ratio-2)<1e-9);
  const lowDpi=createResolutionBudget(.8);
  for(let i=0;i<3000;i++)lowDpi.sample(30);
  assert.equal(lowDpi.ratio,.8);
});
test('adaptive resolution holds steady at healthy frame rates', () => {
  const budget=createResolutionBudget(1.5);
  for(let i=0;i<1000;i++) assert.equal(budget.sample(20),null);
  assert.equal(budget.ratio,1.5);
});
