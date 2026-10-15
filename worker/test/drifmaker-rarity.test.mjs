import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_APPEARANCE,BODY_STYLES,BODY_STYLE_COLORS,HEAD_SCALES,normalizeAppearance} from '../../drifmaker-config.mjs';
import {RARITY_GROUPS,RARITY_STORAGE_KEY,DEFAULT_WEIGHT,MAX_WEIGHT,normalizeRarity,traitWeight,traitChances,pickTrait,randomizeLook,loadRarity,saveRarity} from '../../drifmaker-rarity.mjs';

test('every trait, color, finish, background and pose starts with equal odds',()=>{
 assert.equal(Object.keys(RARITY_GROUPS).length,17);
 for(const [category,{options}] of Object.entries(RARITY_GROUPS)){
  assert.ok(options.every(option=>typeof option.id==='string'&&option.id));
  assert.equal(new Set(options.map(option=>option.id)).size,options.length);
  const chances=traitChances({},category);
  for(const [index,option] of options.entries()){
   assert.equal(traitWeight({},category,option.id),DEFAULT_WEIGHT);
   assert.equal(chances[option.id],1/options.length);
   assert.equal(pickTrait({},category,()=>(index+.5)/options.length).id,option.id);
  }
 }
});

test('independent weights give exact weighted intervals and exclude zero-weight traits',()=>{
 const weights=Object.fromEntries(RARITY_GROUPS.eyes.options.map(option=>[option.id,0]));weights.classic=1;weights.sleepy=3;
 const rarity={eyes:weights},chances=traitChances(rarity,'eyes');
 assert.equal(chances.classic,.25);assert.equal(chances.sleepy,.75);assert.equal(chances.star,0);
 for(const value of [0,.01,.249999])assert.equal(pickTrait(rarity,'eyes',()=>value).id,'classic');
 for(const value of [.25,.5,.999999,1])assert.equal(pickTrait(rarity,'eyes',()=>value).id,'sleepy');
 assert.deepEqual(traitChances(rarity,'hat'),traitChances({},'hat'));
 // Exhaust all equally spaced draws, avoiding probabilistic/flaky assertions.
 const counts={classic:0,sleepy:0};for(let i=0;i<4000;i++)counts[pickTrait(rarity,'eyes',()=>(i+.5)/4000).id]++;
 assert.deepEqual(counts,{classic:1000,sleepy:3000});
});

test('all-off groups keep the current selection, including custom colors and portrait poses',()=>{
 const rarity=Object.fromEntries(Object.entries(RARITY_GROUPS).map(([key,{options}])=>[key,Object.fromEntries(options.map(option=>[option.id,0]))]));
 const state={rarity,appearance:{...DEFAULT_APPEARANCE,bodyColor:'#123abc',shirt:'cardigan'},background:'#abcdef',pose:'heart',posesEnabled:true};
 assert.equal(pickTrait(rarity,'eyes'),null);
 assert.deepEqual(randomizeLook(state),{appearance:state.appearance,background:state.background,overlay:'none',pose:state.pose});
 assert.ok(Object.values(traitChances(rarity,'eyes')).every(chance=>chance===0));
});

test('randomization uses weights in every group and only rolls portrait poses when enabled',()=>{
 const rarity={},expected={};
 for(const [key,{options}] of Object.entries(RARITY_GROUPS)){
  const chosen=options.at(-1);expected[key]=chosen;rarity[key]=Object.fromEntries(options.map(option=>[option.id,option===chosen?1:0]));
 }
 const state={rarity,appearance:DEFAULT_APPEARANCE,background:'#abcdef',pose:'salute',posesEnabled:true};
 const result=randomizeLook(state,()=>.5);
 for(const key of Object.keys(result.appearance))assert.equal(result.appearance[key],key==='bodyColor'?expected[key].hex:expected[key].id);
 assert.equal(result.background,expected.background.hex);assert.equal(result.pose,expected.pose.id);
 assert.equal(randomizeLook({...state,posesEnabled:false},()=>.5).pose,'salute');
 assert.equal(state.appearance,DEFAULT_APPEARANCE);
 assert.equal(expected.pose.id,'holdcard');assert.equal(RARITY_GROUPS.pose.options.length,31);
});

