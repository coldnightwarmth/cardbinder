import {migrateMetadata} from '../../minotecurator/tag-cleanup.js';
import {metadataSeed} from '../../minotecurator/metadata-seed.js';
import {updateMetadata} from '../../minotecurator/metadata-model.js';
import collection from '../../minotecurator/collection.json';
import seed from '../../minotecurator/initial-edits.json';
import {normalize} from '../../minotecurator/normalize.js';
async function readEdits(store){const count=await store.get('chunks');if(count===undefined)return structuredClone(seed);const parts=await store.get(Array.from({length:count},(_,i)=>'edits:'+i));return JSON.parse(Array.from({length:count},(_,i)=>parts.get('edits:'+i)).join(''));}
async function writeEdits(store,edits){const json=JSON.stringify(edits),chunks=Math.ceil(json.length/48000);for(let i=0;i<chunks;i++)await store.put('edits:'+i,json.slice(i*48000,(i+1)*48000));await store.put('chunks',chunks);}
async function readMetadata(store){
 const count=await store.get('metadata:chunks');
 if(count===undefined)return structuredClone(metadataSeed);
 const parts=await store.get(Array.from({length:count},(_,i)=>'metadata:'+i));
 const metadata=JSON.parse(Array.from({length:count},(_,i)=>parts.get('metadata:'+i)).join(''));
 const migrated=migrateMetadata(metadata);
 const additions=['cigarette','yugioh'].filter(tag=>!metadata.tags.includes(tag));
 if(additions.length){metadata.tags.push(...additions);metadata.tags.sort();metadata.revision++;}
 if(migrated||additions.length){
  // Keep the original chunks recoverable while applying the one-time cleanup.
  for(let i=0;i<count;i++)await store.put('metadata:before-cleanup:'+i,parts.get('metadata:'+i));
  await store.put('metadata:before-cleanup:chunks',count);
  await writeMetadata(store,metadata);
 }
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
  if(path==='/api/metadata'&&request.method==='GET')return Response.json(await this.ctx.storage.transaction(store=>readMetadata(store)));
  if(!['/api/save','/api/import','/api/tags'].includes(path)||request.method!=='POST')return new Response('Not found',{status:404});
  try{
   const reader=request.body.getReader();let size=0,parts=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();return new Response('Too large',{status:413});}parts.push(value);}
   const value=JSON.parse(await new Blob(parts).text());
   const result=await this.ctx.storage.transaction(async store=>{
    if(path==='/api/tags'){
     const metadata=updateMetadata(await readMetadata(store),value);
     await writeMetadata(store,metadata);
     return {status:200,body:metadata};
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
    for(const id of Object.keys(entries))await store.put('previous:'+id,edits[id]||null);await writeEdits(store,next);
    return {status:200,body:path==='/api/save'?next[value.id]:next};
   });
   if(result.status===200)for(const ws of this.ctx.getWebSockets()){try{ws.send('changed');}catch{}}
   return Response.json(result.body,{status:result.status});
  }catch(error){return Response.json({error:error.message},{status:400});}
 }
 webSocketMessage(){}
 webSocketClose(ws,code,reason){ws.close(code,reason);}
}
