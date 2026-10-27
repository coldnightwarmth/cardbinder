import test from 'node:test';
import {mergeAvatarParts} from '../../showroom-avatar-parts.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {characterId,characterCategories,normalizeAppearance,DRILADY_DEFAULT_APPEARANCE,DEFAULT_APPEARANCE} from '../../drifmaker-config.mjs';
import {normalizePose,normalizePoseTime,POSES} from '../../drifmaker-poses.mjs';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {normalizeLook,bookmarkMetadata,createLookHistory} from '../../drifmaker-bookmarks.mjs';
import {parseBookmarkJSON} from '../../drifmaker-bookmark-import.mjs';
import {randomizeLook} from '../../drifmaker-rarity.mjs';
function asset(path){
 const bytes=readFileSync(new URL(path,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 function values(index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],width={5121:1,5123:2,5125:4,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType],out=[];
  for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)out.push(bytes[read](28+length+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*width)+j*width));
  return out;
 }
 return {bytes,json,values};
}
const archive=asset('../../assets/models/drilady/drilady-archive.glb');
const lady=asset('../../assets/models/drilady/drilady-base.glb'),drif=asset('../../assets/models/drifmaker/drifella-customizable.glb');
const near=(a,b,label)=>{assert.equal(a.length,b.length,label);a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<.00002,`${label}: ${x} != ${b[i]}`));};
test('Drilady shares every bone, bind matrix and all 49 animation tracks with Drifella',()=>{
 const boneNames=a=>a.json.skins[0].joints.map(i=>a.json.nodes[i].name);
 assert.deepEqual(boneNames(lady),boneNames(drif));assert.equal(boneNames(lady).length,19);
 near(lady.values(lady.json.skins[0].inverseBindMatrices),drif.values(drif.json.skins[0].inverseBindMatrices),'bind pose');
 assert.deepEqual(boneNames(archive),boneNames(lady));
 near(archive.values(archive.json.skins[0].inverseBindMatrices),lady.values(lady.json.skins[0].inverseBindMatrices),'archive bind pose');
 assert.equal(archive.json.animations?.length||0,0,'trait pack reuses the base animation library');
 assert.equal(lady.json.animations.length,49);
 const tracks=(a,clip)=>new Map(clip.channels.map(c=>[a.json.nodes[c.target.node].name+':'+c.target.path,c]));
 for(const clip of drif.json.animations){
  const matching=lady.json.animations.find(c=>c.name===clip.name);assert.ok(matching,clip.name);
  const actual=tracks(lady,matching);
  for(const [key,c] of tracks(drif,clip)){
   if(!boneNames(drif).some(name=>key.startsWith(name+':')))continue;
   const current=actual.get(key);assert.ok(current,clip.name+' '+key);
   for(const channel of ['input','output'])near(lady.values(matching.samplers[current.sampler][channel]),drif.values(clip.samplers[c.sampler][channel]),clip.name+' '+key+' '+channel);
  }
 }
});
test('all 540 independent Drilady parts have finite positions and normalized valid skin weights',()=>{
 assert.equal(lady.json.meshes.length+archive.json.meshes.length,540);
 for(const data of [lady,archive]){
 assert.ok(data.bytes.length<80*1024*1024);
 for(const node of data.json.nodes.filter(n=>n.mesh!==undefined)){
  assert.ok(node.name.startsWith('Drif_'));assert.ok(node.skin!==undefined);
  for(const p of data.json.meshes[node.mesh].primitives){
   assert.ok(data.values(p.attributes.POSITION).every(Number.isFinite),node.name);
   const weights=data.values(p.attributes.WEIGHTS_0),joints=data.values(p.attributes.JOINTS_0);
   for(let i=0;i<weights.length;i+=4){assert.ok(Math.abs(weights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-5,node.name);for(let k=0;k<4;k++){assert.ok(weights[i+k]>=0&&Number.isFinite(weights[i+k]));assert.ok(joints[i+k]>=0&&joints[i+k]<19);}}
  }
 }
 }
 for(const category of ['Hair','Head','Ears','Eyes','Brows','Nose','Mouth','Shirt','Legs','Accessory','Tail'])assert.ok(lady.json.nodes.some(n=>n.name.startsWith('Drif_'+category+'_')),category);
});
test('character-specific parts survive bookmarks, metadata, history and dice rolls without changing old looks',()=>{
 const base=normalizeAppearance(DRILADY_DEFAULT_APPEARANCE);
 assert.deepEqual(normalizeAppearance({...base,eyes:'venom',ears:'elf',shirt:'wizardrobe'}),base);
 assert.equal(Object.hasOwn(normalizeAppearance(DEFAULT_APPEARANCE),'character'),false);
 let look=normalizeLook({appearance:base,portrait:{pose:'bow',posesEnabled:true}});
 const metadata=bookmarkMetadata({name:'Drilady',look},{id:1,image:'drilady.png'});
 assert.deepEqual(parseBookmarkJSON(metadata).look,look);
 assert.equal(metadata.attributes.find(a=>a.trait_type==='top').value,'Mensa tank');
 const attributesOnly=parseBookmarkJSON({name:'Shared Drilady',attributes:metadata.attributes});assert.deepEqual(attributesOnly.look,look);
 const history=createLookHistory({appearance:DEFAULT_APPEARANCE});history.commit(look);assert.equal(characterId(history.undo().appearance),'drifella');assert.equal(characterId(history.redo().appearance),'drilady');
 for(let i=0;i<100;i++){const rolled=randomizeLook({appearance:base,rarity:{},posesEnabled:true,pose:'salute'});assert.equal(rolled.appearance.character,'drilady');for(const [key,options] of Object.entries(characterCategories(base)))assert.ok(options.some(o=>o.id===rolled.appearance[key]));}
});
function rig(a){
 const nodes=a.json.nodes.map(n=>{const o=new THREE.Bone();o.name=THREE.PropertyBinding.sanitizeNodeName(n.name||'');if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 a.json.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new THREE.Group();a.json.scenes[0].nodes.forEach(i=>scene.add(nodes[i]));
 const animations=(a.json.animations||[]).map(c=>new THREE.AnimationClip(c.name,-1,c.channels.map(ch=>{const s=c.samplers[ch.sampler],property={translation:'position',rotation:'quaternion',scale:'scale'}[ch.target.path],Track=property==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;return new Track(`${nodes[ch.target.node].name}.${property}`,a.values(s.input),a.values(s.output),s.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);})));if(a===lady)mergeAvatarParts(scene,rig(archive).scene);return {scene,animations};
}
test('live species swapping preserves stable scene attachments, shared poses, and the latest selection',async()=>{
 const rigs={drilady:rig(lady),drifella:rig(drif)},context=vm.createContext({THREE,normalizePose,normalizePoseTime,normalizeAppearance,characterId,createAvatarAppearance,asset:async name=>rigs[name]});
 const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf('export function cloneAvatar')).replaceAll('export ',''),context);
 const avatar=await context.createShowroomAvatar(),root=avatar.model,attached=new THREE.Group();root.add(attached);root.position.set(3,2,1);
 for(const {id} of POSES){avatar.setPose(id,{static:true});await avatar.setAppearance(DRILADY_DEFAULT_APPEARANCE);avatar.update(0,0,false);assert.equal(avatar.model.userData.animation,'Pose_'+id);root.updateMatrixWorld(true);root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite)));}
 assert.equal(avatar.model,root);assert.equal(attached.parent,root);assert.deepEqual(root.position.toArray(),[3,2,1]);assert.ok(avatar.socket);
 await Promise.all([avatar.setAppearance(DEFAULT_APPEARANCE),avatar.setAppearance(DRILADY_DEFAULT_APPEARANCE),avatar.setAppearance({...DEFAULT_APPEARANCE,eyes:'spiral'})]);
 assert.equal(characterId(avatar.appearance),'drifella');assert.equal(avatar.appearance.eyes,'spiral');assert.equal(root.children.length,2);avatar.dispose();
});
test('makeup vertex colors restore after shared body finishes are removed',()=>{
 const model=new THREE.Group(),material=new THREE.MeshStandardMaterial({vertexColors:true});material.name='Drilady_Makeup';
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.name='Drif_Eyes_classic';model.add(mesh);
 const wardrobe=createAvatarAppearance(model,DRILADY_DEFAULT_APPEARANCE);
 for(const bodyStyle of ['gold','silver','matteblack','marble','holographic','ghost']){wardrobe.setAppearance({...DRILADY_DEFAULT_APPEARANCE,bodyStyle});assert.equal(mesh.material.vertexColors,false,bodyStyle);}
 wardrobe.setAppearance(DRILADY_DEFAULT_APPEARANCE);assert.equal(mesh.material.vertexColors,true);assert.equal(material.vertexColors,true);wardrobe.dispose();
});

