import test from 'node:test';
import assert from 'node:assert/strict';
import {sealPoint} from '../../minotewip/seal.js';

test('peel preserves sticker strip length and its glued back portion',()=>{
 for(const progress of [0,.1,.3,.5,.8,1]){
  let length=0,previous=sealPoint(0,progress,1.29,.0158);
  for(let i=1;i<=2000;i++){
   const point=sealPoint(i/2000,progress,1.29,.0158);
   length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;
  }
  assert.ok(Math.abs(length-.56)<.00001);
  assert.deepEqual(sealPoint(.8,progress,1.29,.0158),sealPoint(.8,0,1.29,.0158));
 }
});
test('sealed sticker continuously wraps outside the edge from back to front',()=>{
 const back=sealPoint(.605,0,1.29,.0158);
 const middle=sealPoint(.605-Math.PI*(.0158+.007)/4/.56,0,1.29,.0158);
 const front=sealPoint(.2,0,1.29,.0158);
 assert.equal(back.z,-.0035);assert.ok(middle.x>1.29);
 assert.ok(middle.z>back.z&&middle.z<front.z);
 assert.ok(Math.abs(front.z-(.0158+.0035))<1e-12);
});
