import {CATEGORIES,DEFAULT_APPEARANCE,normalizeAppearance} from './drifmaker-config.mjs?v=2';

// Visibility is per cloned Object3D. Only recolored materials are cloned; the
// immutable geometry, textures and wardrobe materials remain shared.
export function createAvatarAppearance(model){
 const categories=Object.fromEntries(Object.keys(CATEGORIES).map(category=>[category,[]])),owned=new Map(),bodyMaterials=[];
 model.traverse(node=>{
  const match=/^Drif_([a-z]+)_([a-z0-9]+)(?:_|$)/i.exec(node.name);
  if(match){const category=match[1].toLowerCase(),id=match[2].toLowerCase();if(Object.hasOwn(categories,category)&&CATEGORIES[category].some(item=>item.id===id))categories[category].push({node,id});}
  if(!node.material)return;
  const isolate=material=>{
   if(!material?.color||!(/^(?:Drif_Body_Main|Azure blue)(?:[._]|$)/.test(material.name)))return material;
   if(!owned.has(material)){
    const local=material.clone();owned.set(material,local);bodyMaterials.push({material:local,original:material.color.clone()});
   }
   return owned.get(material);
  };
  node.material=Array.isArray(node.material)?node.material.map(isolate):isolate(node.material);
 });
 let current={...DEFAULT_APPEARANCE},disposed=false;
 return {
  get appearance(){return {...current};},
  setAppearance(value){
   if(disposed)throw Error('This character has been disposed.');
   current=normalizeAppearance(value);
   for(const [category,parts] of Object.entries(categories))for(const {node,id} of parts)node.visible=id===current[category];
   for(const {material,original} of bodyMaterials){
    if(current.bodyColor===DEFAULT_APPEARANCE.bodyColor)material.color.copy(original);else material.color.set(current.bodyColor);
   }
   model.userData.appearance={...current};return {...current};
  },
  dispose(){if(disposed)return;disposed=true;for(const material of owned.values())material.dispose();owned.clear();},
 };
}
