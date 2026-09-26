import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
const source=readFileSync(new URL('../../showroom-avatar.js',import.meta.url),'utf8');
test('avatar clones share geometry but own their skeleton and pose',()=>{
 const context=vm.createContext({THREE});vm.runInContext(source.slice(source.indexOf('export function cloneAvatar'),source.indexOf('export async')).replace('export ',''),context);
 const root=new THREE.Group(),bone=new THREE.Bone();root.add(bone);const geometry=new THREE.BoxGeometry();const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());root.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 const a=context.cloneAvatar(root),b=context.cloneAvatar(root);assert.equal(a.children[1].geometry,geometry);assert.notEqual(a.children[1].skeleton,b.children[1].skeleton);assert.equal(a.children[1].skeleton.bones[0],a.children[0]);a.children[0].rotation.x=1;assert.ok(Math.abs(b.children[0].rotation.x)<1e-9);assert.equal(bone.rotation.x,0);
});
test('shipped character includes four skinned clips, texture, and right-hand socket',()=>{
 const bytes=readFileSync(new URL('../../assets/models/showroom-character/blue-fin-character.glb',import.meta.url));const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Hold_Right','Neutral','Walk','Walk_Hold_Right']);assert.ok(gltf.skins.length);assert.ok(gltf.images.length);assert.ok(gltf.nodes.some(n=>n.name==='CardSocket.R'));for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){assert.ok(primitive.attributes.JOINTS_0!==undefined);assert.ok(primitive.attributes.WEIGHTS_0!==undefined);}
});
