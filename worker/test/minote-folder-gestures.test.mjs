import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {spring,snapToNearest,tiltSpring} from '../../minotewip/motion.js';

const source=readFileSync(new URL('../../minotewip/folder.js',import.meta.url),'utf8');
function section(start,end){
 const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from);return source.slice(from,to);
}
function gestures(phase=0){
 const events=new Map();
 const c=vm.createContext({seal:{locked:false},sealHint:{dismiss(){}},performance:{now:()=>0},THREE,snapToNearest,innerWidth:1280,phase,targetPhase:phase,
  foldMotion:{value:phase,velocity:0},drag:null,outerFlip:null,selected:null,transition:null,
  reduced:false,cardTiltTarget:new THREE.Vector2(),updateCardTiltInput(){},
  canvas:{focus(){},setPointerCapture(){},hasPointerCapture(){return true},
   releasePointerCapture(){events.get('lostpointercapture')?.(event(0,0,50));},
   addEventListener(name,callback){events.set(name,callback);}},
  invalidate(){},syncUI(){},hit(){return {object:{userData:{}}}},toggle(){},selectCard(){},putBack(){}});
 vm.runInContext(section('function beginOuterFlip(', 'function setPhase('),c);
 vm.runInContext(section("canvas.addEventListener('pointerdown'", "canvas.addEventListener('pointermove'"),c);
 vm.runInContext(section('function finishDrag(', "document.addEventListener('keydown'"),c);
 c.shakeSealedFolder=()=>c.seal.shake();
 c.down=(x=600,y=350,t=0)=>events.get('pointerdown')(event(x,y,t));
 c.move=(x,y=350,t=16)=>c.moveDrag(event(x,y,t));
 c.up=(x,y=350,t=32)=>events.get('pointerup')(event(x,y,t));
 c.cancel=()=>events.get('pointercancel')(event(0,0,32));
 return c;
}
function event(clientX,clientY,timeStamp){return {clientX,clientY,timeStamp,pointerId:1,button:0};}

test('fast release uses the mouse-up position when it crosses a midpoint after the last move',()=>{
 const c=gestures();c.down();c.move(480);assert.ok(c.phase<.5);
 c.up(425);assert.equal(c.targetPhase,1);
 const flip=gestures();flip.down();flip.move(715);assert.ok(flip.outerFlip.progress<.5);
 flip.up(780);assert.equal(flip.outerFlip.target,1);
});
test('cancelled and lost-capture gestures settle at the nearest pose instead of their starting side',()=>{
 for(const start of [0,2]){
  const c=gestures(start);c.down();c.move(start===0?395:805);c.cancel();
  assert.equal(c.targetPhase,1);
 }
 const c=gestures();c.down();c.move(810);c.cancel();assert.equal(c.outerFlip.target,1);
});
test('outer cover flips use the same halfway threshold in both directions',()=>{
 for(const start of [0,2])for(const progress of [.36,.49,.51,.9]){
  const c=gestures(start),x=600+(start===0?1:-1)*280*progress;
  c.down();c.move(x);c.up(x);
  assert.equal(c.outerFlip.target,progress<.5?0:1);
 }
});
test('a settling outer flip can be grabbed again without resetting its progress',()=>{
 const c=gestures(2);
 c.outerFlip={from:0,to:2,progress:.72,target:1,dragging:false,motion:{value:.72,velocity:2}};
 c.down();assert.equal(c.outerFlip.dragging,true);
 c.move(560);assert.ok(Math.abs(c.outerFlip.progress-(.72-40/280))<1e-10);
 c.up(560);assert.equal(c.outerFlip.target,1);
});
test('initial vertical jitter does not disable a later horizontal swipe',()=>{
 const c=gestures();c.down();c.move(598,358);c.move(390,360);c.up(390,360);
 assert.equal(c.targetPhase,1);
});
test('release momentum never changes the nearest destination or overshoots it',()=>{
 for(const max of [1,2])for(const value of [.1,.49,.51,.9,1.1,1.49,1.51,1.9].filter(v=>v<max)){
  for(const velocity of [-20,0,20])for(const hz of [30,60,144]){
   const state={value,velocity},target=snapToNearest(state,max,16);
   assert.equal(target,Math.round(value));
   for(let i=0;i<hz;i++){
    spring(state,target,16,1/hz);
    assert.ok(state.value>=Math.min(value,target)-1e-10&&state.value<=Math.max(value,target)+1e-10);
   }
   assert.ok(Math.abs(state.value-target)<.00001);
  }
 }
});

