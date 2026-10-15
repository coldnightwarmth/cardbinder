import {POSES,normalizePose,normalizePoseTime} from '../../drifmaker-poses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {CATEGORIES,GOLD_COLOR,BODY_COLORS,PORTRAIT_BACKGROUNDS,DEFAULT_APPEARANCE,APPEARANCE_STORAGE_KEY,normalizeAppearance,appearanceKey,loadAppearance,saveAppearance} from '../../drifmaker-config.mjs';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {Showroom} from '../src/showroom.js';
import {freshRoom} from '../src/showroom-state.js';

test('expanded wardrobe contains twelve independent categories and bounded normalized values',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(CATEGORIES).map(([category,items])=>[category,items.length])),{eyes:35,mouth:31,shirt:30,legs:24,hat:31,accessory:30,head:10,extra:16,tattoo:12,nose:9,ears:13,brows:14});
 for(const items of Object.values(CATEGORIES)){
  assert.ok(items.filter(item=>item.id!=='none').length>=5);
  assert.equal(new Set(items.map(item=>item.id)).size,items.length);
  for(const item of items)assert.match(item.id,/^[a-z0-9]+$/);
 }
 assert.equal(BODY_COLORS.length,43);
 assert.equal(PORTRAIT_BACKGROUNDS.length,32);
 for(const palette of [BODY_COLORS,PORTRAIT_BACKGROUNDS]){
  assert.equal(new Set(palette.map(color=>color.hex)).size,palette.length);
  for(const color of palette)if(color.hex!=='rainbow')assert.match(color.hex,/^#[a-f0-9]{6}$/);
 }
 assert.deepEqual(normalizeAppearance(null),DEFAULT_APPEARANCE);
 assert.deepEqual(normalizeAppearance([]),DEFAULT_APPEARANCE);
 assert.deepEqual(normalizeAppearance({bodyColor:'url(https://example.com)',eyes:'__proto__',shirt:{id:'bomber'},hat:'toString',accessory:'x'.repeat(10000),legs:['cargo'],mouth:'constructor',extra:'ignored'}),DEFAULT_APPEARANCE);
 const chosen={...DEFAULT_APPEARANCE,bodyColor:'#ABC123',eyes:'hearts',mouth:'fangs',shirt:'puffer',legs:'cargo',hat:'wizard',accessory:'wings'};
 assert.deepEqual(normalizeAppearance(chosen),{...chosen,bodyColor:'#abc123'});
 assert.equal(appearanceKey(chosen),appearanceKey({...chosen,bodyColor:'#abc123',unknown:true}));
 assert.notEqual(appearanceKey(chosen),appearanceKey({...chosen,legs:'denim'}));
 assert.notEqual(appearanceKey(chosen),appearanceKey({...chosen,mouth:'braces'}));
 assert.deepEqual(Object.keys(normalizeAppearance({...chosen,unsafe:'ignored'})),['bodyColor','bodyStyle',...Object.keys(CATEGORIES)]);
 assert.ok(JSON.stringify(normalizeAppearance(chosen)).length<384,'appearance remains a compact fixed-shape pose field');
});

test('wizard robe hides all leg variants and switching tops restores the saved choice',()=>{
 const model=new THREE.Group();
 for(const name of ['Drif_Shirt_wizardrobe','Drif_Shirt_original',...CATEGORIES.legs.map(item=>'Drif_Legs_'+item.id)]){const part=new THREE.Group();part.name=name;model.add(part);}
 const controller=createAvatarAppearance(model);
 for(const item of CATEGORIES.legs){
  controller.setAppearance({...DEFAULT_APPEARANCE,shirt:'wizardrobe',legs:item.id});
  assert.equal(controller.appearance.legs,item.id);
  assert.ok(CATEGORIES.legs.every(option=>!model.getObjectByName('Drif_Legs_'+option.id).visible));
  assert.equal(model.getObjectByName('Drif_Shirt_wizardrobe').visible,true);
  controller.setAppearance({...controller.appearance,shirt:'original'});
  assert.equal(model.getObjectByName('Drif_Legs_'+item.id).visible,true);
 }
 controller.dispose();
});

