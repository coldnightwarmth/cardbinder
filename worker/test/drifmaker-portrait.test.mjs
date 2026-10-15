import {POSES,normalizePose,normalizePoseTime} from '../../drifmaker-poses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {createAvatarAppearance} from '../../drifmaker-avatar.mjs';
import {DEFAULT_APPEARANCE} from '../../drifmaker-config.mjs';
import {PORTRAIT_COMPOSITION,createPortraitAvatar,configurePortraitCamera,capturePortrait} from '../../drifmaker-portrait.mjs';

// Load actual shipped transforms and clips without a GPU or texture decoder.
function avatarFactory(){
 const bytes=readFileSync(new URL('../../assets/models/drifmaker/drifella-customizable.glb',import.meta.url));
 const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString()),binaryStart=28+length;
 const nodes=gltf.nodes.map(item=>{
  const node=new THREE.Bone();node.name=THREE.PropertyBinding.sanitizeNodeName(item.name||'');
  if(item.matrix){node.matrix.fromArray(item.matrix);node.matrix.decompose(node.position,node.quaternion,node.scale);}
  else{if(item.translation)node.position.fromArray(item.translation);if(item.rotation)node.quaternion.fromArray(item.rotation);if(item.scale)node.scale.fromArray(item.scale);}
  return node;
 });
 gltf.nodes.forEach((item,index)=>item.children?.forEach(child=>nodes[index].add(nodes[child])));
 const scene=new THREE.Group();gltf.scenes[gltf.scene||0].nodes.forEach(index=>scene.add(nodes[index]));
 const values=index=>{
  const accessor=gltf.accessors[index],view=gltf.bufferViews[accessor.bufferView],components={SCALAR:1,VEC3:3,VEC4:4}[accessor.type];
  assert.equal(accessor.componentType,5126);
  const offset=binaryStart+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||components*4,result=[];
  for(let i=0;i<accessor.count;i++)for(let j=0;j<components;j++)result.push(bytes.readFloatLE(offset+i*stride+j*4));
  return result;
 };
 const animations=gltf.animations.map(clip=>new THREE.AnimationClip(clip.name,-1,clip.channels.map(channel=>{
  const sampler=clip.samplers[channel.sampler],property={translation:'position',rotation:'quaternion',scale:'scale'}[channel.target.path];
  const Track=property==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
  return new Track(`${nodes[channel.target.node].name}.${property}`,values(sampler.input),values(sampler.output),sampler.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
 })));
 const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8');
 const context=vm.createContext({THREE,normalizePose,normalizePoseTime,createAvatarAppearance,asset:async()=>({scene,animations})});
 vm.runInContext(source.slice(source.indexOf('export function cloneAvatar')).replaceAll('export ',''),context);
 return context.createShowroomAvatar;
}
function bonePose(model){const result={};model.traverse(node=>{if(node.isBone)result[node.name]=[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()];});return result;}

