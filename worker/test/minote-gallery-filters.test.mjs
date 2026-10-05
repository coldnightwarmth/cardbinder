import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../minotecurator/studio.js',import.meta.url),'utf8');
function setup(){
 const buttons=Object.fromEntries(['#bodyFilter','#inkFilter'].map(id=>[id,{dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}}]));
 const context=vm.createContext({bodyFilter:0,inkFilter:0,$:id=>buttons[id],drawGrid(){}});
 vm.runInContext(source.slice(source.indexOf('function matchesAppearanceFilters('),source.indexOf('function download(')),context);
 return {context,buttons};
}
test('each filter cycles include, exclude, all independently with visible state labels',()=>{
 const {context:c,buttons}=setup();
 for(const [id,key,label] of [['#bodyFilter','bodyFilter','Body box'],['#inkFilter','inkFilter','Colored names']]){
  const b=buttons[id];
  b.onclick();assert.equal(c[key],1);assert.equal(b.textContent,label+' only');assert.equal(b.attributes['aria-pressed'],'true');
  b.onclick();assert.equal(c[key],2);assert.equal(b.textContent,'Exclude '+label.toLowerCase());
  b.onclick();assert.equal(c[key],0);assert.equal(b.textContent,label);assert.equal(b.attributes['aria-pressed'],'false');
 }
});
test('all nine filter combinations match body and ink values, including unedited defaults',()=>{
 const {context:c}=setup();
 for(const bodyState of [0,1,2])for(const inkState of [0,1,2]){
  c.bodyFilter=bodyState;c.inkFilter=inkState;
  for(const value of [undefined,{}, {body:true}, {ink:'rosewood'}, {body:true,ink:'ribbon'}, {body:false,ink:'original'}]){
   const body=value?.body===true,color=(value?.ink??'original')!=='original';
   const expected=(bodyState===0||body===(bodyState===1))&&(inkState===0||color===(inkState===1));
   assert.equal(c.matchesAppearanceFilters(value),expected);
  }
 }
});
