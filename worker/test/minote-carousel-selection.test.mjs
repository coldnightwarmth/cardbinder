import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../minotecurator/studio.js',import.meta.url),'utf8');
function setup(current={id:2}){
 const buttons={'#carouselPrev':{},'#carouselNext':{}};
 const positions={1:300,2:540,3:780};let scroll;
 const context=vm.createContext({carousel:true,current,filtered:[{id:1,available:true},{id:2,available:true},{id:99,available:false},{id:3,available:true}],
  matchMedia:()=>({matches:false}),$:id=>buttons[id],
  grid:{scrollLeft:240,clientWidth:600,scrollWidth:1080,getBoundingClientRect:()=>({left:100}),querySelector(selector){const id=selector.match(/"(\d+)"/)[1];return {getBoundingClientRect:()=>({left:positions[id],width:200})};},scrollTo(value){scroll=value;}},
  open(id){context.current={id};context.centerCarouselCard(id);}
 });
 vm.runInContext(source.slice(source.indexOf('function centerCarouselCard('),source.indexOf('viewToggle.onclick=')),context);
 vm.runInContext(source.slice(source.indexOf('function scrollCards('),source.indexOf("$('#carouselPrev').onclick=")),context);
 return {context,buttons,scroll:()=>scroll};
}
test('centering accounts for viewport offset and existing horizontal scroll',()=>{
 const {context:c,scroll}=setup();c.centerCarouselCard(2);
 assert.equal(scroll().left,480);assert.equal(scroll().behavior,'smooth');
 c.matchMedia=()=>({matches:true});c.centerCarouselCard(2);assert.equal(scroll().behavior,'instant');
});
test('arrows select adjacent available cards, center them, and disable at collection boundaries',()=>{
 const {context:c,buttons}=setup();c.scrollCards(1);assert.equal(c.current.id,3);assert.equal(buttons['#carouselNext'].disabled,true);
 c.scrollCards(-1);assert.equal(c.current.id,2);
 c.scrollCards(-1);assert.equal(c.current.id,1);assert.equal(buttons['#carouselPrev'].disabled,true);
 c.scrollCards(-1);assert.equal(c.current.id,1);
});
test('without a selection, arrows navigate from the nearest visible card',()=>{
 const {context:c}=setup(null);c.scrollCards(1);assert.equal(c.current.id,2);
});
