import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAppearanceTags,appearanceTags} from '../../minotecurator/appearance-tags.js';
import {matchesTags} from '../../minotecurator/metadata-model.js';

test('body-box and colored-name filters derive from current edits without disturbing other traits',()=>{
 const metadata={tags:['cat'],cards:{1:['cat'],2:['cat'],3:[],4:[]}};
 applyAppearanceTags(metadata,{2:{body:true},3:{ink:'rosewood'},4:{body:true,ink:'ribbon'}});
 assert.deepEqual(metadata.cards,{1:['cat'],2:['cat','body box'],3:['colored name'],4:['body box','colored name']});
 for(const tag of appearanceTags)assert.ok(metadata.tags.includes(tag));
 assert.deepEqual(Object.keys(metadata.cards).filter(id=>matchesTags(metadata.cards[id],new Set(['body box']))),['2','4']);
 assert.deepEqual(Object.keys(metadata.cards).filter(id=>matchesTags(metadata.cards[id],new Set(),new Set(['colored name']))),['1','2']);
});
test('appearance traits refresh from edited state, clear reverted values, and never accumulate duplicates',()=>{
 const metadata={tags:['cat','body box','colored name'],cards:{1:['cat','body box','colored name'],2:[]}};
 const edits={1:{body:false,ink:'original'},2:{body:true,ink:'rainbow'}};
 applyAppearanceTags(metadata,edits);applyAppearanceTags(metadata,edits);
 assert.deepEqual(metadata.cards[1],['cat']);assert.deepEqual(metadata.cards[2],['body box','colored name']);
 delete edits[2];applyAppearanceTags(metadata,edits);assert.deepEqual(metadata.cards[2],[]);
 assert.ok(matchesTags(metadata.cards[1],new Set(['cat']),new Set(['body box','colored name'])));
});
