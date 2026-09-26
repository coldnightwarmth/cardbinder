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
export async function createShowroomAvatar(){
 const gltf=await asset(),model=cloneAvatar(gltf.scene);model.name='showroom-player-character';model.scale.setScalar(.66);model.position.y=-1.72;model.rotation.y=Math.PI;
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const socket=model.getObjectByName('CardSocketR')||model.getObjectByName('CardSocket.R');
 let current='',moving=false,speed=0;
 return {model,socket,update(dt,velocity,holding){
  speed+=(Math.min(velocity,5)-speed)*(1-Math.exp(-dt*14));moving=speed>(moving?.045:.10);
  const name=moving?(holding?'Walk_Hold_Right':'Walk'):(holding?'Hold_Right':'Neutral');
  if(name!==current){const previous=actions.get(current),next=actions.get(name);next.reset().setEffectiveWeight(1).play();if(previous)next.crossFadeFrom(previous,.18,false);current=name;model.userData.animation=name;}
  const action=actions.get(current);action.setEffectiveTimeScale(moving?THREE.MathUtils.clamp(speed/.85,.6,1.8):1);mixer.update(dt);
 },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});model.removeFromParent();}};
}