test('camo covers skin and feet, preserves eyewear and clothes, and restores other finishes',()=>{
 const geometry=new THREE.BoxGeometry(),source=new THREE.MeshStandardMaterial({color:'#ffffff'});source.name='Drif_Original_Warm_ivory';
 const model=new THREE.Group();
 for(const name of ['Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Eyes_mog','Drif_Mouth_fluffybeard','Drif_Shirt_original','Drif_Legs_original']){const part=new THREE.Mesh(geometry,source);part.name=name;model.add(part);}
 const controller=createAvatarAppearance(model);
 controller.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:'camo',eyes:'mog',mouth:'fluffybeard'});
 assert.equal(controller.appearance.bodyColor,'#62734a');
 for(const part of ['Head_original','Ears_original','Nose_original','Legs_original']){
  const mat=model.getObjectByName('Drif_'+part).material;
  assert.equal(mat.userData.drifCamo,true,part);assert.equal(mat.roughness,1);assert.equal(mat.metalness,0);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};mat.onBeforeCompile(shader);
  assert.match(shader.vertexShader,/vDrifCamoPosition = position/);assert.match(shader.fragmentShader,/diffuseColor.rgb = camoColor/);
 }
 for(const part of ['Eyes_mog','Mouth_fluffybeard','Shirt_original'])assert.ok(!model.getObjectByName('Drif_'+part).material.userData.drifCamo,part);
 const skin=model.getObjectByName('Drif_Head_original').material;
 controller.setAppearance({...controller.appearance,bodyStyle:'ghost'});assert.equal(skin.userData.drifCamo,false);assert.equal(skin.userData.drifGhost,true);
 controller.setAppearance({...controller.appearance,bodyStyle:'silver'});assert.equal(skin.userData.drifCamo,false);assert.equal(skin.metalness,.94);
 controller.setAppearance({...DEFAULT_APPEARANCE});assert.equal(skin.userData.drifCamo,false);assert.equal(skin.color.getHexString(),'ffffff');assert.equal(skin.roughness,source.roughness);
 controller.dispose();geometry.dispose();source.dispose();
});

test('pumpkin, TV and crystal retain classic fins without losing the selected ear variant',()=>{
 const model=new THREE.Group();
 for(const name of ['Drif_Ears_original','Drif_Ears_elf','Drif_Eyes_classic','Drif_Mouth_original',...CATEGORIES.head.map(head=>'Drif_Head_'+head.id)]){const part=new THREE.Group();part.name=name;model.add(part);}
 const controller=createAvatarAppearance(model),selected={...DEFAULT_APPEARANCE,ears:'elf'};
 for(const head of ['pumpkin','tv','crystal']){
  controller.setAppearance({...selected,head});
  assert.equal(model.getObjectByName('Drif_Ears_original').visible,true,head);
  assert.equal(model.getObjectByName('Drif_Ears_elf').visible,false,head);
  assert.equal(model.getObjectByName('Drif_Eyes_classic').visible,false,head);
  assert.equal(model.getObjectByName('Drif_Mouth_original').visible,false,head);
  assert.equal(controller.appearance.ears,'elf');
 }
 for(const head of ['void','vortex','gasmask','glitch','hockey','hayabusa']){
  controller.setAppearance({...selected,head});
  assert.equal(model.getObjectByName('Drif_Ears_original').visible,false,head);
  assert.equal(model.getObjectByName('Drif_Ears_elf').visible,false,head);
 }
 controller.setAppearance(selected);
 assert.equal(model.getObjectByName('Drif_Ears_elf').visible,true);
 assert.equal(model.getObjectByName('Drif_Ears_original').visible,false);
 controller.dispose();
});

