import test from 'node:test';import assert from 'node:assert/strict';
import {previewStore} from '../../minotecurator/preview-sync.js';import {suitDefaults} from '../../minotecurator/suits-model.js';
test('preview edits, tags and suits stay in the isolated snapshot',()=>{
 const original={edits:{1:{body:false,ink:'original',_revision:1}},metadata:{cards:{1:[]},tags:[],revision:1},suits:{...suitDefaults}};
 const copy=structuredClone(original),request=previewStore(copy.edits,copy.metadata,copy.suits),post=(url,body)=>request(url,{method:'POST',body:JSON.stringify(body)});
 post('/api/tags',{id:1,tag:'favorite',selected:true});
 assert.ok(request('/api/metadata').cards[1].includes('favorite'));assert.ok(request('/api/metadata').tags.includes('favorite'));
 post('/api/save',{id:1,body:true,ink:'rainbow'});assert.ok(request('/api/metadata').cards[1].includes('body box'));assert.ok(request('/api/metadata').cards[1].includes('colored name'));
 post('/api/icon',{id:1,icon:{type:'tear',color:'emerald'}});assert.equal(request('/api/metadata').icons[1].type,'tear');
 post('/api/suits',{...suitDefaults,size:250});assert.equal(request('/api/suits').size,250);
 post('/api/save',{id:1,body:false,ink:'original'});assert.ok(!request('/api/metadata').cards[1].includes('body box'));assert.ok(!request('/api/metadata').cards[1].includes('colored name'));
 assert.equal(original.edits[1]._revision,1);assert.deepEqual(original.metadata.cards[1],[]);assert.equal(original.suits.size,110);
});
