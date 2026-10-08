import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataSeed} from '../../minotecurator/metadata-seed.js';
import {normalizeTag,orderedTags,updateMetadata} from '../../minotecurator/metadata-model.js';
test('starter catalog excludes filler and restores recurring Pokemon names and initializes every card',()=>{
 assert.equal(Object.keys(metadataSeed.cards).length,1430);
 for(const word of ['milady','lady','mi','note','minote','the','of','notebook'])assert.ok(!metadataSeed.tags.includes(word));
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
 for(const tag of removedTags)assert.equal(normalizeTag(tag),tag);
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

test('recurring Pokemon are assigned and sad becomes crying without losing custom tags',async()=>{
 const {pokemonTags}=await import('../../minotecurator/pokemon-tags.js');
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 for(const [tag,ids] of Object.entries(pokemonTags)){assert.ok(ids.length>=2);for(const id of ids)assert.ok(metadataSeed.cards[id].includes(tag));}
 const state={schemaVersion:1,revision:7,tags:['sad','custom'],cards:{25:['sad','custom'],66:[],1:['sad','crying']}};
 assert.ok(migrateMetadata(state));assert.ok(state.cards[25].includes('pikachu'));assert.ok(state.cards[66].includes('meowth'));
 assert.deepEqual(state.cards[1],['crying']);assert.ok(state.cards[25].includes('custom'));assert.ok(!state.tags.includes('sad'));
 assert.equal(migrateMetadata(state),false);assert.equal(state.revision,8);
});

test('exclusions veto included tags and work without any inclusion',async()=>{
 const {matchesTags}=await import('../../minotecurator/metadata-model.js');
 assert.equal(matchesTags(['angel','cat'],new Set(['angel']),new Set(['cat'])),false);
 assert.equal(matchesTags(['angel'],new Set(),new Set(['cat'])),true);
 assert.equal(matchesTags(['cat'],new Set(),new Set(['cat'])),false);
 assert.equal(matchesTags([],new Set(),new Set()),true);
});

 test('schema 3 removes clothing tags and renames king without restoring removed Pokemon',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const state={schemaVersion:2,revision:9,tags:['hoodie','beanie','king','crown','custom'],cards:{25:['hoodie','beanie','king','crown','custom']}};
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.cards[25],['crown','custom']);
 assert.deepEqual(state.tags,['crown','custom']);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,10);
 assert.equal(migrateMetadata(state),false);
 });

test('schema 4 removes requested tags from existing live metadata and preserves other traits',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const removed=['secret','god','fallen','little','boy','emo','holy','light'];
 const state={schemaVersion:3,revision:14,tags:[...removed,'crown','custom'],cards:{25:[...removed,'custom'],26:['crown']}};
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.tags,['crown','custom']);assert.deepEqual(state.cards[25],['custom']);assert.deepEqual(state.cards[26],['crown']);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,15);assert.equal(migrateMetadata(state),false);
 for(const tag of removed)assert.equal(normalizeTag(tag),tag);
});

test('computer merge retains every affected card and deduplicates overlapping tags',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const state={schemaVersion:4,revision:15,tags:['network','online','desktop','internet','computer','custom'],cards:{1:['network'],2:['online'],3:['desktop'],4:['internet'],5:['network','online','desktop','internet','computer','custom'],6:['custom']}};
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.tags,['computer','custom']);
 for(const id of [1,2,3,4])assert.deepEqual(state.cards[id],['computer']);
 assert.deepEqual(state.cards[5],['computer','custom']);assert.deepEqual(state.cards[6],['custom']);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,16);assert.equal(migrateMetadata(state),false);
 for(const tag of ['network','online','desktop','internet'])assert.equal(normalizeTag(tag),'computer');
});

test('standalone colors are removed while icon colors and colored-name traits remain',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const colors=['azure','black','blue','brown','green','orange','pink','purple','rainbow','red','sepia','white','yellow'];
 const keep=['cherry red icon','marigold icon','cobalt blue icon','emerald icon','colored name'];
 const state={schemaVersion:5,revision:16,tags:[...colors,...keep],cards:{1:[...colors,...keep]}};
 assert.equal(migrateMetadata(state),true);assert.deepEqual(state.cards[1],[...keep].sort());assert.deepEqual(state.tags,[...keep].sort());
 assert.equal(migrateMetadata(state),false);
});

test('part-time and its legacy time alias are removed without affecting other tags',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const state={schemaVersion:6,revision:20,tags:['part-time','time','computer'],cards:{1:['part-time','computer'],2:['time']}};
 assert.equal(migrateMetadata(state),true);assert.deepEqual(state.tags,['computer']);assert.deepEqual(state.cards[1],['computer']);assert.deepEqual(state.cards[2],[]);
 assert.equal(migrateMetadata(state),false);assert.equal(normalizeTag('part-time'),'part-time');assert.equal(normalizeTag('time'),'time');
});