test('alternate heads override facial meshes and ghost materials stay isolated and reversible',()=>{
 const geometry=new THREE.SphereGeometry(1,8,6),skin=new THREE.MeshStandardMaterial({color:0x1d5dea}),ivory=new THREE.MeshStandardMaterial({color:0xffeedd});
 skin.name='Drif_Body_Main';ivory.name='shared-ivory';
 const source=new THREE.Group();
 for(const [name,material] of [['Drif_Body',skin],['Drif_Head_original',ivory],['Drif_Head_hockey',ivory],['Drif_Brows_heavy',ivory],['Drif_Eyes_venom',ivory],['Drif_Mouth_venom',ivory],['Drif_Nose_pig',ivory],['Drif_Ears_elf',ivory],['Drif_Tattoo_stars',ivory],['Drif_Shirt_original',ivory],['Drif_Extra_mon',ivory],['Drif_Ghost_Fuzz',ivory]]){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;source.add(mesh);
 }
 const a=source.clone(true),b=source.clone(true),appearanceA=createAvatarAppearance(a),appearanceB=createAvatarAppearance(b);
 const selected={...DEFAULT_APPEARANCE,eyes:'venom',brows:'heavy',mouth:'venom',nose:'pig',ears:'elf',tattoo:'stars',extra:'mon'};
 appearanceA.setAppearance(selected);appearanceB.setAppearance(selected);
 appearanceA.setAppearance({...selected,head:'hockey',bodyStyle:'ghost',bodyColor:'#00ccef'});
 assert.equal(a.getObjectByName('Drif_Head_original').visible,false);
 assert.equal(a.getObjectByName('Drif_Head_hockey').visible,true);
 assert.equal(a.getObjectByName('Drif_Eyes_venom').visible,false);assert.equal(a.getObjectByName('Drif_Mouth_venom').visible,false);
 assert.equal(a.getObjectByName('Drif_Extra_mon').visible,true);assert.equal(a.getObjectByName('Drif_Ghost_Fuzz').visible,true);
 for(const part of ['Drif_Brows_heavy','Drif_Nose_pig','Drif_Ears_elf','Drif_Tattoo_stars'])assert.equal(a.getObjectByName(part).visible,false);
 assert.equal(appearanceA.appearance.eyes,'venom');assert.equal(appearanceA.appearance.mouth,'venom');
 const ghost=a.getObjectByName('Drif_Head_hockey').material;
 assert.equal(ghost.transparent,true);assert.equal(ghost.depthWrite,false);assert.ok(ghost.opacity<1);assert.equal(ghost.userData.drifGhost,true);
 assert.equal(a.getObjectByName('Drif_Shirt_original').material,ivory,'clothes sharing a head material keep the opaque shared original');
 assert.equal(ivory.transparent,false);assert.equal(b.getObjectByName('Drif_Head_original').material.opacity,1);
 const fragment={fragmentShader:'#include <opaque_fragment>'};ghost.onBeforeCompile(fragment);assert.match(fragment.fragmentShader,/drifRim/);
 appearanceA.setAppearance(selected);
 assert.equal(a.getObjectByName('Drif_Head_original').visible,true);assert.equal(a.getObjectByName('Drif_Head_hockey').visible,false);
 assert.equal(a.getObjectByName('Drif_Eyes_venom').visible,true);assert.equal(a.getObjectByName('Drif_Mouth_venom').visible,true);assert.equal(a.getObjectByName('Drif_Ghost_Fuzz').visible,false);
 for(const part of ['Drif_Brows_heavy','Drif_Nose_pig','Drif_Ears_elf','Drif_Tattoo_stars'])assert.equal(a.getObjectByName(part).visible,true);
 assert.equal(ghost.transparent,false);assert.equal(ghost.depthWrite,true);assert.equal(ghost.opacity,1);assert.equal(ghost.emissive.getHex(),0);
 appearanceA.dispose();appearanceB.dispose();geometry.dispose();skin.dispose();ivory.dispose();
});

test('v1 looks and poses gain original legs and mouth without losing their selections',()=>{
 const legacy={bodyColor:'#abcdef',eyes:'spiral',shirt:'denim',hat:'beanie',accessory:'backpack'};
 const expected={...DEFAULT_APPEARANCE,...legacy};
 assert.deepEqual(normalizeAppearance(legacy),expected);
 assert.equal(appearanceKey(legacy),appearanceKey(expected));
 const values=new Map([[APPEARANCE_STORAGE_KEY,JSON.stringify(legacy)]]),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(APPEARANCE_STORAGE_KEY,'cards-art:drifmaker:appearance:v1');
 assert.deepEqual(loadAppearance(storage),expected);
 assert.deepEqual(saveAppearance(legacy,storage),expected);
 assert.deepEqual(JSON.parse(values.get(APPEARANCE_STORAGE_KEY)),expected);
 assert.deepEqual(normalizeAppearance({...legacy,mouth:'skull',legs:null}),{...expected,mouth:'skull'});
});

test('saved appearances survive reload, recover from malformed data, and report storage failures',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const selected={...DEFAULT_APPEARANCE,bodyColor:'#a48aef',eyes:'star',hat:'beanie'};
 assert.deepEqual(saveAppearance(selected,storage),selected);assert.deepEqual(loadAppearance(storage),selected);
 values.set(APPEARANCE_STORAGE_KEY,'{broken');assert.deepEqual(loadAppearance(storage),DEFAULT_APPEARANCE);
 values.set(APPEARANCE_STORAGE_KEY,JSON.stringify({eyes:'classic',hat:'<script>'}));assert.deepEqual(loadAppearance(storage),DEFAULT_APPEARANCE);
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.deepEqual(loadAppearance(denied),DEFAULT_APPEARANCE);assert.throws(()=>saveAppearance(selected,denied),/quota/);
 assert.throws(()=>saveAppearance(selected,{}),/cannot save/);
});

