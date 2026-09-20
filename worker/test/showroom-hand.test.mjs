import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowroomHandState} from '../../showroom-hand-state.mjs';
test('borrowing preserves independent slots across binders and deduplicates a source',()=>{
 const hand=createShowroomHandState(),a={collectionId:'nolegs'},b={walletAddress:'wallet'},card={stableId:'card-1',index:1};
 const first=hand.add(a,card);assert.equal(hand.add(a,card),first);
 const second=hand.add(b,card);assert.equal(hand.cards.length,2);
 hand.remove(first.key);assert.equal(hand.has(a,card.stableId),false);assert.equal(hand.has(b,card.stableId),true);
 assert.equal(hand.cards[0],second);
});
test('hand navigation wraps and returning a selected card clears the viewer',()=>{
 const hand=createShowroomHandState(),origin={collectionId:'nolegs'};
 const a=hand.add(origin,{stableId:'a'}),b=hand.add(origin,{stableId:'b'});
 hand.select(a.key);assert.equal(hand.adjacent(-1),b);assert.equal(hand.adjacent(1),b);
 hand.select(b.key);assert.equal(hand.adjacent(1),a);
 hand.remove(b.key);assert.equal(hand.selected,null);assert.equal(hand.adjacent(1),a);
 hand.remove(a.key);assert.equal(hand.adjacent(1),null);
});
