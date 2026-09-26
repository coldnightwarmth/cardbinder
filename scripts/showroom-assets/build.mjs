import * as THREE from '../../vendor/three.module.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,dedup,draco,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=root+'assets/models/showroom-optimized/';await mkdir(out,{recursive:true});
const stats=[];
for(const [name,path,ratio] of [['gremlin','assets/models/table-display/thumbsup-grem.glb',60000/695096],['frame','assets/models/showroom-dratini/frame.glb',140000/1147771]]){
 for(const [level,mult] of [['near',1],['far',.16]]){
  const doc=await io.read(root+path);
  if(name==='gremlin')for(const m of doc.getRoot().listMaterials()){m.setBaseColorTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null);}
  if(name==='frame')for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){p.setAttribute('NORMAL',null);p.setAttribute('TEXCOORD_0',null);}
  await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:ratio*mult,error:level==='near'?.002:.01}),dedup(),prune());
  if(name==='frame')for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(p.getAttribute('POSITION').getArray(),3));
   if(p.getIndices())geometry.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(),1));
   geometry.computeVertexNormals();
   p.setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(geometry.getAttribute('normal').array));
  }
  await doc.transform(textureCompress({encoder:(await import('sharp')).default,targetFormat:'webp',resize:[512,512]}));
  let triangles=0,vertices=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;vertices+=p.getAttribute('POSITION').getCount();}
  await doc.transform(draco({method:'edgebreaker',quantizePosition:16,quantizeNormal:12}));
  const file=`${name}-${level}.glb`;await io.write(out+file,doc);const bytes=(await stat(out+file)).size;stats.push({file,triangles,vertices,bytes});console.log(stats.at(-1));
 }
}
await writeFile(out+'metrics.json',JSON.stringify(stats,null,2)+'\n');