test('mixing wardrobe parts isolates body color and visibility while sharing immutable assets',()=>{
 const source=new THREE.Group(),geometry=new THREE.BoxGeometry(),bodyMaterial=new THREE.MeshStandardMaterial({color:0x1d5dea}),wardrobeMaterial=new THREE.MeshStandardMaterial({color:0xffffff});
 bodyMaterial.name='Drif_Body_Main';
 const body=new THREE.Mesh(geometry,bodyMaterial);body.name='Drif_Body';source.add(body);
 for(const [category,items] of Object.entries(CATEGORIES))for(const item of items.filter(item=>item.id!=='none')){
  const part=new THREE.Mesh(geometry,category==='eyes'?[wardrobeMaterial,bodyMaterial]:wardrobeMaterial);
  part.name=`Drif_${category[0].toUpperCase()+category.slice(1)}_${item.id}`;source.add(part);
 }
 const a=source.clone(true),b=source.clone(true),wardrobeA=createAvatarAppearance(a),wardrobeB=createAvatarAppearance(b);
 const selected={...DEFAULT_APPEARANCE,bodyColor:'#e67d9b',eyes:'star',mouth:'goldgrill',shirt:'bomber',legs:'patched',hat:'party',accessory:'headphones'};
 wardrobeA.setAppearance(selected);wardrobeB.setAppearance();
 assert.equal(a.children[0].geometry,geometry);assert.notEqual(a.children[0].material,bodyMaterial);assert.notEqual(a.children[0].material,b.children[0].material);
 assert.equal(a.children[0].material.color.getHexString(),'e67d9b');assert.equal(b.children[0].material.color.getHexString(),'1d5dea');assert.equal(bodyMaterial.color.getHexString(),'1d5dea');
 for(const [category,items] of Object.entries(CATEGORIES))for(const item of items.filter(item=>item.id!=='none')){
  const name=`Drif_${category[0].toUpperCase()+category.slice(1)}_${item.id}`;
  assert.equal(a.getObjectByName(name).visible,item.id===selected[category]);
  assert.equal(b.getObjectByName(name).visible,item.id===DEFAULT_APPEARANCE[category]);
 }
 // Each new category swaps only its own meshes, with no effect on another
 // category or another player's clone.
 for(const category of ['mouth','legs','nose','ears','tattoo'])for(const item of CATEGORIES[category]){
  const look={...selected,[category]:item.id};wardrobeA.setAppearance(look);
  for(const [other,items] of Object.entries(CATEGORIES))for(const option of items.filter(option=>option.id!=='none')){
   const name=`Drif_${other[0].toUpperCase()+other.slice(1)}_${option.id}`;
   assert.equal(a.getObjectByName(name).visible,option.id===look[other],`${category}:${item.id} must leave ${other} independent`);
   assert.equal(b.getObjectByName(name).visible,option.id===DEFAULT_APPEARANCE[other]);
  }
 }
 const localMaterial=a.children[0].material;let localDisposed=0,sharedDisposed=0;
 localMaterial.addEventListener('dispose',()=>localDisposed++);bodyMaterial.addEventListener('dispose',()=>sharedDisposed++);wardrobeMaterial.addEventListener('dispose',()=>sharedDisposed++);
 for(let i=0;i<20;i++)wardrobeA.setAppearance({...selected,bodyColor:i%2?'#28b8ae':'#e67d9b'});
 assert.equal(a.children[0].material,localMaterial);
 wardrobeA.dispose();wardrobeA.dispose();assert.equal(localDisposed,1);assert.equal(sharedDisposed,0);
 assert.throws(()=>wardrobeA.setAppearance(selected),/disposed/);wardrobeB.dispose();geometry.dispose();bodyMaterial.dispose();wardrobeMaterial.dispose();
});

