import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from '../../vendor/three.module.min.js';
import {DEFAULT_APPEARANCE} from '../../drifmaker-config.mjs';
import {BOOKMARK_KEY,MAX_BOOKMARKS,createBookmarkStore,createLookHistory,normalizeLook,bookmarkMetadata,exportBookmarkZip} from '../../drifmaker-bookmarks.mjs';
import {createBookmarkRenderer} from '../../drifmaker-bookmark-renderer.mjs';
const look=(patch={},portrait={})=>normalizeLook({appearance:{...DEFAULT_APPEARANCE,...patch},portrait});
function memory(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}

test('bookmarks persist all independent traits, background and held pose without sharing mutable state',()=>{
 const storage=memory(),store=createBookmarkStore(storage,{id:()=> 'first'});
 const value=look({bodyStyle:'ghost',brows:'slit',mouth:'venom',accessory:'shoulderpet',extra:'planets'},{background:'#DF006F',pose:'bow',posesEnabled:true});
 const saved=store.add(value);assert.equal(saved.duplicate,false);value.appearance.mouth='original';
 assert.equal(store.add(saved.entry.look).duplicate,true);assert.equal(store.entries.length,1);
 const reload=createBookmarkStore(storage);assert.deepEqual(reload.entries,[saved.entry]);
 const copy=reload.entries;copy[0].look.appearance.extra='none';assert.equal(reload.entries[0].look.appearance.extra,'planets');
 const removed=reload.remove('first');assert.equal(reload.entries.length,0);reload.restore(removed);assert.deepEqual(reload.entries,[saved.entry]);
});
test('bad storage and quota failures do not report false saves or lose existing bookmarks',()=>{
 const storage=memory();storage.setItem(BOOKMARK_KEY,'broken');let warning='';
 const store=createBookmarkStore(storage,{onError:message=>warning=message,id:()=> 'saved'});assert.match(warning,/could not be read/);
 store.add(look());storage.setItem=()=>{throw Error('Quota');};
 assert.throws(()=>store.add(look({mouth:'venom'})),/Could not save/);assert.equal(store.entries.length,1);
 assert.throws(()=>store.remove('saved'),/Could not save/);assert.equal(store.entries.length,1);
});
test('Undo/redo restores complete randomizations, bookmark loads and portrait changes atomically',()=>{
 const a=look(),b=look({mouth:'venom',bodyColor:'#ff0000'},{background:'#0000ff',pose:'bow',posesEnabled:true}),c=look({bodyStyle:'gold'});
 const history=createLookHistory(a);assert.equal(history.undo(),null);assert.equal(history.commit(a),false);
 history.commit(b);history.commit(c);assert.deepEqual(history.undo(),b);assert.deepEqual(history.undo(),a);assert.equal(history.canUndo,false);assert.equal(history.canRedo,true);
 assert.deepEqual(history.redo(),b);history.commit(c);assert.equal(history.redo(),null);assert.deepEqual(history.undo(),b);
 const copy=history.current;copy.portrait.background='#ffffff';assert.equal(history.current.portrait.background,'#0000ff');
});
test('ZIP pairs each PNG with categorized JSON metadata in its own folder, with safe names and valid CRCs',async()=>{
 const png=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')],{type:'image/png'});
 const entries=[{name:'../Look 1',look:look()},{name:'../Look 1',look:look({mouth:'venom'})}],received=[];
 const zip=await exportBookmarkZip(entries,{render:async value=>{received.push(value);return png;}});
 assert.deepEqual(received,entries.map(item=>item.look));
 const dir=mkdtempSync(join(tmpdir(),'drifmaker-zip-'));try{const path=join(dir,'bookmarks.zip');writeFileSync(path,Buffer.from(await zip.arrayBuffer()));
  const result=JSON.parse(execFileSync('python3',['-c','import zipfile,json,sys,posixpath; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; pngs=[n for n in z.namelist() if n.endswith(".png")]; assert all(z.read(n).startswith(bytes([137,80,78,71,13,10,26,10])) for n in pngs); metadata=[json.loads(z.read(n)) for n in z.namelist() if n.endswith(".json")]; assert all(posixpath.normpath(posixpath.join("json",m["image"])) in pngs for m in metadata); print(json.dumps({"names":z.namelist(),"metadata":metadata}))',path],{encoding:'utf8'}));
  assert.deepEqual(result.names,['001-Look-1.png','json/001-Look-1.json','002-Look-1.png','json/002-Look-1.json']);
  result.metadata.forEach((metadata,index)=>{
   assert.equal(metadata.id,index+1);assert.equal(metadata.name,entries[index].name);assert.deepEqual(normalizeLook(metadata),entries[index].look);
   assert.deepEqual(metadata.properties,{files:[{uri:metadata.image,type:'image/png'}],category:'image'});
   const categories=metadata.attributes.map(trait=>trait.trait_type);assert.deepEqual(categories,[...categories].sort());assert.equal(new Set(categories).size,17);
   assert.equal(metadata.attributes.find(trait=>trait.trait_type==='mouth').value,index?'Venom mouth':'Original');
  });
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('new bookmarks appear first, keep their order after reload, and restore at their former position',()=>{
 const storage=memory();let next=0;const store=createBookmarkStore(storage,{id:()=>String(++next)});
 const first=store.add(look()).entry,second=store.add(look({mouth:'venom'})).entry,third=store.add(look({shirt:'wizardrobe'})).entry;
 assert.deepEqual(store.entries,[third,second,first]);assert.deepEqual(createBookmarkStore(storage).entries,store.entries);
 assert.equal(store.add(second.look).duplicate,true);assert.deepEqual(store.entries,[third,second,first]);
 const removed=store.remove(second.id);store.restore(removed);assert.deepEqual(store.entries,[third,second,first]);
});

test('500 bookmarks survive storage, reject a 501st unique look, and permit duplicates and recovery at capacity',()=>{
 assert.equal(MAX_BOOKMARKS,500);
 const storage=memory(),entries=Array.from({length:499},(_,i)=>({id:String(i),name:`Look ${i+1}`,look:look({bodyColor:`#${i.toString(16).padStart(6,'0')}`})}));
 storage.setItem(BOOKMARK_KEY,JSON.stringify({version:1,entries}));
 const store=createBookmarkStore(storage,{id:()=> 'last'}),last=store.add(look()).entry;
 assert.equal(store.entries.length,500);assert.deepEqual(store.entries[0],last);assert.equal(last.name,'Look 500');
 const reload=createBookmarkStore(storage);assert.deepEqual(reload.entries,store.entries);
 assert.throws(()=>reload.add(look({shirt:'wizardrobe'})),/500 bookmarks/);assert.equal(reload.add(last.look).duplicate,true);
 const removed=reload.remove('1');reload.restore(removed);assert.deepEqual(reload.entries,store.entries);
});

test('metadata uses readable visible trait names and preserves hidden selections for reimport',()=>{
 const value=look({head:'pumpkin',ears:'droopyfins',eyes:'mog',shirt:'wizardrobe',legs:'denim',bodyStyle:'camo'},{background:'rainbow',pose:'holdcard',posesEnabled:true});
 const metadata=bookmarkMetadata({name:'Wizard',look:value},{image:'../001-Wizard.png',id:1}),traits=Object.fromEntries(metadata.attributes.map(item=>[item.trait_type,item.value]));
 assert.equal(traits.background,'Rainbow gradient');assert.equal(traits['body finish'],'Camo');assert.equal(traits['body color'],'Woodland camo');assert.equal(traits.pose,'Hold card');assert.equal(traits.top,'Star wizard robe');
 for(const key of ['eyes','eyebrows','mouth','nose','tattoos','legs'])assert.equal(traits[key],'None');
 assert.equal(traits.ears,'Drooping fins');assert.deepEqual(normalizeLook(metadata),value);
 const custom=bookmarkMetadata({name:'Custom',look:look({bodyColor:'#123abc'},{background:'#abcdef',pose:'bow',posesEnabled:false})},{image:'../custom.png',id:2});
 const customTraits=Object.fromEntries(custom.attributes.map(item=>[item.trait_type,item.value]));
 assert.equal(customTraits['body color'],'Custom (#123abc)');assert.equal(customTraits.background,'Custom (#abcdef)');assert.equal(customTraits.pose,'Neutral');
 assert.ok(custom.attributes.every(trait=>typeof trait.value==='string'&&trait.value.length));
});
test('ZIP cancellation aborts partial output and render failures propagate',async()=>{
 const controller=new AbortController(),calls=[];
 const writer={async add(){calls.push('add');},async finish(){calls.push('finish');},async abort(){calls.push('abort');}};
 await assert.rejects(exportBookmarkZip([{name:'Look',look:look()}],{writer,signal:controller.signal,render:async()=>{controller.abort();return new Blob();}}),{name:'AbortError'});assert.deepEqual(calls,['abort']);
 await assert.rejects(exportBookmarkZip([{name:'Look',look:look()}],{writer,render:async()=>{throw Error('GPU failure');}}),/GPU failure/);
});
test('gallery and batch rendering serialize one isolated context, freeze each pose and release resources',async()=>{
 const calls=[],model=new THREE.Group();let contexts=0;
 const avatar={model,setAppearance:async value=>{calls.push(['look',value.mouth]);},setPose:(id,options)=>calls.push(['pose',id,options.static]),update(){},dispose:()=>calls.push('avatar disposed')};
 const renderer={setPixelRatio(){},setSize:(w,h)=>calls.push(['size',w,h]),setClearColor:color=>calls.push(['background',color]),render(){calls.push('render');},domElement:{toBlob:callback=>setTimeout(()=>callback(new Blob(['png'])),5)},dispose:()=>calls.push('renderer disposed'),forceContextLoss:()=>calls.push('context released')};
 const session=createBookmarkRenderer({THREE,createAvatar:async()=>avatar,environmentFactory:()=>({texture:null,dispose:()=>calls.push('environment disposed')}),rendererFactory:()=>{contexts++;return renderer;}});
 await Promise.all([session.render(look({mouth:'venom'},{posesEnabled:true,pose:'bow',background:'#ff0000'}),{thumbnail:true}),session.render(look({mouth:'moustache'},{background:'#0000ff'}))]);
 assert.equal(contexts,1);assert.deepEqual(calls.filter(Array.isArray).filter(call=>['look','size','background'].includes(call[0])),[['look','venom'],['size',240,259],['background','#ff0000'],['look','moustache'],['size',1200,1295],['background','#0000ff']]);
 assert.ok(calls.some(call=>Array.isArray(call)&&call[0]==='pose'&&call[1]==='bow'&&call[2]));
 await session.dispose();for(const item of ['avatar disposed','renderer disposed','environment disposed','context released'])assert.ok(calls.includes(item));
 await assert.rejects(session.render(look()),/closed/);
});

test('rainbow background survives bookmarks and complete look history',()=>{
 const value=look({bodyStyle:'silver'},{background:'rainbow',pose:'bow',posesEnabled:true});
 const storage=memory(),store=createBookmarkStore(storage,{id:()=> 'rainbow'});store.add(value);
 assert.equal(createBookmarkStore(storage).entries[0].look.portrait.background,'rainbow');
 const history=createLookHistory(look());history.commit(value);history.undo();assert.deepEqual(history.redo(),value);
});

test('card holding survives saved bookmarks, undo and redo',()=>{
 const value=look({shirt:'wizardrobe'},{pose:'holdcard',posesEnabled:true});
 const storage=memory(),store=createBookmarkStore(storage,{id:()=> 'card'});store.add(value);
 assert.equal(createBookmarkStore(storage).entries[0].look.portrait.pose,'holdcard');
 const history=createLookHistory(look());history.commit(value);history.undo();assert.deepEqual(history.redo(),value);
});
