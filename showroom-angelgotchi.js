import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';

export async function createShowroomAngelgotchi() {
  const draco=new DRACOLoader().setDecoderPath(new URL('./vendor/draco/r165/',import.meta.url).href);
  draco.setWorkerLimit(1);
  let model;
  try {
    model=(await new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('./assets/models/table-display/angelgotchi.glb?v=table-display-1',import.meta.url).href)).scene;
  } finally {draco.dispose();}
  // Match the table-view model's upright orientation while preserving its materials.
  const materials=new Set();
  model.traverse(object=>{
    if(object.isMesh)for(const material of [].concat(object.material))materials.add(material);
  });
  for(const material of materials)material.color?.multiplyScalar(.88);
  model.rotation.x=-Math.PI/2;
  let bounds=new THREE.Box3().setFromObject(model);
  model.scale.setScalar(.12/bounds.getSize(new THREE.Vector3()).y);
  bounds=new THREE.Box3().setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
  const root=new THREE.Group();root.name='showroom-angelgotchi';root.add(model);
  return root;
}
