import test from 'node:test';
import assert from 'node:assert/strict';
import {chatAnchor,chatVisibleThroughDoor} from '../../showroom-chat-projection.mjs';
test('chat maps to the speaker through the door in both directions without inheriting the stencil clip',()=>{
 const front=chatAnchor({x:0,y:1.72,z:-5},'cube',false,-40);
 assert.equal(front.z,-45);assert.equal(chatVisibleThroughDoor({x:0,y:1.72,z:-35},front,false,-40),true);
 const reverse=chatAnchor({x:0,y:1.72,z:-35},'showroom',true,-40);
 assert.equal(reverse.z,5);assert.equal(chatVisibleThroughDoor({x:0,y:1.72,z:-5},reverse,true,-40),true);
 assert.equal(chatVisibleThroughDoor({x:5,y:1.72,z:-35},front,false,-40),false);
 assert.equal(chatVisibleThroughDoor({x:0,y:1.72,z:-46},front,false,-40),false);
});
test('same-room bubbles stay in that room without a doorway visibility constraint',()=>{
 const anchor=chatAnchor({x:4,y:1.72,z:-8},'cube',true,-40);assert.equal(anchor.z,-8);assert.equal(anchor.other,false);
 assert.equal(chatVisibleThroughDoor({x:0,y:1.72,z:-2},anchor,true,-40),true);
});
