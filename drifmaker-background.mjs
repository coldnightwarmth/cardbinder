import {IMAGE_BACKGROUNDS,loadPortraitTexture} from './drifmaker-portrait-art.mjs?v=1';
export const RAINBOW_BACKGROUND='rainbow';
export const RAINBOW_CSS='linear-gradient(135deg,#ff537a 0%,#ffb94d 20%,#edee5b 38%,#46dca3 56%,#4b9cff 76%,#af6df5 100%)';
export const validPortraitBackground=value=>typeof value==='string'&&(value===RAINBOW_BACKGROUND||Object.hasOwn(IMAGE_BACKGROUNDS,value)||/^#[a-f\d]{6}$/i.test(value));
export const backgroundCSS=value=>value===RAINBOW_BACKGROUND?RAINBOW_CSS:Object.hasOwn(IMAGE_BACKGROUNDS,value)?`url("${IMAGE_BACKGROUNDS[value]}") center / cover`:value;
const gradients=new WeakMap(),versions=new WeakMap();
// An sRGB data texture gives the preview and every export the same diagonal
// gradient, independent of canvas dimensions, device pixel ratio, and DOM CSS.
export function setPortraitSceneBackground(THREE,scene,value){
 const version=(versions.get(scene)||0)+1;versions.set(scene,version);
 if(Object.hasOwn(IMAGE_BACKGROUNDS,value)){
  return loadPortraitTexture(THREE,IMAGE_BACKGROUNDS[value]).then(texture=>{if(versions.get(scene)===version)scene.background=texture;});
 }
 if(value!==RAINBOW_BACKGROUND){scene.background=new THREE.Color(value);return;}
 if(!gradients.has(scene)){
  const stops=[[255,83,122],[255,185,77],[237,238,91],[70,220,163],[75,156,255],[175,109,245]],positions=[0,.20,.38,.56,.76,1],size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const t=(x+size-1-y)/(2*(size-1));let index=0;while(index<stops.length-2&&t>positions[index+1])index++;
   const blend=(t-positions[index])/(positions[index+1]-positions[index]),offset=(y*size+x)*4;
   for(let channel=0;channel<3;channel++)data[offset+channel]=Math.round(stops[index][channel]*(1-blend)+stops[index+1][channel]*blend);
   data[offset+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;gradients.set(scene,texture);
 }
 scene.background=gradients.get(scene);
}
export function disposePortraitBackground(scene){versions.set(scene,(versions.get(scene)||0)+1);gradients.get(scene)?.dispose();gradients.delete(scene);}
