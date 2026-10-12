import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import {createDisplayPreparer} from '../../showroom-display-preparation.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function display(...textures){
 const group=new THREE.Group();
 group.add(new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial({map:textures[0]})));
 group.add(new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.ShaderMaterial({uniforms:{first:{value:textures[0]},second:{value:textures[1]}}})));
 return {group};
}
test('display textures upload once per version on separate frames before only the new model compiles',async()=>{
 const frames=[],events=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const prepare=createDisplayPreparer({scene,camera,nextFrame:()=>new Promise(resolve=>frames.push(resolve)),renderer:{
  initTexture:t=>events.push(t),compileAsync:async(root,view,target)=>{assert.equal(view,camera);assert.equal(target,scene);events.push(root);}}});
 const a=new THREE.Texture(),b=new THREE.Texture(),model=display(a,b);model.group.visible=false;
 const ready=prepare(model);await tick();assert.equal(events.length,0);
 frames.shift()();await tick();assert.deepEqual(events,[a]);
 frames.shift()();await tick();assert.deepEqual(events,[a,b]);
 frames.shift()();assert.equal(await ready,true);assert.deepEqual(events,[a,b,model.group]);
 assert.equal(model.group.visible,false);assert.equal(model.group.matrixAutoUpdate,true,'preparation never freezes animated transforms');
 const cached=prepare(model);await tick();frames.shift()();await cached;assert.deepEqual(events,[a,b,model.group,model.group]);
 a.needsUpdate=true;const changed=prepare(model);await tick();frames.shift()();await tick();frames.shift()();await changed;
 assert.deepEqual(events,[a,b,model.group,model.group,a,model.group]);
});
test('cancelled display preparation cannot upload/reveal a superseded card and errors do not stall the next card',async()=>{
 const frames=[],events=[];let current=true,fail=true;
 const prepare=createDisplayPreparer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),nextFrame:()=>new Promise(resolve=>frames.push(resolve)),renderer:{
  initTexture:t=>events.push(t),compileAsync:async()=>{if(fail){fail=false;throw new Error('shader preparation failed');}}}});
 const first=prepare(display(new THREE.Texture()),()=>current);await tick();current=false;frames.shift()();assert.equal(await first,false);assert.equal(events.length,0);
 const failed=prepare({group:new THREE.Group()}),rejected=assert.rejects(failed,/shader preparation failed/);
 await tick();frames.shift()();await rejected;
 const recovered=prepare({group:new THREE.Group()});await tick();frames.shift()();assert.equal(await recovered,true);
});
