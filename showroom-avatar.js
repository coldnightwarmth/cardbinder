import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
let assetPromise;
function asset(){return assetPromise ||= new GLTFLoader().loadAsync(new URL('./assets/models/showroom-character/blue-fin-character.glb?v=4',import.meta.url).href).catch(error=>{assetPromise=null;throw error;});}
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
    const angle=bone===head?THREE.MathUtils.clamp(pitch,-.85,.85):pitch*held;
    bone.quaternion.premultiply(turn.setFromAxisAngle(localAxis,-angle));
   });
   applied=true;
   return pitch*held;
  },
 };
}
export async function createShowroomAvatar(){
 const gltf=await asset(),model=cloneAvatar(gltf.scene);model.name='showroom-player-character';model.scale.setScalar(.66);model.position.y=-1.72;model.rotation.y=Math.PI;
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const socket=model.getObjectByName('CardSocketR')||model.getObjectByName('CardSocket.R');
 const look=createAvatarLookPose(model);
 let current='',moving=false,speed=0,handPitch=0;
 return {model,socket,get handPitch(){return handPitch;},update(dt,velocity,holding,pitch=0){
  look.restore();
  speed+=(Math.min(velocity,5)-speed)*(1-Math.exp(-dt*14));moving=speed>(moving?.045:.10);
  const name=moving?(holding?'Walk_Hold_Right':'Walk'):(holding?'Hold_Right':'Neutral');
  if(name!==current){const previous=actions.get(current),next=actions.get(name);next.reset().setEffectiveWeight(1).play();if(previous)next.crossFadeFrom(previous,.18,false);current=name;model.userData.animation=name;}
  const action=actions.get(current);action.setEffectiveTimeScale(moving?THREE.MathUtils.clamp(speed/.85,.6,1.8):1);mixer.update(dt);handPitch=look.apply(dt,pitch,holding);
 },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});model.removeFromParent();}};
}
