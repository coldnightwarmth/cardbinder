import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as THREE from '../../vendor/three.module.min.js';

test('binder outline retains local dimensions and follows rotated binder pose',()=>{
 const source=readFileSync(new URL('../../showroom.js',import.meta.url),'utf8');
 const start=source.indexOf('  function fitBinderOutline('),end=source.indexOf('\n  }',start)+4;
 const outline=new THREE.Group(),outlineBounds=new THREE.Box3();
 const context=vm.createContext({outline,outlineBounds,outlineInverse:new THREE.Matrix4(),outlineTransform:new THREE.Matrix4(),outlineMeshBounds:new THREE.Box3()});
 vm.runInContext(source.slice(start,end),context);
 const group=new THREE.Group();group.position.set(3,.838,-12);group.rotation.set(-Math.PI/2,-1.1,0,'YXZ');
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1.4,.1));mesh.position.x=.03;group.add(mesh);
 const pages=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,1,.02),new THREE.MeshBasicMaterial(),2);
 pages.position.x=-.5;
 pages.setMatrixAt(0,new THREE.Matrix4().makeTranslation(.55,0,0));
 pages.setMatrixAt(1,new THREE.Matrix4().makeTranslation(.55,0,.02));
 group.add(pages);
 const hidden=new THREE.Group();hidden.visible=false;hidden.add(new THREE.Mesh(new THREE.BoxGeometry(10,10,10)));group.add(hidden);
 context.fitBinderOutline(group);
 assert(outline.quaternion.angleTo(group.quaternion)<1e-7);
 assert(outline.position.distanceTo(group.position)<1e-9);
 assert(outlineBounds.getSize(new THREE.Vector3()).distanceTo(new THREE.Vector3(1.016,1.416,.116))<1e-6);
 assert(Math.abs(outlineBounds.getCenter(new THREE.Vector3()).x-.03)<1e-8);
});
