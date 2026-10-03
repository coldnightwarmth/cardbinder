import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';

const source=readFileSync(new URL('../../minotewip/folder.js',import.meta.url),'utf8');
function section(start,end){
 const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from);return source.slice(from,to);
}
function makeSheet(side){
 const context=vm.createContext({THREE,pockets:[],
  green:new THREE.MeshStandardMaterial(),paper:new THREE.MeshStandardMaterial(),
  cutEdge:new THREE.MeshStandardMaterial(),foldGreen:new THREE.MeshStandardMaterial({side:THREE.DoubleSide})});
 vm.runInContext(section('const CARD_W=',"const fiberCanvas="),context);
 vm.runInContext(section('function faceGeometry(', 'sheet(left,-1);'),context);
 const group=new THREE.Group();context.sheet(group,side);group.updateMatrixWorld(true);
 return group;
}

test('each paper leaf has only one visible surface on each side, with no hidden extrusion caps',()=>{
 const ray=new THREE.Raycaster();
 for(const side of [-1,1]){
  const group=makeSheet(side);
  for(const direction of [-1,1])for(let i=0;i<50;i++){
   const x=side*(.01+(i+.31)/50*1.265),y=.05+((i*17)%49)/49*.81;
   ray.set(new THREE.Vector3(x,y,-direction),new THREE.Vector3(0,0,direction));
   const hits=ray.intersectObject(group,true);
   assert.equal(hits.length,1,`side ${side}, viewing direction ${direction}, x=${x}, y=${y}`);
  }
 }
});

test('the curved paper tab and green border share a continuous edge without overlapping faces',()=>{
 const ray=new THREE.Raycaster();
 for(const side of [-1,1]){
  const group=makeSheet(side);
  // Inspect the actual inner planar faces independently of the pocket in front.
  const inner=group.children.filter(mesh=>mesh.geometry.type==='ShapeGeometry'&&Math.abs(mesh.position.z-.0009)<1e-8);
  assert.equal(inner.length,2);
  for(let i=0;i<120;i++){
   const x=side*(1.225+(i+.27)/120*.06),y=-.348+((i*37)%119)/119*.021;
   ray.set(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1));
   assert.equal(ray.intersectObjects(inner).length,1,`The liner/border must cover each point exactly once: ${x}, ${y}`);
  }
 }
});