test('saved/imported rarity is bounded, catalog-only, forward compatible and survives reload',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const invalid={eyes:{classic:0,sleepy:2,star:DEFAULT_WEIGHT,spiral:-1,hearts:Infinity,buttons:'10',wink:.5,angry:MAX_WEIGHT+1,unknown:7},hat:{none:MAX_WEIGHT},unknown:{option:1}};
 const expected={eyes:{classic:0,sleepy:2},hat:{none:MAX_WEIGHT}};
 assert.deepEqual(normalizeRarity(invalid),expected);assert.deepEqual(normalizeRarity(null),{});
 assert.deepEqual(saveRarity(invalid,storage),expected);assert.deepEqual(loadRarity(storage),expected);
 assert.equal(traitWeight(loadRarity(storage),'eyes','target'),DEFAULT_WEIGHT,'new/default traits remain eligible');
 values.set(RARITY_STORAGE_KEY,'{broken');assert.deepEqual(loadRarity(storage),{});
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.deepEqual(loadRarity(denied),{});assert.throws(()=>saveRarity(expected,denied),/quota/);
 // A full rarity catalog must fit the editor's bounded file import guard.
 const full=Object.fromEntries(Object.entries(RARITY_GROUPS).map(([key,{options}])=>[key,Object.fromEntries(options.map(option=>[option.id,MAX_WEIGHT]))]));
 const editor=readFileSync(new URL('../../drifmaker.js',import.meta.url),'utf8'),guard=/file\.size\s*>\s*(\d+(?:\s*\*\s*\d+)*)/.exec(editor);
 assert.ok(guard,'editor keeps an explicit bounded rarity import guard');
 const importLimit=guard[1].split('*').reduce((value,factor)=>value*Number(factor),1);
 assert.equal(importLimit,128*1024);
 assert.ok(Buffer.byteLength(JSON.stringify({version:6,appearance:DEFAULT_APPEARANCE,rarity:full,portrait:{posesEnabled:true,pose:'salute',background:'#abcdef'}},null,2))<importLimit);
});

test('new finishes and rainbow gradient obey independent zero and exclusive weights',()=>{
 const rarity={bodyStyle:{},background:{}};
 for(const category of ['bodyStyle','background'])for(const option of RARITY_GROUPS[category].options)rarity[category][option.id]=0;
 rarity.bodyStyle.silver=1;rarity.background.rainbow=1;
 const state={rarity,appearance:DEFAULT_APPEARANCE,background:'#abcdef',pose:'salute'};
 for(const value of [0,.4,.999]){const result=randomizeLook(state,()=>value);assert.equal(result.appearance.bodyStyle,'silver');assert.equal(result.background,'rainbow');}
 rarity.bodyStyle.silver=0;rarity.bodyStyle.matteblack=1;assert.equal(randomizeLook(state).appearance.bodyStyle,'matteblack');
});

test('all six sculpt finishes are eligible, independently weighted, and normalize to their intended material color',()=>{
 const ids=['blackgem','lava','woods','mossy','pinklatex','cowhide'];
 const bodyColor='azure',background=RARITY_GROUPS.background.options[0];
 const weights=(category,id)=>Object.fromEntries(RARITY_GROUPS[category].options.map(option=>[option.id,option.id===id?1:0]));
 for(const id of ids){
  assert.ok(BODY_STYLES.some(style=>style.id===id));assert.equal(traitWeight({},'bodyStyle',id),DEFAULT_WEIGHT);
  const rarity={bodyStyle:weights('bodyStyle',id),bodyColor:weights('bodyColor',bodyColor),background:weights('background',background.id)};
  for(const random of [0,.5,.999999]){
   const result=randomizeLook({rarity,appearance:DEFAULT_APPEARANCE,background:'#abcdef',pose:'salute'},()=>random);
   assert.equal(result.appearance.bodyStyle,id);assert.equal(result.background,background.hex);
   const normalized=normalizeAppearance(result.appearance);assert.equal(normalized.bodyStyle,id);assert.equal(normalized.bodyColor,BODY_STYLE_COLORS[id]);
  }
  rarity.bodyStyle[id]=0;rarity.bodyStyle.solid=1;
  assert.equal(randomizeLook({rarity,appearance:DEFAULT_APPEARANCE},()=>.5).appearance.bodyStyle,'solid','zero weight must exclude the new finish');
 }
});

test('head-size aliases participate in rarity without discarding independently sampled facial traits',()=>{
 for(const head of Object.keys(HEAD_SCALES).filter(id=>id!=='original')){
  const rarity={head:Object.fromEntries(RARITY_GROUPS.head.options.map(option=>[option.id,option.id===head?1:0]))};
  for(const random of [0,.5,.999999]){
   const state={rarity,appearance:DEFAULT_APPEARANCE,background:'#abcdef',pose:'salute'},look=randomizeLook(state,()=>random);
   assert.equal(look.appearance.head,head);
   for(const category of ['eyes','brows','mouth','nose','ears','tattoo'])assert.equal(look.appearance[category],pickTrait({},category,()=>random).id);
   assert.equal(normalizeAppearance(look.appearance).head,head);
  }
 }
});
