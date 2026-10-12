import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.min.js';
import { createShowroomPickupLayer } from '../../showroom-pickup-layer.mjs';
import { createSceneIndex } from '../../showroom-scene-index.mjs';

function setup() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  scene.background = new THREE.Color('gray');
  scene.environment = new THREE.Texture();
  scene.fog = new THREE.Fog('gray', 14, 75);
  const lights = [new THREE.HemisphereLight(), new THREE.DirectionalLight()];
  scene.add(...lights, lights[1].target);
  lights[1].position.set(-3,9,4);
  const binder = new THREE.Group();
  binder.position.set(3,.838,-5); binder.rotation.set(-Math.PI/2,0,1.5);
  binder.updateMatrix(); binder.matrixAutoUpdate = false;
  const cover = new THREE.Mesh(new THREE.BoxGeometry(.7,1,.03),new THREE.MeshStandardMaterial());
  binder.add(cover); scene.add(binder);
  const index = createSceneIndex(scene), events = [];
  const renderer = { autoClear: true,
    clear(...args) { events.push(['clear',...args]); },
    render(s,c) { events.push(['render',s,c,this.autoClear]); s.updateMatrixWorld(); },
  };
  const layer = createShowroomPickupLayer({scene,renderer,lights});
  return {scene,camera,lights,binder,cover,index,events,renderer,layer};
}

test('moving binder renders over world depth and doorway stencil, retaining its own depth and lighting',()=>{
  const {scene,camera,lights,binder,cover,index,events,renderer,layer} = setup();
  scene.updateMatrixWorld();
  const world = binder.matrixWorld.clone();
  const end = layer.begin(binder);
  binder.updateWorldMatrix(true,true);
  assert.deepEqual(binder.matrixWorld.elements,world.elements,'pickup does not jump');
  assert.equal(index.renderables.has(cover),false,'not drawn again in world or reflections');
  assert.equal(cover.material.depthTest,true);
  assert.equal(cover.material.depthWrite,true);
  lights[0].intensity = 2.1;
  layer.render(()=>events.push(['world']),camera);
  assert.deepEqual(events.slice(0,2),[['world'],['clear',false,true,true]]);
  const foreground = events[2][1];
  assert.equal(events[2][2],camera);
  assert.equal(events[2][3],false,'retain room color');
  assert.equal(foreground.background,null);
  assert.equal(foreground.environment,scene.environment);
  assert.equal(foreground.fog,scene.fog);
  assert.equal(foreground.children.find(o=>o.isHemisphereLight).intensity,2.1);
  assert.deepEqual(foreground.children.find(o=>o.isDirectionalLight).position.toArray(),lights[1].position.toArray());
  assert.equal(renderer.autoClear,true);
  binder.position.set(1,2,3);binder.updateMatrix();
  end();end();
  assert.equal(binder.parent,scene);
  assert.deepEqual(binder.position.toArray(),[1,2,3]);
  assert.equal(index.renderables.has(cover),true);
  events.length=0;
  layer.render(()=>events.push(['world']),camera);
  assert.deepEqual(events,[['world']],'no extra pass outside transition');
});

test('hidden proxies stay hidden and cleanup restores render state after an overlay error',()=>{
  const {scene,camera,binder,events,renderer,layer} = setup();
  const end=layer.begin(binder);
  binder.visible=false;
  layer.render(()=>events.push(['world']),camera);
  assert.deepEqual(events,[['world']]);
  binder.visible=true;
  renderer.render=()=>{throw new Error('render failed');};
  assert.throws(()=>layer.render(()=>{},camera),/render failed/);
  assert.equal(renderer.autoClear,true);
  end();
  assert.equal(binder.parent,scene);
  const again=layer.begin(binder);again();
});