test('three collections provide exactly 44 unique modeled options in each of twelve categories',async()=>{
 const {DRILADY_TRAITS}=await import('../../drilady-traits.mjs');
 assert.equal(Object.keys(DRILADY_TRAITS).length,12);
 for(const [category,options] of Object.entries(DRILADY_TRAITS)){
  assert.equal(options.length,44,category);
  assert.equal(new Set(options.map(o=>o.id)).size,44,category);
  assert.equal(new Set(options.map(o=>o.label)).size,44,category+' labels');
  for(const option of options){
   const slot=category==='head'&&option.baseHead?'hair':category;
   const name=`Drif_${slot[0].toUpperCase()+slot.slice(1)}_${option.id}`;
   assert.equal([...lady.json.nodes,...archive.json.nodes].filter(n=>n.name===name).length,1,name);
   assert.ok(option.source&&option.design,name+' provenance');
   if(option.batch===3){assert.match(option.source,/^Drilady · /);assert.equal(option.sourceUrl,'https://www.tensor.trade/trade/drilady');}
   if(option.batch>=2&&category==='head')assert.equal(option.baseHead,true,'new hairstyles keep the bunny face');
  }
 }
});

test('trait packs rebind to the base bones and remain attached through animation and cloning',()=>{
 const base=new THREE.Group(),baseRig=new THREE.Group(),head=new THREE.Bone();baseRig.name='DriladyRig';head.name='Head';base.add(baseRig);baseRig.add(head);
 const pack=new THREE.Group(),packRig=new THREE.Group(),packHead=new THREE.Bone();packRig.name='DriladyRig';packHead.name='Head';pack.add(packRig);packRig.add(packHead);
 const mesh=new THREE.SkinnedMesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());mesh.name='Drif_Hat_ladyhatkoss';packRig.add(mesh);mesh.bind(new THREE.Skeleton([packHead]));
 mergeAvatarParts(base,pack);assert.equal(mesh.parent,baseRig);assert.equal(mesh.skeleton.bones[0],head);assert.equal(base.getObjectsByProperty('name','Head').length,1);
 head.rotation.y=.5;base.updateMatrixWorld(true);mesh.skeleton.update();assert.ok(mesh.skeleton.boneMatrices.every(Number.isFinite));
 const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8'),context=vm.createContext({THREE});
 vm.runInContext(source.slice(source.indexOf('export function cloneAvatar'),source.indexOf('// Apply camera aim')).replace('export ',''),context);
 const clone=context.cloneAvatar(base),clonedMesh=clone.getObjectByName(mesh.name);assert.equal(clonedMesh.skeleton.bones[0],clone.getObjectByName('Head'));assert.notEqual(clonedMesh.skeleton.bones[0],head);
 const bad=new THREE.Group(),badRig=new THREE.Group(),unknown=new THREE.Bone();badRig.name='DriladyRig';unknown.name='Unknown';bad.add(badRig);badRig.add(unknown);const invalid=mesh.clone();invalid.bind(new THREE.Skeleton([unknown]));badRig.add(invalid);assert.throws(()=>mergeAvatarParts(base,bad),/unknown bone/);
});

