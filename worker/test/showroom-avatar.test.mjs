import {POSES,normalizePose,normalizePoseTime} from '../../drifmaker-poses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {jumpHeight} from '../../showroom-locomotion.mjs';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8');
test('avatar clones share geometry but own their skeleton and pose',()=>{
 const context=vm.createContext({THREE});vm.runInContext(source.slice(source.indexOf('export function cloneAvatar'),source.indexOf('export async')).replaceAll('export ',''),context);
 const root=new THREE.Group(),bone=new THREE.Bone();root.add(bone);const geometry=new THREE.BoxGeometry();const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());root.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 const shirt=new THREE.SkinnedMesh(geometry,mesh.material);root.add(shirt);shirt.bind(mesh.skeleton,mesh.bindMatrix);
 const a=context.cloneAvatar(root),b=context.cloneAvatar(root);assert.equal(a.children[1].geometry,geometry);assert.notEqual(a.children[1].skeleton,b.children[1].skeleton);assert.equal(a.children[1].skeleton.bones[0],a.children[0]);a.children[0].rotation.x=1;assert.ok(Math.abs(b.children[0].rotation.x)<1e-9);assert.equal(bone.rotation.x,0);
 assert.equal(a.children[1].skeleton,a.children[2].skeleton,'one skeleton drives all wardrobe pieces for each visitor');
});
test('shipped character includes locomotion and holding clips, texture, and right-hand socket',()=>{
 const bytes=readFileSync(new URL('../../assets/models/showroom-character/blue-fin-character.glb',import.meta.url));const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Crouch','Crouch_Hold_Right','Crouch_Walk','Crouch_Walk_Hold_Right','Hold_Right','Jump','Jump_Hold_Right','Neutral','Walk','Walk_Hold_Right']);assert.ok(gltf.skins.length);assert.ok(gltf.images.length);assert.ok(gltf.nodes.some(n=>n.name==='CardSocket.R'));for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){assert.ok(primitive.attributes.JOINTS_0!==undefined);assert.ok(primitive.attributes.WEIGHTS_0!==undefined);}
});
test('camera aim is additive, bounded, and only raises the holding arm',()=>{
 const context=vm.createContext({THREE});vm.runInContext(source.slice(source.indexOf('export function createAvatarLookPose'),source.indexOf('export async')).replaceAll('export ',''),context);
 const model=new THREE.Group(),chest=new THREE.Bone(),head=new THREE.Bone(),arm=new THREE.Bone();
 head.name='Head';arm.name='UpperArm.R';model.add(chest);chest.add(head,arm);
 model.rotation.y=Math.PI;chest.rotation.z=.13;head.rotation.y=.05;arm.rotation.z=.2;
 const restHead=head.quaternion.clone(),restArm=arm.quaternion.clone(),look=context.createAvatarLookPose(model);
 for(let i=0;i<120;i++){look.restore();look.apply(1/60,.6,false);}
 assert(arm.quaternion.angleTo(restArm)<1e-7);assert(Math.abs(head.quaternion.angleTo(restHead)-.432)<1e-6);
 look.restore();assert(head.quaternion.angleTo(restHead)<1e-7);
 let pitch;for(let i=0;i<120;i++){look.restore();pitch=look.apply(1/60,.6,true);}
 assert(Math.abs(pitch-.42)<1e-6);assert(Math.abs(arm.quaternion.angleTo(restArm)-.42)<1e-6);
 const steady=head.quaternion.clone();for(let i=0;i<600;i++){look.restore();look.apply(1/60,.6,true);}
 assert(head.quaternion.angleTo(steady)<1e-6,'no accumulating drift');
 for(let i=0;i<120;i++){look.restore();look.apply(1/60,100,true);}
 assert(Math.abs(head.quaternion.angleTo(restHead)-.72)<1e-6);
 for(let i=0;i<120;i++){look.restore();pitch=look.apply(1/60,-.6,false);}
 assert(Math.abs(pitch)<1e-6);assert(arm.quaternion.angleTo(restArm)<1e-6);
});

