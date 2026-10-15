import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBookmarkJSON,readBookmarkFiles} from '../../drifmaker-bookmark-import.mjs';
import {createBookmarkStore,normalizeLook,bookmarkMetadata,BOOKMARK_KEY} from '../../drifmaker-bookmarks.mjs';
import {DEFAULT_APPEARANCE} from '../../drifmaker-config.mjs';
const look=(patch={})=>normalizeLook({appearance:{...DEFAULT_APPEARANCE,...patch},portrait:{background:'spiral',overlay:'hell',posesEnabled:true,pose:'fistbump'}});
const file=(name,data,extra={})=>({name,size:100,text:async()=>JSON.stringify(data),...extra});
function memory(){const data=new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};}

test('exported metadata, editor files and wrapped shared bookmarks round-trip hidden traits and portraits',()=>{
 const value=look({head:'pumpkin',ears:'droopyfins',eyes:'mog',shirt:'wizardrobe',legs:'denim'});
 const metadata=bookmarkMetadata({name:'Shared wizard',look:value},{image:'../001.png',id:1});
 assert.deepEqual(parseBookmarkJSON(metadata),{name:'Shared wizard',look:value});
 assert.deepEqual(parseBookmarkJSON({version:6,...value},'002-Wizard.JSON'),{name:'002-Wizard',look:value});
 assert.deepEqual(parseBookmarkJSON({name:'Wrapped',look:value}).look,value);
 assert.equal(parseBookmarkJSON(DEFAULT_APPEARANCE).look.appearance.eyes,DEFAULT_APPEARANCE.eyes);
});

test('category-sorted NFT attributes resolve readable names without fetching any linked images',()=>{
 const value=look({shirt:'ainsliejersey',bodyStyle:'pearl'}),metadata=bookmarkMetadata({name:'Jersey',look:value});
 const parsed=parseBookmarkJSON({name:'Jersey',attributes:metadata.attributes,image:'https://invalid.example/not-fetched.png'});
 assert.deepEqual(parsed.look,value);
 assert.equal(parseBookmarkJSON({bodyColor:'#123456'},'../custom.json').name,'custom');
 for(const data of [null,[],{name:'not a character'},{appearance:{shirt:'missing'}},{appearance:DEFAULT_APPEARANCE,portrait:{pose:'missing'}},{attributes:[{trait_type:'banana',value:'yes'}]}])assert.throws(()=>parseBookmarkJSON(data));
});

test('folder import ignores images, isolates malformed and oversized JSON, and sorts nested filenames naturally',async()=>{
 let readLarge=false;
 const result=await readBookmarkFiles([
  file('10.json',look({mouth:'venom'}),{webkitRelativePath:'shared/json/10.json'}),
  file('2.json',look({hat:'burgerstack'}),{webkitRelativePath:'shared/json/2.json'}),
  file('preview.png',null,{text:async()=>{throw Error('must not read PNG');}}),
  file('broken.json',null,{text:async()=>'{'}),
  file('huge.json',null,{size:300000,text:async()=>{readLarge=true;}}),
  file('unrelated.json',{foo:'bar'}),
 ]);
 assert.equal(readLarge,false);assert.equal(result.files,5);assert.equal(result.errors.length,3);
 assert.deepEqual(result.records.map(record=>record.name),['2','10']);
 assert.match(result.errors.find(error=>error.file==='huge.json').reason,/256 KB/);
});

test('batch imports prepend in file order, deduplicate and preserve all entries on storage failure',()=>{
 const storage=memory();let n=0;const store=createBookmarkStore(storage,{id:()=>String(++n)});
 const old=store.add(look()).entry,a={name:'A',look:look({hat:'burgerstack'})},b={name:'B',look:look({shirt:'seedoilfree'})};
 assert.deepEqual(store.addMany([a,a,b,{name:'Old',look:old.look}]),{added:2,duplicates:2,full:0});
 assert.deepEqual(store.entries.map(item=>item.name),['A','B',old.name]);
 assert.deepEqual(createBookmarkStore(storage).entries,store.entries);
 const before=store.entries;storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>store.addMany([{name:'C',look:look({bodyStyle:'gold'})}]),/Could not save/);
 assert.deepEqual(store.entries,before);
});

test('folder batches fill remaining slots and report excess looks without deleting existing bookmarks',()=>{
 const storage=memory(),entries=Array.from({length:499},(_,i)=>({id:String(i),name:`Saved ${i}`,look:look({bodyColor:`#${i.toString(16).padStart(6,'0')}`})}));
 storage.setItem(BOOKMARK_KEY,JSON.stringify({version:1,entries}));
 const store=createBookmarkStore(storage,{id:()=> 'new'});
 assert.deepEqual(store.addMany([{name:'One',look:look({shirt:'hardcoretechno'})},{name:'Two',look:look({shirt:'ainsliejersey'})}]),{added:1,duplicates:0,full:1});
 assert.equal(store.entries.length,500);assert.equal(store.entries[0].name,'One');assert.deepEqual(store.entries.slice(1),entries);
});
