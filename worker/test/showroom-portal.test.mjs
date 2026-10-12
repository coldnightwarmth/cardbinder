import test from 'node:test';
import assert from 'node:assert/strict';
import {portalPositionForTables,stepThroughPortal,PORTAL_ROOM_SIZE,apertureMayBeVisible,PORTAL_RADIUS,PORTAL_SPRING_HEIGHT} from '../../showroom-portal-layout.mjs';
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
  .replace("'./showroom-portal-layout.mjs?v=2'",`'${new URL('../../showroom-portal-layout.mjs',import.meta.url).href}'`)
  .replace("'./showroom-scene-index.mjs'",`'${new URL('../../showroom-scene-index.mjs',import.meta.url).href}'`);
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

test('threshold rotation keeps a partial aperture mask on both sides, including exactly on the plane',async()=>{
 const {readFile}=await import('node:fs/promises');const THREE=await import('../../vendor/three.module.js');
 const source=(await readFile(new URL('../../showroom-portal.js',import.meta.url),'utf8'))
  .replace("from 'three'",`from '${new URL('../../vendor/three.module.js',import.meta.url).href}'`)
  .replace("'./showroom-portal-layout.mjs?v=2'",`'${new URL('../../showroom-portal-layout.mjs',import.meta.url).href}'`)
  .replace("'./showroom-scene-index.mjs'",`'${new URL('../../showroom-scene-index.mjs',import.meta.url).href}'`);
 const {createShowroomPortal}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const calls=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1.4,.05,600);scene.background=new THREE.Color(0x181d23);
 const renderer={capabilities:{getMaxAnisotropy:()=>1},render:(scene,camera)=>calls.push({scene,camera}),clearDepth(){},autoClear:true};
 const portal=createShowroomPortal({renderer,scene,camera,canWalkOutside:()=>true});
 for(const inside of [false,true]){
  if(inside){camera.position.set(0,1.72,portal.z+.1);portal.move(0,-.2);}
  for(const distance of [.1,.001,0])for(const yaw of [Math.PI/2-.2,Math.PI/2,Math.PI/2+.2]){
   camera.position.set(.65,1.72,inside?-distance:portal.z+distance);camera.rotation.set(-.18,yaw,0);calls.length=0;portal.render();
   assert.equal(calls.length,4,'sideways view must composite both spaces, never switch the whole screen');
   const mask=portal.surface.material;assert.equal(portal.surface.frustumCulled,false);
   assert.equal(mask.uniforms.planeZ.value,inside?0:portal.z,'aperture plane does not move with the eye');
   assert.equal(mask.uniforms.travelSign.value,inside?1:-1);
   assert.ok(mask.uniforms.eye.value.equals(camera.position));
   assert.equal(renderer.autoClear,true,'render state restored');
  }
 }
});


test('offscreen portal culling preserves all sampled aperture rays at oblique and near-plane views',async()=>{
 const THREE=await import('../../vendor/three.module.js');
 const camera=new THREE.PerspectiveCamera(65,1.4,.05,600),matrix=new THREE.Matrix4(),ray=new THREE.Vector3();
 let rejected=0,visible=0;
 // Positive and negative distances exercise both sides. Include distances
 // closer than the near plane and the exact threshold used by the ray mask.
 for(const z of [-8,-2,-.1,-.001,0,.001,.1,2,8])for(const x of [-8,-2,-.8,0,.8,2,8])
 for(const yaw of [-Math.PI,-2,-Math.PI/2,-.8,0,.8,Math.PI/2,2,Math.PI])for(const pitch of [-1,0,1]) {
  camera.position.set(x,1.72,z);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  if(apertureMayBeVisible(matrix.elements,0)){visible++;continue;}
  rejected++;
  for(let sx=-1;sx<=1;sx+=.2)for(let sy=-1;sy<=1;sy+=.2){
   ray.set(sx,sy,.5).unproject(camera).sub(camera.position).normalize();
   if(Math.abs(ray.z)<1e-8)continue;
   const t=-z/ray.z;if(t<0)continue;
   const hitX=x+ray.x*t,hitY=camera.position.y+ray.y*t;
   const inArch=Math.abs(hitX)<=PORTAL_RADIUS&&hitY>=0&&
    (hitY<=PORTAL_SPRING_HEIGHT || hitX*hitX+(hitY-PORTAL_SPRING_HEIGHT)**2<=PORTAL_RADIUS**2);
   assert.equal(inArch,false,`visible ray rejected at eye ${x},${z}, yaw ${yaw}, pitch ${pitch}`);
  }
 }
 assert.ok(rejected>1000,'offscreen views really avoid destination passes');assert.ok(visible>100,'partial views remain eligible');
});

test('sideways offscreen doorway does not submit mask or destination scenes',async()=>{
 const {readFile}=await import('node:fs/promises');const THREE=await import('../../vendor/three.module.js');
 const source=(await readFile(new URL('../../showroom-portal.js',import.meta.url),'utf8'))
  .replace("from 'three'",`from '${new URL('../../vendor/three.module.js',import.meta.url).href}'`)
  .replace("'./showroom-portal-layout.mjs?v=2'",`'${new URL('../../showroom-portal-layout.mjs',import.meta.url).href}'`)
  .replace("'./showroom-scene-index.mjs'",`'${new URL('../../showroom-scene-index.mjs',import.meta.url).href}'`);
 const {createShowroomPortal}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const calls=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1.4,.05,600);scene.background=new THREE.Color(0x181d23);
 const renderer={capabilities:{getMaxAnisotropy:()=>1},render:(scene,camera)=>calls.push({scene,camera}),clearDepth(){},autoClear:true};
 const portal=createShowroomPortal({renderer,scene,camera,canWalkOutside:()=>true});
 camera.position.set(8,1.72,portal.z+3);portal.render();
 assert.equal(calls.length,1);assert.equal(calls[0].scene,scene);
 camera.rotation.y=Math.atan2(8,3);calls.length=0;portal.render();assert.equal(calls.length,4,'turning toward doorway immediately restores portal');
 // A newly inserted card receives the transmission guard without a traversal.
 const material=new THREE.MeshPhysicalMaterial({transmission:1}),card=new THREE.Mesh(new THREE.PlaneGeometry(),material);
 const parent=new THREE.Group();portal.room.add(parent);parent.add(card);material.stencilWrite=true;
 card.onBeforeRender({getRenderTarget:()=>({})},null,null,null,material);assert.equal(material.stencilWrite,false);
 card.onAfterRender({},null,null,null,material);assert.equal(material.stencilWrite,true);
});
