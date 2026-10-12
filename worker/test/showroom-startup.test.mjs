import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
function section(first,next){const a=source.indexOf(first),b=source.indexOf(next,a+first.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
test('showroom skips the initial catalog import while ordinary collection pages still load it',async()=>{
 for(const showroom of [true,false]){
  let imports=0;const cards=[{stableId:'cardnft2:1'}];
  const context=vm.createContext({IS_SHOWROOM:showroom,REQUESTED_COLLECTION_ID:'cardnft2',INITIAL_COLLECTION_DATA_SPEC:{module:'cards.js',exportName:'cards'},loadModule:async()=>{imports++;return {cards};}});
  vm.runInContext('async function run(){'+section('const INITIAL_COLLECTION_DATA_MODULE =','function getInitialCollectionCards(').replace('await import(INITIAL_COLLECTION_DATA_SPEC.module)','await loadModule(INITIAL_COLLECTION_DATA_SPEC.module)')+'return INITIAL_COLLECTION_CARDS;}',context);
  const loaded=await context.run();assert.equal(imports,showroom?0:1);assert.equal(loaded.length,showroom?0:1);if(!showroom)assert.equal(loaded,cards);
 }
});
test('showroom initializes controls and the room without restoring or rendering a hidden default binder',async()=>{
 const calls=[],context=vm.createContext({IS_SHOWROOM:true,galleryOpen:false,els:{body:{classList:{add:value=>calls.push(value)}}},
  updateAppViewportVars:()=>calls.push('viewport'),applyTheme:light=>{assert.equal(light,false);},
  updateGalleryViewModeButton(){},populateTraitSortOptions(){},initCardScene:()=>calls.push('card-scene'),initEvents:()=>calls.push('events'),
  initShowroomExperience:async()=>calls.push('room'),initializeLiveDataRefresh:()=>calls.push('live'),initializeWalletAuth:async()=>calls.push('auth'),updateWalletAuthUi(){},
  installWalletBinderDirectoryArrivalBridge(){throw Error('ordinary startup reached');},
 });
 vm.runInContext(section('async function init() {','async function initShowroomExperience('),context);await context.init();
 assert.deepEqual(calls,['viewport','card-scene','events','is-gallery','room','live','auth']);assert.equal(context.galleryOpen,true);
});
test('background gallery refreshes and animation requests do not construct hidden showroom binders',()=>{
 const context=vm.createContext({IS_SHOWROOM:true,showroomBinderEntry:null});
 const gallery=section('function renderGallery() {','\nfunction ').split('\n');
 // Execute the real early guard without mocking the ordinary gallery work.
 vm.runInContext(gallery.join('\n'),context);
 vm.runInContext(section('function startBinderRenderLoop() {','\nfunction '),context);
 assert.doesNotThrow(()=>context.renderGallery());assert.doesNotThrow(()=>context.startBinderRenderLoop());
});
