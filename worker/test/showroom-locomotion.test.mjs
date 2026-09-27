import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerticalMovement} from '../../showroom-locomotion.mjs';
test('crouch eases down and returns to standing without drift',()=>{
 const m=createVerticalMovement();let y;
 for(let i=0;i<120;i++)y=m.update(1/60,true);
 assert(Math.abs(y-1.45)<1e-6);
 for(let i=0;i<120;i++)y=m.update(1/60,false);
 assert(Math.abs(y-1.65)<1e-6);
});
test('jump is frame-rate independent, cannot double jump, and lands on the floor',()=>{
 for(const dt of [1/30,1/60,1/144]){
  const m=createVerticalMovement();assert(m.jump());assert(!m.jump());let peak=0,y;
  for(let i=0;i<Math.ceil(2/dt);i++){y=m.update(dt,false);peak=Math.max(peak,y);}
  assert(Math.abs(peak-(1.65+2/3))<.005);assert.equal(y,1.65);assert(m.jump());
 }
});
test('jumping from crouch does not stick below the floor or in the air',()=>{
 const m=createVerticalMovement();for(let i=0;i<60;i++)m.update(1/60,true);
 m.jump();let y;for(let i=0;i<180;i++)y=m.update(1/60,true);
 assert(Math.abs(y-1.45)<1e-6);
});