test('portrait samples a separate neutral avatar at time zero and remains frozen during studio animation',async()=>{
 const createAvatar=avatarFactory(),studio=await createAvatar(),studioCamera=new THREE.PerspectiveCamera();
 studio.model.position.set(3,2,1);studio.model.rotation.y=.7;studioCamera.position.set(7,5,9);
 for(let i=0;i<36;i++)studio.update(1/60,1.4,true,.8,{crouch:.2,jumpTime:.4});
 const before=bonePose(studio.model),cameraBefore=studioCamera.matrix.clone();
 const appearance={...DEFAULT_APPEARANCE,eyes:'hearts',hat:'wizard'};
 const portrait=await createPortraitAvatar({createAvatar,appearance}),second=await createPortraitAvatar({createAvatar,appearance});
 assert.deepEqual(bonePose(studio.model),before,'creating a portrait must not reset the active studio pose');
 assert.deepEqual(studio.model.position.toArray(),[3,2,1]);assert.equal(studio.model.rotation.y,.7);assert.deepEqual(studioCamera.matrix,cameraBefore);
 assert.equal(portrait.update,undefined);assert.equal(portrait.model.userData.animation,'Neutral');assert.deepEqual(portrait.model.position.toArray(),[0,0,0]);assert.deepEqual(portrait.model.scale.toArray(),[1,1,1]);
 assert.notEqual(portrait.model.getObjectByName('Head'),studio.model.getObjectByName('Head'));
 for(const side of ['L','R']){
  const hand=portrait.model.getObjectByName(`Hand${side}`).getWorldPosition(new THREE.Vector3()),shoulder=portrait.model.getObjectByName(`UpperArm${side}`).getWorldPosition(new THREE.Vector3());
  assert.ok(hand.y<shoulder.y-.3,'the neutral portrait lowers both hands instead of retaining the bind-pose T stance');
 }
 assert.deepEqual(bonePose(portrait.model),bonePose(second.model),'fresh portraits have the same exact clip time');
 const frozen=bonePose(portrait.model);
 for(let i=0;i<120;i++)studio.update(1/60,2,false,-.7,{crouch:1,jumpTime:-1});
 await portrait.setAppearance({...appearance,mouth:'fangs',legs:'denim'});
 assert.deepEqual(bonePose(portrait.model),frozen,'appearance changes do not advance the portrait animation');
 assert.equal(portrait.appearance.mouth,'fangs');assert.equal(studio.appearance.mouth,'original');
 portrait.dispose();second.dispose();studio.dispose();
});

test('orthographic portrait framing preserves configured aspect without mutating readonly composition',()=>{
 const config=Object.freeze({...PORTRAIT_COMPOSITION,width:1200,height:1295,target:Object.freeze([.1,2.1,0]),cameraPosition:Object.freeze([2.7,2.3,7])});
 const camera=configurePortraitCamera(THREE,new THREE.OrthographicCamera(),config);
 assert.ok(Math.abs((camera.right-camera.left)/(camera.top-camera.bottom)-1200/1295)<1e-12);
 const target=new THREE.Vector3().fromArray(config.target).project(camera);assert.ok(Math.abs(target.x)<1e-12&&Math.abs(target.y)<1e-12);
 assert.deepEqual(camera.position.toArray(),config.cameraPosition);assert.deepEqual(config.target,[.1,2.1,0]);
 assert.throws(()=>configurePortraitCamera(THREE,new THREE.PerspectiveCamera(),config),/orthographic/);
 assert.throws(()=>configurePortraitCamera(THREE,camera,{width:0}),/dimensions/);
});

function rendererFixture({blob=new Blob(['png'],{type:'image/png'}),error}={}){
 const calls={},renderer={domElement:{toBlob(callback,type){calls.mime=type;callback(blob);}},
  setPixelRatio(value){calls.pixelRatio=value;},setSize(...value){calls.size=value;},setClearColor(...value){calls.clear=value;},
  render(scene,camera){calls.scene=scene;calls.camera=camera;if(error)throw error;},dispose(){calls.disposed=true;},forceContextLoss(){calls.contextLost=true;}};
 return {calls,renderer,factory:options=>{calls.options=options;return renderer;}};
}
test('PNG export uses native dimensions, an isolated camera and renderer, and always releases its context',async()=>{
 const scene=new THREE.Scene(),camera=configurePortraitCamera(THREE,new THREE.OrthographicCamera(),{width:400,height:400}),originalProjection=camera.projectionMatrix.clone();
 const fixture=rendererFixture(),blob=await capturePortrait({THREE,scene,camera,composition:{width:1200,height:1295},rendererFactory:fixture.factory});
 assert.equal(blob.type,'image/png');assert.deepEqual(fixture.calls.size,[1200,1295,false]);assert.equal(fixture.calls.pixelRatio,1);assert.equal(fixture.calls.mime,'image/png');assert.equal(fixture.calls.options.alpha,false);
 assert.equal(fixture.calls.scene,scene);assert.notEqual(fixture.calls.camera,camera);assert.deepEqual(camera.projectionMatrix,originalProjection);
 assert.equal(fixture.calls.disposed,true);assert.equal(fixture.calls.contextLost,true);
 for(const options of [{blob:null},{error:Error('Context unavailable')}]){
  const failure=rendererFixture(options);
  await assert.rejects(capturePortrait({THREE,scene,camera,rendererFactory:failure.factory}),options.error?/Context unavailable/:/could not be encoded/);
  assert.equal(failure.calls.disposed,true);assert.equal(failure.calls.contextLost,true);
 }
});

