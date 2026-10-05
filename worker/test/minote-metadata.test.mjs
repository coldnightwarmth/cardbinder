import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataSeed} from '../../minotecurator/metadata-seed.js';
import {normalizeTag,orderedTags,updateMetadata} from '../../minotecurator/metadata-model.js';
test('starter catalog excludes filler and Pokemon names and initializes every card',()=>{
 assert.equal(Object.keys(metadataSeed.cards).length,1413);
 for(const word of ['milady','lady','mi','note','minote','the','of','notebook','pikachu','dratini','gengar'])assert.ok(!metadataSeed.tags.includes(word));
 assert.ok(metadataSeed.tags.includes('pokemon'));
 for(const id of [25,66,841])assert.ok(metadataSeed.cards[id].includes('pokemon'));
 for(const tag of metadataSeed.tags)assert.match(tag,/^\p{L}+$/u);
 for(const tags of Object.values(metadataSeed.cards))for(const tag of tags)assert.ok(metadataSeed.tags.includes(tag));
});
test('new tags normalize, remain globally available after removal, and selected tags sort first',()=>{
 const state=structuredClone(metadataSeed);
 updateMetadata(state,{id:1,tag:'  New   Tag ',selected:true});
 assert.ok(state.tags.includes('new tag'));assert.ok(state.cards[1].includes('new tag'));
 updateMetadata(state,{id:1,tag:'new tag',selected:false});
 assert.ok(state.tags.includes('new tag'));assert.ok(!state.cards[1].includes('new tag'));
 assert.deepEqual(orderedTags(['cat','angel','pokemon','hat'],['hat','cat']),['cat','hat','angel','pokemon']);
 assert.equal(normalizeTag('Café'),'café');
 assert.throws(()=>normalizeTag('<script>'));assert.throws(()=>normalizeTag(''));
});
