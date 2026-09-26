import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRoom,applyAction,finishRitual} from '../src/showroom-state.js';
const card={stableId:'playcards:group-test',origin:{collectionId:'playcards'}};
test('one player can retrieve another player’s card; competing actions do not duplicate it',()=>{
 const room=freshRoom(),borrowed=applyAction(room,'a',{type:'borrow',card},0);
 applyAction(room,'a',{type:'place',slot:1,id:borrowed.id},1);
 assert.throws(()=>applyAction(room,'a',{type:'place',slot:1,id:borrowed.id},2));
 assert.equal(applyAction(room,'b',{type:'grab',slot:1},3).holder,'b');
 assert.throws(()=>applyAction(room,'a',{type:'grab',slot:1},4));
 assert.throws(()=>applyAction(room,'a',{type:'return',id:borrowed.id},5));
 applyAction(room,'b',{type:'return',id:borrowed.id},6);assert.deepEqual(room.cards,{});
});
test('ritual has one shared start, freezes transfers, and clears exactly its cards',()=>{
 const room=freshRoom();assert.throws(()=>applyAction(room,'a',{type:'ritual'},0));
 for(let slot=0;slot<3;slot++){const c=applyAction(room,'a',{type:'borrow',card:{...card,stableId:`playcards:card-${slot}`}},0);applyAction(room,'a',{type:'place',slot,id:c.id},0);}
 const extra=applyAction(room,'b',{type:'borrow',card},0);
 applyAction(room,'b',{type:'ritual'},1000);assert.equal(room.ritual.startedAt,1000);
 assert.throws(()=>applyAction(room,'a',{type:'grab',slot:0},1001));assert.throws(()=>applyAction(room,'a',{type:'ritual'},1001));
 assert.equal(finishRitual(room,7349),false);assert.equal(finishRitual(room,7350),true);
 assert.deepEqual(room.slots,[null,null,null]);assert.deepEqual(Object.keys(room.cards),[extra.id]);
});
test('invalid descriptors, slot indexes, and excessive hands are rejected',()=>{
 const room=freshRoom();assert.throws(()=>applyAction(room,'a',{type:'borrow',card:{stableId:'https://bad',origin:{}}}));
 assert.throws(()=>applyAction(room,'a',{type:'grab',slot:-1}));
 for(let i=0;i<24;i++)applyAction(room,'a',{type:'borrow',card:{...card,stableId:`playcards:card-${i}`}});
 assert.throws(()=>applyAction(room,'a',{type:'borrow',card}));
});
