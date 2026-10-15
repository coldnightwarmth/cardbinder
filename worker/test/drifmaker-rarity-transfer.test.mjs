import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportRarity,importRarity,traitWeight} from '../../drifmaker-rarity.mjs';
test('rarity transfer preserves disabled, boosted, and default weights without character data',()=>{
 const original={hat:{none:0,lavendercowl:250,burgerstack:100}};
 const exported=exportRarity(original);
 assert.deepEqual(Object.keys(exported),['type','version','rarity']);
 const imported=importRarity(JSON.parse(JSON.stringify(exported)));
 assert.equal(traitWeight(imported,'hat','none'),0);
 assert.equal(traitWeight(imported,'hat','lavendercowl'),250);
 assert.equal(traitWeight(imported,'hat','burgerstack'),100);
});
test('empty rarity export resets weights; legacy look exports can supply rarity only',()=>{
 assert.deepEqual(importRarity(exportRarity({})),{});
 assert.deepEqual(importRarity({version:6,appearance:{},rarity:{hat:{lavendercowl:5}}}),{hat:{lavendercowl:5}});
});
test('invalid imports cannot silently clear saved rarity',()=>{
 for(const data of [null,[],{}, {rarity:[]},{type:'other',version:1,rarity:{}},{type:'drifmaker-rarity',version:2,rarity:{}},{rarity:{hat:null}},{rarity:{hat:{none:-1}}},{rarity:{hat:{none:'10'}}},{rarity:{hat:{none:10001}}}])assert.throws(()=>importRarity(data));
});
