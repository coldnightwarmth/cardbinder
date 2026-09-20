import test from 'node:test';
import assert from 'node:assert/strict';
import {portalPositionForTables,stepThroughPortal,PORTAL_ROOM_SIZE} from '../../showroom-portal-layout.mjs';
const walk=()=>true,portalZ=-40;
test('portal sits past the longest row, including uneven rows',()=>{
  assert.equal(portalPositionForTables([{x:-3,z:0},{x:-3,z:-5},{x:3,z:-20}]),-25);
});
test('threshold crossing preserves sub-frame movement and maps back without rotating',()=>{
  const entered=stepThroughPortal({x:.4,z:-39.98},{x:0,z:-.1},false,portalZ,walk);
  assert.equal(entered.inside,true);assert.equal(entered.x,.4);assert(Math.abs(entered.z+.08)<1e-9);
  const exited=stepThroughPortal(entered,{x:0,z:.1},true,portalZ,walk);
  assert.equal(exited.inside,false);assert(Math.abs(exited.z+39.98)<1e-9);
});
test('rear of the freestanding arch does not connect to the room',()=>{
  const next=stepThroughPortal({x:0,z:-40.1},{x:0,z:.2},false,portalZ,walk);
  assert.equal(next.inside,false);assert.equal(next.z,-39.9);
});
test('posts, cube walls and front wall block movement but the doorway stays open',()=>{
  assert.equal(stepThroughPortal({x:1.3,z:-39.5},{x:0,z:-.5},false,portalZ,walk),null);
  assert.equal(stepThroughPortal({x:0,z:-39.5},{x:0,z:-.6},false,portalZ,walk).inside,true);
  assert.equal(stepThroughPortal({x:3,z:-.3},{x:0,z:.4},true,portalZ,walk),null);
  assert.equal(stepThroughPortal({x:6.4,z:-5},{x:.3,z:0},true,portalZ,walk),null);
  assert.equal(stepThroughPortal({x:0,z:-PORTAL_ROOM_SIZE+.3},{x:0,z:-.2},true,portalZ,walk),null);
  assert.equal(stepThroughPortal({x:0,z:-.1},{x:0,z:.2},true,portalZ,walk).inside,false);
});
test('ordinary showroom collision still applies away from the portal',()=>{
  assert.equal(stepThroughPortal({x:3,z:1},{x:0,z:-.1},false,portalZ,()=>false),null);
});

test('portal masking stays on the final card but off its refraction framebuffer',async()=>{
 const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');
 const source=await readFile(new URL('../../showroom-portal.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('  function guardTransmissionPass('),source.indexOf('  let inside=false'));
 const context=vm.createContext({guardedObjects:new WeakSet()});vm.runInContext(code,context);
 const material={stencilWrite:true},object={material,onBeforeRender(){},onAfterRender(){}};
 context.guardTransmissionPass(object);
 object.onBeforeRender({getRenderTarget:()=>({})},null,null,null,material);
 assert.equal(material.stencilWrite,false);
 object.onAfterRender({},null,null,null,material);assert.equal(material.stencilWrite,true);
 object.onBeforeRender({getRenderTarget:()=>null},null,null,null,material);
 assert.equal(material.stencilWrite,true);
 object.onAfterRender({},null,null,null,material);assert.equal(material.stencilWrite,true);
});

test('full-view crossings retain one render pass and the same scene camera in both directions',async()=>{
 const {readFile}=await import('node:fs/promises');
 const THREE=await import('../../vendor/three.module.js');
 const source=(await readFile(new URL('../../showroom-portal.js',import.meta.url),'utf8'))
  .replace("from 'three'",`from '${new URL('../../vendor/three.module.js',import.meta.url).href}'`)
  .replace("'./showroom-portal-layout.mjs'",`'${new URL('../../showroom-portal-layout.mjs',import.meta.url).href}'`);
 const {createShowroomPortal}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const calls=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1.4,.05,600);
 scene.background=new THREE.Color(0x181d23);
 const renderer={capabilities:{getMaxAnisotropy:()=>1},render:(scene,camera)=>calls.push({scene,camera}),clearDepth(){},autoClear:true};
 const portal=createShowroomPortal({renderer,scene,camera,canWalkOutside:()=>true});
 camera.position.set(0,1.72,portal.z+.1);portal.render();
 assert.equal(calls.length,1);const roomCamera=calls[0].camera;assert.equal(calls[0].scene,portal.room);
 calls.length=0;portal.move(0,-.2);portal.render();
 assert.equal(calls.length,1);assert.equal(calls[0].camera,roomCamera);assert.equal(calls[0].scene,portal.room);
 camera.rotation.y=Math.PI;calls.length=0;portal.render();
 assert.equal(calls.length,1);const showCamera=calls[0].camera;assert.equal(calls[0].scene,scene);
 calls.length=0;portal.move(0,.2);portal.render();
 assert.equal(calls.length,1);assert.equal(calls[0].camera,showCamera);assert.equal(calls[0].scene,scene);
});