test('every shipped wardrobe option is skinned to the original rig and retains all showroom clips',()=>{
 const readAsset=path=>{
  const bytes=readFileSync(new URL(path,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString()),binaryStart=28+length;
  const values=index=>{
   const accessor=json.accessors[index],view=json.bufferViews[accessor.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[accessor.type];
   const components={5121:[1,'readUInt8',255],5123:[2,'readUInt16LE',65535],5125:[4,'readUInt32LE',4294967295],5126:[4,'readFloatLE',1]},[bytesPer,method,denominator]=components[accessor.componentType];
   const offset=binaryStart+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||size*bytesPer,result=[];
   for(let i=0;i<accessor.count;i++)for(let j=0;j<size;j++){const value=bytes[method](offset+i*stride+j*bytesPer);result.push(accessor.normalized?value/denominator:value);}return result;
  };return {json,values};
 };
 const current=readAsset('../../assets/models/drifmaker/drifella-customizable.glb'),original=readAsset('../../assets/models/showroom-character/blue-fin-character.glb');
 const {json:gltf,values}=current;
 assert.equal(gltf.skins.length,1);assert.deepEqual(gltf.skins[0].joints.map(index=>gltf.nodes[index].name),original.json.skins[0].joints.map(index=>original.json.nodes[index].name));
 const bind=values(gltf.skins[0].inverseBindMatrices),originalBind=original.values(original.json.skins[0].inverseBindMatrices);
 assert.equal(bind.length,originalBind.length);bind.forEach((value,index)=>assert.ok(Math.abs(value-originalBind[index])<.00001,'wardrobe must preserve the original bind pose'));
 assert.ok(gltf.nodes.some(node=>node.name==='CardSocket.R'));
 const hoodie=gltf.meshes[gltf.nodes.find(node=>node.name==='Drif_Shirt_swagworld').mesh];
 const photoPrimitive=hoodie.primitives.find(primitive=>gltf.materials[primitive.material].name==='Drif_SwagWorld_Photo');
 assert.ok(photoPrimitive?.attributes.TEXCOORD_0!==undefined,'Swag World photo must have UV-mapped geometry');
 const photoMaterial=gltf.materials[photoPrimitive.material],texture=gltf.textures[photoMaterial.pbrMetallicRoughness.baseColorTexture.index];
 assert.ok(gltf.images[texture.source].bufferView!==undefined,'the supplied photo is embedded in the GLB');
 assert.ok(values(photoPrimitive.attributes.TEXCOORD_0).every(Number.isFinite));
 const hood=gltf.meshes[gltf.nodes.find(node=>node.name==='Drif_Hat_ponchohood').mesh];
 const woven=hood.primitives.find(primitive=>gltf.materials[primitive.material].name==='Drif_Collection_Poncho_Fabric');
 assert.ok(woven?.attributes.TEXCOORD_0!==undefined,'poncho cloth retains its fabric UVs');
 const wovenTexture=gltf.textures[gltf.materials[woven.material].pbrMetallicRoughness.baseColorTexture.index];
 assert.ok(gltf.images[wovenTexture.source].bufferView!==undefined,'poncho cloth texture travels with the GLB');
 assert.deepEqual(gltf.animations.filter(clip=>!clip.name.startsWith('Pose_')).map(clip=>clip.name).sort(),original.json.animations.map(clip=>clip.name).sort());
 const expectedNames=['Drif_Body','Drif_Ghost_Fuzz',...Object.entries(CATEGORIES).flatMap(([category,items])=>items.filter(item=>item.id!=='none').map(item=>`Drif_${category[0].toUpperCase()+category.slice(1)}_${item.id}`))];
 assert.equal(expectedNames.length,252);
 assert.deepEqual(gltf.nodes.filter(node=>node.mesh!==undefined).map(node=>node.name).sort(),expectedNames.sort(),'every logical wardrobe option has exactly one mesh node');
 for(const [category,items] of Object.entries(CATEGORIES))for(const item of items.filter(item=>item.id!=='none')){
  const prefix=`Drif_${category[0].toUpperCase()+category.slice(1)}_${item.id}`;
  const parts=gltf.nodes.filter(node=>node.name===prefix||node.name?.startsWith(`${prefix}_`));
  assert.ok(parts.length,`missing ${prefix}`);
  for(const node of parts){
   assert.equal(node.skin,0,`${node.name} must use the common animated skeleton`);
   for(const primitive of gltf.meshes[node.mesh].primitives){
    const joints=values(primitive.attributes.JOINTS_0),weights=values(primitive.attributes.WEIGHTS_0);
    assert.equal(joints.length,weights.length);assert.equal(weights.length,gltf.accessors[primitive.attributes.POSITION].count*4);
    for(let i=0;i<weights.length;i+=4){
     assert.ok(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)<.001,`${node.name} has an unweighted vertex`);
     for(let j=0;j<4;j++){assert.ok(weights[i+j]>=0&&Number.isFinite(weights[i+j]));assert.ok(Number.isInteger(joints[i+j])&&joints[i+j]>=0&&joints[i+j]<gltf.skins[0].joints.length);}
    }
   }
  }
 }
 // Splitting legs and mouth out of the joined character must neither lose
 // nor duplicate any original surface. Compare triangles independent of
 // exporter vertex order and per-material vertex duplication.
 const triangles=(asset,names)=>{
  const result=new Map();
  for(const node of asset.json.nodes.filter(node=>node.mesh!==undefined&&(!names||names.includes(node.name)))){
   assert.equal(node.matrix,undefined);assert.equal(node.translation,undefined);assert.equal(node.rotation,undefined);assert.equal(node.scale,undefined);
   for(const primitive of asset.json.meshes[node.mesh].primitives){
    const positions=asset.values(primitive.attributes.POSITION),indices=primitive.indices===undefined?Array.from({length:positions.length/3},(_,index)=>index):asset.values(primitive.indices);
    for(let index=0;index<indices.length;index+=3){
     const key=indices.slice(index,index+3).map(vertex=>positions.slice(vertex*3,vertex*3+3).map(value=>Math.round(value*100000)).join(',')).sort().join('|');
     result.set(key,(result.get(key)||0)+1);
    }
   }
  }
  return [...result].sort(([a],[b])=>a.localeCompare(b));
 };
 const originalParts=['Drif_Body','Drif_Head_original','Drif_Eyes_classic','Drif_Mouth_original','Drif_Shirt_original','Drif_Legs_original','Drif_Accessory_original','Drif_Nose_original','Drif_Ears_original','Drif_Brows_original'];
 assert.deepEqual(triangles(current,originalParts),triangles(original),'the original body, eyes, mouth, shirt, legs and bag must reconstruct the original surface');
 // Compare actual animation sampler data, not just their display names.
 assert.deepEqual(gltf.animations.filter(clip=>clip.name.startsWith('Pose_')).map(clip=>clip.name).sort(),POSES.map(pose=>pose.clip).sort());
 for(const clip of gltf.animations.filter(clip=>!clip.name.startsWith('Pose_'))){
  const baseline=original.json.animations.find(item=>item.name===clip.name);
  assert.equal(clip.channels.length,baseline.channels.length);
  for(const channel of clip.channels){
   const name=gltf.nodes[channel.target.node].name,path=channel.target.path;
   const expected=baseline.channels.find(item=>original.json.nodes[item.target.node].name===name&&item.target.path===path);
   assert.ok(expected,`${clip.name}: ${name}.${path}`);
   const sampler=clip.samplers[channel.sampler],expectedSampler=baseline.samplers[expected.sampler];
   for(const key of ['input','output']){
    const actualValues=values(sampler[key]),expectedValues=original.values(expectedSampler[key]);assert.equal(actualValues.length,expectedValues.length);
    actualValues.forEach((value,index)=>assert.ok(Math.abs(value-expectedValues[index])<.00001,`${clip.name}: ${name}.${path} changed`));
   }
  }
 }
});

function serverFixture(){
 const player={id:'a',pose:{x:0,y:1.65,z:3.5,yaw:0,pitch:0,room:'showroom'},lastActive:1,lastMove:0,seen:[]},messages=[];
 const ws={deserializeAttachment:()=>structuredClone(player),serializeAttachment:value=>Object.assign(player,value),send:value=>messages.push(JSON.parse(value))};
 const server=Object.create(Showroom.prototype);server.room=freshRoom();server.ctx={getWebSockets:()=>[ws],storage:{put:async()=>{},setAlarm:async()=>{}}};return {server,player,ws,messages};
}
test('showroom broadcasts and snapshots carry validated appearance, including stationary changes',async()=>{
 const {server,player,ws,messages}=serverFixture(),chosen={...DEFAULT_APPEARANCE,eyes:'hearts',mouth:'braces',hat:'halo',shirt:'rugby',legs:'tech',accessory:'skateboard'};
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,appearance:chosen}}));
 assert.deepEqual(player.pose.appearance,chosen);assert.deepEqual(messages.at(-1).pose.appearance,chosen);assert.deepEqual(server.snapshot().players[0].pose.appearance,chosen);assert.ok(player.lastActive>1);
 const lastActive=player.lastActive;player.lastMove=0;
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:player.pose}));assert.equal(player.lastActive,lastActive);
 // New-category changes alone must be broadcast and count as activity.
 for(const patch of [{mouth:'venom'},{legs:'rainbow'},{head:'hockey'},{extra:'mon'},{bodyStyle:'ghost'},{bodyStyle:'gold',bodyColor:GOLD_COLOR},{nose:'pig'},{ears:'elf'},{tattoo:'stars'},{brows:'flame'},{head:'original',hat:'ponchohood',shirt:'militaryvest',eyes:'gengar',mouth:'gengarsmile'},{hat:'aliencap',eyes:'pixelcry',mouth:'rainbowtongue'}]){
  player.lastMove=0;player.lastActive=1;
  const updated={...player.pose.appearance,...patch};
  await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,appearance:updated}}));
  assert.ok(player.lastActive>1);assert.deepEqual(messages.at(-1).pose.appearance,updated);assert.deepEqual(server.snapshot().players[0].pose.appearance,updated);
 }
 player.lastMove=0;
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,appearance:{bodyColor:'red',eyes:'bad',hat:'none',legs:{asset:'remote'},mouth:'__proto__',shader:'https://example.com'}}}));
 assert.deepEqual(player.pose.appearance,DEFAULT_APPEARANCE);assert.equal(JSON.stringify(messages.at(-1)).includes('example.com'),false);
 player.lastMove=0;
 const legacy={bodyColor:'#abc123',eyes:'sleepy',hat:'cap',shirt:'original',accessory:'none'};
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,appearance:legacy}}));
 assert.deepEqual(messages.at(-1).pose.appearance,{...DEFAULT_APPEARANCE,...legacy});
 for(const pose of POSES){
  player.lastMove=0;player.lastActive=1;
  await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,emote:pose.id,emoteTime:1.25}}));
  assert.equal(messages.at(-1).pose.emote,pose.id);assert.equal(server.snapshot().players[0].pose.emoteTime,1.25);assert.ok(player.lastActive>1);
 }
 player.lastMove=0;
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,emote:'salute',emoteTime:9999}}));assert.equal(player.pose.emoteTime,2);
 player.lastMove=0;
 await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,emote:'untrusted',emoteTime:1}}));assert.equal(player.pose.emote,'');assert.equal(player.pose.emoteTime,0);

});

