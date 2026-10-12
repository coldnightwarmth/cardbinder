import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import {createSceneIndex} from '../../showroom-scene-index.mjs';

test('scene index follows nested additions, removals and room transfers without per-frame tree walks',()=>{
 const scene=new THREE.Scene(),room=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry());
 group.userData.excludeFloorReflection=true;group.add(mesh);scene.add(group);
 const added=[],index=createSceneIndex(scene,o=>added.push(o)),roomIndex=createSceneIndex(room);
 assert.deepEqual([...index.renderables],[mesh]);assert.deepEqual([...index.reflectionExcluded],[group]);
 const hand=new THREE.Group(),card=new THREE.Mesh(new THREE.PlaneGeometry());group.add(hand);hand.add(card);
 assert.equal(index.renderables.has(card),true);assert.equal(added.filter(o=>o===card).length,1);
 room.add(group);
 assert.equal(index.renderables.size,0);assert.equal(index.reflectionExcluded.size,0);assert.equal(roomIndex.renderables.size,2);
 const back=new THREE.Mesh(new THREE.PlaneGeometry());hand.add(back);
 assert.equal(index.renderables.has(back),false);assert.equal(roomIndex.renderables.has(back),true);
 group.remove(hand);assert.equal(roomIndex.renderables.size,1);assert.equal(roomIndex.objects.has(back),false);
 scene.add(hand);assert.equal(index.renderables.has(card),true);assert.equal(index.renderables.has(back),true);
 const original=card.material;card.material=new THREE.MeshStandardMaterial();assert.notEqual([...index.renderables].find(o=>o===card).material,original);
 index.dispose();roomIndex.dispose();assert.equal(index.objects.size,0);assert.equal(roomIndex.objects.size,0);
 hand.add(new THREE.Mesh());assert.equal(index.renderables.size,0,'disposed indices no longer retain new objects');
});