test('subject restoration uses historical assignments rather than generated icon labels and runs once',async()=>{
 const {restoreSubjectTags}=await import('../../minotecurator/subject-tags.js');
 const state={revision:1,tags:['star','bell'],icons:{1:{type:'star'}},cards:{1:['star','custom'],119:['bell'],105:['heart']}};
 assert.ok(restoreSubjectTags(state));assert.deepEqual(state.cards[1],['custom']);assert.deepEqual(state.cards[119],['star']);assert.deepEqual(state.cards[105],['mushroom']);
 state.cards[119]=[];assert.equal(restoreSubjectTags(state),false);assert.deepEqual(state.cards[119],[]);
});

test('chan and error are removed from the catalog and cards without changing icon or subject tags',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const state={schemaVersion:7,revision:21,tags:['chan','error','heart','heart icon','emerald icon','custom'],cards:{1:['chan','heart','heart icon','emerald icon'],2:['error','custom'],3:['chan','error'],4:['custom']},iconOverrides:{1:{type:'heart',color:'emerald'}}};
 const icons=structuredClone(state.iconOverrides);
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.tags,['custom','emerald icon','heart','heart icon']);
 assert.deepEqual(state.cards,{1:['emerald icon','heart','heart icon'],2:['custom'],3:[],4:['custom']});
 assert.deepEqual(state.iconOverrides,icons);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,22);
 assert.equal(migrateMetadata(state),false);assert.equal(state.revision,22);
 for(const tag of ['chan','error'])assert.equal(normalizeTag(tag),tag);
});

test('schema 9 removes favorite, remilio and invader while preserving audited tags and icons',async()=>{
 const {migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const removed=['favorite','remilio','invader'];
 const keep=['remilia','remicat','kirby','gun','heart','heart icon','emerald icon'];
 const state={schemaVersion:8,subjectTagsVersion:1,revision:3127,tags:[...removed,...keep],cards:{1:[...removed,...keep],2:[...removed],3:['kirby','gun']},iconOverrides:{1:{type:'heart',color:'emerald'}}};
 const icons=structuredClone(state.iconOverrides);
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.tags,[...keep].sort());
 assert.deepEqual(state.cards,{1:[...keep].sort(),2:[],3:['gun','kirby']});
 assert.deepEqual(state.iconOverrides,icons);assert.equal(state.subjectTagsVersion,1);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,3128);
 assert.equal(migrateMetadata(state),false);assert.equal(state.revision,3128);
 for(const tag of removed)assert.equal(normalizeTag(tag),tag);
});

test('previously removed tags can be added manually and survive subsequent metadata reads',async()=>{
 const {removedTags,migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const state={schemaVersion:8,revision:1,tags:['favorite','kirby'],cards:{1:['favorite','kirby'],2:[]}};
 migrateMetadata(state);
 assert.ok(!state.tags.includes('favorite'));
 for(const tag of removedTags)updateMetadata(state,{id:1,tag,selected:true});
 const reloaded=JSON.parse(JSON.stringify(state));
 assert.equal(migrateMetadata(reloaded),false);
 for(const tag of removedTags){assert.ok(reloaded.tags.includes(tag));assert.ok(reloaded.cards[1].includes(tag));}
 assert.ok(reloaded.cards[1].includes('kirby'));assert.deepEqual(reloaded.cards[2],[]);
 updateMetadata(reloaded,{id:2,tag:'favorite',selected:true});
 updateMetadata(reloaded,{id:1,tag:'favorite',selected:false});
 assert.ok(reloaded.tags.includes('favorite'));assert.ok(reloaded.cards[2].includes('favorite'));assert.ok(!reloaded.cards[1].includes('favorite'));
});

test('schema 10 removes only child and bera and preserves manually restored traits',async()=>{
 const {removedTags,migrateMetadata}=await import('../../minotecurator/tag-cleanup.js');
 const keep=[...removedTags].filter(tag=>tag!=='child'&&tag!=='bera').concat(['kirby','heart','heart icon','emerald icon']).sort();
 const state={schemaVersion:9,subjectTagsVersion:1,revision:50,tags:['child','bera',...keep],cards:{1:['child','bera',...keep],2:['child','bera'],3:['kirby']},iconOverrides:{1:{type:'heart',color:'emerald'}}};
 const icons=structuredClone(state.iconOverrides);
 assert.equal(migrateMetadata(state),true);
 assert.deepEqual(state.tags,keep);assert.deepEqual(state.cards,{1:keep,2:[],3:['kirby']});
 assert.deepEqual(state.iconOverrides,icons);assert.equal(state.subjectTagsVersion,1);
 assert.equal(state.schemaVersion,10);assert.equal(state.revision,51);
 for(const tag of ['child','bera'])updateMetadata(state,{id:2,tag,selected:true});
 const reloaded=JSON.parse(JSON.stringify(state));
 assert.equal(migrateMetadata(reloaded),false);assert.equal(reloaded.revision,53);
 for(const tag of ['child','bera'])assert.ok(reloaded.tags.includes(tag));assert.deepEqual(reloaded.cards[2],['bera','child']);
});
