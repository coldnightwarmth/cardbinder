import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../../vendor/three.module.min.js';
import {CHARACTER_COLLECTION as catalog} from '../../drifmaker-character-collection.mjs';
import {characterCategories,characterDefaults,normalizeAppearance,usesBaseHead,topOverridesLegs,characterHair} from '../../drifmaker-config.mjs';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {normalizeLook,bookmarkMetadata} from '../../drifmaker-bookmarks.mjs';
import {parseBookmarkJSON} from '../../drifmaker-bookmark-import.mjs';
import {randomizeLook,RARITY_GROUPS} from '../../drifmaker-rarity.mjs';
function asset(path){
 const bytes=readFileSync(new URL(path,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 function values(index){const a=json.accessors[index],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],width={5121:1,5123:2,5125:4,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType],out=[];for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)out.push(bytes[read](28+length+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*width)+j*width));return out;}
 return {bytes,json,values};
}
const assets=Object.fromEntries(['drifella','drilady'].map(character=>[character,asset(`../../assets/models/${character==='drilady'?'drilady':'drifmaker'}/${character}-collection-wave.glb`)]));
const base=asset('../../assets/models/drifmaker/drifella-customizable.glb');
const partName=(cat,row)=>`Drif_${cat==='head'?'Hair':cat[0].toUpperCase()+cat.slice(1)}_${row.id}`;
for(const character of ['drifella','drilady']){
 const pack=assets[character],defaults=characterDefaults({character}),groups=catalog[character];
 test(`${character}: 240 new, independently modeled options and no duplicate geometry in a category`,()=>{
  assert.equal(Object.keys(groups).length,12);assert.equal(pack.json.meshes.length,240);assert.ok(pack.bytes.length<25*1024*1024);
  for(const [cat,rows] of Object.entries(groups)){
   assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.id)).size,20);assert.equal(new Set(rows.map(r=>r.label)).size,20);
   const hashes=new Set();
   for(const row of rows){
    const nodes=pack.json.nodes.filter(n=>n.name===partName(cat,row));assert.equal(nodes.length,1,row.id);
    assert.equal(characterCategories(defaults)[cat].filter(r=>r.id===row.id).length,1);
    const geometry=pack.json.meshes[nodes[0].mesh].primitives.map(p=>pack.values(p.attributes.POSITION));hashes.add(createHash('sha256').update(JSON.stringify(geometry)).digest('hex'));
    assert.equal(normalizeAppearance({...defaults,[cat]:row.id})[cat],row.id);
    assert.ok(row.source&&row.design&&row.sourceUrls.length);
   }
   assert.equal(hashes.size,20,cat+' must be more than recolors of one mesh');
  }
 });
 test(`${character}: all vertices are rigged, bind matrices match, and no duplicate animation library is shipped`,()=>{
  const bones=a=>a.json.skins[0].joints.map(i=>a.json.nodes[i].name);
  assert.deepEqual(bones(pack),bones(base));assert.equal(bones(pack).length,19);
  const expected=base.values(base.json.skins[0].inverseBindMatrices);pack.values(pack.json.skins[0].inverseBindMatrices).forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<.00002));
  assert.equal(pack.json.animations?.length||0,0);
  for(const n of pack.json.nodes.filter(n=>n.mesh!==undefined)){
   assert.equal(n.skin,0,n.name);
   for(const p of pack.json.meshes[n.mesh].primitives){
    assert.ok(pack.values(p.attributes.POSITION).every(Number.isFinite));
    const weights=pack.values(p.attributes.WEIGHTS_0),joints=pack.values(p.attributes.JOINTS_0);
    for(let i=0;i<weights.length;i+=4){assert.ok(Math.abs(weights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-5,n.name);for(let k=0;k<4;k++){assert.ok(weights[i+k]>=0&&Number.isFinite(weights[i+k]));assert.ok(joints[i+k]>=0&&joints[i+k]<19);}}
   }
  }
 });
 test(`${character}: swapping every new part preserves face, ears, hidden leg selection and saved metadata`,()=>{
  const root=new THREE.Group();
  for(const [cat,rows] of Object.entries(characterCategories(defaults)))for(const row of rows){const node=new THREE.Group();node.name=partName(cat,{...row,...(cat==='head'&&!row.baseHead?{}:{})});if(cat==='head'&&!row.baseHead)node.name='Drif_Head_'+row.id;root.add(node);}
  const appearance=createAvatarAppearance(root,defaults);
  for(const [cat,rows] of Object.entries(groups))for(const row of rows){
   const look=normalizeLook({appearance:{...defaults,[cat]:row.id}});appearance.setAppearance(look.appearance);
   assert.equal(root.getObjectByName(partName(cat,row)).visible,true,row.id);
   for(const other of rows.filter(r=>r.id!==row.id))assert.equal(root.getObjectByName(partName(cat,other)).visible,false);
   const metadata=bookmarkMetadata({name:row.label,look},{id:1,image:'portrait.png'});assert.deepEqual(parseBookmarkJSON(metadata).look,look);
   if(cat==='head'){assert.ok(usesBaseHead(look.appearance));assert.equal(root.getObjectByName('Drif_Head_original').visible,true);assert.equal(root.getObjectByName('Drif_Ears_original').visible,true);assert.equal(characterHair(look.appearance),row.id);}
   if(cat==='shirt'&&row.overridesLegs){assert.equal(topOverridesLegs(look.appearance),true);assert.equal(root.getObjectByName('Drif_Legs_original').visible,false);assert.equal(look.appearance.legs,'original');}
  }
  appearance.dispose();
 });
 test(`${character}: new options participate in independent per-tile rarity`,()=>{
  const rarity={};
  for(const [cat,rows] of Object.entries(groups)){const key=character==='drilady'?'drilady.'+cat:cat;rarity[key]=Object.fromEntries(RARITY_GROUPS[key].options.map(r=>[r.id,r.id===rows[19].id?1:0]));}
  for(let i=0;i<10;i++){const rolled=randomizeLook({appearance:defaults,rarity});for(const [cat,rows] of Object.entries(groups))assert.equal(rolled.appearance[cat],rows[19].id);}
 });
}
test('twelve shared finishes, backgrounds and transparent overlays round-trip in both species',()=>{
 for(const key of ['bodyStyle','background','overlay'])assert.equal(catalog[key].length,12);
 for(const character of ['drifella','drilady'])for(let i=0;i<12;i++){
  const look=normalizeLook({appearance:{...characterDefaults({character}),bodyStyle:catalog.bodyStyle[i].id},portrait:{background:catalog.background[i].id,overlay:catalog.overlay[i].id}});
  assert.equal(look.appearance.bodyStyle,catalog.bodyStyle[i].id);assert.equal(look.portrait.background,catalog.background[i].id);assert.equal(look.portrait.overlay,catalog.overlay[i].id);
  assert.deepEqual(parseBookmarkJSON(bookmarkMetadata({name:'Character collection',look},{id:i,image:'portrait.png'})).look,look);
 }
});
test('modeled collections are exclusive to their character; only finishes and portrait art are shared',()=>{
 for(const character of ['drifella','drilady']){
  const defaults=characterDefaults({character}),other=character==='drifella'?'drilady':'drifella';
  for(const [category,rows] of Object.entries(catalog[other]))for(const {id} of rows){
   assert.equal(characterCategories(defaults)[category].some(row=>row.id===id),false);
   assert.equal(normalizeAppearance({...defaults,[category]:id})[category],defaults[category]);
  }
 }
});
