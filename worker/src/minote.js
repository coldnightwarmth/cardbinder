import {restoreSubjectTags} from '../../minotecurator/subject-tags.js';
import {applyAppearanceTags,appearanceTags} from '../../minotecurator/appearance-tags.js';
import {iconTags,iconTypes,iconColors,splitIcon,validateIcon,tagsForIcon,selectIconTag} from '../../minotecurator/icon-options.js';
import {suitDefaults,validateSuits,suitAssignments} from '../../minotecurator/suits-model.js';
import {migrateMetadata} from '../../minotecurator/tag-cleanup.js';
import {metadataSeed} from '../../minotecurator/metadata-seed.js';
import {updateMetadata,pruneUnusedTags} from '../../minotecurator/metadata-model.js';
import collection from '../../minotecurator/collection.json';
import seed from '../../minotecurator/initial-edits.json';
import {normalize} from '../../minotecurator/normalize.js';
async function readEdits(store){const count=await store.get('chunks');if(count===undefined)return structuredClone(seed);const parts=await store.get(Array.from({length:count},(_,i)=>'edits:'+i));return JSON.parse(Array.from({length:count},(_,i)=>parts.get('edits:'+i)).join(''));}
async function writeEdits(store,edits){const json=JSON.stringify(edits),chunks=Math.ceil(json.length/48000);for(let i=0;i<chunks;i++)await store.put('edits:'+i,json.slice(i*48000,(i+1)*48000));await store.put('chunks',chunks);}
async function readRawMetadata(store){
 const count=await store.get('metadata:chunks');
 if(count===undefined){const metadata=structuredClone(metadataSeed);migrateMetadata(metadata);restoreSubjectTags(metadata);return metadata;}
 const parts=await store.get(Array.from({length:count},(_,i)=>'metadata:'+i));
 const metadata=JSON.parse(Array.from({length:count},(_,i)=>parts.get('metadata:'+i)).join(''));
 let addedCards=false;
 for(const [id,tags] of Object.entries(metadataSeed.cards))if(!Object.hasOwn(metadata.cards,id)){metadata.cards[id]=[...tags];addedCards=true;}
 if(addedCards)metadata.revision++;
 const migrated=migrateMetadata(metadata);
 const restored=restoreSubjectTags(metadata);
 if(migrated||restored||addedCards){
  // Keep the original chunks recoverable while applying the one-time cleanup.
  for(let i=0;i<count;i++)await store.put('metadata:before-cleanup:'+i,parts.get('metadata:'+i));
  await store.put('metadata:before-cleanup:chunks',count);
  await writeMetadata(store,metadata);
 }
 return metadata;
}
async function readMetadata(store){
 const metadata=await readRawMetadata(store),suits=validateSuits(await store.get('suits')||{}),assignments=suitAssignments(collection.map(c=>c.id),suits.seed);
 const previousTags=JSON.stringify(metadata.tags);
 metadata.icons={};metadata.tags=[...new Set([...metadata.tags,...iconTags])];
 for(const [id,asset] of assignments){const icon=metadata.iconOverrides?.[id]||splitIcon(asset);metadata.icons[id]=icon;metadata.cards[id]=[...(metadata.cards[id]||[]).filter(t=>!iconTags.includes(t)),...tagsForIcon(icon)];}
 pruneUnusedTags(applyAppearanceTags(metadata,await readEdits(store)));
 // Derive the catalog after icon and appearance tags so only used tags remain.
 // Persist cleanup once and advance the revision for already-open curators.
 if(JSON.stringify(metadata.tags)!==previousTags){metadata.revision++;await writeMetadata(store,metadata);}
 return metadata;
}
async function writeMetadata(store,metadata){
 const json=JSON.stringify(metadata),count=Math.ceil(json.length/48000);
 for(let i=0;i<count;i++)await store.put('metadata:'+i,json.slice(i*48000,(i+1)*48000));
 await store.put('metadata:chunks',count);
}
const cards=new Map(collection.map(c=>[c.id,c]));
const origins=new Set(['https://cards.art','https://www.cards.art','http://localhost:8000','http://127.0.0.1:8000']);
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');
 if(!origins.has(origin))return new Response('Forbidden',{status:403});
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const response=await env.CURATOR.get(env.CURATOR.idFromName('shared-v1')).fetch(request);
 if(response.status===101)return response;
 const out=new Response(response.body,response);for(const [k,v] of Object.entries(headers))out.headers.set(k,v);return out;
}};
export class Curator {
 constructor(ctx){this.ctx=ctx;ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));}
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/connect'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);return new Response(null,{status:101,webSocket:pair[0]});
  }
  if(path==='/api/edits'&&request.method==='GET')return Response.json(await this.ctx.storage.transaction(store=>readEdits(store)));
  if(path==='/api/suits'&&request.method==='GET'){const suits=validateSuits(await this.ctx.storage.get('suits')||{});return Response.json({...suits,spacing:suits.spacingY});}
  if(path==='/api/metadata'&&request.method==='GET')return Response.json(await this.ctx.storage.transaction(store=>readMetadata(store)));
  if(!['/api/save','/api/import','/api/tags','/api/suits','/api/icon','/api/icon-colors'].includes(path)||request.method!=='POST')return new Response('Not found',{status:404});
  try{
   const reader=request.body.getReader();let size=0,parts=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();return new Response('Too large',{status:413});}parts.push(value);}
   const value=JSON.parse(await new Blob(parts).text());
   const result=await this.ctx.storage.transaction(async store=>{
    if(path==='/api/suits'){
     const latest=await store.get('suits')||suitDefaults;
     if(value.revision!==latest.revision)return {status:409,body:{error:'Suit settings changed elsewhere. Try again.',latest}};
     // Older open tabs still send one spacing field; retain settings they do not know about.
     const incoming={...latest,...value};if(value.spacingX===undefined&&value.spacing!==undefined)incoming.spacingX=value.spacing;if(value.spacingY===undefined&&value.spacing!==undefined)incoming.spacingY=value.spacing;
     const saved={...validateSuits(incoming),revision:latest.revision+1};await store.put('suits',saved);const metadata=await readMetadata(store);metadata.revision++;await writeMetadata(store,metadata);return {status:200,body:saved};
    }
    if(path==='/api/icon-colors'){
     const metadata=await readMetadata(store),suits=validateSuits(await store.get('suits')||{});
     if(value.revision!==metadata.revision||value.suitsRevision!==suits.revision)return {status:409,body:{error:'Cards or suits changed since analysis. Analyze again.'}};
     if(!value.colors||typeof value.colors!=='object'||Array.isArray(value.colors))throw Error('Invalid icon colors');
     for(const [id,color] of Object.entries(value.colors)){if(!cards.has(+id)||!iconColors.includes(color))throw Error('Invalid card color');}
     await store.put('icon-colors:previous',metadata.iconOverrides||{});
     metadata.iconOverrides={...metadata.iconOverrides};for(const [id,color] of Object.entries(value.colors))metadata.iconOverrides[id]={...metadata.icons[id],color};
     metadata.revision++;await writeMetadata(store,metadata);
     return {status:200,body:{revision:metadata.revision,updated:Object.keys(value.colors).length}};
    }
    if(path==='/api/icon'||path==='/api/tags'){
     if(path==='/api/tags'&&appearanceTags.includes(value.tag))throw Error('This tag follows the card appearance. Change it in the Text sidebar.');
     let metadata=await readMetadata(store);
     if(path==='/api/icon'||iconTags.includes(value.tag)){
      if(!cards.has(+value.id))throw Error('Invalid card');
      let icon=metadata.icons[value.id];
      if(path==='/api/icon')icon=validateIcon({...icon,...value.icon});
      else if(value.selected)icon=selectIconTag(icon,value.tag);
      metadata.iconOverrides={...metadata.iconOverrides,[value.id]:icon};metadata.revision++;
     }else metadata=updateMetadata(metadata,value);
     await writeMetadata(store,metadata);
     return {status:200,body:await readMetadata(store)};
    }
    const edits=await readEdits(store);
    const entries=path==='/api/save'?{[value.id]:value}:value.edits;
    if(path==='/api/import'&&(value.version!==1||!entries||typeof entries!=='object'||Array.isArray(entries)))throw Error('Invalid backup');
    const next={...edits};
    for(const [id,v] of Object.entries(entries)){
     const item=cards.get(+id);if(!item||!v||typeof v!=='object')throw Error('Invalid card');
     const latest=edits[id]||{...normalize(item,{}),_revision:0};
     const expected=path==='/api/save'?value._revision:value.revisions?.[id]??0;
     if(expected!==(latest._revision||0))return {status:409,body:{error:'Another user changed this card. Load the saved version first.',latest,id:+id}};
     next[id]={...normalize(item,v),_revision:(latest._revision||0)+1};
    }
    for(const id of Object.keys(entries))await store.put('previous:'+id,edits[id]||null);await writeEdits(store,next);const metadata=await readMetadata(store);metadata.revision++;await writeMetadata(store,metadata);
    return {status:200,body:path==='/api/save'?next[value.id]:next};
   });
   if(result.status===200)for(const ws of this.ctx.getWebSockets()){try{ws.send('changed');}catch{}}
   return Response.json(result.body,{status:result.status});
  }catch(error){return Response.json({error:error.message},{status:400});}
 }
 webSocketMessage(){}
 webSocketClose(ws,code,reason){ws.close(code,reason);}
}