test('every new hairstyle, ear and face part switches cleanly without stacking hidden alternatives',async()=>{
 const {DRILADY_TRAITS}=await import('../../drilady-traits.mjs');
 const model=rig(lady).scene,wardrobe=createAvatarAppearance(model,DRILADY_DEFAULT_APPEARANCE);
 const part=(category,id)=>model.getObjectByName(`Drif_${category}_${id}`);
 for(const category of ['head','ears','eyes','brows','nose','mouth','tattoo','hat','accessory','extra','legs','shirt']){
  for(const option of DRILADY_TRAITS[category]){
   const value={...DRILADY_DEFAULT_APPEARANCE,[category]:option.id};wardrobe.setAppearance(value);
   const slot=category==='head'&&option.baseHead?'Hair':category[0].toUpperCase()+category.slice(1);
   assert.equal(part(slot,option.id).visible,true,`${category} ${option.id}`);
   for(const other of DRILADY_TRAITS[category].filter(o=>o.id!==option.id)){
    const otherSlot=category==='head'&&other.baseHead?'Hair':category[0].toUpperCase()+category.slice(1);
    assert.equal(part(otherSlot,other.id).visible,false,`${other.id} hidden`);
   }
   if(category==='head'){
    assert.equal(part('Head','original').visible,!!option.baseHead);
    assert.equal(part('Eyes','classic').visible,!!option.baseHead);
    assert.equal(part('Ears','original').visible,true);
   }
  }
 }
 for(const head of DRILADY_TRAITS.head.filter(o=>!o.baseHead))for(const ear of DRILADY_TRAITS.ears){wardrobe.setAppearance({...DRILADY_DEFAULT_APPEARANCE,head:head.id,ears:ear.id});assert.equal(part('Ears',ear.id).visible,true);assert.equal(part('Eyes','classic').visible,false);}
 wardrobe.dispose();
});