test('clicks on cards during opening request pickup and never close the folder',()=>{
 for(const phase of [.7,.95,1,1.1]){
  const c=gestures(phase);let picked=null;
  c.hit=()=>({object:{userData:{card:1}}});
  c.selectCard=index=>{picked=index;};
  c.toggle=()=>assert.fail('card click closed the folder');
  c.down();c.up(600);
  assert.equal(picked,1);
 }
});
test('a card under the release point also takes priority over closing',()=>{
 const c=gestures(1);let picked=null;
 c.selectCard=index=>{picked=index;};c.toggle=()=>assert.fail('closed instead of picking');
 c.down();c.hit=()=>({object:{userData:{card:0}}});c.up(600);
 assert.equal(picked,0);
});
test('both cards are pickable before any texture request completes',async()=>{
 const requests=[],cards=[],left=new THREE.Group(),right=new THREE.Group();
 const c=vm.createContext({THREE,URL,Math,cards,left,right,
  PONCHO_CARDS:[{status:'pulled',file:'a.webp',title:'A'},{status:'pulled',file:'b.webp',title:'B'}],
  ui:{left:{},right:{}},syncUI(){},invalidate(){},
  texture(url){return new Promise(resolve=>requests.push({url,resolve}));}});
 vm.runInContext(section('const CARD_W=', 'const fiberCanvas='),c);
 vm.runInContext(section('function roundedShape(', 'function sheetOutline('),c);
 vm.runInContext(section('async function loadCards(', 'function cardPath(').replaceAll('import.meta.url',JSON.stringify('http://localhost/minotewip/folder.js')),c);
 const completion=c.loadCards();
 assert.equal(cards.length,2);assert.equal(requests.length,3);
 for(const [i,card] of cards.entries()){
  assert.ok(card.model.children.every(mesh=>mesh.userData.card===i));
  assert.equal(card.model.children[1].material.map,null);
 }
 for(const request of requests)request.resolve(new THREE.Texture());
 await completion;
 assert.ok(cards.every(card=>card.model.children[1].material.map?.isTexture));
});

test('card tilt stays bounded and springs back to neutral after release',()=>{
 const model=new THREE.Group(),camera=new THREE.PerspectiveCamera(34,1280/720,1,40);
 camera.position.z=5.9;camera.updateMatrixWorld();
 const c=vm.createContext({THREE,spring,tiltSpring,settle:(state,target,tolerance)=>{
  if(Math.abs(state.value-target)>tolerance||Math.abs(state.velocity)>tolerance*8)return false;
  state.value=target;state.velocity=0;return true;
 },selected:{model},transition:null,reduced:false,camera,stageCenter:new THREE.Vector3(0,0,1.4),
 CARD_W:1.165,CARD_H:1.631,cardTiltTarget:new THREE.Vector2(),
 cardTilt:{pitch:{value:0,velocity:0},yaw:{value:0,velocity:0}},
 canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})},invalidate(){}});
 vm.runInContext(section('function resetCardTilt(', 'function frame('),c);
 c.updateCardTiltInput({clientX:10000,clientY:-10000});
 for(let i=0;i<120;i++)c.animateCardTilt(1/60);
 assert.ok(Math.abs(model.rotation.x+.28)<.001);
 assert.ok(Math.abs(model.rotation.y-.38)<.001);
 c.cardTiltTarget.set(0,0);
 c.animateCardTilt(1/60);assert.ok(model.rotation.y>0&&model.rotation.y<.38);
 let crossedCenter=false;
 for(let i=0;i<120;i++){c.animateCardTilt(1/60);if(model.rotation.y<-.005)crossedCenter=true;}
 assert.ok(crossedCenter,'return passes through neutral before settling');
 assert.equal(model.rotation.x,0);assert.equal(model.rotation.y,0);
});

test('sealed cover taps shake without opening the folder',()=>{
 const c=gestures();let shakes=0;
 c.seal={locked:true,shake(){shakes++;},peel(){assert.fail('cover peeled sticker');}};
 c.down();c.up(600);
 assert.equal(c.phase,0);assert.equal(c.targetPhase,0);assert.equal(shakes,1);
});
test('clicking the seal starts peeling without toggling the folder',()=>{
 const c=gestures();let peels=0;
 c.seal={locked:true,shake(){assert.fail('seal click shook cover');},peel(){peels++;}};
 c.hit=()=>({object:{userData:{seal:true}}});
 c.toggle=()=>assert.fail('opened before peel completed');
 c.down();c.up(600);assert.equal(peels,1);assert.equal(c.targetPhase,0);
});


test('sealed folders flip in either drag direction without opening or peeling',()=>{
 for(const start of [0,2])for(const direction of [-1,1]){
  const c=gestures(start);
  c.seal={locked:true,shake(){assert.fail('drag shook cover');},peel(){assert.fail('drag peeled sticker');}};
  c.down();c.move(600+direction*220);c.up(600+direction*220);
  assert.equal(c.phase,start);assert.equal(c.outerFlip.to,2-start);
  assert.equal(c.outerFlip.target,1);assert.equal(c.outerFlip.direction,direction);
 }
});

test('a tap during a sealed flip shakes and resumes its existing destination',()=>{
 const c=gestures(0);let shakes=0;
 c.seal={locked:true,shake(){shakes++;}};
 c.outerFlip={from:0,to:2,progress:.35,target:1,dragging:false,motion:{value:.35,velocity:1}};
 c.down();c.up(600);
 assert.equal(shakes,1);assert.equal(c.outerFlip.target,1);assert.equal(c.outerFlip.dragging,false);
});