test('multiplayer publishes saved appearance and uses the newest choice after avatar loading',async()=>{
 const source=readFileSync(new URL('../../showroom-multiplayer.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const saved={...DEFAULT_APPEARANCE,bodyColor:'#e9b84c',hat:'beanie'},scene=new THREE.Scene(),room=new THREE.Group(),camera=new THREE.PerspectiveCamera();camera.position.y=1.65;
 let handlers,finishLoad,changeSaved;const sent=[],applied=[];
 const avatar={model:new THREE.Group(),async setAppearance(value){applied.push({...value});},dispose(){}};
 const network={id:'local',send:value=>sent.push(value),now:()=>Date.now(),close(){}};
 const context=vm.createContext({THREE,normalizePose,normalizePoseTime,appearanceKey,normalizeAppearance,loadAppearance:()=>saved,subscribeAppearance:fn=>{changeSaved=fn;return ()=>{};},
  createShowroomAvatar:()=>new Promise(resolve=>{finishLoad=()=>resolve(avatar);}),createPoseBuffer:()=>({push(){},sample:()=>null}),connectShowroom:value=>{handlers=value;return network;},
  location:{hostname:'example.com'},performance:{now:()=>100},console,setTimeout,clearTimeout});
 vm.runInContext(source,context);
 const multiplayer=context.createShowroomMultiplayer({scene,room,camera,portal:{inside:false},bridge:{},columns:{setNetwork(){}},ripples:{forget(){}},onDirty(){}});
 multiplayer.update(100);assert.deepEqual(sent[0].pose.appearance,saved);
 const pose={x:0,y:1.65,z:0,yaw:0,pitch:0,room:'showroom',appearance:{...DEFAULT_APPEARANCE,eyes:'sleepy'}};
 handlers.onPose({type:'pose',id:'remote',pose,time:1});
 const latest={...DEFAULT_APPEARANCE,eyes:'buttons',mouth:'cat',shirt:'tiedye',legs:'striped',hat:'bunny',accessory:'cassette'};
 handlers.onPose({type:'pose',id:'remote',pose:{...pose,appearance:latest},time:2});finishLoad();
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(applied.at(-1),latest);
 changeSaved(latest);multiplayer.update(200);assert.deepEqual(sent.at(-1).pose.appearance,latest);
 camera.userData.pose={emote:'bow',emoteTime:1.25};multiplayer.update(300);assert.equal(sent.at(-1).pose.emote,'bow');assert.equal(sent.at(-1).pose.emoteTime,1.25);
 multiplayer.dispose();
});

test('gold covers every body and face surface, isolates clothes, and restores original finishes',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),map=new THREE.Texture();
 const shared=new THREE.MeshStandardMaterial({color:0xddeeff,map,metalness:.12,roughness:.74,emissive:0x00ffff,emissiveIntensity:2});shared.name='shared-skin';
 const names=['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Mouth_original','Drif_Eyes_classic','Drif_Brows_original'];
 for(const name of [...names,'Drif_Shirt_original','Drif_Tattoo_stars']){const mesh=new THREE.Mesh(geometry,shared);mesh.name=name;root.add(mesh);}
 const other=root.clone(true),wardrobe=createAvatarAppearance(root),otherWardrobe=createAvatarAppearance(other);
 wardrobe.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:'gold',bodyColor:'#111111',tattoo:'stars'});
 assert.equal(wardrobe.appearance.bodyColor,GOLD_COLOR,'gold persists with its canonical finish color');
 for(const name of names){const material=root.getObjectByName(name).material;assert.equal(material.color.getHexString(),GOLD_COLOR.slice(1));assert.equal(material.metalness,.94);assert.equal(material.roughness,.17);assert.equal(material.map,null);assert.equal(material.opacity,1);assert.equal(material.emissive.getHex(),0);assert.equal(material.emissiveIntensity,0);}
 assert.equal(root.getObjectByName('Drif_Shirt_original').material,shared);assert.equal(root.getObjectByName('Drif_Tattoo_stars').material,shared);
 assert.equal(other.getObjectByName('Drif_Head_original').material.color.getHex(),0xddeeff);
 wardrobe.setAppearance(DEFAULT_APPEARANCE);
 for(const name of names){const material=root.getObjectByName(name).material;assert.equal(material.map,map);assert.equal(material.color.getHex(),0xddeeff);assert.equal(material.metalness,.12);assert.equal(material.roughness,.74);assert.equal(material.emissive.getHex(),0x00ffff);assert.equal(material.emissiveIntensity,2);}
 wardrobe.dispose();otherWardrobe.dispose();geometry.dispose();shared.dispose();map.dispose();
});


