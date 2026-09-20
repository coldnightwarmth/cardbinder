import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../../vendor/three.module.js';
const source=(await readFile(new URL('../../showroom-columns.js',import.meta.url),'utf8'))
  .replace("'./showroom-ritual.mjs?v=2'",`'${new URL('../../showroom-ritual.mjs',import.meta.url).href}'`)
  .replace("from 'three'",`from '${new URL('../../vendor/three.module.js',import.meta.url).href}'`);
const {createShowroomColumns}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('three table-height columns block walking and only offer empty slots with a held card',()=>{
 const room=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.05,600);
 camera.position.set(0,1.72,-8.3);camera.lookAt(0,1.3,-10.7);
 const columns=createShowroomColumns({room,camera,renderer:{},bridge:{}});
 assert.equal(columns.columns.length,3);
 for(const column of columns.columns){
  assert.equal(columns.canWalk(column.x,column.z),false);
  assert(Math.abs(new THREE.Box3().setFromObject(column.group).max.y-.78)<1e-6);
 }
 assert.equal(columns.canWalk(1.5,-10.7),true);
 assert.equal(columns.pick(new THREE.Vector2()),null);
 const hand={cards:[{key:'held'}],choose(){},restore(){}};columns.setHand(hand);
 assert.equal(columns.pick(new THREE.Vector2()),columns.columns[1]);
 camera.position.z=-6;assert.equal(columns.pick(new THREE.Vector2()),null);
});
test('column selection can be cancelled without trapping movement or consuming a card',()=>{
 const room=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let cancel;
 const columns=createShowroomColumns({room,camera,renderer:{},bridge:{}});
 const cards=[{key:'held'}];columns.setHand({cards,choose(_place,onCancel){cancel=onCancel;}});
 assert.equal(columns.activate(columns.columns[0]),true);assert.equal(columns.selecting,true);
 cancel();assert.equal(columns.selecting,false);assert.equal(cards.length,1);assert.equal(columns.columns[0].card,null);
});

test('ritual requires three cards, blocks pickup, then clears displays and returns their exact keys',()=>{
 const room=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let returned=null,disposed=0;
 const columns=createShowroomColumns({room,camera,renderer:{},bridge:{}});
 columns.setHand({cards:[],returnToBinders(keys){returned=keys;}});
 assert.equal(columns.activate({ritual:true}),false);
 const lamp=columns.ritualButton.children.find(child=>child.material?.isMeshBasicMaterial);
 columns.columns.forEach((column,index)=>{
  column.card={key:`binder-${index}:card`};const group=new THREE.Group();group.position.set(column.x,1.43,column.z);
  column.display={group,update(){},dispose(){disposed++;}};room.add(group);
  columns.update(performance.now(),new THREE.Vector2(),false);
  assert.equal(lamp.material.color.getHex(),index===2?0x37e66a:0xffc533);
 });
 const before=performance.now();assert.equal(columns.activate({ritual:true}),true);const after=performance.now();
 assert.equal(columns.activate(columns.columns[0]),false);
 columns.update(before+4900,new THREE.Vector2(),false);
 assert(columns.columns[0].display.group.position.y>3.9);
 assert.equal(columns.columns[0].display.group.scale.x,1);
 columns.update(before+5950,new THREE.Vector2(),false);
 assert(columns.columns[0].display.group.scale.x>1.9);
 columns.update(after+6400,new THREE.Vector2(),false);
 assert.equal(columns.ritualActive,false);assert.equal(disposed,3);
 assert.deepEqual(returned,['binder-0:card','binder-1:card','binder-2:card']);
 assert(columns.columns.every(column=>!column.card&&!column.display));assert.equal(lamp.material.color.getHex(),0x080908);
});
