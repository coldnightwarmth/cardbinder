import test from 'node:test';import assert from 'node:assert/strict';import {suitAssignments,validateSuits,suitDefaults} from '../../minotecurator/suits-model.js';
test('suits are deterministic, balanced and rerollable',()=>{const ids=Array.from({length:1430},(_,i)=>i+1),a=suitAssignments(ids,1),b=suitAssignments(ids,2),counts={};for(const asset of a.values()){const suit=asset.replace(/-(cherry-red|marigold|cobalt-blue|emerald)$/,'');counts[suit]=(counts[suit]||0)+1;}assert.equal(Object.keys(counts).length,6);assert.ok(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))<=1);assert.deepEqual(a,suitAssignments(ids,1));assert.notDeepEqual(a,b);});
test('settings reject invalid geometry',()=>{assert.deepEqual(validateSuits(suitDefaults),suitDefaults);assert.throws(()=>validateSuits({size:Infinity}));assert.throws(()=>validateSuits({side:'top'}));});

test('collection counts arrange upright icons inside either bottom corner',async()=>{const {suitIconCount,suitBoxes}=await import('../../minotecurator/suits-model.js');assert.deepEqual([166,167,1282,1283,1430].map(suitIconCount),[1,2,2,3,3]);for(const side of ['left','right'])for(const orientation of ['vertical','horizontal']){const boxes=suitBoxes(1430,{...suitDefaults,side,orientation,size:400,spacing:300});assert.equal(boxes.length,3);for(const b of boxes){assert.ok(b.x>=0&&b.y>=0&&b.x+b.size<=2000&&b.y+b.size<=2800);}}});

test('effect settings default safely for older saves and reject invalid values',()=>{
 const legacy=validateSuits({visible:true,size:110});assert.equal(legacy.stroke,false);assert.equal(legacy.shadow,false);
 const effects={stroke:true,strokeColor:'black',strokeWidth:10,shadow:true,shadowColor:'white',shadowSize:20,shadowOpacity:75};
 for(const [k,v] of Object.entries(effects))assert.equal(validateSuits(effects)[k],v);
 for(const bad of [{stroke:'yes'},{shadowColor:'red'},{strokeWidth:11},{shadowSize:-1},{shadowOpacity:101}])assert.throws(()=>validateSuits(bad));
});
