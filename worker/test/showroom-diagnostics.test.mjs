import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowroomDiagnostics} from '../../showroom-diagnostics.mjs';
test('opt-in diagnostics sum all frame passes and expose bounded rolling timings in the DOM',()=>{
 let time=0,removed=false;const listeners=new Map(),panel={dataset:{},style:{},setAttribute(){},remove(){removed=true;}};
 const doc={hidden:false,createElement:()=>panel,body:{append(){}},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const renderer={info:{autoReset:true,render:{calls:9,triangles:100,points:0,lines:0},memory:{textures:12,geometries:20},reset(){this.render.calls=0;this.render.triangles=0;}},getPixelRatio:()=>.75};
 const diagnostics=createShowroomDiagnostics({renderer,canvas:{width:900,height:600},document:doc,now:()=>time});
 assert.equal(renderer.info.autoReset,false);diagnostics.begin();assert.equal(renderer.info.render.calls,0);
 for(let i=0;i<4;i++){renderer.info.render.calls+=3;renderer.info.render.triangles+=200;}
 diagnostics.end();let data=JSON.parse(panel.dataset.metrics);assert.equal(data.renderCalls,12);assert.equal(data.triangles,800);
 for(let frame=1;frame<=200;frame++){time+=20;diagnostics.begin();renderer.info.render.calls=5;diagnostics.end({inside:true});}
 data=JSON.parse(panel.dataset.metrics);assert.equal(data.sampleCount,180);assert.equal(data.meanFrameMs,20);assert.equal(data.p95FrameMs,20);assert.equal(data.room,'ritual');assert.equal(data.width,900);
 listeners.get('visibilitychange')();time+=100000;diagnostics.begin();diagnostics.end();assert.equal(JSON.parse(panel.dataset.metrics).p95FrameMs,20,'tab suspension does not register as a slow frame');
 diagnostics.dispose();assert.equal(renderer.info.autoReset,true);assert.equal(listeners.size,0);assert.equal(removed,true);
});
