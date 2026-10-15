import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MINOTE_CATALOG as catalog} from '../../drifmaker-minote.mjs';
import {CATEGORIES,BODY_STYLES,BODY_COLORS,PORTRAIT_BACKGROUNDS,LEG_OVERRIDE_TOPS,EAR_COMPATIBLE_HEADS,normalizeAppearance} from '../../drifmaker-config.mjs';
import {PORTRAIT_OVERLAYS} from '../../drifmaker-portrait-art.mjs';
import {POSES} from '../../drifmaker-poses.mjs';
import {RARITY_GROUPS,randomizeLook} from '../../drifmaker-rarity.mjs';
import {normalizeLook,bookmarkMetadata} from '../../drifmaker-bookmarks.mjs';
const manifest=JSON.parse(readFileSync(new URL('../../assets/models/drifmaker/manifest.json',import.meta.url)));
test('Mi Note supplies nine source-traced choices per category with matching Blender and browser catalogs',()=>{
 assert.deepEqual(catalog,JSON.parse(readFileSync(new URL('../../scripts/showroom-assets/minote-catalog.json',import.meta.url))));
 assert.equal(Object.keys(catalog).length,17);const ids=new Set();
 for(const [category,rows] of Object.entries(catalog)){
  assert.equal(rows.length,9,category);
  for(const row of rows){assert.ok(!ids.has(row.id),row.id);ids.add(row.id);assert.ok(Number.isInteger(row.sourceCard)&&row.sourceCard>0);assert.ok(row.label.length>2);}
  const pool=CATEGORIES[category]||({bodyStyle:BODY_STYLES,bodyColor:BODY_COLORS,background:PORTRAIT_BACKGROUNDS,overlay:PORTRAIT_OVERLAYS,pose:POSES})[category];
  for(const row of rows)assert.ok(pool.some(o=>(o.id||o.hex)===row.id),`${category}/${row.id}`);
  if(CATEGORIES[category])for(const row of rows)assert.ok(manifest.parts.some(p=>p.name===`Drif_${category[0].toUpperCase()+category.slice(1)}_${row.id}`));
 }
 assert.equal(ids.size,153);
});
test('new options participate in independent weighted rolls and exported bookmark metadata',()=>{
 for(let i=0;i<9;i++){
  const rarity=Object.fromEntries(Object.entries(RARITY_GROUPS).map(([key,{options}])=>[key,Object.fromEntries(options.map(o=>[o.id,0]))]));
  for(const [key,rows] of Object.entries(catalog))rarity[key][rows[i].id]=1;
  const rolled=randomizeLook({rarity,appearance:{},posesEnabled:true},()=>.53);
  for(const key of Object.keys(CATEGORIES))assert.equal(rolled.appearance[key],catalog[key][i].id);
  assert.equal(rolled.appearance.bodyStyle,catalog.bodyStyle[i].id);assert.equal(rolled.background,catalog.background[i].id);assert.equal(rolled.overlay,catalog.overlay[i].id);assert.equal(rolled.pose,catalog.pose[i].id);
  const look=normalizeLook({appearance:rolled.appearance,portrait:{background:rolled.background,overlay:rolled.overlay,pose:rolled.pose,posesEnabled:true}});
  const metadata=bookmarkMetadata({name:'Mi Note study',look});const values=metadata.attributes.map(a=>a.value);
  assert.ok(values.includes(catalog.head[i].label));assert.ok(values.includes(catalog.shirt[i].label));assert.ok(values.includes(catalog.background[i].label));assert.ok(values.includes(catalog.overlay[i].label));
 }
});
test('new full-length tops override legs and earless heads preserve the ear selection',()=>{
 for(const id of ['mnchoirrobe','mnrainponcho','mnsainttabard','mnpetaldress']){assert.ok(LEG_OVERRIDE_TOPS.includes(id));assert.ok(manifest.legOverrideTops.includes(id));}
 for(const row of catalog.head){assert.equal(EAR_COMPATIBLE_HEADS.includes(row.id),row.id!=='mnrabbitmask');assert.equal(normalizeAppearance({head:row.id,ears:'mnrabbitfolds'}).ears,'mnrabbitfolds');}
});
test('new gear is torso-mounted and Mi Note models do not embed whole-card artwork',()=>{
 const bytes=readFileSync(new URL('../../assets/models/drifmaker/drifella-customizable.glb',import.meta.url));const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());const start=28+bytes.readUInt32LE(12);
 const values=index=>{const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],n={VEC4:4,VEC2:2,SCALAR:1}[a.type],w={5121:1,5123:2,5126:4}[a.componentType],method={5121:'readUInt8',5123:'readUInt16LE',5126:'readFloatLE'}[a.componentType];return Array.from({length:a.count*n},(_,i)=>bytes[method](start+v.byteOffset+(a.byteOffset||0)+Math.floor(i/n)*(v.byteStride||w*n)+(i%n)*w));};
 for(const {id} of catalog.accessory){const node=gltf.nodes.find(n=>n.name==='Drif_Accessory_'+id);for(const p of gltf.meshes[node.mesh].primitives){const joints=values(p.attributes.JOINTS_0),weights=values(p.attributes.WEIGHTS_0);for(let i=0;i<joints.length;i++)if(weights[i]>0)assert.equal(gltf.nodes[gltf.skins[node.skin].joints[joints[i]]].name,'Chest',id);}}
 for(const node of gltf.nodes.filter(n=>/^Drif_.*_mn/.test(n.name)&&n.mesh!==undefined))for(const p of gltf.meshes[node.mesh].primitives){
  const m=gltf.materials[p.material];assert.ok(!m.name.startsWith('Drif_MiNote_Art_'));
  assert.equal(m.pbrMetallicRoughness?.baseColorTexture,undefined,node.name);
 }
});
