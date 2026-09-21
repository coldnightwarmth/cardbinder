import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../../showroom-sky.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('../../vendor/three.module.min.js',import.meta.url).href}'`);
const {createShowroomSky}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('lightning sequences overlap across separate sky directions and respect reduced motion',()=>{
 const random=Math.random,media=globalThis.matchMedia;
 const preference={matches:false};Math.random=()=>.2;globalThis.matchMedia=()=>preference;
 try {
  const sky=createShowroomSky(),u=sky.object.material.uniforms;
  sky.update(100);sky.update(2500);sky.update(2600);
  assert(u.flashes.value[0]>0);
  sky.update(2916);sky.update(3016);
  assert(u.flashes.value[0]>0 && u.flashes.value[1]>0);
  assert(u.flashDirections.value[0].angleTo(u.flashDirections.value[1])>.5);
  sky.update(4300);assert(u.flashes.value.every(value=>value===0));
  sky.update(6076);sky.update(6176);assert(u.flashes.value.some(value=>value>0));
  preference.matches=true;sky.update(6200);assert(u.flashes.value.every(value=>value===0));
 } finally {Math.random=random;globalThis.matchMedia=media;}
});