test('reflective PNG exports build their own environment and preserve the live preview',async()=>{
 const scene=new THREE.Scene(),liveEnvironment=new THREE.Texture(),child=new THREE.Group();scene.environment=liveEnvironment;scene.add(child);
 const camera=configurePortraitCamera(THREE,new THREE.OrthographicCamera());
 for(const error of [undefined,Error('Export render failed')]){
  const fixture=rendererFixture({error}),texture=new THREE.Texture();let disposed=0;
  const environmentFactory=renderer=>{assert.equal(renderer,fixture.renderer);return {texture,dispose(){disposed++;}};};
  const work=capturePortrait({THREE,scene,camera,rendererFactory:fixture.factory,environmentFactory});
  if(error)await assert.rejects(work,/Export render failed/);else await work;
  assert.equal(scene.environment,liveEnvironment);assert.equal(child.parent,scene);assert.notEqual(fixture.calls.scene,scene);
  assert.equal(fixture.calls.scene.children[0],child);assert.equal(fixture.calls.scene.environment,texture);assert.equal(disposed,1);assert.equal(fixture.calls.contextLost,true);
  texture.dispose();
 }
 liveEnvironment.dispose();
});

test('all ten pose clips enter from neutral, hold indefinitely, cancel, and match static portraits',async()=>{
 const createAvatar=avatarFactory(),avatar=await createAvatar(),neutral=await createPortraitAvatar({createAvatar});
 for(const pose of POSES){
  avatar.setPose(pose.id);avatar.update(0,0,false);const first=bonePose(avatar.model);
  assert.deepEqual(first,bonePose(neutral.model),`${pose.id} enters from the neutral stance`);
  avatar.update(.65,0,false);assert.notDeepEqual(bonePose(avatar.model),first,`${pose.id} contains motion`);
  avatar.update(2,0,false);const held=bonePose(avatar.model);
  assert.notDeepEqual(held,first,`${pose.id} has a distinct key pose`);
  for(let i=0;i<100;i++)avatar.update(.1,0,true,.9);
  assert.deepEqual(bonePose(avatar.model),held,`${pose.id} holds, without camera aim or card animation drift`);
  const portrait=await createPortraitAvatar({createAvatar,pose:pose.id});
  assert.deepEqual(bonePose(portrait.model),held,`${pose.id} portrait uses the exact held frame`);
  portrait.setPose('');assert.deepEqual(bonePose(portrait.model),bonePose(neutral.model));portrait.dispose();
  avatar.setPose('');avatar.update(.2,2,false);assert.equal(avatar.model.userData.animation,'Walk');
 }
 avatar.setPose('invalid');avatar.update(0,0,false);assert.equal(avatar.pose,'');
 avatar.dispose();neutral.dispose();
});

test('remote pose time reproduces the same frame for late joiners and supports cancellation',async()=>{
 const createAvatar=avatarFactory(),a=await createAvatar(),b=await createAvatar();
 for(const pose of POSES){
  a.setPose(pose.id);a.update(.8,0,false);
  b.update(.03,0,false,0,{emote:pose.id,emoteTime:.8});
  assert.deepEqual(bonePose(a.model),bonePose(b.model));
  b.update(.03,0,false,0,{emote:pose.id,emoteTime:99});assert.equal(b.model.userData.animation,pose.clip);
 }
 b.update(.1,1,false,0,{emote:'',emoteTime:0});assert.equal(b.model.userData.animation,'Walk');
 a.dispose();b.dispose();
});
