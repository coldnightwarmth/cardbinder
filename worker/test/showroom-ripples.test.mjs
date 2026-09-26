import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
globalThis.matchMedia=()=>({matches:false});
const source=(await readFile(new URL('../../showroom-ripples.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('../../vendor/three.module.js',import.meta.url).href}'`);
const {createShowroomRipples}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('local and remote footsteps have independent histories and share bounded ripple storage',()=>{
 const r=createShowroomRipples(),position=(x,z)=>({position:{x,z}});
 r.update(0,position(0,0));r.update(0,position(10,0),'peer');
 r.update(100,position(.2,0));r.update(100,position(10.2,0),'peer');
 assert.equal(r.steps.filter(s=>s.w===1).length,2);
 assert.equal(r.steps.length,16);
 const count=r.steps.filter(s=>s.w===1).length;
 r.update(200,position(10.2,0),'peer');assert.equal(r.steps.filter(s=>s.w===1).length,count);
 r.forget('peer');r.update(300,position(20,0),'peer');assert.equal(r.steps.filter(s=>s.w===1).length,count);
});
