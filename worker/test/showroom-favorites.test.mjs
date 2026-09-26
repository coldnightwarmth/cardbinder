import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createShowroomHandState} from '../../showroom-hand-state.mjs';
const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function isShowroomCardHeld('),source.indexOf('function getIndividualCardSequenceIndexes('));
test('favorites prevent duplicates borrowed through any binder while ordinary binders retain their own slots',()=>{
 const state=createShowroomHandState(),origin={walletAddress:'test-wallet'};
 const card={stableId:'poncho:card-1'};const held=state.add(origin,card);
 const context=vm.createContext({IS_SHOWROOM:true,CARDS:[card],showroomBinderEntry:{favorites:true},showroomHand:{has:(origin,id)=>state.has(origin,id),hasCard:id=>state.cards.some(card=>card.stableId===id)}});
 vm.runInContext(code,context);assert.equal(context.isShowroomCardHeld(0),true);
 context.showroomBinderEntry={collectionId:'poncho'};assert.equal(context.isShowroomCardHeld(0),false);
 context.showroomBinderEntry=origin;assert.equal(context.isShowroomCardHeld(0),true);
 context.showroomBinderEntry={favorites:true};state.remove(held.key);assert.equal(context.isShowroomCardHeld(0),false);
 assert.equal(context.isShowroomCardHeld(5),false);
});
