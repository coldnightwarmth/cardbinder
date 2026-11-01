import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../../vendor/three.module.min.js';
import {DRILADY_BUNNY_STUDY as catalog} from '../../drilady-bunny-study.mjs';
import {characterCategories,characterDefaults,normalizeAppearance,characterHair} from '../../drifmaker-config.mjs';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {normalizeLook,bookmarkMetadata} from '../../drifmaker-bookmarks.mjs';
import {parseBookmarkJSON} from '../../drifmaker-bookmark-import.mjs';
import {randomizeLook,RARITY_GROUPS} from '../../drifmaker-rarity.mjs';

function glb(path){
 const bytes=readFileSync(new URL(path,import.meta.url));
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 function values(index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView];
  const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const width={5121:1,5123:2,5125:4,5126:4}[a.componentType];
  const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType],out=[];
  for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)out.push(bytes[read](28+length+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*width)+j*width));
  return out;
 }
 return {bytes,json,values};
}
const pack=glb('../../assets/models/drilady/drilady-bunny-study.glb');
const base=glb('../../assets/models/drilady/drilady-base.glb');
const defaults=characterDefaults({character:'drilady'});
const partName=(cat,id)=>`Drif_${cat==='head'?'Hair':'Ears'}_${id}`;

test('bunny study supplies ten distinct ear pairs and five hairstyles exclusively to Drilady',()=>{
 assert.equal(catalog.ears.length,10);assert.ok(catalog.ears.filter(r=>r.upright).length>=5);
 assert.equal(catalog.head.length,5);assert.equal(pack.json.meshes.length,15);
 assert.ok(pack.bytes.length<12*1024*1024,'Small additional pack, without a duplicate base');
 for(const [category,rows] of Object.entries(catalog)){
  const hashes=new Set();
  for(const row of rows){
   const nodes=pack.json.nodes.filter(n=>n.name===partName(category,row.id));assert.equal(nodes.length,1,row.id);
   assert.equal(pack.json.meshes[nodes[0].mesh].name,nodes[0].name,'Stable multi-material child names');
   const geometry=pack.json.meshes[nodes[0].mesh].primitives.map(p=>pack.values(p.attributes.POSITION));
   hashes.add(createHash('sha256').update(JSON.stringify(geometry)).digest('hex'));
   assert.equal(characterCategories(defaults)[category].filter(r=>r.id===row.id).length,1);
   assert.equal(normalizeAppearance({...defaults,[category]:row.id})[category],row.id);
   assert.equal(characterCategories({character:'drifella'})[category].some(r=>r.id===row.id),false);
   if(category==='head')assert.equal(row.baseHead,true);
  }
  assert.equal(hashes.size,rows.length,'Every silhouette is distinct');
 }
});

test('every new vertex uses the original Head bind and all 49 base animations remain reusable',()=>{
 const bones=g=>g.json.skins[0].joints.map(i=>g.json.nodes[i].name);
 assert.deepEqual(bones(pack),bones(base));assert.equal(bones(pack).length,19);
 const expected=base.values(base.json.skins[0].inverseBindMatrices);
 pack.values(pack.json.skins[0].inverseBindMatrices).forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.00002));
 assert.equal(pack.json.animations?.length||0,0);assert.equal(base.json.animations.length,49);
 const headIndex=bones(pack).indexOf('Head');
 for(const node of pack.json.nodes.filter(n=>n.mesh!==undefined)){
  assert.equal(node.skin,0,node.name);
  for(const primitive of pack.json.meshes[node.mesh].primitives){
   const positions=pack.values(primitive.attributes.POSITION),normals=pack.values(primitive.attributes.NORMAL);
   assert.ok(positions.every(Number.isFinite));assert.ok(normals.every(Number.isFinite));
   const indices=pack.values(primitive.indices);assert.ok(indices.every(i=>i>=0&&i<positions.length/3));
   const weights=pack.values(primitive.attributes.WEIGHTS_0),joints=pack.values(primitive.attributes.JOINTS_0);
   for(let i=0;i<weights.length;i+=4){
    assert.ok(Math.abs(weights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-5);
    for(let k=0;k<4;k++){assert.ok(Number.isFinite(weights[i+k])&&weights[i+k]>=0);if(weights[i+k]>0)assert.equal(joints[i+k],headIndex);}
   }
  }
 }
});

test('ears, hairstyles and existing face selections mix, save and restore without stacking alternatives',()=>{
 const model=new THREE.Group();
 for(const [category,rows] of Object.entries(characterCategories(defaults)))for(const row of rows){
  const node=new THREE.Group();node.name=`Drif_${category==='head'&&row.baseHead?'Hair':category[0].toUpperCase()+category.slice(1)}_${row.id}`;model.add(node);
 }
 const originalHair=new THREE.Group();originalHair.name='Drif_Hair_original';model.add(originalHair);
 const wardrobe=createAvatarAppearance(model,defaults);
 for(const hair of catalog.head)for(const ear of catalog.ears){
  const look=normalizeLook({appearance:{...defaults,head:hair.id,ears:ear.id,eyes:'ladydoe',mouth:'original'}});
  wardrobe.setAppearance(look.appearance);
  assert.equal(characterHair(look.appearance),hair.id);
  assert.equal(model.getObjectByName(partName('head',hair.id)).visible,true);
  assert.equal(model.getObjectByName(partName('ears',ear.id)).visible,true);
  assert.equal(model.getObjectByName('Drif_Head_original').visible,true);
  assert.equal(model.getObjectByName('Drif_Eyes_ladydoe').visible,true);
  assert.equal(model.getObjectByName('Drif_Ears_original').visible,false);
  assert.equal(originalHair.visible,false);
  for(const other of catalog.ears.filter(r=>r.id!==ear.id))assert.equal(model.getObjectByName(partName('ears',other.id)).visible,false);
  for(const other of catalog.head.filter(r=>r.id!==hair.id))assert.equal(model.getObjectByName(partName('head',other.id)).visible,false);
  assert.deepEqual(parseBookmarkJSON(bookmarkMetadata({name:'Bunny study',look},{id:1,image:'test.png'})).look,look);
 }
 wardrobe.setAppearance(defaults);assert.equal(originalHair.visible,true);wardrobe.dispose();
});

test('new ears and hairstyles respect independent rarity controls',()=>{
 for(let i=0;i<10;i++){
  const expected={ears:catalog.ears[i].id,head:catalog.head[i%5].id},rarity={};
  for(const category of ['ears','head'])rarity['drilady.'+category]=Object.fromEntries(RARITY_GROUPS['drilady.'+category].options.map(row=>[row.id,row.id===expected[category]?1:0]));
  const rolled=randomizeLook({appearance:defaults,rarity});assert.equal(rolled.appearance.ears,expected.ears);assert.equal(rolled.appearance.head,expected.head);
 }
});
