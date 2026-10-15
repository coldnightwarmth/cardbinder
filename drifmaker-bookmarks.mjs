import {validPortraitBackground} from './drifmaker-background.mjs?v=1';
import {normalizeAppearance,BODY_COLORS,BODY_STYLES,PORTRAIT_BACKGROUNDS,CATEGORIES,CLASSIC_FIN_HEADS,LEG_OVERRIDE_TOPS} from './drifmaker-config.mjs?v=8';
import {normalizePortraitPose,PORTRAIT_POSES} from './drifmaker-poses.mjs?v=2';
import {PORTRAIT_COMPOSITION} from './drifmaker-portrait.mjs?v=5';
import {createZipWriter} from './minotecurator/zip-writer.js';

export const BOOKMARK_KEY='cards.art.drifmaker.bookmarks.v1';
export const MAX_BOOKMARKS=500;
export function normalizeLook(value={}){
 const portrait=value?.portrait||{};
 return {appearance:normalizeAppearance(value?.appearance),portrait:{
  background:validPortraitBackground(portrait.background)?portrait.background.toLowerCase():PORTRAIT_COMPOSITION.background,
  posesEnabled:portrait.posesEnabled===true,pose:normalizePortraitPose(portrait.pose)||'salute',
 }};
}
export const lookKey=value=>JSON.stringify(normalizeLook(value));

// Persist only selections; previews are regenerated from the current model.
export function createBookmarkStore(storage,{id=()=>crypto.randomUUID(),onError=()=>{}}={}){
 let entries=[];
 try{
  const raw=storage.getItem(BOOKMARK_KEY);
  if(raw){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.entries))throw Error('Invalid bookmarks');
   const seen=new Set();entries=data.entries.filter(item=>item&&typeof item.id==='string'&&!seen.has(item.id)&&seen.add(item.id)&&item.look?.appearance).slice(0,MAX_BOOKMARKS).map(item=>({id:item.id,name:typeof item.name==='string'?item.name.slice(0,60):'Look',look:normalizeLook(item.look)}));}
 }catch{onError('Bookmarks could not be read. Browser storage may be unavailable.');}
 const copy=value=>structuredClone(value);
 const persist=next=>{try{storage.setItem(BOOKMARK_KEY,JSON.stringify({version:1,entries:next}));}catch{throw Error('Could not save bookmarks. Check browser storage space and permissions.');}entries=next;};
 return {
  get entries(){return copy(entries);},
  add(look){const clean=normalizeLook(look),existing=entries.find(item=>lookKey(item.look)===lookKey(clean));if(existing)return {entry:copy(existing),duplicate:true};
   if(entries.length>=MAX_BOOKMARKS)throw Error(`You can save up to ${MAX_BOOKMARKS} bookmarks. Remove one to save another.`);
   const number=Math.max(0,...entries.map(item=>Number(/^Look (\d+)$/.exec(item.name)?.[1])||0))+1;
   const entry={id:id(),name:`Look ${number}`,look:clean};persist([entry,...entries]);return {entry:copy(entry),duplicate:false};},
  remove(id){const index=entries.findIndex(item=>item.id===id);if(index<0)return null;const entry=entries[index];persist(entries.filter(item=>item.id!==id));return {entry:copy(entry),index};},
  restore(removed){if(!removed||entries.some(item=>item.id===removed.entry.id))return;if(entries.length>=MAX_BOOKMARKS)throw Error('Remove a bookmark before restoring this one.');const next=[...entries];next.splice(removed.index,0,copy(removed.entry));persist(next);},
 };
}

// Every user action is one snapshot, including all dice-generated colors/pose.
export function createLookHistory(initial,limit=100){
 let current=normalizeLook(initial),past=[],future=[];
 return {
  get current(){return structuredClone(current);},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
  commit(next){next=normalizeLook(next);if(lookKey(next)===lookKey(current))return false;past.push(current);if(past.length>limit)past.shift();current=next;future=[];return true;},
  undo(){if(!past.length)return null;future.push(current);current=past.pop();return this.current;},
  redo(){if(!future.length)return null;past.push(current);current=future.pop();return this.current;},
 };
}

// Card NFT 2-style attributes describe the rendered look. Retain the full
// editor selections too, including traits temporarily hidden by a head or robe.
export function bookmarkMetadata(item,{image,id}={}){
 const look=normalizeLook(item.look),{appearance,portrait}=look;
 const label=(options,value)=>options.find(option=>option.id===value)?.label;
 const values={
  background:PORTRAIT_BACKGROUNDS.find(color=>color.hex===portrait.background)?.label||`Custom (${portrait.background})`,
  'body color':BODY_COLORS.find(color=>color.hex===appearance.bodyColor)?.label||`Custom (${appearance.bodyColor})`,
  'body finish':label(BODY_STYLES,appearance.bodyStyle),
  pose:portrait.posesEnabled?label(PORTRAIT_POSES,portrait.pose):'Neutral',
 };
 const categories={accessory:'accessories',brows:'eyebrows',ears:'ears',extra:'extra',eyes:'eyes',hat:'hat',head:'head',legs:'legs',mouth:'mouth',nose:'nose',shirt:'top',tattoo:'tattoos'};
 for(const [category,title] of Object.entries(categories)){
  let selected=appearance[category];
  if(category==='ears'&&CLASSIC_FIN_HEADS.includes(appearance.head))selected='original';
  else if(appearance.head!=='original'&&['eyes','brows','mouth','nose','ears','tattoo'].includes(category))selected=null;
  if(category==='legs'&&LEG_OVERRIDE_TOPS.includes(appearance.shirt))selected=null;
  values[title]=selected===null?'None':label(CATEGORIES[category],selected);
 }
 return {
  id,name:item.name,description:'Drifmaker character portrait',image,external_url:'https://cards.art/drifmaker/',
  attributes:Object.keys(values).sort().map(trait_type=>({trait_type,value:values[trait_type]})),
  properties:{files:[{uri:image,type:'image/png'}],category:'image'},
  ...look,
 };
}

export async function exportBookmarkZip(entries,{render,signal,onProgress=()=>{},writer=createZipWriter()}={}){
 const snapshots=structuredClone(entries);
 const check=()=>{if(signal?.aborted)throw new DOMException('Export canceled','AbortError');};
 try{
  if(!snapshots.length)throw Error('Save a bookmark first.');
  for(const [index,item] of snapshots.entries()){
   check();onProgress(index+1,snapshots.length);
   const blob=await render(item.look);check();
   const name=item.name.normalize('NFKD').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'drifella';
   const filename=`${String(index+1).padStart(3,'0')}-${name}`,image=`${filename}.png`;
   await writer.add(image,blob);check();
   const metadata=bookmarkMetadata(item,{image:`../${image}`,id:index+1});
   await writer.add(`json/${filename}.json`,new Blob([JSON.stringify(metadata,null,2)+'\n'],{type:'application/json'}));
  }
  check();return await writer.finish();
 }catch(error){await writer.abort();throw error;}
}
