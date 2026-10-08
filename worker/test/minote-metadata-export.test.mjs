import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCardMetadata,createMetadataArchive,loadMetadataSnapshot} from '../../minotecurator/metadata-export.js';

const item={id:7,name:'Example card'};
const makeMetadata=(tags=[],icon={type:'star',color:'cherry-red'})=>({revision:1,cards:{7:tags},icons:{7:icon}});
const values=(card,category)=>card.attributes.filter(a=>a.trait_type===category).map(a=>a.value);

test('NFT export categorizes subjects separately from icons and uses the actual appearance settings',()=>{
 const metadata=makeMetadata(['alien','wizard','saint','hoodie','eyepatch','pokemon','remicat','mew','lucario','cat','heart','stars','star icon','cherry red icon','pixel','colored name','body box']);
 const original=structuredClone(metadata);
 const card=buildCardMetadata(item,metadata,{7:{body:false,ink:'original'}});
 assert.equal(card.name,'mi note card #7');
 assert.equal(card.description,'mi note cards');
 assert.equal(card.image,'mi-note-0007-full.png');
 assert.deepEqual(card.properties,{files:[{uri:card.image,type:'image/png'}],category:'image'});
 assert.deepEqual(values(card,'type'),['alien']);
 assert.deepEqual(values(card,'class'),['saint','wizard']);
 assert.deepEqual(values(card,'clothing'),['hoodie']);
 assert.deepEqual(values(card,'head'),['eyepatch']);
 assert.deepEqual(values(card,'rep'),['pokemon','remicat']);
 assert.deepEqual(values(card,'creature'),['cat','lucario','mew']);
 assert.deepEqual(values(card,'misc'),['heart','stars']);
 assert.deepEqual(values(card,'effects'),['pixel']);
 assert.deepEqual(values(card,'body text'),['none']);
 assert.deepEqual(values(card,'name'),['black']);
 assert.deepEqual(values(card,'icon type'),['star']);
 assert.deepEqual(values(card,'icon color'),['cherry']);
 assert.deepEqual(metadata,original);
});

test('export includes enabled body text, ink palette names, cobalt, and no-icon cards',()=>{
 const visible=buildCardMetadata(item,makeMetadata([],{type:'tear',color:'cobalt-blue'}),{7:{body:true,ink:'ribbon'}});
 assert.deepEqual(values(visible,'body text'),['true']);
 assert.deepEqual(values(visible,'name'),['ribbon']);
 assert.deepEqual(values(visible,'icon type'),['tear']);
 assert.deepEqual(values(visible,'icon color'),['cobalt']);
 const hidden=buildCardMetadata(item,makeMetadata(['special','so special'],{type:'heart',color:'emerald',hidden:true}),{});
 assert.deepEqual(values(hidden,'icon type'),['none']);
 assert.deepEqual(values(hidden,'icon color'),['none']);
 assert.deepEqual(values(hidden,'name'),['black']);
});

test('snapshot retries when edits or traits change between reads and returns a consistent revision',async()=>{
 const paths=[],responses=[{revision:1},{7:{ink:'rainbow'}},{revision:2},{revision:2},{7:{ink:'sunset'}},{revision:2}];
 const snapshot=await loadMetadataSnapshot(async path=>{paths.push(path);return Response.json(responses.shift());});
 assert.deepEqual(paths,['/api/metadata','/api/edits','/api/metadata','/api/metadata','/api/edits','/api/metadata']);
 assert.equal(snapshot.edits[7].ink,'sunset');
 assert.equal(snapshot.metadata.revision,2);
});

test('export fails instead of downloading incomplete or continuously changing data',async()=>{
 await assert.rejects(loadMetadataSnapshot(async()=>new Response('',{status:503})),/Could not load/);
 let revision=0;
 await assert.rejects(loadMetadataSnapshot(async()=>Response.json({revision:revision++})),/Cards changed/);
 assert.equal(revision,9);
 await assert.rejects(createMetadataArchive([],{metadata:makeMetadata(),edits:{}}),/still loading/);
 await assert.rejects(createMetadataArchive([item],{metadata:{cards:{},icons:{}},edits:{}}),/Missing metadata/);
 await assert.rejects(createMetadataArchive([item],{metadata:{cards:{7:[]},icons:{}},edits:{}}),/Missing icon settings/);
});

test('archive includes every supplied card, valid filenames, and reports only unclassified subject tags',async()=>{
 const collection=[item,{id:1430,name:'Last card'}];
 const metadata=makeMetadata(['custom subject','star icon','cherry red icon','body box','colored name']);
 metadata.cards[1430]=['pokemon','pecharunt','special','so special'];
 metadata.icons[1430]={type:'bell',color:'marigold',hidden:true};
 const result=await createMetadataArchive(collection,{metadata,edits:{}});
 assert.equal(result.count,2);
 assert.equal(result.blob.type,'application/zip');
 assert.deepEqual(result.unmappedTags,['custom subject']);
 // Read the stored ZIP64 local entries, including their actual size fields.
 const data=new Uint8Array(await result.blob.arrayBuffer()),view=new DataView(data.buffer),decoder=new TextDecoder(),files=new Map();
 let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){
  const nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
  const name=decoder.decode(data.slice(offset+30,offset+30+nameLength));
  const size=Number(view.getBigUint64(offset+30+nameLength+4,true));
  const start=offset+30+nameLength+extraLength;
  files.set(name,JSON.parse(decoder.decode(data.slice(start,start+size))));offset=start+size;
 }
 assert.deepEqual([...files.keys()],['mi-note-0007.json','mi-note-1430.json']);
 assert.equal(files.get('mi-note-1430.json').image,'mi-note-1430-full.png');
 assert.deepEqual(values(files.get('mi-note-1430.json'),'creature'),['pecharunt']);
});
