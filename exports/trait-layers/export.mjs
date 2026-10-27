import * as THREE from 'three';
import {createShowroomAvatar} from '/showroom-avatar.js?v=40';
import {characterCategories,characterDefaults,BODY_COLORS,BODY_STYLES,PORTRAIT_BACKGROUNDS,HEAD_SCALES,usesBaseHead,headAllowsEars,topOverridesLegs,characterHair} from '/drifmaker-config.mjs?v=22';
import {configurePortraitCamera,PORTRAIT_COMPOSITION} from '/drifmaker-portrait.mjs?v=10';
import {createDrifmakerEnvironment} from '/drifmaker-lighting.mjs?v=1';
import {setPortraitSceneBackground} from '/drifmaker-background.mjs?v=4';
import {setPortraitOverlay,renderPortraitScene,PORTRAIT_OVERLAYS} from '/drifmaker-portrait-art.mjs?v=3';

const W=1200,H=1295,$=s=>document.querySelector(s);
const folders={body:'03 Base Body',legs:'04 Legs',shirt:'05 Tops',head:'06 Heads',ears:'07 Ears',tattoo:'08 Tattoos',eyes:'09 Eyes',brows:'10 Eyebrows',nose:'11 Noses',mouth:'12 Mouths',hat:'13 Hats',accessory:'14 Gear',extra:'15 Extra',background:'01 Backgrounds',overlay:'16 Overlays'};
const slug=s=>s.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
const dirname=row=>`${slug(row.label)}--${row.id}`;
const canvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
const output=canvas(),ctx=output.getContext('2d',{willReadFrequently:true}),scratch=canvas(),scratchCtx=scratch.getContext('2d',{willReadFrequently:true});
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene(),camera=configurePortraitCamera(THREE,new THREE.OrthographicCamera());
scene.add(new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
for(const [color,power,pos] of [[0xfff5df,3.2,[-3,7,5]],[0xa9d4ec,1.2,[4,3,-4]]]){const light=new THREE.DirectionalLight(color,power);light.position.fromArray(pos);scene.add(light);}
const environment=createDrifmakerEnvironment(renderer);scene.environment=environment.texture;
const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
const avatars=new Map(),partsBySpecies=new Map(),geometryCache=new WeakMap();
let active,character,defaults,parts,done=0,started=0,exporting=false,manifest,previewLayers=new Map();

function geometrySubset(node,kind){
 const original=node.userData.layerOriginalGeometry||node.geometry;node.userData.layerOriginalGeometry=original;
 let cache=geometryCache.get(original);if(!cache){cache={};geometryCache.set(original,cache);}if(cache[kind])return cache[kind];
 const joints=original.attributes.skinIndex,weights=original.attributes.skinWeight;
 if(!joints||!weights)return original;
 const selected=new Set(node.skeleton.bones.flatMap((bone,i)=>(kind.startsWith('tail')?/^Tail(?:Tip)?$/.test(bone.name):bone.name==='Head')?[i]:[]));
 const include=v=>{for(let k=0;k<4;k++)if(weights.getComponent(v,k)>.05&&selected.has(joints.getComponent(v,k)))return true;return false;};
 const count=original.index?.count??joints.count,index=[],ranges=original.groups.length?original.groups:[{start:0,count,materialIndex:0}],groups=[];
 for(const group of ranges){const start=index.length;for(let i=group.start;i<Math.min(count,group.start+group.count);i+=3){const triangle=[0,1,2].map(k=>original.index?original.index.getX(i+k):i+k);const matches=triangle.some(include);if(matches===!kind.endsWith('Exclude'))index.push(...triangle);}groups.push({start,count:index.length-start,materialIndex:group.materialIndex});}
 const result=original.clone();result.setIndex(index);result.clearGroups();if(original.groups.length)for(const g of groups)result.addGroup(g.start,g.count,g.materialIndex);cache[kind]=result;return result;
}
function findParts(model){const result=[];model.traverse(node=>{if(!/^Drif_/.test(node.name)||/^Drif_/.test(node.parent?.name||''))return;const m=/^Drif_([a-z]+)(?:_([a-z0-9]+))?/i.exec(node.name);result.push({node,category:m[1].toLowerCase(),id:m[2]?.toLowerCase()||'original'});});return result;}
function select(category,id){return parts.filter(p=>p.category===category&&(id===undefined||p.id===id));}
function toggle(selected){const wanted=new Set(selected.map(p=>p.node));for(const p of parts){p.node.visible=wanted.has(p.node);p.node.traverse(node=>{if(node!==p.node)node.visible=true;if(node.isMesh){node.renderOrder=0;if(node.userData.layerOriginalGeometry)node.geometry=node.userData.layerOriginalGeometry;}});}}
async function useSpecies(species){
 character=species;defaults=characterDefaults({character});
 if(!avatars.has(character)){const avatar=await createShowroomAvatar({appearance:defaults});avatar.model.position.set(0,0,0);avatar.model.rotation.set(0,0,0);avatar.model.scale.setScalar(1);scene.add(avatar.model);avatars.set(character,avatar);partsBySpecies.set(character,findParts(avatar.model));}
 active=avatars.get(character);parts=partsBySpecies.get(character);for(const [id,a] of avatars)a.model.visible=id===character;
 await appearance(defaults);
}
async function appearance(value){await active.setAppearance(value);active.setPose('',{static:true});active.update(0,0,false);active.model.updateMatrixWorld(true);}
function clearBackground(){scene.background=null;}
function renderPixels(selected,{occlude=false,subset=null}={}){
 clearBackground();toggle(selected);
 if(subset)for(const p of selected)p.node.traverse(node=>{if(node.isMesh)node.geometry=geometrySubset(node,subset);});
 const saved=[];
 if(occlude){for(const p of [...select('body'),...select('head','original')]){if(selected.includes(p))continue;p.node.visible=true;p.node.traverse(node=>{if(node.isMesh){saved.push([node,node.material,node.renderOrder]);node.material=depthMaterial;node.renderOrder=-100;}});}}
 renderer.render(scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
 for(const [node,material,order] of saved){node.material=material;node.renderOrder=order;}
 return ctx.getImageData(0,0,W,H);
}
function split(full,front){
 const back=new ImageData(W,H);let visibleFront=0,visibleBack=0;
 for(let i=0;i<full.data.length;i+=4){const a=full.data[i+3]/255,f=front.data[i+3]/255;if(f>.003)visibleFront++;const b=Math.max(0,Math.min(1,(a-f)/Math.max(.00001,1-f)));if(b>.003){visibleBack++;back.data[i+3]=Math.round(b*255);for(let c=0;c<3;c++)back.data[i+c]=Math.max(0,Math.min(255,(full.data[i+c]*a-front.data[i+c]*f)/Math.max(.00001,a-f)));}}
 return {back,front,visibleBack,visibleFront};
}
function opaquePixels(data){let count=0;for(let i=3;i<data.data.length;i+=4)if(data.data[i])count++;return count;}
const png=data=>{ctx.putImageData(data,0,0);return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));};
async function post(endpoint,path,body,type){const response=await fetch(`${endpoint}?character=${character}&path=${encodeURIComponent(path)}`,{method:'POST',headers:{'Content-Type':type},body});const result=await response.json();if(!response.ok)throw Error(result.error||response.statusText);return result;}
async function save(path,data){const result=await post('/export-png',path,await png(data),'image/png');done++;$('#status').textContent=`${character} · ${done.toLocaleString()} PNGs\n${path}\n${Math.round((performance.now()-started)/1000)} seconds`;return {path,sha256:result.sha256,visiblePixels:opaquePixels(data)};}
async function saveJSON(path,value){return post('/export-json',path,JSON.stringify(value),'application/json');}
function variants(){const rows=[{id:'default',label:'Default',bodyStyle:'solid',bodyColor:defaults.bodyColor}],seen=new Set([defaults.bodyColor]);for(const row of BODY_COLORS){if(row.style||seen.has(row.hex))continue;seen.add(row.hex);rows.push({id:'color-'+row.id,label:row.label,bodyStyle:'solid',bodyColor:row.hex});}for(const row of BODY_STYLES)if(row.id!=='solid')rows.push({id:'finish-'+row.id,label:row.label,bodyStyle:row.id,bodyColor:defaults.bodyColor});return rows;}
function varFile(v){return `${slug(v.label)}--${v.id}.png`;}
async function layerPair(category,row,targets,{saveFiles=true,basePath}={}){
 const full=renderPixels(targets),front=renderPixels(targets,{occlude:true}),pair=split(full,front);
 const dir=basePath||`${folders[category]}/${dirname(row)}`;
 const result={id:row.id,label:row.label,front:null,back:null,empty:!opaquePixels(full)};
 if(saveFiles){
  // Every selection has a PNG; fully rear pieces get a transparent front companion.
  result.front=await save(`${dir}/front.png`,pair.front);
  if(pair.visibleBack)result.back=await save(`${dir}/back.png`,pair.back);
 }
 return {...result,pixels:pair,full};
}
function sampleCard(label,data){const c=canvas();c.getContext('2d').putImageData(data,0,0);const figure=document.createElement('figure');figure.append(c);const caption=document.createElement('figcaption');caption.textContent=label;figure.append(caption);$('#preview').append(figure);}
async function samples(){
 $('#sample').disabled=true;$('#preview').replaceChildren();
 try{for(const species of ['drifella','drilady']){
  await useSpecies(species);const look={...defaults};await appearance(look);
  const body=renderPixels(select('body')),head=renderPixels(select('head','original'));
  const layers=[];
  for(const category of ['legs','shirt','ears','eyes','brows','nose','mouth','accessory']){const row=characterCategories(defaults)[category].find(r=>r.id===defaults[category]);const data=await layerPair(category,row,select(category,row.id),{saveFiles:false});layers.push({category,...data});}
  const hairId=characterHair(defaults);if(select('hair',hairId).length)layers.push({category:'hair',...await layerPair('head',{id:hairId,label:'Hair'},select('hair',hairId),{saveFiles:false})});
  scratchCtx.clearRect(0,0,W,H);
  const draw=data=>{ctx.putImageData(data,0,0);scratchCtx.drawImage(output,0,0);};
  for(const l of layers)draw(l.pixels.back);draw(body);for(const c of ['legs','shirt'])for(const l of layers.filter(l=>l.category===c))draw(l.pixels.front);draw(head);for(const c of ['ears','eyes','brows','nose','mouth','hair','accessory'])for(const l of layers.filter(l=>l.category===c))draw(l.pixels.front);
  const composite=scratchCtx.getImageData(0,0,W,H);sampleCard(`${species}: reconstructed from PNG layers`,composite);sampleCard(`${species}: isolated top`,layers.find(l=>l.category==='shirt').pixels.front);
 }
 $('#status').textContent='Samples ready. Both characters share the fixed portrait camera and neutral pose.';$('#run').disabled=false;
 }catch(error){$('#status').textContent=error.stack;throw error;}finally{$('#sample').disabled=false;}
}