// Read the shipped rig and actual transform tracks without loading textures or
// requiring a browser. Sanitize Blender names exactly as GLTFLoader does.
function shippedAnimationRig(){
 const bytes=readFileSync(new URL('../../assets/models/showroom-character/blue-fin-character.glb',import.meta.url));
 const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
 const binaryStart=20+jsonLength+8;
 const nodes=gltf.nodes.map(n=>{
  const node=new THREE.Bone();node.name=n.name||'';
  if(n.matrix){node.matrix.fromArray(n.matrix);node.matrix.decompose(node.position,node.quaternion,node.scale);}
  else {if(n.translation)node.position.fromArray(n.translation);if(n.rotation)node.quaternion.fromArray(n.rotation);if(n.scale)node.scale.fromArray(n.scale);}
  return node;
 });
 gltf.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));
 const scene=new THREE.Group();gltf.scenes[gltf.scene||0].nodes.forEach(i=>scene.add(nodes[i]));
 function values(index){
  const accessor=gltf.accessors[index],view=gltf.bufferViews[accessor.bufferView];
  assert.equal(accessor.componentType,5126);assert.equal(accessor.sparse,undefined);
  const size={SCALAR:1,VEC3:3,VEC4:4}[accessor.type],stride=view.byteStride||size*4;
  const start=binaryStart+(view.byteOffset||0)+(accessor.byteOffset||0),result=[];
  for(let i=0;i<accessor.count;i++)for(let j=0;j<size;j++)result.push(bytes.readFloatLE(start+i*stride+j*4));
  return result;
 }
 const animations=gltf.animations.map(animation=>new THREE.AnimationClip(animation.name,-1,animation.channels.map(channel=>{
  const sampler=animation.samplers[channel.sampler],path={translation:'position',rotation:'quaternion',scale:'scale'}[channel.target.path];
  assert.ok(path);assert.ok(['LINEAR','STEP'].includes(sampler.interpolation));
  const Track=path==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
  // cloneAvatar retains names, so bind using their sanitized names just as
  // GLTFLoader does instead of retaining the source object's UUID.
  const node=nodes[channel.target.node];node.name=THREE.PropertyBinding.sanitizeNodeName(node.name);
  return new Track(`${node.name}.${path}`,values(sampler.input),values(sampler.output),sampler.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
 })));
 return {scene,animations};
}

function animationPipeline(legacy){
 const rig=shippedAnimationRig();
 let code=source.slice(source.indexOf('export function cloneAvatar')).replaceAll('export ','');
 if(legacy)code=code.replace('model.getWorldQuaternion(parentRotation);','model.updateWorldMatrix(true,true);model.getWorldQuaternion(parentRotation);');
 const context=vm.createContext({THREE,normalizePose,normalizePoseTime,asset:async()=>rig,createAvatarAppearance});vm.runInContext(code,context);
 const multiplayer=readFileSync(new URL('../../showroom-multiplayer.js',import.meta.url),'utf8');
 let update=multiplayer.slice(multiplayer.indexOf('  if(p.avatar){'),multiplayer.indexOf('  if(p.layoutDirty)'));
 if(legacy)update=update.replace('p.avatar.update(dt,velocity,p.holding,sample.pitch,sample);','p.avatar.update(dt,velocity,p.holding,sample.pitch,sample);p.group.updateWorldMatrix(true,true);');
 const updateContext=vm.createContext({THREE,normalizePose,normalizePoseTime,jumpHeight,socketPosition:new THREE.Vector3()});
 vm.runInContext(`function updatePeer(p,sample,dt,velocity){${update}}`,updateContext);
 return {create:context.createShowroomAvatar,update:updateContext.updatePeer};
}

