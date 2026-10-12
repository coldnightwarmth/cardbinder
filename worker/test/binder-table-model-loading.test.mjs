import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.js';
const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8'),tick=()=>new Promise(resolve=>setImmediate(resolve));
function section(first,next){const a=source.indexOf(first),b=source.indexOf(next,a+first.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function harness({warm=async()=>{}}={}){
 const loads=[],gates=[],warnings=[];let dracoDisposed=0;
 class GLTFLoader{setDRACOLoader(){}loadAsync(url){loads.push(url);return new Promise((resolve,reject)=>gates.push({url,resolve,reject}));}}
 class DRACOLoader{setDecoderPath(){}setWorkerLimit(){}dispose(){dracoDisposed++;}}
 const context=vm.createContext({GLTFLoader,DRACOLoader,binderTableDisplayModelRoot:new THREE.Group(),binderTableDisplayModelPromise:null,
  binderTableDisplayWarmup:Promise.resolve(),binderTableDisplayModelLoads:new Map(),binderTableDisplayRequestedIndex:0,binderTableDisplaySelectionToken:0,binderTableDisplayModelEntries:[],binderTableDisplayModelIndex:0,
  binderTableDisplayModelLoadedAt:0,BINDER_TABLE_DISPLAY_MODEL_REVEAL_DURATION_MS:200,INDIVIDUAL_CARD_DRACO_DECODER_PATH:'decoder/',
  BINDER_TABLE_DISPLAY_MODEL_SPECS:Array.from({length:4},(_,i)=>({id:`model-${i}`,url:`model-${i}.glb`})),performance:{now:()=>100},console:{warn:(...args)=>warnings.push(args)},
  createBinderTableDisplayModelEntry:(gltf,spec)=>({root:new THREE.Group(),materials:[new THREE.MeshStandardMaterial()],usesResinMaterial:spec.id==='model-1'}),
  warmBinderTableDisplayModelEntries:warm,applyBinderTableViewProgress(){},markBinderInteractionActive(){},startBinderRenderLoop(){},
  modulo:(a,b)=>((a%b)+b)%b,
 });
 vm.runInContext(section('function loadBinderTableDisplayModelEntry(','function createBinderTableDisplayModelEntry(')
  .replace(/import\("\.\/vendor\/GLTFLoader.js[^"\n]*"\)/g,'Promise.resolve({GLTFLoader})')
  .replace(/import\("\.\/vendor\/DRACOLoader.js[^"\n]*"\)/g,'Promise.resolve({DRACOLoader})')
  +section('function applyBinderTableDisplayModelSelection(','function updateBinderTableDisplayModelVisibility('),context);
 return {context,loads,gates,warnings,disposed:()=>dracoDisposed};
}
test('table initially loads only its selected ornament and shares in-flight loads',async()=>{
 const {context:c,loads,gates,disposed}=harness();assert.equal(c.cycleBinderTableDisplayModel(),false);
 const first=c.ensureBinderTableDisplayModel(),same=c.ensureBinderTableDisplayModel();assert.equal(first,same);
 await tick();assert.deepEqual(loads,['model-0.glb']);gates[0].resolve({});await first;
 assert.equal(c.binderTableDisplayModelEntries[0].root.visible,true);assert.equal(disposed(),1);
 const cached=await c.loadBinderTableDisplayModelEntry(0);assert.equal(cached,c.binderTableDisplayModelEntries[0]);assert.equal(loads.length,1);
});
test('latest ornament click wins out-of-order downloads, while failures retain the current model and retry',async()=>{
 const {context:c,loads,gates,warnings}=harness();const first=c.ensureBinderTableDisplayModel();await tick();gates[0].resolve({});await first;
 c.cycleBinderTableDisplayModel();c.cycleBinderTableDisplayModel();await tick();assert.deepEqual(loads,['model-0.glb','model-1.glb','model-2.glb']);
 assert.equal(c.binderTableDisplayModelEntries[0].root.visible,true,'keep a model visible during download');
 gates[2].resolve({});await tick();assert.equal(c.binderTableDisplayModelIndex,2);assert.equal(c.binderTableDisplayModelEntries[2].root.visible,true);
 gates[1].resolve({});await tick();assert.equal(c.binderTableDisplayModelIndex,2);assert.equal(c.binderTableDisplayModelEntries[1].root.visible,false);
 c.cycleBinderTableDisplayModel();await tick();gates[3].reject(new Error('offline'));await tick();
 assert.equal(c.binderTableDisplayModelIndex,2);assert.equal(c.binderTableDisplayRequestedIndex,2);assert.equal(c.binderTableDisplayModelEntries[2].root.visible,true);assert.equal(warnings.length,1);
 c.cycleBinderTableDisplayModel();await tick();assert.equal(loads.at(-1),'model-3.glb');assert.equal(loads.length,5);gates[4].resolve({});await tick();
 assert.equal(c.binderTableDisplayModelIndex,3);assert.equal(c.binderTableDisplayModelEntries[2].root.visible,false);assert.equal(c.binderTableDisplayModelEntries[3].root.visible,true);
 c.cycleBinderTableDisplayModel();await tick();assert.equal(c.binderTableDisplayModelIndex,0);assert.equal(loads.length,5,'cycling back reuses decoded resources');
});


test('separate ornament downloads never overlap warmups that temporarily change renderer visibility',async()=>{
 const warming=[],finish=[];
 const {context:c,gates}=harness({warm:entries=>{warming.push(entries[0]);return new Promise(resolve=>finish.push(resolve));}});
 const first=c.loadBinderTableDisplayModelEntry(1),second=c.loadBinderTableDisplayModelEntry(2);
 await tick();gates[0].resolve({});gates[1].resolve({});await tick();assert.equal(warming.length,1);
 finish[0]();await first;await tick();assert.equal(warming.length,2);finish[1]();await second;
 assert.notEqual(warming[0],warming[1]);assert.equal(c.binderTableDisplayModelEntries[1].root.visible,false);assert.equal(c.binderTableDisplayModelEntries[2].root.visible,false);
});
