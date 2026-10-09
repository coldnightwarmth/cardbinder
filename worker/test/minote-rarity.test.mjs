import test from 'node:test';
import assert from 'node:assert/strict';
import {cardRarityTraits,calculateRarities,rankTraitRows,sortGalleryCards} from '../../minotecurator/rarity.js';

const rows=values=>values.map((attributes,index)=>({id:index+1,attributes:new Map(Object.entries(attributes))}));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
const item={id:1};
const metadata={cards:{1:['wizard','saint','heart','stars','custom subject','heart','star icon','cherry red icon','body box','colored name']},icons:{1:{type:'star',color:'cherry-red'}}};

test('traits retain every subject, including multiple values per category and custom tags, without double-counting appearance',()=>{
 const snapshot=structuredClone(metadata);
 const traits=cardRarityTraits(item,metadata,{1:{body:false,ink:'original'}});
 assert.deepEqual(Object.fromEntries(traits),{'body text':'none',name:'black','icon type':'star','icon color':'cherry','tag:custom subject':'true','tag:heart':'true','tag:saint':'true','tag:stars':'true','tag:wizard':'true'});
 assert.deepEqual(metadata,snapshot);
 const hidden=cardRarityTraits(item,{...metadata,icons:{1:{type:'star',color:'cobalt-blue',hidden:true}}},{1:{body:true,ink:'rainbow'}});
 assert.equal(hidden.get('body text'),'true');assert.equal(hidden.get('name'),'rainbow');assert.equal(hidden.get('icon type'),'none');assert.equal(hidden.get('icon color'),'none');
});

test('information scores match hand-calculated entropy and identical scores share competition ranks',()=>{
 const ratings=rankTraitRows(rows([{eyes:'red'},{eyes:'blue'},{eyes:'blue'},{eyes:'blue'}]));
 const entropy=.25*2+.75*Math.log2(4/3);
 near(ratings.get(1).score,2/entropy);near(ratings.get(2).score,Math.log2(4/3)/entropy);
 assert.deepEqual([...ratings.values()].map(r=>r.rank),[1,2,2,2]);
 near([...ratings.values()].reduce((sum,r)=>sum+r.score,0)/4,1);
});

test('missing attributes contribute information and trait counts exclude none, but missing values are not unique traits',()=>{
 const ratings=rankTraitRows(rows([{hat:'cap',extra:'none'},{hat:'cap',extra:'none'},{hat:'cap',extra:'none'},{extra:'none'}]));
 assert.equal(ratings.get(4).traitCount,0);
 assert.equal(ratings.get(1).traitCount,1);
 assert.equal(ratings.get(4).uniqueTraits,1); // Its trait count, not the implicit null hat.
 assert.equal(ratings.get(4).rank,1);
 const entropy=.25*2+.75*Math.log2(4/3);
 near(ratings.get(4).score,2/entropy);
});

test('OpenRarity prioritizes one-of-one attributes before score and preserves stable tie order',()=>{
 const input=rows([
  {shape:'unique',color:'common',object:'common'},
  {shape:'pair',color:'pair',object:'pair'},
  {shape:'pair',color:'pair',object:'pair'},
  ...Array.from({length:5},()=>({shape:'common',color:'common',object:'common'})),
 ]);
 const ratings=rankTraitRows(input);
 assert.equal(ratings.get(1).rank,1);assert.ok(ratings.get(1).score<ratings.get(2).score);
 assert.deepEqual([...ratings.keys()],[1,2,3,4,5,6,7,8]);
 assert.deepEqual([...ratings.values()].map(r=>r.rank),[1,2,2,4,4,4,4,4]);
 assert.equal(input[0].attributes.has('meta_trait:trait_count'),false);
});

test('empty and identical collections have finite scores, while incomplete metadata cannot silently rank',()=>{
 assert.equal(calculateRarities([],{},{}).size,0);
 const ratings=rankTraitRows(rows([{},{}]));
 assert.deepEqual([...ratings.values()].map(r=>[r.rank,r.score]),[[1,0],[1,0]]);
 assert.equal(rankTraitRows(rows([{hat:'cap'}])).get(1).score,0);
 assert.throws(()=>calculateRarities([item],{cards:{},icons:{}},{}),/Missing metadata/);
 assert.throws(()=>calculateRarities([item],{cards:{1:[]},icons:{}},{}),/Missing icon/);
});

test('filtered sorting keeps global ranks and restores original collection sequence without mutating inputs',()=>{
 const collection=[{id:8},{id:2},{id:4},{id:1}];
 const ratings=rankTraitRows(collection.map((item,i)=>({id:item.id,attributes:new Map([['hat',i===2?'rare':'common']])})));
 const filtered=[collection[0],collection[2]],copy=[...filtered];
 const rare=sortGalleryCards(filtered,collection,ratings,true);
 assert.deepEqual(rare.map(i=>i.id),[4,8]);assert.equal(ratings.get(8).rank,2);
 assert.deepEqual(sortGalleryCards(rare,collection,ratings,false),copy);
 assert.deepEqual(filtered,copy);
});

test('changing traits and ink updates ratings, while crop geometry and unused catalog tags do not',()=>{
 const collection=[item,{id:2},{id:3}];
 const state={cards:{1:[],2:[],3:[]},icons:Object.fromEntries(collection.map(i=>[i.id,{type:'star',color:'emerald'}]))};
 const original=calculateRarities(collection,state,{});
 assert.deepEqual(calculateRarities(collection,{...state,tags:['unused']},{1:{zoom:2,x:100,y:400}}),original);
 const colored=calculateRarities(collection,state,{1:{ink:'ribbon'}});
 assert.ok(colored.get(1).score>original.get(1).score);assert.equal(colored.get(1).rank,1);
 const tagged=calculateRarities(collection,{...state,cards:{...state.cards,2:['cat']}},{});
 assert.equal(tagged.get(2).rank,1);assert.ok(tagged.get(2).score>tagged.get(1).score);
});
