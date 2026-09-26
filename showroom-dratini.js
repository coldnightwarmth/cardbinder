import * as THREE from 'three';
import { createExhibitLOD } from './showroom-exhibit-lod.js?v=1';

const SHOWROOM_CLEAR_FRAME_TRANSMISSION = 0.97;

// Standalone exhibit: the GLB embeds the same V19 clear-resin physical
// material (transmission, IOR and clearcoat) as the individual Clear Cards.
export async function createShowroomDratini(renderer, environment) {
  const base = new URL('./assets/models/showroom-dratini/', import.meta.url);
  const textures = new THREE.TextureLoader();
  const [frame,front,back]=await Promise.all([
    createExhibitLOD('frame',model=>{
      model.traverse(object=>{
        if(!object.isMesh)return;
        for(const material of [].concat(object.material)){
          material.envMap=environment;material.envMapIntensity=1;
          material.envMapRotation.set(0,THREE.MathUtils.degToRad(121),0);
          if(material.transmission>0)material.transmission=SHOWROOM_CLEAR_FRAME_TRANSMISSION;
        }
      });
    }),
    textures.loadAsync(new URL('front.webp',base).href),
    textures.loadAsync(new URL('back.jpg',base).href),
  ]);
  const root=new THREE.Group();root.name='showroom-dratini-display';root.add(frame);
  frame.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [].concat(object.material)) {
      material.envMap = environment;
      material.envMapIntensity = 1;
      material.envMapRotation.set(0, THREE.MathUtils.degToRad(121), 0);
      if (material.isMeshPhysicalMaterial && material.transmission > 0) {
        material.transmission = SHOWROOM_CLEAR_FRAME_TRANSMISSION;
        material.needsUpdate = true;
      }
    }
  });
  for (const texture of [front, back]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    renderer.initTexture(texture);
  }
  // Slight overlap beneath the frame lips prevents a gap around the insert.
  const width = 1.61, height = width * 840 / 600, depth = .014;
  const edge = new THREE.MeshStandardMaterial({color:0xded9cb, roughness:.85});
  const card = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
    edge, edge, edge, edge,
    new THREE.MeshStandardMaterial({map:front, roughness:.72}),
    new THREE.MeshStandardMaterial({map:back, roughness:.72}),
  ]);
  card.name = 'dratini-card-insert';
  card.position.set(.025, -.015, -.26);
  root.add(card);
  root.scale.setScalar(.14);
  const bounds = new THREE.Box3().setFromObject(root);
  // The frame's feet rest on the table rather than its centered GLB origin.
  root.userData.tableHeightOffset = -bounds.min.y;
  return root;
}
