import {CATEGORIES,DEFAULT_APPEARANCE,normalizeAppearance} from './drifmaker-config.mjs?v=3';

// Visibility is per cloned Object3D. Skin and recolored materials are isolated;
// immutable geometry, textures and unchanged wardrobe materials remain shared.
export function createAvatarAppearance(model){
 const categories=Object.fromEntries(Object.keys(CATEGORIES).map(category=>[category,[]])),owned=new Map(),bodyMaterials=[],skinMaterials=[],fuzz=[];
 const partName=node=>{for(let current=node;current&&current!==model;current=current.parent)if(/^Drif_(?:Body|Head_|Ghost_)/.test(current.name))return current.name;return node.name;};
 model.traverse(node=>{
  const match=/^Drif_([a-z]+)_([a-z0-9]+)(?:_|$)/i.exec(node.name);
  if(match){const category=match[1].toLowerCase(),id=match[2].toLowerCase();if(Object.hasOwn(categories,category)&&CATEGORIES[category].some(item=>item.id===id))categories[category].push({node,id});}
  if(node.name.startsWith('Drif_Ghost_Fuzz'))fuzz.push(node);
  if(!node.material)return;
  const part=partName(node),skin=/^Drif_(?:Body(?:_|$)|Head_)/.test(part),fiber=part.startsWith('Drif_Ghost_Fuzz');
  const isolate=material=>{
   const recolor=/^(?:Drif_Body_Main|Azure blue)(?:[._]|$)/.test(material?.name||'');
   if(!material?.color||(!recolor&&!skin&&!fiber))return material;
   // A head can share a source material with clothing. Keep separate role
   // copies so making its skin transparent never fades the same shirt material.
   const role=skin||recolor?'skin':'fiber',key=material.uuid+':'+role;
   if(!owned.has(key)){
    const local=material.clone();owned.set(key,local);
    if(recolor||fiber)bodyMaterials.push({material:local,original:material.color.clone()});
    if(role==='skin'){
     skinMaterials.push({material:local,opacity:local.opacity,transparent:local.transparent,depthWrite:local.depthWrite,emissive:local.emissive?.clone(),intensity:local.emissiveIntensity,roughness:local.roughness});
     local.userData.drifGhost=false;
     local.customProgramCacheKey=()=>local.userData.drifGhost?'drif-ghost-rim-v1':'drif-solid-v1';
     local.onBeforeCompile=shader=>{if(local.userData.drifGhost)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float drifRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.35);
diffuseColor.a *= 0.16 + 0.84 * drifRim;
outgoingLight += diffuse * drifRim * 0.7;
#include <opaque_fragment>`);};
    }else{local.depthWrite=false;local.transparent=true;}
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
   for(const [category,parts] of Object.entries(categories))for(const {node,id} of parts)node.visible=id===current[category]&&(!['eyes','mouth'].includes(category)||current.head==='original');
   const ghost=current.bodyStyle==='ghost';
   for(const node of fuzz)node.visible=ghost;
   for(const {material,original} of bodyMaterials){
    if(current.bodyColor===DEFAULT_APPEARANCE.bodyColor)material.color.copy(original);else material.color.set(current.bodyColor);
   }
   for(const saved of skinMaterials){
    const {material}=saved;
    if(material.userData.drifGhost!==ghost){material.userData.drifGhost=ghost;material.needsUpdate=true;}
    material.opacity=ghost?.52:saved.opacity;material.transparent=ghost||saved.transparent;material.depthWrite=ghost?false:saved.depthWrite;
    material.roughness=ghost?.95:saved.roughness;
    if(material.emissive){if(ghost)material.emissive.set(current.bodyColor);else material.emissive.copy(saved.emissive);material.emissiveIntensity=ghost?.35:saved.intensity;}
   }
   model.userData.appearance={...current};return {...current};
  },
  dispose(){if(disposed)return;disposed=true;for(const material of owned.values())material.dispose();owned.clear();},
 };
}
