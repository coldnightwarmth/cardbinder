import {normalize} from './normalize.js?v=2';
const KEY='cards.art:minote-studio:edits:v1';
const ready=Promise.all(['collection.json','initial-edits.json'].map(file=>fetch(new URL(file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Could not load studio data');return r.json();})));
function read(seed){const text=localStorage.getItem(KEY);return text===null?structuredClone(seed):JSON.parse(text);}
export async function studioRequest(url,options={}){
 try{
  const [items,seed]=await ready,cards=new Map(items.map(item=>[item.id,item]));
  if(url==='/api/collection')return Response.json(items);
  if(url==='/api/edits')return Response.json(read(seed));
  const value=JSON.parse(options.body);
  const update=()=>{
   const edits=read(seed);
   if(url==='/api/save'){
    const item=cards.get(value.id);if(!item)throw Error('Unknown card');
    const latest=edits[value.id]||{...normalize(item,{}),_revision:0};
    if(value._revision!==(latest._revision||0))return Response.json({error:'This card changed in another browser tab. Load the saved version first.',latest},{status:409});
    const saved={...normalize(item,value),_revision:(latest._revision||0)+1};
    localStorage.setItem(KEY,JSON.stringify({...edits,[value.id]:saved}));return Response.json(saved);
   }
   if(url!=='/api/import'||value?.version!==1||!value.edits||typeof value.edits!=='object'||Array.isArray(value.edits))throw Error('Choose a version 1 Mi Note edits backup.');
   const next={...edits};
   for(const [id,v] of Object.entries(value.edits)){
    if(!cards.has(+id)||!v||typeof v!=='object')throw Error('Invalid card in backup');
    next[id]={...normalize(cards.get(+id),v),_revision:(edits[id]?._revision||0)+1};
   }
   localStorage.setItem(KEY+':before-import',JSON.stringify(edits));
   localStorage.setItem(KEY,JSON.stringify(next));return Response.json(next);
  };
  return navigator.locks?await navigator.locks.request(KEY,update):update();
 }catch(error){return Response.json({error:error.message},{status:400});}
}
