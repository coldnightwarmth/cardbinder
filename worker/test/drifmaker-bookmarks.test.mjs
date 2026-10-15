import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from '../../vendor/three.module.min.js';
import {DEFAULT_APPEARANCE} from '../../drifmaker-config.mjs';
import {BOOKMARK_KEY,createBookmarkStore,createLookHistory,normalizeLook,exportBookmarkZip} from '../../drifmaker-bookmarks.mjs';
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
test('ZIP contains one valid stored PNG per bookmark with safe unique filenames and correct CRCs',async()=>{
 const png=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')],{type:'image/png'});
 const entries=[{name:'../Look 1',look:look()},{name:'../Look 1',look:look({mouth:'venom'})}],received=[];
 const zip=await exportBookmarkZip(entries,{render:async value=>{received.push(value);return png;}});
 assert.deepEqual(received,entries.map(item=>item.look));
 const dir=mkdtempSync(join(tmpdir(),'drifmaker-zip-'));try{const path=join(dir,'bookmarks.zip');writeFileSync(path,Buffer.from(await zip.arrayBuffer()));
  const result=JSON.parse(execFileSync('python3',['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert all(z.read(n).startswith(bytes([137,80,78,71,13,10,26,10])) for n in z.namelist()); print(json.dumps(z.namelist()))',path],{encoding:'utf8'}));
  assert.deepEqual(result,['001-Look-1.png','002-Look-1.png']);
 }finally{rmSync(dir,{recursive:true,force:true});}
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
