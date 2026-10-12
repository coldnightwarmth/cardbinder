import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../../vendor/three.module.js';
const source=(await readFile(new URL('../../showroom-columns.js',import.meta.url),'utf8'))
  .replace("'./showroom-resin.mjs?v=5'",`'${new URL('../../showroom-resin.mjs',import.meta.url).href}'`)
  .replace("'./showroom-ritual.mjs?v=2'",`'${new URL('../../showroom-ritual.mjs',import.meta.url).href}'`)
  .replace("'./showroom-display-preparation.mjs'",`'${new URL('../../showroom-display-preparation.mjs',import.meta.url).href}'`)
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

test('network snapshots replace pedestals and late ritual join uses the shared clock',async()=>{
 const room=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let disposed=0;
 const columns=createShowroomColumns({room,camera,renderer:{},bridge:{async createSharedDisplay(){return {group:new THREE.Group(),update(){},dispose(){disposed++;}};}}});
 columns.setNetwork({action:async()=>{}});
 const state={revision:1,cards:{a:{id:'a'}},slots:[null,'a',null],ritual:null};
 await columns.syncShared(state,1000);assert.equal(columns.columns[1].card.id,'a');assert(columns.columns[1].display);
 const before=performance.now();await columns.syncShared({...state,revision:2,ritual:{startedAt:1000}},5900);
 columns.update(before+10,new THREE.Vector2(),false);assert(columns.columns[1].display.group.position.y>3.9);
 await columns.syncShared({revision:3,cards:{},slots:[null,null,null],ritual:null},8000);
 assert.equal(disposed,1);assert.equal(columns.columns[1].display,null);assert.equal(columns.ritualActive,false);
});

test('shared pedestal reveals only after warmup, keeps resin lighting and cancels stale displays safely',async()=>{
 const room=new THREE.Scene(),camera=new THREE.PerspectiveCamera();room.userData.cardEnvironment=new THREE.Texture();
 const compiled=[],textures=[],displays=[];let finishCompile;
 const renderer={initTexture:t=>textures.push(t),compileAsync:(group,view,target)=>{
  assert.equal(group.visible,false);assert.equal(view,camera);assert.equal(target,room);compiled.push(group);
  return new Promise(resolve=>finishCompile=resolve);
 }};
 const bridge={async createSharedDisplay(card){
  const group=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({map:new THREE.Texture(),transmission:1});
  group.userData.individualCardModelRoot=true;group.userData.modelRenderProfile='mons-clear-resin';
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(),material));
  const display={group,material,disposed:0,updates:0,update(){this.updates++;},dispose(){this.disposed++;}};displays.push(display);return display;
 }};
 const columns=createShowroomColumns({room,camera,renderer,bridge});columns.setNetwork({action:async()=>{}});
 const state={revision:1,cards:{a:{id:'a'}},slots:[null,'a',null],ritual:null};
 const first=columns.syncShared(state,1000);await new Promise(resolve=>setImmediate(resolve));
 const model=displays[0];assert.equal(columns.columns[1].display,null);assert.equal(model.group.visible,false);
 assert.equal(compiled.length,1);assert.ok(textures.includes(model.material.map));
 assert.equal(model.material.envMap,room.userData.cardEnvironment);assert.equal(model.material.envMapIntensity,1);
 assert.equal(model.material.envMapRotation.y,THREE.MathUtils.degToRad(121));assert.equal(model.group.matrixAutoUpdate,true);
 finishCompile();await first;assert.equal(columns.columns[1].display,model);assert.equal(model.group.visible,true);
 columns.update(performance.now(),new THREE.Vector2(),false);assert.equal(model.updates,1);
 const replacement=columns.syncShared({revision:2,cards:{b:{id:'b'}},slots:[null,'b',null],ritual:null},2000);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(model.disposed,1);assert.equal(displays[1].group.visible,false);
 await columns.syncShared({revision:3,cards:{},slots:[null,null,null],ritual:null},2100);
 finishCompile();await replacement;
 assert.equal(displays[1].disposed,1);assert.equal(displays[1].group.parent,null);assert.equal(columns.columns[1].display,null);
});
