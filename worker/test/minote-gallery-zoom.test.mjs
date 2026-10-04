import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../minotecurator/studio.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function galleryVisibleBounds()'),source.indexOf('zoomOut.onclick='));
function zoom({top=200,after=1200,height=300,selected=true,carousel=false,delta=1}={}){
 let changed=false,scroll=null,fitted=false;
 const card={getBoundingClientRect:()=>({top:changed?after:top,bottom:(changed?after:top)+height,height,left:20,right:250})};
 const context=vm.createContext({carousel,current:selected?{id:42}:null,galleryColumns:4,captionFitFrame:0,
  grid:{querySelector:()=>card,style:{setProperty(){changed=true;}},classList:{add(){}}},
  document:{querySelector:()=>({getBoundingClientRect:()=>({bottom:80})})},
  toolbar:{hidden:false,getBoundingClientRect:()=>({top:700})},
  window:{innerHeight:800,innerWidth:1200,scrollBy(value){assert.ok(fitted);scroll=value;}},
  currentColumns:()=>4,updateGalleryZoom(){},cancelAnimationFrame(){},fitCaptions(){fitted=true;},queueCarouselLayout(){}
 });
 vm.runInContext(code,context);context.changeGalleryColumns(delta);return scroll;
}
test('zoom in and out retain a visible selected card after rows reflow',()=>{
 assert.equal(zoom({after:1200,delta:-1}).top,1000);
 assert.equal(zoom({after:-200,delta:1}).top,-400);
});
test('larger cards stay above the toolbar, or start below the header if too tall',()=>{
 assert.equal(zoom({top:400,after:900,height:400}).top,612);
 assert.equal(zoom({height:800,after:1000}).top,908);
});
test('zoom does not chase offscreen cards or affect unselected and horizontal galleries',()=>{
 assert.equal(zoom({top:900}),null);
 assert.equal(zoom({top:-400}),null);
 assert.equal(zoom({selected:false}),null);
 assert.equal(zoom({carousel:true}),null);
});
