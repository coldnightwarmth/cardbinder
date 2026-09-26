import test from 'node:test';
import assert from 'node:assert/strict';
import {Showroom,INACTIVE_MS} from '../src/showroom.js';
import {freshRoom} from '../src/showroom-state.js';
function fixture(){
 const player={id:'idle',pose:{x:0,y:1.72,z:3.5,yaw:0,pitch:0,room:'showroom'},lastActive:Date.now()-INACTIVE_MS-1,lastMove:0,seen:[]};
 const messages=[],alarms=[];const ws={deserializeAttachment:()=>structuredClone(player),serializeAttachment:p=>Object.assign(player,p),send:data=>messages.push(JSON.parse(data))};
 const server=Object.create(Showroom.prototype);server.room=freshRoom();server.ctx={getWebSockets:()=>[ws],storage:{put:async()=>{},setAlarm:async t=>alarms.push(t)}};return {server,ws,player,messages,alarms};
}
test('idle players despawn, held cards return, and placed cards stay shared',async()=>{
 const {server,player,messages}=fixture();server.room.cards={held:{holder:'idle'},placed:{holder:null,slot:0}};
 await server.alarm();assert.equal(player.inactive,true);assert.equal(server.snapshot().players.length,0);assert.equal(server.room.cards.held,undefined);assert.ok(server.room.cards.placed);assert.ok(messages.some(m=>m.type==='leave'));
});
test('fresh activity revives an idle player and schedules the next timeout',async()=>{
 const {server,player,ws,alarms}=fixture();await server.alarm();await server.webSocketMessage(ws,JSON.stringify({type:'activity'}));assert.equal(player.inactive,false);assert.equal(server.snapshot().players.length,1);assert.ok(alarms.at(-1)>=Date.now()+INACTIVE_MS-100);
});
test('duplicate poses do not keep idle players alive, changed poses do',async()=>{
 const {server,player,ws}=fixture();const before=player.lastActive;await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:player.pose}));assert.equal(player.lastActive,before);
 player.lastMove=0;await server.webSocketMessage(ws,JSON.stringify({type:'pose',pose:{...player.pose,x:.1}}));assert.ok(player.lastActive>before);
});
test('inactivity scheduling preserves an earlier ritual alarm',async()=>{
 const {server,alarms,player}=fixture();player.lastActive=Date.now();server.room.ritual={startedAt:Date.now()};await server.scheduleAlarm();assert.ok(alarms.at(-1)<Date.now()+INACTIVE_MS);
});