test('ghost color and rim cover all skin and facial surfaces, including bare feet, and restore cleanly',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry();
 const shared=new THREE.MeshStandardMaterial({color:0xffeedd,metalness:.12,roughness:.7,emissive:0x220011,emissiveIntensity:.1});
 shared.name='Drif_Original_Warm_ivory_fins_muzzle';
 const names=['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Mouth_original','Drif_Eyes_classic','Drif_Brows_original','Drif_Legs_original'];
 for(const name of [...names,'Drif_Shirt_original','Drif_Extra_mon']){const part=new THREE.Mesh(geometry,shared);part.name=name;root.add(part);}
 const other=root.clone(true),wardrobe=createAvatarAppearance(root),otherWardrobe=createAvatarAppearance(other);
 for(const bodyColor of ['#e42ee8','#00ccef']){
  wardrobe.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:'ghost',bodyColor});
  for(const name of names){
   const material=root.getObjectByName(name).material;
   assert.equal(material.color.getHexString(),bodyColor.slice(1),name);
   assert.equal(material.emissive.getHexString(),bodyColor.slice(1),name);
   assert.equal(material.opacity,.52);assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.userData.drifGhost,true);
   const shader={fragmentShader:'#include <opaque_fragment>'};material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/drifRim/);
  }
 }
 assert.equal(root.getObjectByName('Drif_Shirt_original').material,shared);
 assert.equal(root.getObjectByName('Drif_Extra_mon').material,shared);
 assert.equal(other.getObjectByName('Drif_Ears_original').material.color.getHex(),0xffeedd);
 assert.equal(shared.opacity,1);
 wardrobe.setAppearance(DEFAULT_APPEARANCE);
 for(const name of names){const material=root.getObjectByName(name).material;assert.equal(material.color.getHex(),0xffeedd);assert.equal(material.emissive.getHex(),0x220011);assert.equal(material.opacity,1);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.userData.drifGhost,false);}
 wardrobe.dispose();otherWardrobe.dispose();geometry.dispose();shared.dispose();
});

