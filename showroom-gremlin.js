import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export async function createShowroomGremlin() {
  const {scene:model}=await new GLTFLoader().loadAsync(
    new URL('./assets/models/table-display/thumbsup-grem.glb?v=table-display-1',import.meta.url).href,
  );
  const materials=new Map();
  const unusedTextures=new Set();
  model.traverse(object=>{
    if(!object.isMesh)return;
    const convert=source=>{
      if(materials.has(source))return materials.get(source);
      const material=source.clone();
      // Keep the matte orange finish, tempered for the brighter showroom lights.
      for(const texture of [material.map,material.metalnessMap,material.roughnessMap])if(texture)unusedTextures.add(texture);
      material.map=null;material.color.set(0xe99045).multiplyScalar(.72);
      material.metalness=0;material.metalnessMap=null;
      material.roughness=1;material.roughnessMap=null;
      material.emissive?.set(0x000000);
      if('clearcoat' in material)material.clearcoat=0;
      materials.set(source,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
  });
  for(const material of materials.keys())material.dispose();
  const retainedTextures=new Set();
  for(const material of materials.values())for(const value of Object.values(material))if(value?.isTexture)retainedTextures.add(value);
  for(const texture of unusedTextures)if(!retainedTextures.has(texture))texture.dispose();
  let bounds=new THREE.Box3().setFromObject(model);
  model.scale.setScalar(.18/bounds.getSize(new THREE.Vector3()).y);
  bounds=new THREE.Box3().setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
  const root=new THREE.Group();root.name='showroom-thumbsup-gremlin';root.add(model);
  return root;
}
