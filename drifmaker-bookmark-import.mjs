import {normalizeLook} from './drifmaker-bookmarks.mjs?v=13';
import {CATEGORIES,BODY_STYLES,BODY_COLORS,PORTRAIT_BACKGROUNDS} from './drifmaker-config.mjs?v=16';
import {PORTRAIT_POSES} from './drifmaker-poses.mjs?v=5';
import {PORTRAIT_OVERLAYS} from './drifmaker-portrait-art.mjs?v=2';
import {validPortraitBackground} from './drifmaker-background.mjs?v=3';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const match=(options,value)=>typeof value==='string'?options.find(option=>option.id===value||option.label.toLowerCase()===value.toLowerCase()):undefined;
const color=(options,value)=>typeof value==='string'?(options.find(option=>option.label.toLowerCase()===value.toLowerCase())?.hex||/^Custom \((.+)\)$/i.exec(value)?.[1]||value):undefined;
const categories={accessories:'accessory',gear:'accessory',eyebrows:'brows',top:'shirt',tops:'shirt',tattoos:'tattoo',hats:'hat',pants:'legs'};

// Never fetch metadata image URLs. Imported JSON is only a set of local choices.
export function parseBookmarkJSON(data,filename='Shared look.json'){
 if(!object(data))throw Error('Expected a character JSON object.');
 let value=object(data.look)?data.look:data;
 if(!object(value.appearance)&&Array.isArray(data.attributes)){
  const appearance={},portrait={};let recognized=0;
  for(const trait of data.attributes){
   if(!object(trait)||typeof trait.trait_type!=='string')continue;
   const key=trait.trait_type.toLowerCase(),category=categories[key]||key;
   if(Object.hasOwn(CATEGORIES,category)){const option=match(CATEGORIES[category],trait.value);if(option){appearance[category]=option.id;recognized++;}}
   else if(key==='body finish'){const option=match(BODY_STYLES,trait.value);if(option){appearance.bodyStyle=option.id;recognized++;}}
   else if(key==='body color'){const hex=color(BODY_COLORS,trait.value);if(/^#[a-f\d]{6}$/i.test(hex)){appearance.bodyColor=hex;recognized++;}}
   else if(key==='background'){const background=color(PORTRAIT_BACKGROUNDS,trait.value);if(validPortraitBackground(background)){portrait.background=background;recognized++;}}
   else if(key==='overlay'){const option=match(PORTRAIT_OVERLAYS,trait.value);if(option){portrait.overlay=option.id;recognized++;}}
   else if(key==='pose'){const option=match(PORTRAIT_POSES,trait.value);if(option){portrait.pose=option.id;portrait.posesEnabled=true;recognized++;}else if(trait.value==='Neutral'){portrait.posesEnabled=false;recognized++;}}
  }
  if(!recognized)throw Error('No recognized Drifmaker traits.');
  value={appearance,portrait};
 }
 const appearance=object(value.appearance)?value.appearance:value,portrait=value.portrait;
 let recognized=0;
 for(const [key,options] of Object.entries({...CATEGORIES,bodyStyle:BODY_STYLES}))if(Object.hasOwn(appearance,key)){
  if(!options.some(option=>option.id===appearance[key]))throw Error(`Unknown ${key} trait.`);
  recognized++;
 }
 if(Object.hasOwn(appearance,'bodyColor')){if(!/^#[a-f\d]{6}$/i.test(appearance.bodyColor))throw Error('Invalid body color.');recognized++;}
 if(!recognized)throw Error('No recognized Drifmaker traits.');
 if(portrait!==undefined){
  if(!object(portrait))throw Error('Invalid portrait settings.');
  if(Object.hasOwn(portrait,'background')&&!validPortraitBackground(portrait.background))throw Error('Unknown background.');
  if(Object.hasOwn(portrait,'overlay')&&!PORTRAIT_OVERLAYS.some(option=>option.id===portrait.overlay))throw Error('Unknown overlay.');
  if(Object.hasOwn(portrait,'pose')&&!PORTRAIT_POSES.some(option=>option.id===portrait.pose))throw Error('Unknown pose.');
  if(Object.hasOwn(portrait,'posesEnabled')&&typeof portrait.posesEnabled!=='boolean')throw Error('Invalid pose setting.');
 }
 const fallback=filename.split(/[\\/]/).pop().replace(/\.json$/i,'');
 const name=(typeof data.name==='string'?data.name:fallback).replace(/[\u0000-\u001f]/g,'').trim().slice(0,60)||'Shared look';
 return {name,look:normalizeLook({appearance,portrait})};
}

export async function readBookmarkFiles(files,{onProgress=()=>{}}={}){
 const jsons=Array.from(files).filter(file=>/\.json$/i.test(file.name)).sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name,undefined,{numeric:true}));
 const records=[],errors=[];
 for(const [index,file] of jsons.entries()){
  const name=file.webkitRelativePath||file.name;onProgress(index+1,jsons.length);
  try{
   if(file.size>256*1024)throw Error('JSON exceeds 256 KB.');
   let data;try{data=JSON.parse(await file.text());}catch{throw Error('Could not read valid JSON.');}
   records.push(parseBookmarkJSON(data,file.name));
  }catch(error){errors.push({file:name,reason:error.message});}
 }
 return {records,errors,files:jsons.length};
}