test('targeted avatar matrix updates preserve real animation poses and hand placement',async()=>{
 const current=animationPipeline(false),legacy=animationPipeline(true);
 const make=async pipeline=>{
  const root=new THREE.Group(),group=new THREE.Group(),cardsRoot=new THREE.Group(),avatar=await pipeline.create();
  root.position.set(3,2,-4);root.rotation.set(.1,.4,-.06);root.add(group);group.add(avatar.model,cardsRoot);
  return {root,group,cardsRoot,avatar,holding:false};
 };
 const a=await make(current),b=await make(legacy),seen=new Set();
 const assertArray=(actual,expected,label)=>{
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-10,`${label}[${index}]: ${value} versus ${expected[index]}`));
 };
 // All ten animation variants, including blending into and out of crouch,
 // holding, airborne motion and opposite camera pitches on a moving parent.
 const phases=[
  {velocity:0,holding:false},{velocity:1.4,holding:false},
  {velocity:0,holding:true},{velocity:1.4,holding:true},
  {velocity:0,holding:false,crouch:1},{velocity:.65,holding:false,crouch:1},
  {velocity:0,holding:true,crouch:1},{velocity:.65,holding:true,crouch:1},
  {velocity:1.2,holding:false,jump:true},{velocity:1.2,holding:true,jump:true},
 ];
 let frame=0;
 for(const phase of phases)for(let step=0;step<90;step++,frame++){
  const time=frame/60,jumpTime=phase.jump&&step<66?step/60:-1;
  const sample={y:1.65-(phase.crouch||0)*.29+jumpHeight(jumpTime),pitch:Math.sin(time*2)*1.1,crouch:phase.crouch||0,jumpTime};
  for(const [peer,pipeline] of [[a,current],[b,legacy]]){
   peer.holding=phase.holding;peer.group.position.set(Math.sin(time),sample.y,Math.cos(time));peer.group.rotation.y=time*.6;
   pipeline.update(peer,sample,1/60,phase.velocity);seen.add(peer.avatar.model.userData.animation);
  }
  assertArray(a.cardsRoot.position.toArray(),b.cardsRoot.position.toArray(),'socket-relative held cards');
  assertArray(a.cardsRoot.quaternion.toArray(),b.cardsRoot.quaternion.toArray(),'held card tilt');
  for(const name of ['Head','UpperArmR','HandR']){
   const actual=a.avatar.model.getObjectByName(name),expected=b.avatar.model.getObjectByName(name);
   assertArray(actual.quaternion.toArray(),expected.quaternion.toArray(),`${name} local pose`);
   assertArray(actual.getWorldPosition(new THREE.Vector3()).toArray(),expected.getWorldPosition(new THREE.Vector3()).toArray(),`${name} world pose before render`);
  }
  // Three updates scene matrices before rendering and updating skinning.
  a.root.updateMatrixWorld(true);b.root.updateMatrixWorld(true);
  const actual=[],expected=[];a.root.traverse(node=>actual.push(node));b.root.traverse(node=>expected.push(node));
  actual.forEach((node,index)=>assertArray(node.matrixWorld.elements,expected[index].matrixWorld.elements,`${node.name} rendered world matrix`));
 }
 assert.deepEqual([...seen].sort(),['Crouch','Crouch_Hold_Right','Crouch_Walk','Crouch_Walk_Hold_Right','Hold_Right','Jump','Jump_Hold_Right','Neutral','Walk','Walk_Hold_Right']);
 a.avatar.dispose();b.avatar.dispose();
});

test('look and held-card placement leave unrelated descendants to the renderer',async()=>{
 for(const legacy of [false,true]){
  const pipeline=animationPipeline(legacy),avatar=await pipeline.create(),group=new THREE.Group(),cardsRoot=new THREE.Group();
  group.add(avatar.model,cardsRoot);
  let visits=0;
  for(const parent of [avatar.model,cardsRoot]){
   const unrelated=new THREE.Object3D();parent.add(unrelated);
   const update=unrelated.updateWorldMatrix;
   unrelated.updateWorldMatrix=function(...args){visits++;return update.apply(this,args);};
  }
  pipeline.update({avatar,group,cardsRoot,holding:true},{y:1.65,pitch:.7,crouch:.4,jumpTime:.3},1/60,1);
  assert.equal(visits,legacy?3:0,'only required ancestors need eager matrix updates');
  avatar.dispose();
 }
});
