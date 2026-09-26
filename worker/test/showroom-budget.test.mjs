import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {createShowroomQuality} from '../../showroom-performance.mjs';

function sampleFor(quality,ms,seconds){let latest=null;for(let t=0;t<seconds*1000;t+=ms)latest=quality.sample(ms)||latest;return latest;}
test('showroom quality responds to sustained slow frames and recovers with hysteresis',()=>{
 const quality=createShowroomQuality();
 assert.equal(sampleFor(quality,16,1),null);
 assert.equal(sampleFor(quality,40,3).tier,0);
 assert.equal(quality.settings.reflectionSize,256);
 assert.equal(sampleFor(quality,16,3),null,'quality cannot oscillate immediately');
 sampleFor(quality,16,30);assert.equal(quality.settings.tier,2);
 assert.equal(quality.settings.reflectionSize,1024);
 sampleFor(quality,40,45);assert.equal(quality.settings.tier,0);
 for(const ms of [0,-1,1000])assert.equal(quality.sample(ms),null);
});
test('healthy 50fps stays stable rather than unnecessarily lowering quality',()=>{
 const quality=createShowroomQuality();assert.equal(sampleFor(quality,20,60),null);assert.equal(quality.settings.tier,1);
});
function budget(){const source=readFileSync(new URL('../../showroom-exhibit-lod.js',import.meta.url),'utf8');const context=vm.createContext({THREE});vm.runInContext(source.slice(source.indexOf('export function createExhibitBudget')).replace('export ',''),context);return context.createExhibitBudget();}
test('distant clear proxies and reflection overrides restore exact original materials',()=>{
 const manager=budget(),group=new THREE.Group(),glass=new THREE.MeshPhysicalMaterial({transmission:1}),art=new THREE.MeshBasicMaterial();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),[glass,art]);group.add(mesh);manager.register(group);manager.register(group);
 const camera=new THREE.PerspectiveCamera();camera.position.z=20;manager.update(camera,1,async()=>{});
 const cheap=mesh.material;assert.notEqual(cheap[0],glass);assert.equal(cheap[1],art);
 camera.position.z=1;manager.update(camera,1,async()=>{});assert.equal(mesh.material[0],glass);
 const restore=manager.reflection();assert.equal(mesh.material,cheap);restore();assert.equal(mesh.material[0],glass);
 let disposed=0;cheap[0].addEventListener('dispose',()=>disposed++);manager.unregister(group);assert.equal(disposed,1);manager.update(camera,0,async()=>{});assert.equal(mesh.material[0],glass);
});
test('showroom optimized geometry stays within near and far budgets',()=>{
 const stats=JSON.parse(readFileSync(new URL('../../assets/models/showroom-optimized/metrics.json',import.meta.url)));
 const limits={'gremlin-near.glb':60000,'gremlin-far.glb':10000,'frame-near.glb':140000,'frame-far.glb':23000};
 for(const stat of stats){assert.ok(stat.triangles<=limits[stat.file]);assert.ok(stat.bytes<500000);const buffer=readFileSync(new URL('../../assets/models/showroom-optimized/'+stat.file,import.meta.url));assert.equal(buffer.toString('utf8',0,4),'glTF');assert.equal(buffer.length,stat.bytes);}
});
test('near detail stays hidden until prepared and distance hysteresis prevents flicker',async()=>{
 const source=readFileSync(new URL('../../showroom-exhibit-lod.js',import.meta.url),'utf8');let loads=0;
 const context=vm.createContext({THREE,URL,performance:{now:()=>1000},setTimeout:fn=>fn(),console,loader:{loadAsync:async()=>{loads++;return {scene:new THREE.Group()};}}});
 vm.runInContext(source.slice(source.indexOf('let upgrades='),source.indexOf('// Keep clear')).replace('export ','').replaceAll('import.meta.url',"'http://localhost/showroom-exhibit-lod.js'"),context);
 const root=await context.createExhibitLOD('frame'),lod=root.userData.exhibitLOD,far=root.children[0];
 let prepared;const pending=new Promise(resolve=>prepared=resolve);lod.update(1,1,()=>pending);
 await new Promise(resolve=>setImmediate(resolve));const near=root.children[1];assert.equal(loads,2);assert.equal(far.visible,true);assert.equal(near.visible,false);
 prepared();await new Promise(resolve=>setImmediate(resolve));lod.update(1,1,()=>{});assert.equal(near.visible,true);assert.equal(far.visible,false);
 lod.update(4.7,1,()=>{});assert.equal(near.visible,true,'retain detail through threshold margin');
 const restore=lod.reflection();assert.equal(near.visible,false);assert.equal(far.visible,true);restore();assert.equal(near.visible,true);assert.equal(far.visible,false);
 lod.update(5.1,1,()=>{});assert.equal(near.visible,false);lod.update(4.7,1,()=>{});assert.equal(near.visible,false);lod.update(4.4,1,()=>{});assert.equal(near.visible,true);assert.equal(loads,2,'reuse loaded geometry');
});
