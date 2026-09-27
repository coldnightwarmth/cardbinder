import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
let assetPromise;
function asset(){return assetPromise ||= new GLTFLoader().loadAsync(new URL('./assets/models/showroom-character/blue-fin-character.glb?v=5',import.meta.url).href).catch(error=>{assetPromise=null;throw error;});}
// Geometry, materials, and textures are shared; each visitor owns their bones.
export function cloneAvatar(source){
 const clone=source.clone(true),lookup=new Map();
 function pair(a,b){lookup.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);}pair(source,clone);
 source.traverse(original=>{if(!original.isSkinnedMesh)return;const mesh=lookup.get(original);mesh.skeleton=original.skeleton.clone();mesh.skeleton.bones=original.skeleton.bones.map(bone=>lookup.get(bone));mesh.bind(mesh.skeleton,original.bindMatrix);mesh.frustumCulled=false;});
 return clone;
}
// Apply camera aim after the clip mixer, and restore its untouched pose before
// the next mixer tick so additive rotations never accumulate.
export function createAvatarLookPose(model){
 const head=model.getObjectByName('Head');
 const arm=model.getObjectByName('UpperArmR')||model.getObjectByName('UpperArm.R');
 const joints=[head,arm].filter(Boolean),base=joints.map(b=>b.quaternion.clone());
 const axis=new THREE.Vector3(),localAxis=new THREE.Vector3(),parentRotation=new THREE.Quaternion(),turn=new THREE.Quaternion();
 let pitch=0,held=0,applied=false;
 return {
  restore(){if(applied)joints.forEach((b,i)=>b.quaternion.copy(base[i]));applied=false;},
  apply(dt,target,holding){
   const blend=1-Math.exp(-Math.max(0,dt)*14);
   pitch+=(THREE.MathUtils.clamp(Number.isFinite(target)?target:0,-1.15,1.15)-pitch)*blend;
   held+=((holding?1:0)-held)*(1-Math.exp(-Math.max(0,dt)*16));
   model.updateWorldMatrix(true,true);
   model.getWorldQuaternion(parentRotation);axis.set(1,0,0).applyQuaternion(parentRotation);
   joints.forEach((bone,i)=>{
    base[i].copy(bone.quaternion);
    bone.parent.getWorldQuaternion(parentRotation).invert();
    localAxis.copy(axis).applyQuaternion(parentRotation).normalize();
    // Eyes contribute to gaze; the neck and shoulder need not copy the
    // full camera angle, especially when looking down at a nearby table.
    const angle=bone===head?THREE.MathUtils.clamp(pitch*.72,-.72,.72):pitch*.7*held;
    bone.quaternion.premultiply(turn.setFromAxisAngle(localAxis,-angle));
   });
   applied=true;
   return pitch*.7*held;
  },
 };
}
export async function createShowroomAvatar(){
 const gltf=await asset(),model=cloneAvatar(gltf.scene);model.name='showroom-player-character';model.scale.setScalar(.75);model.position.y=-1.65;model.rotation.y=Math.PI;
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const socket=model.getObjectByName('CardSocketR')||model.getObjectByName('CardSocket.R');
 const look=createAvatarLookPose(model);
 let moving=false,speed=0,handPitch=0,holdBlend=0,walkBlend=0;
 for(const [name,action] of actions){action.play().setEffectiveWeight(0);if(name.startsWith('Jump'))action.paused=true;}
 return {model,socket,get handPitch(){return handPitch;},update(dt,velocity,holding,pitch=0,locomotion={}){
  look.restore();
  speed+=(Math.min(velocity,5)-speed)*(1-Math.exp(-dt*14));moving=speed>(moving?.045:.10);
  const blend=1-Math.exp(-dt*16);holdBlend+=((holding?1:0)-holdBlend)*blend;walkBlend+=((moving?1:0)-walkBlend)*blend;
  const crouch=THREE.MathUtils.clamp(locomotion.crouch||0,0,1),time=locomotion.jumpTime??-1;
  const airborne=time>=0&&time<=1.1;
  const jumpWeight=airborne?Math.min(1,time/.06,(1.1-time)/.1):0;
  for(const [name,action] of actions){
   const held=name.includes('Hold_Right'),holdWeight=held?holdBlend:1-holdBlend;
   if(name.startsWith('Jump')){action.time=THREE.MathUtils.clamp(time,0,1.1);action.setEffectiveWeight(jumpWeight*holdWeight);continue;}
   const duck=name.startsWith('Crouch'),walk=name.includes('Walk');
   action.setEffectiveWeight((1-jumpWeight)*holdWeight*(duck?crouch:1-crouch)*(walk?walkBlend:1-walkBlend));
   action.setEffectiveTimeScale(walk?THREE.MathUtils.clamp(speed/(duck?.65:.85),.55,1.8):1);
  }
  model.userData.animation=airborne?(holding?'Jump_Hold_Right':'Jump'):(crouch>.5?'Crouch'+(moving?'_Walk':'')+(holding?'_Hold_Right':''):(moving?(holding?'Walk_Hold_Right':'Walk'):(holding?'Hold_Right':'Neutral')));
  mixer.update(dt);handPitch=look.apply(dt,pitch,holding);
 },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});model.removeFromParent();}};
}