test('silver and matte black cover the whole face and body, preserve clothes, and restore ghost finishes',()=>{
 const geometry=new THREE.BoxGeometry(),shared=new THREE.MeshStandardMaterial({color:0x12aaff,metalness:.1,roughness:.4,emissive:0x336699,emissiveIntensity:2}),root=new THREE.Group();
 const names=['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Mouth_original','Drif_Eyes_classic','Drif_Brows_original'];
 for(const name of [...names,'Drif_Shirt_original','Drif_Extra_mon']){const node=new THREE.Mesh(geometry,shared);node.name=name;root.add(node);}
 const wardrobe=createAvatarAppearance(root);
 for(const [bodyStyle,color,metalness,roughness] of [['silver','d7dee8',.94,.17],['matteblack','08090b',0,1]]){
  wardrobe.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:'ghost',bodyColor:'#ff00ff'});
  wardrobe.setAppearance({...DEFAULT_APPEARANCE,bodyStyle});assert.equal(wardrobe.appearance.bodyColor,`#${color}`);
  for(const name of names){const material=root.getObjectByName(name).material;assert.equal(material.color.getHexString(),color);assert.equal(material.metalness,metalness);assert.equal(material.roughness,roughness);assert.equal(material.transparent,false);assert.equal(material.opacity,1);assert.equal(material.depthWrite,true);assert.equal(material.emissiveIntensity,0);assert.equal(material.userData.drifGhost,false);}
  assert.equal(root.getObjectByName('Drif_Shirt_original').material,shared);assert.equal(root.getObjectByName('Drif_Extra_mon').material,shared);
 }
 wardrobe.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:'ghost',bodyColor:'#ff00ff'});assert.equal(root.getObjectByName('Drif_Ears_original').material.color.getHexString(),'ff00ff');assert.equal(root.getObjectByName('Drif_Ears_original').material.transparent,true);
 wardrobe.dispose();geometry.dispose();shared.dispose();
});
