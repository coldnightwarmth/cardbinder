import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoseBuffer,remoteHandPose} from '../../showroom-motion.mjs';
const pose=(x,yaw=0,room='showroom')=>({x,y:1.72,z:0,pitch:0,yaw,room});
test('jittered packets yield continuous uniform movement rather than packet-sized easing',()=>{
 const buffer=createPoseBuffer();
 for(const [sent,arrival] of [[0,30],[67,109],[134,165],[201,240]])buffer.push(pose(sent*.003),arrival,sent);
 const points=[170,180,190,200,210].map(time=>buffer.sample(time).x);
 for(let i=1;i<points.length;i++)assert(Math.abs(points[i]-points[i-1]-.03)<1e-9);
});
test('prediction is bounded, stale packets ignored, and portal crossings snap',()=>{
 const b=createPoseBuffer();b.push(pose(0),0,0);b.push(pose(.2),100,100);b.push(pose(20),80,80);
 assert(Math.abs(b.sample(10000).x-.36)<1e-9);
 b.push(pose(0,0,'cube'),200,200);assert.equal(b.sample(200).room,'cube');assert.equal(b.sample(200).x,0);
});
test('yaw crosses the angle seam on the short path',()=>{
 const b=createPoseBuffer({delay:0});b.push(pose(0,Math.PI-.1),0,0);b.push(pose(0,-Math.PI+.1),100,100);
 assert(Math.abs(b.sample(50).yaw-Math.PI)<1e-9);
});
test('fanned cards occupy distinct parallel planes at every hand size',()=>{
 for(let count=1;count<=24;count++){
  const poses=Array.from({length:count},(_,i)=>remoteHandPose(i,count));
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
   assert.equal(poses[i].ry,0);assert.equal(poses[i].rx,poses[j].rx);assert(Number.isFinite(poses[i].rz));
   const separation=Math.abs((poses[i].y-poses[j].y)*Math.sin(.16)+(poses[i].z-poses[j].z)*Math.cos(.16));
   assert(separation>.006*.27);
  }
 }
});
