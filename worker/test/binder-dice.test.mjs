import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
function setup(random){
 const entry={group:new THREE.Group(),baseZ:.2,shadow:new THREE.Group(),shadowMaterial:{userData:{}}};
 entry.group.position.z=entry.baseZ;
 const context=vm.createContext({THREE,Math:Object.assign(Object.create(Math),{random:()=>random}),performance:{now:()=>0},
 binderTableDice:[entry],BINDER_TABLE_DIE_SIZE:.36,BINDER_TABLE_DIE_TOSS_DURATION_MS:920,BINDER_TABLE_DIE_TOSS_HEIGHT:1.55,
 clamp:THREE.MathUtils.clamp,markBinderInteractionActive(){},startBinderRenderLoop(){}});
 for(const [start,end] of [['function getRandomBinderTableDieFace(', 'function getBinderTableDieHit('],['function beginBinderTableDieToss(', 'function ensureBinderTableAccessories(']])
 vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))),context);
 return {entry,context};
}
for(const random of [.2,.5,.9])test(`dice settle continuously with rebound choice ${random}`,()=>{
 const {entry,context}=setup(random);
 assert.equal(context.beginBinderTableDieToss(0),true);
 assert.equal(context.beginBinderTableDieToss(0),false);
 const animation=entry.animation;
 assert.equal(animation.phases.length,random===.2?4:random===.5?3:2);
 let previous=entry.group.quaternion.clone();
 for(let time=0;time<animation.duration;time+=2){
  context.updateBinderTableDice(time);
  assert(previous.angleTo(entry.group.quaternion)<.04,'no sudden orientation jump');
  previous.copy(entry.group.quaternion);
  for(const x of [-.18,.18])for(const y of [-.18,.18])for(const z of [-.18,.18]){
   const corner=new THREE.Vector3(x,y,z).applyQuaternion(entry.group.quaternion).add(entry.group.position);
   assert(corner.z>=entry.baseZ-.18-1e-8,'corners stay above table');
  }
 }
 context.updateBinderTableDice(animation.duration);
 assert(previous.angleTo(entry.group.quaternion)<.001,'no final snap');
 assert(entry.group.quaternion.angleTo(animation.targetQuaternion)<1e-7);
 assert.equal(entry.group.position.z,entry.baseZ);
 assert.equal(entry.animation,null);
 assert.equal(entry.group.userData.binderTableDieTopFace,animation.topFace);
 assert.equal(entry.shadowMaterial.userData.tableAccessoryOpacityFactor,1);
 // A stalled frame still lands exactly and clears the animation.
 context.beginBinderTableDieToss(0);context.updateBinderTableDice(10000);
 assert.equal(entry.animation,null);
});
