import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataSeed} from '../../minotecurator/metadata-seed.js';
import {normalizeTag,orderedTags,updateMetadata} from '../../minotecurator/metadata-model.js';
test('starter catalog excludes filler and Pokemon names and initializes every card',()=>{
 assert.equal(Object.keys(metadataSeed.cards).length,1413);
 for(const word of ['milady','lady','mi','note','minote','the','of','notebook','pikachu','dratini','gengar'])assert.ok(!metadataSeed.tags.includes(word));
 assert.ok(metadataSeed.tags.includes('pokemon'));
 for(const id of [25,66,841])assert.ok(metadataSeed.cards[id].includes('pokemon'));
 for(const tag of metadataSeed.tags)assert.match(tag,/^[\p{L}-]+$/u);
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

// These are the explicit cleanup rules, including removal from every card.
test('cleanup merges and renames tags without losing unrelated user metadata and runs once',async()=>{
 const {removedTags,mergedTags,migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const tags=[...removedTags,...Object.keys(mergedTags),'baby','cat','custom'];
 const data={tags:[...tags],cards:{1:[...tags],2:['catty','catlady','cat'],3:[]},revision:12};
 assert.equal(migrateMetadata(data),true);assert.equal(data.revision,13);
 for(const old of [...removedTags,...Object.keys(mergedTags)]){assert.ok(!data.tags.includes(old));assert.ok(!data.cards[1].includes(old));}
 for(const replacement of Object.values(mergedTags)){assert.ok(data.tags.includes(replacement));assert.ok(data.cards[1].includes(replacement));}
 assert.deepEqual(data.cards[2],['cat']);assert.ok(data.cards[1].includes('custom'));
 assert.equal(migrateMetadata(data),false);assert.equal(data.revision,13);
 for(const tag of removedTags)assert.throws(()=>normalizeTag(tag));
 for(const [old,next] of Object.entries(mergedTags))assert.equal(normalizeTag(old),next);
 assert.equal(normalizeTag('constructor'),'constructor');
});
test('tag counts and multiple-tag matching use the whole collection without double counting',async()=>{
 const {countTags,matchesTags}=await import('../../minotecurator/metadata-model.js');
 const counts=countTags({tags:['cat','baby','unused'],cards:{1:['cat','cat'],2:['cat','baby'],3:[]}});
 assert.equal(counts.get('cat'),2);assert.equal(counts.get('baby'),1);assert.equal(counts.get('unused'),0);
 assert.equal(matchesTags([],new Set()),true);
 assert.equal(matchesTags(['cat'],new Set(['cat','baby'])),true);
 assert.equal(matchesTags(['baby'],new Set(['cat','baby'])),true);
 assert.equal(matchesTags(['frog'],new Set(['cat','baby'])),false);
});
