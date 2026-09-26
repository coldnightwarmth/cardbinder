import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.js';

const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
const context=vm.createContext({THREE});
for(const [start,end] of [
 ['function createRoundedShape(', 'function addPaperNoise('],
 ['function createRoundedCoreGeometry(', 'function createBinderCoverPanelGeometry('],
 ['function stabilizeShowroomDisplayCardDepth(', 'function makeScreensaverCardGroupSolid('],
]) vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),context);

test('pedestal cardboard keeps its edge without dark caps competing with either artwork face',()=>{
 const geometry=context.createRoundedCoreGeometry(2.5,3.5,.022,.12);
 const core=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 const group=new THREE.Group();group.add(core);group.userData.coreMesh=core;
 const ray=new THREE.Raycaster();
 const hits=(origin,direction)=>{ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction));return ray.intersectObject(core).length;};
 assert(hits([0,0,1],[0,0,-1])>0,'ordinary card starts with a front cap');
 assert(hits([0,0,-1],[0,0,1])>0,'ordinary card starts with a back cap');
 context.stabilizeShowroomDisplayCardDepth(group);
 assert.equal(hits([0,0,1],[0,0,-1]),0,'no hidden dark front cap');
 assert.equal(hits([0,0,-1],[0,0,1]),0,'no hidden dark back cap');
 assert(hits([2,0,0],[-1,0,0])>0,'right cardboard edge retained');
 assert(hits([-2,0,0],[1,0,0])>0,'left cardboard edge retained');
 assert(hits([0,2,0],[0,-1,0])>0,'top cardboard edge retained');
 assert(hits([0,-2,0],[0,1,0])>0,'bottom cardboard edge retained');
 geometry.dispose();core.material.dispose();
});