test('full outfits preserve hidden leg selections, and fitted caps restore selected hair when removed',async()=>{
 const {DRILADY_TRAITS}=await import('../../drilady-traits.mjs');
 const model=rig(lady).scene,wardrobe=createAvatarAppearance(model,DRILADY_DEFAULT_APPEARANCE);
 for(const top of DRILADY_TRAITS.shirt.filter(o=>o.overridesLegs)){
  const look=normalizeLook({appearance:{...DRILADY_DEFAULT_APPEARANCE,head:'ladyglamwave',eyes:'ladydoe',ears:'ladytalloval',shirt:top.id,legs:'ladypencilmini'}});
  wardrobe.setAppearance(look.appearance);assert.equal(model.getObjectByName('Drif_Legs_ladypencilmini').visible,false,top.id);
  const data=bookmarkMetadata({name:'QA',look},{image:'test.png',id:1});
  assert.equal(data.attributes.find(a=>a.trait_type==='legs').value,'None');
  assert.equal(data.attributes.find(a=>a.trait_type==='eyes').value,'Cocoa doe eyes');
  assert.deepEqual(parseBookmarkJSON(data).look,look);
  wardrobe.setAppearance({...look.appearance,shirt:'original'});assert.equal(model.getObjectByName('Drif_Legs_ladypencilmini').visible,true);
 }
 wardrobe.setAppearance({...DRILADY_DEFAULT_APPEARANCE,head:'ladyglamwave',hat:'ladyboater'});assert.equal(model.getObjectByName('Drif_Hair_ladyglamwave').visible,false);
 wardrobe.setAppearance({...DRILADY_DEFAULT_APPEARANCE,head:'ladyglamwave',hat:'none'});assert.equal(model.getObjectByName('Drif_Hair_ladyglamwave').visible,true);
 wardrobe.dispose();
});

test('Drilady rarity is independent, portable, and applies to all trait batches',async()=>{
 const {RARITY_GROUPS,rarityCategory,exportRarity,importRarity,traitWeight}=await import('../../drifmaker-rarity.mjs');
 const rarity={eyes:{classic:0},'drilady.eyes':Object.fromEntries(RARITY_GROUPS['drilady.eyes'].options.map(o=>[o.id,o.id==='ladydoe'?25:0]))};
 assert.equal(rarityCategory(DRILADY_DEFAULT_APPEARANCE,'eyes'),'drilady.eyes');assert.equal(rarityCategory(DEFAULT_APPEARANCE,'eyes'),'eyes');
 assert.equal(traitWeight(rarity,'eyes','classic'),0);assert.equal(traitWeight(rarity,'drilady.eyes','ladydoe'),25);
 const restored=importRarity(exportRarity(rarity));
 for(let i=0;i<20;i++)assert.equal(randomizeLook({appearance:DRILADY_DEFAULT_APPEARANCE,rarity:restored}).appearance.eyes,'ladydoe');
 restored['drilady.eyes'].ladydoe=0;
 assert.equal(randomizeLook({appearance:{...DRILADY_DEFAULT_APPEARANCE,eyes:'ladyspiral'},rarity:restored}).appearance.eyes,'ladyspiral');
});
