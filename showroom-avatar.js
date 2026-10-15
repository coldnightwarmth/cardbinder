import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createAvatarAppearance} from './drifmaker-avatar.mjs?v=10';
import {normalizePose,normalizePoseTime} from './drifmaker-poses.mjs?v=3';
let assetPromise;
function asset(){return assetPromise ||= new GLTFLoader().loadAsync(new URL('./assets/models/drifmaker/drifella-customizable.glb?v=10',import.meta.url).href).catch(error=>{assetPromise=null;throw error;});}
// Geometry and textures are shared; each visitor owns their bones and any
// recolored materials. Wardrobe pieces on the same skin reuse that visitor's skeleton.
export function cloneAvatar(source){
 const clone=source.clone(true),lookup=new Map(),skeletons=new Map();
 function pair(a,b){lookup.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);}pair(source,clone);
 source.traverse(original=>{if(!original.isSkinnedMesh)return;const mesh=lookup.get(original);if(!skeletons.has(original.skeleton)){const skeleton=original.skeleton.clone();skeleton.bones=original.skeleton.bones.map(bone=>lookup.get(bone));skeletons.set(original.skeleton,skeleton);}mesh.bind(skeletons.get(original.skeleton),original.bindMatrix);mesh.frustumCulled=false;});
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
   // World-orientation queries update their ancestor chains. Descendant meshes
   // and the rest of the skeleton can wait for the renderer's matrix update.
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
export async function createShowroomAvatar({appearance}={}){
 const gltf=await asset(),model=cloneAvatar(gltf.scene);model.name='showroom-player-character';model.scale.setScalar(.75);model.position.y=-1.65;model.rotation.y=Math.PI;
 const wardrobe=createAvatarAppearance(model);wardrobe.setAppearance(appearance);
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const socket=model.getObjectByName('CardSocketR')||model.getObjectByName('CardSocket.R');
 const look=createAvatarLookPose(model);
 let moving=false,speed=0,handPitch=0,holdBlend=0,walkBlend=0;
 let selectedPose='',poseTime=0,staticPose=false,staticHold=false;
 for(const [name,action] of actions){action.play().setEffectiveWeight(0);if(name.startsWith('Jump')||name.startsWith('Pose_'))action.paused=true;}
 function setPose(id,{static:freeze=false,time=0,holding=false}={}){
  look.restore();selectedPose=normalizePose(id);poseTime=freeze?2:normalizePoseTime(time);staticPose=freeze;
  staticHold=freeze&&holding;
  if(!selectedPose){speed=0;moving=false;holdBlend=0;walkBlend=0;for(const action of actions.values())action.time=0;}
 }
 return {model,socket,setPose,get pose(){return selectedPose;},get appearance(){return wardrobe.appearance;},async setAppearance(value){return wardrobe.setAppearance(value);},get handPitch(){return handPitch;},update(dt,velocity,holding,pitch=0,locomotion={}){
  look.restore();
  if(Object.hasOwn(locomotion,'emote')){selectedPose=normalizePose(locomotion.emote);poseTime=normalizePoseTime(locomotion.emoteTime);}
  else if(selectedPose&&!staticPose)poseTime=normalizePoseTime(poseTime+Math.max(0,dt));
  if(selectedPose){
   const name=`Pose_${selectedPose}`,chosen=actions.get(name);
   if(chosen){
    for(const [key,action] of actions)action.setEffectiveWeight(key===name?1:0);
    chosen.time=Math.min(poseTime,chosen.getClip().duration);mixer.update(0);handPitch=0;
    model.userData.animation=name;return;
   }
  }
  if(staticHold){dt=0;velocity=0;holding=true;holdBlend=1;walkBlend=0;speed=0;for(const action of actions.values())action.time=0;}
  speed+=(Math.min(velocity,5)-speed)*(1-Math.exp(-dt*14));moving=speed>(moving?.045:.10);
  const blend=1-Math.exp(-dt*16);holdBlend+=((holding?1:0)-holdBlend)*blend;walkBlend+=((moving?1:0)-walkBlend)*blend;
  const crouch=THREE.MathUtils.clamp(locomotion.crouch||0,0,1),time=locomotion.jumpTime??-1;
  const airborne=time>=0&&time<=1.1;
  const jumpWeight=airborne?Math.min(1,time/.06,(1.1-time)/.1):0;
  for(const [name,action] of actions){
   if(name.startsWith('Pose_')){action.setEffectiveWeight(0);continue;}
   const held=name.includes('Hold_Right'),holdWeight=held?holdBlend:1-holdBlend;
   if(name.startsWith('Jump')){action.time=THREE.MathUtils.clamp(time,0,1.1);action.setEffectiveWeight(jumpWeight*holdWeight);continue;}
   const duck=name.startsWith('Crouch'),walk=name.includes('Walk');
   action.setEffectiveWeight((1-jumpWeight)*holdWeight*(duck?crouch:1-crouch)*(walk?walkBlend:1-walkBlend));
   action.setEffectiveTimeScale(walk?THREE.MathUtils.clamp(speed/(duck?.65:.85),.55,1.8):1);
  }
  model.userData.animation=airborne?(holding?'Jump_Hold_Right':'Jump'):(crouch>.5?'Crouch'+(moving?'_Walk':'')+(holding?'_Hold_Right':''):(moving?(holding?'Walk_Hold_Right':'Walk'):(holding?'Hold_Right':'Neutral')));
  mixer.update(dt);handPitch=look.apply(dt,pitch,holding);
 },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);wardrobe.dispose();const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();model.removeFromParent();}};
}
