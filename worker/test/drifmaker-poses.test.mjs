import test from 'node:test';
import assert from 'node:assert/strict';
import {POSES,createPoseState,normalizePose,normalizePoseTime} from '../../drifmaker-poses.mjs';
import {createPoseBuffer} from '../../showroom-motion.mjs';
test('pose state holds at the endpoint, restarts the same pose, and cancels explicitly',()=>{
 const state=createPoseState();assert.equal(POSES.length,10);
 state.select('salute');assert.deepEqual(state.update(.7),{emote:'salute',emoteTime:.7});
 assert.equal(state.update(80).emoteTime,2);assert.equal(state.update(80).emote,'salute');
 state.select('salute');assert.equal(state.value.emoteTime,0);
 state.cancel();assert.deepEqual(state.value,{emote:'',emoteTime:0});
 for(const bad of [null,{},'__proto__','Pose_salute'])assert.equal(normalizePose(bad),'');
 for(const bad of [NaN,Infinity,'2'])assert.equal(normalizePoseTime(bad),0);
});
test('remote interpolation follows an emote without blending different poses or rewinding a restart',()=>{
 const buffer=createPoseBuffer({delay:0}),base={x:0,y:1.65,z:0,yaw:0,pitch:0,room:'showroom',emote:'salute'};
 buffer.push({...base,emoteTime:.5},1000);buffer.push({...base,emoteTime:.6},1100);
 assert.ok(Math.abs(buffer.sample(1050).emoteTime-.55)<1e-8);
 buffer.push({...base,emote:'bow',emoteTime:0},1200);assert.equal(buffer.sample(1150).emote,'bow');assert.equal(buffer.sample(1150).emoteTime,0);
 buffer.push({...base,emote:'bow',emoteTime:1.5},1300);buffer.push({...base,emote:'bow',emoteTime:0},1400);assert.equal(buffer.sample(1350).emoteTime,0);
});
