import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../../vendor/three.module.min.js';
import {PORTRAIT_OVERLAYS,IMAGE_BACKGROUNDS,setPortraitOverlay,renderPortraitScene,disposePortraitOverlay} from '../../drifmaker-portrait-art.mjs?v=2';
import {setPortraitSceneBackground,validPortraitBackground,disposePortraitBackground} from '../../drifmaker-background.mjs?v=3';
import {normalizeLook,createLookHistory,bookmarkMetadata} from '../../drifmaker-bookmarks.mjs?v=13';
import {RARITY_GROUPS,randomizeLook} from '../../drifmaker-rarity.mjs?v=14';
import {capturePortrait} from '../../drifmaker-portrait.mjs?v=9';

const loaded=[];
const fakeThree={...THREE,TextureLoader:class{async loadAsync(src){loaded.push(src);const texture=new THREE.Texture({width:1000,height:1250});texture.userData.src=src;return texture;}}};
test('the supplied portrait images are shipped as original RGBA PNG assets',()=>{
 assert.equal(PORTRAIT_OVERLAYS.length,16);
 for(const src of [...Object.values(IMAGE_BACKGROUNDS),...PORTRAIT_OVERLAYS.filter(o=>o.src).map(o=>o.src)]){
  const bytes=readFileSync(new URL('../..'+src,import.meta.url));if(src.endsWith('.svg')){assert.match(bytes.toString(),/^<svg /);assert.doesNotMatch(bytes.toString(),/<script|href=/);continue;}assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6,'original alpha is retained');
 }
 for(const id of Object.keys(IMAGE_BACKGROUNDS))assert.equal(validPortraitBackground(id),true);
 assert.equal(validPortraitBackground('url(https://untrusted.example/image.png)'),false);
});
test('background and overlay survive history and bookmark metadata; old looks default to no overlay',()=>{
 const initial=normalizeLook({});assert.equal(initial.portrait.overlay,'none');
 const look=normalizeLook({portrait:{background:'blackops',overlay:'avantgarde'}}),history=createLookHistory(initial);
 assert.equal(history.commit(look),true);assert.deepEqual(history.undo(),initial);assert.deepEqual(history.redo(),look);
 const traits=Object.fromEntries(bookmarkMetadata({name:'Test',look}).attributes.map(a=>[a.trait_type,a.value]));
 assert.equal(traits.background,'Black Ops');assert.equal(traits.overlay,'Avant garde');
 assert.equal(normalizeLook({portrait:{overlay:'bad'}}).portrait.overlay,'none');
});
test('all image choices use independent rarity weights, and all-off overlays keep their selection',()=>{
 const rarity={overlay:Object.fromEntries(RARITY_GROUPS.overlay.options.map(o=>[o.id,0])),background:Object.fromEntries(RARITY_GROUPS.background.options.map(o=>[o.id,0]))};
 rarity.overlay.hell=1;rarity.background.spiral=1;
 for(const n of [0,.3,.999]){const look=randomizeLook({rarity,appearance:{},overlay:'postdemon'},()=>n);assert.equal(look.overlay,'hell');assert.equal(look.background,'spiral');}
 rarity.overlay.hell=0;assert.equal(randomizeLook({rarity,appearance:{},overlay:'postdemon'}).overlay,'postdemon');
});
test('overlays render last in screen space, preserve alpha and renderer state, and disable cleanly',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),calls=[];
 await setPortraitOverlay(fakeThree,scene,'hell');
 const renderer={autoClear:true,render(s,c){calls.push({s,c,clear:this.autoClear});}};
 renderPortraitScene(renderer,scene,camera);
 assert.equal(calls.length,2);assert.equal(calls[0].s,scene);assert.equal(calls[0].c,camera);assert.equal(calls[1].clear,false);assert.equal(renderer.autoClear,true);
 const quad=calls[1].s.children[0];assert.equal(quad.material.transparent,true);assert.equal(quad.material.toneMapped,false);assert.equal(quad.material.opacity,1);assert.equal(quad.material.depthTest,false);assert.equal(quad.material.map.colorSpace,THREE.SRGBColorSpace);
 assert.deepEqual(quad.geometry.parameters,{width:2,height:2,widthSegments:1,heightSegments:1});assert.equal(scene.children.length,0,'no overlay object enters the avatar scene');
 calls.length=0;await setPortraitOverlay(fakeThree,scene,'none');renderPortraitScene(renderer,scene,camera);assert.equal(calls.length,1);
 let disposed=0;quad.geometry.addEventListener('dispose',()=>disposed++);quad.material.addEventListener('dispose',()=>disposed++);disposePortraitOverlay(scene);assert.equal(disposed,2);
});
test('a later background or no-overlay selection wins over pending image loads',async()=>{
 const scene=new THREE.Scene();const pending=setPortraitSceneBackground(fakeThree,scene,'blackops');setPortraitSceneBackground(fakeThree,scene,'#ff0000');await pending;assert.equal(scene.background.getHexString(),'ff0000');
 const pendingOverlay=setPortraitOverlay(fakeThree,scene,'ssdrip');await setPortraitOverlay(fakeThree,scene,'none');await pendingOverlay;
 let calls=0;renderPortraitScene({render(){calls++;}},scene,new THREE.Camera());assert.equal(calls,1);disposePortraitOverlay(scene);disposePortraitBackground(scene);
});
test('PNG export waits for both image layers and composites before encoding',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),calls=[];
 const renderer={autoClear:true,setPixelRatio(){},setSize(){},setClearColor(){},render(s){calls.push(s);},domElement:{toBlob(callback){assert.equal(calls.length,2);callback(new Blob(['png']));}},dispose(){},forceContextLoss(){}};
 await capturePortrait({THREE:fakeThree,scene,camera,composition:{background:'spiral',overlay:'postdemon'},rendererFactory:()=>renderer});
 assert.equal(calls[0].background.userData.src,IMAGE_BACKGROUNDS.spiral);assert.equal(calls[1].children[0].material.map.userData.src,PORTRAIT_OVERLAYS.find(o=>o.id==='postdemon').src);
 assert.equal(scene.background,null);assert.equal(scene.children.length,0);
});
