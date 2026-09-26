import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';
// One decoder and one serialized upgrade queue for small, showroom-only assets.
const draco=new DRACOLoader().setDecoderPath(new URL('./vendor/draco/r165/',import.meta.url).href).setWorkerLimit(1);
const loader=new GLTFLoader().setDRACOLoader(draco);
let upgrades=Promise.resolve();
export async function createExhibitLOD(name,configure=()=>{}) {
 const load=async level=>{
  const {scene}=await loader.loadAsync(new URL(`./assets/models/showroom-optimized/${name}-${level}.glb`,import.meta.url).href);
  configure(scene);
  scene.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});return scene;
 };
 const root=new THREE.Group(),far=await load('far');root.add(far);
 let near=null,loading=false,retryAt=0,useNear=false;
 root.userData.exhibitLOD={
  update(distance,tier,prepare){
   const threshold=tier===0?2.8:tier===1?4.5:6;
   useNear=distance<threshold+(useNear?.5:0);
   if(useNear&&!near&&!loading&&performance.now()>retryAt){
    loading=true;
    upgrades=upgrades.catch(()=>{}).then(async()=>{
     // Defer parsing/upload until after the current interaction frame.
     await new Promise(resolve=>setTimeout(resolve,100));
     const model=await load('near');
     root.add(model);model.visible=false;root.updateMatrixWorld(true);
     await prepare(model);near=model;
    }).catch(error=>{retryAt=performance.now()+30000;console.warn('Exhibit detail unavailable',error);}).finally(()=>{loading=false;});
   }
   far.visible=!useNear||!near;if(near)near.visible=useNear;
  },
  reflection(){const visible=near?.visible;if(near)near.visible=false;const oldFar=far.visible;far.visible=true;return ()=>{far.visible=oldFar;if(near)near.visible=visible;};},
 };
 return root;
}
// Keep clear silhouettes at a distance without rendering another refraction
// framebuffer. Originals remain on the materials used for close inspection.
export function createExhibitBudget() {
 const exhibits=[],position=new THREE.Vector3();
 function register(group){
  if(exhibits.some(exhibit=>exhibit.group===group))return group;
  const entries=[],seen=new Set();group.traverse(object=>{
   if(!object.isMesh)return;
   const originals=[].concat(object.material),cheap=originals.map(material=>{
    if(!(material.transmission>0))return material;
    const proxy=new THREE.MeshStandardMaterial({color:material.color,roughness:.12,metalness:.15,envMap:material.envMap,envMapIntensity:.65,transparent:true,opacity:.17,depthWrite:false,side:material.side});seen.add(proxy);return proxy;
   });
   if(cheap.some((m,i)=>m!==originals[i]))entries.push({object,original:object.material,cheap:Array.isArray(object.material)?cheap:cheap[0]});
  });
  // Near geometry can arrive later, so register its materials when prepared.
  exhibits.push({group,entries,owned:seen,distant:false});return group;
 }
 function unregister(group){
  for(let i=exhibits.length-1;i>=0;i--){
   const exhibit=exhibits[i];let belongs=false;for(let parent=exhibit.group;parent;parent=parent.parent)if(parent===group)belongs=true;
   if(!belongs)continue;
   for(const entry of exhibit.entries)entry.object.material=entry.original;
   for(const material of exhibit.owned)material.dispose();exhibits.splice(i,1);
  }
 }
 return {register,unregister,
  update(camera,tier,prepare){for(const exhibit of exhibits){
   exhibit.group.getWorldPosition(position);const distance=position.distanceTo(camera.position);
   exhibit.group.traverse(o=>{o.userData.exhibitLOD?.update(distance,tier,async model=>{register(model);await prepare(model);});});
   const threshold=tier===0?2.8:tier===1?4.5:7;
   exhibit.distant=distance>threshold+(exhibit.distant?-.5:0);
   for(const entry of exhibit.entries)entry.object.material=exhibit.distant?entry.cheap:entry.original;
  }},
  reflection(){const restores=[];for(const exhibit of exhibits){
   exhibit.group.traverse(o=>{if(o.userData.exhibitLOD)restores.push(o.userData.exhibitLOD.reflection());});
   for(const entry of exhibit.entries){const previous=entry.object.material;entry.object.material=entry.cheap;restores.push(()=>{entry.object.material=previous;});}
  }return ()=>{for(let i=restores.length-1;i>=0;i--)restores[i]();};},
 };
}
