import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {COLLECTION_FINISHES,applyCollectionFinishShader} from '../../drifmaker-finishes.mjs';
import {BODY_COLORS,BODY_STYLES,BODY_STYLE_COLORS,HEAD_SCALES,isOriginalHead,DEFAULT_APPEARANCE,normalizeAppearance} from '../../drifmaker-config.mjs';
import {normalizePose,normalizePoseTime} from '../../drifmaker-poses.mjs';
import {createPortraitAvatar} from '../../drifmaker-portrait.mjs';

const finishIds=['blackgem','lava','woods','mossy','pinklatex','cowhide'];
function fixture(){
 const geometry=new THREE.BoxGeometry(),texture=new THREE.Texture();
 const source=new THREE.MeshStandardMaterial({color:'#dbbd96',map:texture,normalMap:texture,bumpMap:texture,roughnessMap:texture,metalnessMap:texture,alphaMap:texture,emissiveMap:texture,alphaTest:.35,vertexColors:true,emissive:'#351724',emissiveIntensity:.7,metalness:.19,roughness:.61,transparent:true,opacity:.6,depthWrite:false});
 source.name='Drif_Original_Warm_ivory';
 const model=new THREE.Group();
 for(const name of ['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Legs_original','Drif_Shirt_wizardrobe','Drif_Eyes_classic','Drif_Brows_original','Drif_Mouth_original','Drif_Shirt_original','Drif_Hat_cap','Drif_Accessory_camera','Drif_Extra_mon','Drif_Tattoo_stars']){
  const parent=new THREE.Group();parent.name=name;parent.add(new THREE.Mesh(geometry,source));model.add(parent);
 }
 return {model,source,texture,geometry,material:name=>model.getObjectByName(name).children[0].material,dispose(){geometry.dispose();texture.dispose();source.dispose();}};
}
const state=material=>({color:material.color.getHex(),metalness:material.metalness,roughness:material.roughness,envMapIntensity:material.envMapIntensity,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,alphaTest:material.alphaTest,vertexColors:material.vertexColors,emissive:material.emissive.getHex(),emissiveIntensity:material.emissiveIntensity,...Object.fromEntries(['map','normalMap','bumpMap','roughnessMap','metalnessMap','alphaMap','emissiveMap'].map(key=>[key,material[key]]))});

test('six source-inspired finishes are normalized and exposed by the shared palettes',()=>{
 assert.deepEqual(Object.keys(COLLECTION_FINISHES),finishIds);
 for(const id of finishIds){
  const finish=COLLECTION_FINISHES[id];
  assert.equal(BODY_STYLES.filter(style=>style.id===id).length,1);
  assert.equal(BODY_COLORS.filter(color=>color.style===id).length,1);
  assert.equal(BODY_STYLE_COLORS[id],finish.color);
  const selected=normalizeAppearance({...DEFAULT_APPEARANCE,bodyStyle:id,bodyColor:'#ffffff'});
  assert.equal(selected.bodyStyle,id);assert.equal(selected.bodyColor,finish.color);
  assert.match(finish.source,/\.PNG$/);
 }
 assert.equal(normalizeAppearance({...DEFAULT_APPEARANCE,bodyStyle:'constructor'}).bodyStyle,'solid');
});

test('all new finishes cover skin, ears, nose and bare feet while preserving expressions and wardrobe',()=>{
 const f=fixture(),other=f.model.clone(true),a=createAvatarAppearance(f.model),b=createAvatarAppearance(other),original=state(f.source);
 const coated=['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Nose_original','Drif_Legs_original','Drif_Shirt_wizardrobe'];
 const preserved=['Drif_Eyes_classic','Drif_Brows_original','Drif_Mouth_original','Drif_Shirt_original','Drif_Hat_cap','Drif_Accessory_camera','Drif_Extra_mon','Drif_Tattoo_stars'];
 const cacheKeys=new Set();
 for(const bodyStyle of finishIds){
  a.setAppearance({...DEFAULT_APPEARANCE,bodyStyle});
  for(const name of coated){
   const m=f.material(name);assert.equal(m.userData.drifFinish,bodyStyle,name);
   assert.equal(m.color.getHexString(),COLLECTION_FINISHES[bodyStyle].color.slice(1));
   assert.equal(m.roughness,COLLECTION_FINISHES[bodyStyle].roughness);assert.equal(m.metalness,COLLECTION_FINISHES[bodyStyle].metalness);
   assert.equal(m.opacity,1);assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(m.alphaTest,0);assert.equal(m.vertexColors,false);assert.equal(m.emissiveIntensity,0);
   for(const key of ['map','normalMap','bumpMap','roughnessMap','metalnessMap','alphaMap','emissiveMap'])assert.equal(m[key],null,name+':'+key);
  }
  for(const name of preserved){assert.deepEqual(state(f.material(name)),original,name);assert.equal(f.material(name).userData.drifFinish,'',name);}
  cacheKeys.add(f.material('Drif_Body').customProgramCacheKey());
  assert.deepEqual(state(other.getObjectByName('Drif_Body').children[0].material),original,'other character stays isolated');
  assert.deepEqual(state(f.source),original,'shared loaded material remains untouched');
 }
 assert.equal(cacheKeys.size,6,'each shader has a separate Three program cache key');
 a.dispose();b.dispose();f.dispose();
});

