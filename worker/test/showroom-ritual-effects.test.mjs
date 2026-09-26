import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {freshRoom,applyAction,finishRitual,expireWallArt,ritualRecipe,RITUAL_MS,WALL_ART_MS} from '../src/showroom-state.js';
import {DRIFELLA_IDS,PIXEL_MOSAIC_IDS} from '../src/showroom-ritual-catalog.js';
import {CARD_NFT_2S} from '../../cardnft2-data.js';
import {CARD_NFT_2_TRAITS} from '../../cardnft2-traits.js';
import {Showroom} from '../src/showroom.js';
const drif1='limited:group-36e830340c9bb833e5079f35',drif2='limited:group-3784ca9cd8fb6e3e37458295';
const cards=ids=>ids.map(stableId=>({stableId,origin:{collectionId:stableId.split(':')[0]}}));
const recipe=ids=>ritualRecipe(cards(ids));
const mosaic=[...PIXEL_MOSAIC_IDS].slice(0,3),clear=['clear:one','clear:two','clear:three'];
function ritual(ids,startedAt=1000){
 const room=freshRoom();cards(ids).forEach((card,slot)=>{const c=applyAction(room,`p${slot}`,{type:'borrow',card},startedAt-2);applyAction(room,`p${slot}`,{type:'place',slot,id:c.id},startedAt-1);});
 applyAction(room,'p0',{type:'ritual'},startedAt);return room;
}

test('Drif triptych matches the requested combinations, including repeated Drifellas',()=>{
 for(const ids of [['poncho:card-1','poncho:card-2','poncho:card-3'],[drif1,drif2,'poncho:card-3'],[drif1,drif1,drif1],['cardnft1:card-1',drif1,'cardnft2:card-2'],['cardnft2:card-1','poncho:card-2','cardnft1:card-2']])assert.equal(recipe(ids),'drif-triptych');
 for(const ids of [[drif1,'cardnft1:card-1','cardnft2:card-2'],['cardnft1:card-1',drif1,'playcards:card-1'],[drif1,'limited:group-da0fde553a79aec08fffe4f1',drif2],[]])assert.equal(recipe(ids),null);
 assert.equal(DRIFELLA_IDS.size,209);
});
test('clear and mosaic rituals require three matching cards and authoritative rarity metadata',()=>{
 assert.equal(recipe(clear),'native');assert.equal(recipe(mosaic),'quarter');
 assert.equal(recipe([clear[0],clear[1],mosaic[0]]),null);
 assert.equal(recipe([mosaic[0],mosaic[1],'cardnft2:card-1']),null);
 for(let i=0;i<CARD_NFT_2S.length;i++)assert.equal(PIXEL_MOSAIC_IDS.has(CARD_NFT_2S[i].stableId),CARD_NFT_2_TRAITS[i].entries.some(e=>e.category.toLowerCase()==='rarity'&&e.value.toLowerCase()==='pixel mosaic'));
});
test('wall summon begins after the animation, survives storage/rejoin, renews, and expires exactly one hour later',()=>{
 let room=ritual([drif1,drif2,'poncho:card-1']);
 assert.equal(finishRitual(room,1000+RITUAL_MS-1),false);assert.equal(room.wallArt,null);
 assert.equal(finishRitual(room,1000+RITUAL_MS),true);
 assert.deepEqual(room.slots,[null,null,null]);assert.deepEqual(room.cards,{});
 room=JSON.parse(JSON.stringify(room));assert.equal(room.wallArt.kind,'drif-triptych');
 const expiry=1000+RITUAL_MS+WALL_ART_MS;assert.equal(room.wallArt.expiresAt,expiry);
 assert.equal(expireWallArt(room,expiry-1),false);assert.equal(expireWallArt(room,expiry),true);assert.equal(room.wallArt,null);
 const next=ritual([drif1,drif2,'poncho:card-1'],20000);next.wallArt={kind:'drif-triptych',expiresAt:30000};finishRitual(next,20000+RITUAL_MS);assert.equal(next.wallArt.expiresAt,20000+RITUAL_MS+WALL_ART_MS);
});
test('camera effects target only active players inside at completion and preserve wall art',()=>{
 for(const [ids,mode] of [[clear,'native'],[mosaic,'quarter']]){
  const room=ritual(ids);room.wallArt={kind:'drif-triptych',expiresAt:100000};
  finishRitual(room,1000+RITUAL_MS,[{id:'inside',pose:{room:'cube'}},{id:'outside',pose:{room:'showroom'}},{id:'idle',inactive:true,pose:{room:'cube'}}]);
  assert.equal(room.lastRitualEffect.kind,mode);assert.deepEqual(room.lastRitualEffect.recipients,['inside']);assert.equal(room.wallArt.expiresAt,100000);
  assert.equal(finishRitual(room,99999),false);
 }
});
test('server alarm persists the result and schedules wall expiry even with nobody online',async()=>{
 const server=Object.create(Showroom.prototype),times=[],messages=[];let stored;
 server.room=ritual([drif1,drif2,'poncho:card-1'],Date.now()-RITUAL_MS-10);
 server.ctx={getWebSockets:()=>[],storage:{put:async(key,value)=>{stored=structuredClone(value);},setAlarm:async time=>times.push(time)}};
 server.broadcast=message=>messages.push(message);await server.alarm();
 assert.equal(stored.wallArt.kind,'drif-triptych');assert.equal(times.at(-1),stored.wallArt.expiresAt);assert.equal(messages.at(-1).room.wallArt.kind,'drif-triptych');
});
const source=readFileSync(new URL('../../showroom-ritual-effects.js',import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('export function createRitualCameraState'),source.indexOf('export function createShowroomRitualEffects')).replaceAll('export ',''),context);
test('camera setting persists across later unrelated rituals, replaces, and resets on refresh',()=>{
 const changes=[],state=context.createRitualCameraState(mode=>changes.push(mode));
 const effect={id:1,kind:'native',recipients:['a']};state.sync(effect,'a');state.sync(effect,'a');assert.deepEqual(changes,['native']);
 state.sync({id:2,kind:'quarter',recipients:['b']},'a');assert.equal(state.mode,'native');
 state.sync({id:3,kind:'quarter',recipients:['a']},'a');assert.equal(state.mode,'quarter');
 const refreshed=context.createRitualCameraState(()=>assert.fail('late/refresh must not inherit camera effect'));refreshed.sync(effect,'new-session');assert.equal(refreshed.mode,null);
 assert.equal(context.ritualPixelRatio('native',2,.6),2);assert.equal(context.ritualPixelRatio('quarter',2,.75),.5);assert.equal(context.ritualPixelRatio(null,2,.6),.6);
});
