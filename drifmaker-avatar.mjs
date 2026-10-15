import {CATEGORIES,DEFAULT_APPEARANCE,GOLD_COLOR,normalizeAppearance} from './drifmaker-config.mjs?v=4';

// Each character owns its surface finishes and visibility; geometry and textures
// remain shared. A material shared by a face and a shirt must get separate roles.
export function createAvatarAppearance(model){
 const categories=Object.fromEntries(Object.keys(CATEGORIES).map(category=>[category,[]])),owned=new Map(),surfaces=[],fuzz=[];
 const partName=node=>{for(let current=node;current&&current!==model;current=current.parent)if(/^Drif_(?:Body(?:_|$)|Head_|Ears_|Nose_|Eyes_|Mouth_|Legs_|Ghost_)/.test(current.name))return current.name;return node.name;};
 model.traverse(node=>{
  const match=/^Drif_([a-z]+)_([a-z0-9]+)(?:_|$)/i.exec(node.name);
  if(match){const category=match[1].toLowerCase(),id=match[2].toLowerCase();if(Object.hasOwn(categories,category)&&CATEGORIES[category].some(item=>item.id===id))categories[category].push({node,id});}
  if(node.name.startsWith('Drif_Ghost_Fuzz'))fuzz.push(node);
  if(!node.material)return;
  const part=partName(node),skinPart=/^Drif_(?:Body(?:_|$)|Head_|Ears_|Nose_)/.test(part),face=/^Drif_(?:Eyes_|Mouth_)/.test(part),fiber=part.startsWith('Drif_Ghost_Fuzz');
  const isolate=source=>{
   const recolor=/^(?:Drif_Body_Main|Azure blue)(?:[._]|$)/.test(source?.name||'');
   const feet=part.startsWith('Drif_Legs_')&&/^Drif_Original_Warm_ivory/.test(source?.name||'');
   const skin=skinPart||recolor,gilded=skin||face||feet;
   if(!source?.color||(!gilded&&!fiber))return source;
   const role=skin?'skin':gilded?'gilded':'fiber',key=source.uuid+':'+role;
   if(!owned.has(key)){
    const material=source.clone();owned.set(key,material);
    surfaces.push({material,skin,gilded,recolor:recolor||fiber,color:source.color.clone(),map:source.map,metalness:source.metalness,roughness:source.roughness,envMapIntensity:source.envMapIntensity,opacity:source.opacity,transparent:source.transparent,depthWrite:source.depthWrite,emissive:source.emissive?.clone(),intensity:source.emissiveIntensity});
    if(skin){
     material.userData.drifGhost=false;
     material.customProgramCacheKey=()=>material.userData.drifGhost?'drif-ghost-rim-v1':'drif-solid-v1';
     material.onBeforeCompile=shader=>{if(material.userData.drifGhost)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float drifRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.35);
diffuseColor.a *= 0.16 + 0.84 * drifRim;
outgoingLight += diffuse * drifRim * 0.7;
#include <opaque_fragment>`);};
    }
    if(fiber){material.depthWrite=false;material.transparent=true;surfaces.at(-1).depthWrite=false;surfaces.at(-1).transparent=true;}
   }
   return owned.get(key);
  };
  node.material=Array.isArray(node.material)?node.material.map(isolate):isolate(node.material);
 });
 let current={...DEFAULT_APPEARANCE},disposed=false;
 return {
  get appearance(){return {...current};},
  setAppearance(value){
   if(disposed)throw Error('This character has been disposed.');
   current=normalizeAppearance(value);
   for(const [category,parts] of Object.entries(categories))for(const {node,id} of parts)node.visible=id===current[category]&&(!['eyes','mouth','nose','ears','tattoo'].includes(category)||current.head==='original');
   for(const node of fuzz)node.visible=current.bodyStyle==='ghost';
   for(const saved of surfaces){
    const {material}=saved,ghost=current.bodyStyle==='ghost'&&saved.skin,gold=current.bodyStyle==='gold'&&saved.gilded;
    if(gold)material.color.set(GOLD_COLOR);else if(saved.recolor&&current.bodyColor!==DEFAULT_APPEARANCE.bodyColor)material.color.set(current.bodyColor);else material.color.copy(saved.color);
    const map=gold?null:saved.map;
    if(material.map!==map){material.map=map;material.needsUpdate=true;}
    if(saved.skin&&material.userData.drifGhost!==ghost){material.userData.drifGhost=ghost;material.needsUpdate=true;}
    material.opacity=ghost?.52:saved.opacity;material.transparent=ghost||saved.transparent;material.depthWrite=ghost?false:saved.depthWrite;
    material.metalness=gold?.94:saved.metalness;material.roughness=gold?.17:ghost?.95:saved.roughness;material.envMapIntensity=gold?1.4:saved.envMapIntensity;
    if(material.emissive){if(ghost)material.emissive.set(current.bodyColor);else material.emissive.copy(saved.emissive);material.emissiveIntensity=ghost?.35:saved.intensity;}
   }
   model.userData.appearance={...current};return {...current};
  },
  dispose(){if(disposed)return;disposed=true;for(const material of owned.values())material.dispose();owned.clear();},
 };
}