test('new finishes transition through legacy styles and restore every material slot without disposing shared textures',()=>{
 const f=fixture(),a=createAvatarAppearance(f.model),original=state(f.source),m=f.material('Drif_Body');
 let textureDisposals=0,materialDisposals=0;f.texture.addEventListener('dispose',()=>textureDisposals++);m.addEventListener('dispose',()=>materialDisposals++);
 for(const bodyStyle of finishIds){
  a.setAppearance({...DEFAULT_APPEARANCE,bodyStyle});
  const finishVersion=m.version;a.setAppearance({...DEFAULT_APPEARANCE,bodyStyle});assert.equal(m.version,finishVersion,'same finish should not recompile');
  for(const legacy of ['ghost','camo','holographic','marble','gold','silver','matteblack','solid']){
   a.setAppearance({...DEFAULT_APPEARANCE,bodyStyle:legacy});assert.equal(m.userData.drifFinish,'');
   assert.equal(m.userData.drifGhost,legacy==='ghost');assert.equal(m.userData.drifCamo,legacy==='camo');assert.equal(m.userData.drifHolo,legacy==='holographic');
   a.setAppearance({...DEFAULT_APPEARANCE,bodyStyle});assert.equal(m.userData.drifGhost,false);assert.equal(m.userData.drifCamo,false);assert.equal(m.userData.drifHolo,false);
  }
  a.setAppearance(DEFAULT_APPEARANCE);assert.deepEqual(state(m),original);
 }
 a.dispose();a.dispose();assert.equal(materialDisposals,1);assert.equal(textureDisposals,0);assert.throws(()=>a.setAppearance(DEFAULT_APPEARANCE),/disposed/);f.dispose();
});

test('finish shaders use real Standard chunks, stable bind coordinates and distinct physically lit surface samples',()=>{
 const results=[];
 for(const id of finishIds){
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  assert.equal(applyCollectionFinishShader(shader,id),true);
  assert.match(shader.vertexShader,/vDrifFinishPosition = position;/);
  assert.match(shader.fragmentShader,/roughnessFactor=drifSurfaceRoughness;/);
  assert.match(shader.fragmentShader,/normal=drifSurfaceNormal\(normal,drifSurfaceHeight,vViewPosition,faceDirection\);/);
  assert.match(shader.fragmentShader,/totalEmissiveRadiance\+=drifSurfaceGlow;/);
  assert.ok(shader.fragmentShader.indexOf('float drifSurfaceRoughness')<shader.fragmentShader.indexOf('roughnessFactor=drifSurfaceRoughness'));
  assert.equal((shader.fragmentShader.match(/void drifFinishSample/g)||[]).length,1);
  results.push(shader.fragmentShader);
 }
 assert.equal(new Set(results).size,6);
 assert.equal(applyCollectionFinishShader({},'unknown'),false);
 assert.throws(()=>applyCollectionFinishShader({vertexShader:'',fragmentShader:''},'lava'),/Unsupported Three shader/);
});

