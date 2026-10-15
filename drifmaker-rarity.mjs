import {PORTRAIT_OVERLAYS} from './drifmaker-portrait-art.mjs?v=1';
import {BODY_COLORS,BODY_STYLES,PORTRAIT_BACKGROUNDS,CATEGORIES} from './drifmaker-config.mjs?v=15';
import {PORTRAIT_POSES} from './drifmaker-poses.mjs?v=4';

export const RARITY_STORAGE_KEY='cards-art:drifmaker:rarity:v1';
export const DEFAULT_WEIGHT=100;
export const MAX_WEIGHT=10000;
export const RARITY_GROUPS=Object.freeze({
 bodyColor:{label:'Body colors',options:BODY_COLORS},
 bodyStyle:{label:'Body finishes',options:BODY_STYLES},
 ...Object.fromEntries(['head','eyes','brows','mouth','nose','ears','tattoo','shirt','legs','hat','accessory','extra'].map((key,index)=>[key,{label:['Heads','Eyes','Eyebrows','Mouth','Nose','Ears','Tattoos','Tops','Legs','Hats','Accessories','Extra'][index],options:CATEGORIES[key]}])),
 background:{label:'Backgrounds',options:PORTRAIT_BACKGROUNDS.map(color=>({...color,id:color.hex}))},
 overlay:{label:'Overlays',options:PORTRAIT_OVERLAYS},
 pose:{label:'Portrait poses',options:PORTRAIT_POSES},
});

export const validWeight=value=>Number.isInteger(value)&&value>=0&&value<=MAX_WEIGHT;
export function traitWeight(rarity,category,id){
 const value=rarity?.[category]?.[id];
 return validWeight(value)?value:DEFAULT_WEIGHT;
}
// Store only non-default values. New traits automatically start at equal odds.
export function normalizeRarity(value){
 const result={};
 for(const [key,{options}] of Object.entries(RARITY_GROUPS)){
  const weights={};
  for(const option of options){const weight=traitWeight(value,key,option.id);if(weight!==DEFAULT_WEIGHT)weights[option.id]=weight;}
  if(Object.keys(weights).length)result[key]=weights;
 }
 return result;
}
export function loadRarity(storage){
 try{return normalizeRarity(JSON.parse((storage??globalThis.localStorage)?.getItem(RARITY_STORAGE_KEY)||'{}'));}catch{return {};}
}
export function saveRarity(value,storage){
 const target=storage??globalThis.localStorage;
 if(!target?.setItem)throw Error('This browser cannot save rarity settings.');
 const rarity=normalizeRarity(value);target.setItem(RARITY_STORAGE_KEY,JSON.stringify(rarity));return rarity;
}
export function traitChances(rarity,category){
 const options=RARITY_GROUPS[category]?.options||[],weights=options.map(option=>traitWeight(rarity,category,option.id)),total=weights.reduce((sum,weight)=>sum+weight,0);
 return Object.fromEntries(options.map((option,index)=>[option.id,total?weights[index]/total:0]));
}
export function pickTrait(rarity,category,random=Math.random){
 const options=RARITY_GROUPS[category]?.options||[],weights=options.map(option=>traitWeight(rarity,category,option.id)),total=weights.reduce((sum,weight)=>sum+weight,0);
 if(!total)return null;
 let target=Math.min(1-Number.EPSILON,Math.max(0,random()))*total;
 for(let index=0;index<options.length;index++){target-=weights[index];if(weights[index]>0&&target<0)return options[index];}
 return options.findLast((_,index)=>weights[index]>0);
}
export function randomizeLook({rarity,appearance,background,overlay='none',pose,posesEnabled=false},random=Math.random){
 const next={...appearance};
 for(const category of ['bodyStyle',...Object.keys(CATEGORIES)]){const option=pickTrait(rarity,category,random);if(option)next[category]=option.id;}
 const color=pickTrait(rarity,'bodyColor',random),backdrop=pickTrait(rarity,'background',random);
 if(color)next.bodyColor=color.hex;
 return {appearance:next,overlay:pickTrait(rarity,'overlay',random)?.id??overlay,background:backdrop?.hex??background,pose:posesEnabled?(pickTrait(rarity,'pose',random)?.id??pose):pose};
}

// Portable rarity files contain weights only, never the current character.
export function exportRarity(value){
 return {type:'drifmaker-rarity',version:1,rarity:normalizeRarity(value)};
}
export function importRarity(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid rarity file');
 if(data.type!==undefined&&(data.type!=='drifmaker-rarity'||data.version!==1))throw Error('Unsupported rarity file');
 const value=data.rarity;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Missing rarity settings');
 for(const [category,weights] of Object.entries(value)){
  if(!Object.hasOwn(RARITY_GROUPS,category)||!weights||typeof weights!=='object'||Array.isArray(weights))throw Error('Invalid rarity category');
  // Unknown trait IDs from newer catalogs are ignored by normalization, but
  // malformed weights are rejected before replacing any saved settings.
  if(Object.values(weights).some(weight=>!validWeight(weight)))throw Error('Invalid rarity weight');
 }
 return normalizeRarity(value);
}
