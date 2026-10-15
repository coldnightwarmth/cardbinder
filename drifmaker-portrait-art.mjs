export const IMAGE_BACKGROUNDS=Object.freeze({spiral:'/assets/drifmaker/portrait/spiral.png',blackops:'/assets/drifmaker/portrait/black-ops.png'});
export const PORTRAIT_OVERLAYS=Object.freeze([
 {id:'none',label:'None'},
 {id:'hell',label:'Hell',src:'/assets/drifmaker/portrait/hell.png'},
 {id:'avantgarde',label:'Avant garde',src:'/assets/drifmaker/portrait/avant-garde.png'},
 {id:'ssdrip',label:'SS drip',src:'/assets/drifmaker/portrait/ss-drip.png'},
 {id:'911',label:'911',src:'/assets/drifmaker/portrait/911.png'},
 {id:'postdemon',label:'Postdemon',src:'/assets/drifmaker/portrait/postdemon.png'},
 {id:'splatter',label:'Splatter',src:'/assets/drifmaker/portrait/splatter.png'},
]);
export const normalizeOverlay=value=>PORTRAIT_OVERLAYS.some(option=>option.id===value)?value:'none';
const textures=new Map(),layers=new WeakMap(),versions=new WeakMap();
// The immutable source images are shared across preview/export contexts.
// Preserve their supplied alpha; a full-frame quad composites above the avatar.
export function loadPortraitTexture(THREE,src){
 if(!textures.has(src))textures.set(src,new THREE.TextureLoader().loadAsync(src).then(texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }).catch(error=>{textures.delete(src);throw error;}));
 return textures.get(src);
}
export async function setPortraitOverlay(THREE,scene,id){
 const version=(versions.get(scene)||0)+1;versions.set(scene,version);
 const option=PORTRAIT_OVERLAYS.find(option=>option.id===id),old=layers.get(scene);
 if(old)old.mesh.visible=false;
 if(!option?.src)return;
 const texture=await loadPortraitTexture(THREE,option.src);
 if(versions.get(scene)!==version)return;
 let layer=layers.get(scene);
 if(!layer){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  const overlayScene=new THREE.Scene();overlayScene.add(mesh);
  layer={mesh,scene:overlayScene,camera:new THREE.OrthographicCamera(-1,1,1,-1,0,2)};layer.camera.position.z=1;layers.set(scene,layer);
 }
 layer.mesh.material.map=texture;layer.mesh.material.needsUpdate=true;layer.mesh.visible=true;
}
export function renderPortraitScene(renderer,scene,camera){
 renderer.render(scene,camera);
 const layer=layers.get(scene);if(!layer?.mesh.visible)return;
 const autoClear=renderer.autoClear;renderer.autoClear=false;
 try{renderer.render(layer.scene,layer.camera);}finally{renderer.autoClear=autoClear;}
}
export function disposePortraitOverlay(scene){
 versions.set(scene,(versions.get(scene)||0)+1);
 const layer=layers.get(scene);layer?.mesh.geometry.dispose();layer?.mesh.material.dispose();layers.delete(scene);
}