function animatedFactory(){
 const root=new THREE.Group(),hips=new THREE.Bone(),head=new THREE.Bone(),socket=new THREE.Object3D();
 hips.name='Hips';head.name='Head';socket.name='HeadAccessorySocket';head.position.y=2;socket.position.set(.1,.6,.2);root.add(hips);hips.add(head);head.add(socket);
 for(const name of ['Drif_Head_original','Drif_Eyes_classic','Drif_Brows_original','Drif_Nose_original','Drif_Ears_original','Drif_Mouth_original','Drif_Tattoo_stars','Drif_Hat_cap']){const part=new THREE.Group();part.name=name;root.add(part);}
 const clip=name=>new THREE.AnimationClip(name,2,[new THREE.VectorKeyframeTrack('Head.scale',[0,2],[1,1,1,1.1,1.2,.9]),new THREE.VectorKeyframeTrack('Hips.scale',[0,2],[1,1,1,1,1,1])]);
 const animations=['Neutral','Walk','Hold_Right','Walk_Hold_Right','Crouch','Crouch_Walk','Crouch_Hold_Right','Crouch_Walk_Hold_Right','Jump','Jump_Hold_Right','Pose_wave'].map(clip);
 const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8');
 const context=vm.createContext({THREE,normalizePose,normalizePoseTime,createAvatarAppearance,asset:async()=>({scene:root,animations})});
 vm.runInContext(source.slice(source.indexOf('export function cloneAvatar')).replaceAll('export ',''),context);
 return context.createShowroomAvatar;
}

test('head proportions scale the whole Head hierarchy after animation without accumulating or changing the body',async()=>{
 const createAvatar=animatedFactory(),neutral=await createAvatar(),sized=await createAvatar();
 for(const [head,factor] of Object.entries(HEAD_SCALES)){
  assert.equal(isOriginalHead(head),true);assert.equal(normalizeAppearance({...DEFAULT_APPEARANCE,head}).head,head);
  await sized.setAppearance({...DEFAULT_APPEARANCE,head});
  for(let i=0;i<200;i++){
   for(const avatar of [neutral,sized])avatar.update(1/60,i<100?1:0,i>150,.3,{jumpTime:i%50<10?.4:-1,crouch:i%80<20?.5:0});
   const normal=neutral.model.getObjectByName('Head'),scaled=sized.model.getObjectByName('Head');
   for(const axis of ['x','y','z'])assert.ok(Math.abs(scaled.scale[axis]-normal.scale[axis]*factor)<1e-7,head+':'+axis);
   assert.deepEqual(sized.model.getObjectByName('Hips').scale,neutral.model.getObjectByName('Hips').scale);
  }
  for(const name of ['Head_original','Eyes_classic','Brows_original','Nose_original','Ears_original','Mouth_original'])assert.equal(sized.model.getObjectByName('Drif_'+name).visible,true,name);
  sized.model.updateMatrixWorld(true);neutral.model.updateMatrixWorld(true);
  const scaledOffset=sized.model.getObjectByName('HeadAccessorySocket').getWorldPosition(new THREE.Vector3()).sub(sized.model.getObjectByName('Head').getWorldPosition(new THREE.Vector3()));
  const normalOffset=neutral.model.getObjectByName('HeadAccessorySocket').getWorldPosition(new THREE.Vector3()).sub(neutral.model.getObjectByName('Head').getWorldPosition(new THREE.Vector3()));
  assert.ok(Math.abs(scaledOffset.length()-normalOffset.length()*factor)<1e-7,'head-attached accessories follow proportional scaling');
 }
 assert.equal(isOriginalHead('toString'),false);assert.equal(isOriginalHead('pumpkin'),false);
 neutral.dispose();sized.dispose();
});

test('head sizes persist in frozen poses and immediately update portrait aliases',async()=>{
 const createAvatar=animatedFactory(),portrait=await createPortraitAvatar({createAvatar,appearance:{...DEFAULT_APPEARANCE,head:'gianthead'},pose:'wave'});
 const bone=portrait.model.getObjectByName('Head');
 assert.ok(Math.abs(bone.scale.y-1.2*1.4)<1e-6,'frozen pose scale is multiplied after mixer sampling');
 for(const head of ['smallhead','bighead','original']){
  await portrait.setAppearance({...DEFAULT_APPEARANCE,head});
  assert.ok(Math.abs(bone.scale.y-1.2*HEAD_SCALES[head])<1e-6,'appearance update retains the sampled pose');
  portrait.setPose('wave');assert.ok(Math.abs(bone.scale.y-1.2*HEAD_SCALES[head])<1e-6);
 }
 portrait.dispose();
});