async function exportCharacter(species){
 await useSpecies(species);const catalog=characterCategories(defaults),surfaces=variants();
 manifest={version:2,character,canvas:{width:W,height:H,trimmed:false,alpha:true},pose:'Neutral t=0',composition:PORTRAIT_COMPOSITION,defaultAppearance:defaults,surfaces,categories:{},layerOrder:['background','extra.back','accessory.back','hat.back','ears.back','head.hair.back','body.tail','body.torso','legs.back','legs.front','shirt.back','shirt.front','head.surface','ears.front','tattoo.front','eyes.front','brows.front','nose.front','mouth.front','head.hair.front','hat.front','accessory.front','extra.front','overlay'],rules:{allPNGsSameCanvas:true,noCroppingOrAutoCentering:true,headReplacementsOverride:['eyes','brows','mouth','nose','tattoo'],fullLengthTopsOverride:'legs',dinosaurSuitHides:'body.tail',finishScope:'body and head only',solidColorScope:'body and base heads only; replacement heads keep their authored colors',backFrontPairs:'Use matching back/front files for each selection. Back layers go behind the body/head; front layers follow layerOrder.',headScale:'Apply head scale to ears, face, hair, hats and head-mounted accessories around headScalePivot. Base head PNGs for size options are already scaled.'}};
 const headBone=active.model.getObjectByName('Head'),pivot=new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld).project(camera);manifest.headScalePivot={x:(pivot.x+1)*W/2,y:(1-pivot.y)*H/2};
 manifest.categories.body={label:'Base Body',variants:[]};
 for(const v of surfaces){
  await appearance({...defaults,...v});
  const body=select('body'),fuzz=v.bodyStyle==='ghost'?select('ghost'):[];
  const torso=renderPixels(body,{subset:'tailExclude'}),tail=renderPixels(body,{subset:'tailInclude'});
  if(fuzz.length){const glow=renderPixels(fuzz,{subset:'headExclude'});ctx.putImageData(torso,0,0);scratchCtx.putImageData(glow,0,0);ctx.drawImage(scratch,0,0);torso.data.set(ctx.getImageData(0,0,W,H).data);}
  const row={...v,torso:await save(`${folders.body}/Torso/${varFile(v)}`,torso),tail:await save(`${folders.body}/Tail/${varFile(v)}`,tail)};manifest.categories.body.variants.push(row);
 }
 manifest.categories.head={label:'Heads',traits:[]};
 for(const row of catalog.head){
  const look={...defaults,head:row.id},base=usesBaseHead(look),hairId=characterHair(look),headId=base?'original':row.id;
  const result={id:row.id,label:row.label,baseHead:base,allowsEars:headAllowsEars(look),scale:HEAD_SCALES[row.id]||1,variants:[],hair:null};
  // Hairstyle selections reuse the original head surface; their sculpt is an independent pair.
  if(base&&row.id!=='original'&&!HEAD_SCALES[row.id])result.surfaceFrom='original';
  // Replacement heads use fixed authored colors; only base heads follow body color.
  else for(const v of surfaces.filter(v=>base||v.id==='default'||v.id.startsWith('finish-'))){
   await appearance({...look,...v});const targets=select('head',headId);let data=renderPixels(targets);
   if(v.bodyStyle==='ghost'&&base){const fuzz=select('ghost');if(fuzz.length){const glow=renderPixels(fuzz,{subset:'headInclude'});ctx.putImageData(data,0,0);scratchCtx.putImageData(glow,0,0);ctx.drawImage(scratch,0,0);data=ctx.getImageData(0,0,W,H);}}
   result.variants.push({...v,file:await save(`${folders.head}/${dirname(row)}/Surface/${varFile(v)}`,data)});
  }
  await appearance(look);
  if(select('hair',hairId).length){const pair=await layerPair('head',row,select('hair',hairId),{basePath:`${folders.head}/${dirname(row)}/Hair`});delete pair.pixels;delete pair.full;result.hair=pair;}
  manifest.categories.head.traits.push(result);
  await saveJSON('manifest.partial.json',manifest);
 }
 for(const category of ['legs','shirt','ears','tattoo','eyes','brows','nose','mouth','hat','accessory','extra']){
  const traits=[];manifest.categories[category]={label:folders[category].slice(3),traits};
  for(const row of catalog[category]){
   await appearance({...defaults,[category]:row.id});
   const result=await layerPair(category,row,select(category,row.id));delete result.pixels;delete result.full;
   if(category==='shirt')result.overridesLegs=topOverridesLegs({...defaults,shirt:row.id});
   if(category==='hat')result.hidesHair=characterHair({...defaults,hat:row.id})==='none';
   traits.push(result);
  }
  await saveJSON('manifest.partial.json',manifest);
 }
 toggle([]);manifest.categories.background={label:'Backgrounds',traits:[]};
 for(const row of PORTRAIT_BACKGROUNDS){await setPortraitSceneBackground(THREE,scene,row.hex);renderer.render(scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);const data=ctx.getImageData(0,0,W,H);manifest.categories.background.traits.push({id:row.hex,label:row.label,file:await save(`${folders.background}/${slug(row.label)}--${slug(row.hex)}.png`,data)});}
 clearBackground();manifest.categories.overlay={label:'Overlays',traits:[]};
 for(const row of PORTRAIT_OVERLAYS){await setPortraitOverlay(THREE,scene,row.id);renderPortraitScene(renderer,scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);const data=ctx.getImageData(0,0,W,H);manifest.categories.overlay.traits.push({id:row.id,label:row.label,file:await save(`${folders.overlay}/${dirname(row)}.png`,data)});}
 await setPortraitOverlay(THREE,scene,'none');
 manifest.completed=true;await saveJSON('manifest.json',manifest);
 const readme=`${character.toUpperCase()} TRANSPARENT TRAIT LAYERS\n\nEvery PNG is 1200 x 1295 pixels. Keep that canvas: do not trim, center, crop or resize individual pieces. Rendered at Neutral t=0 using the editor portrait camera and lighting.\n\nChoose a matching Torso and Tail surface in 03 Base Body, then a head surface in 06 Heads. Hairstyle head options reuse the Original head surface and add their own Hair/front.png and Hair/back.png. All other traits are exported once with their original materials. Solid colors apply to the body and original head (including its size variants). Replacement heads keep their authored colors and include only Default plus finish variants. All other traits retain their original materials.\n\nUse each selected trait's matching front.png/back.png pair; not every piece needs a back file. Composite back layers first, then base body, legs, tops, head surface, ears, tattoos, eyes, brows, noses, mouths, hair, hats, gear, extras and overlays. See manifest.json layerOrder for the exact order and all selection mappings.\n\nFull-length tops replace the legs layer. Full replacement heads include their own faces: omit separate eyes, brows, mouth, nose and tattoos. The manifest marks whether ears are allowed. Hats marked hidesHair omit the Hair pair. Dinosaur onesie omits the Tail layer. Big/giant/small heads require corresponding 2D scaling of the other head-mounted layers around headScalePivot.\n\nSome traits are outside the portrait crop and therefore have a transparent PNG; these are marked empty. Back/front partitioning uses the neutral original body/head as a depth reference, so alternate head shapes can overlap differently from 3D. Alpha-blend PNGs normally (source-over), with no background removal.\n\nIdentical variants may share disk storage through hard links; they remain ordinary standalone PNG files. No editor bookmarks, rarity settings or browser storage were modified.\n`;
 await post('/export-text','README.txt',readme,'text/plain');
 $('#log').textContent+=`${character}: completed\n`;
}
$('#sample').onclick=samples;
$('#run').onclick=async()=>{
 if(exporting)return;exporting=true;$('#run').disabled=true;$('#sample').disabled=true;started=performance.now();done=0;
 try{for(const species of ['drifella','drilady'])await exportCharacter(species);$('#status').textContent=`Complete: ${done.toLocaleString()} full-canvas PNGs saved to Downloads.\nDrifella Traits / Drilady Traits`;}
 catch(error){$('#status').textContent='EXPORT FAILED\n'+error.stack;console.error(error);}
 finally{exporting=false;$('#sample').disabled=false;}
};
$('#status').textContent='Ready to render alignment samples.';
