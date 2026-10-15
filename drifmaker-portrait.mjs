import {setPortraitSceneBackground,disposePortraitBackground} from './drifmaker-background.mjs?v=1';
import {createHeldCard,createHeldCardFollower,disposeHeldCard} from './drifmaker-held-card.mjs?v=1';
import {normalizePortraitPose} from './drifmaker-poses.mjs?v=2';
// Composition is shared by the fixed preview and its PNG export. These framing
// values remain explicit so matching collection references does not depend on
// the studio canvas size, orbit controls, animation time, or selected wardrobe.
// Native 1200 × 1295 dimensions are verified from Drifella #8446's PNG header:
// https://gateway.pinata.cloud/ipfs/bafybeickydqnfa3n2nbcihbbj5kpyudpid3yfrkxvt42qgbw7xjwfq4f7y/8446.png
// The camera is visually matched; the collection's original rig is unavailable.
export const PORTRAIT_COMPOSITION=Object.freeze({
 width:1200,height:1295,spanHeight:2.50,
 target:Object.freeze([0,1.88,0]),
 cameraPosition:Object.freeze([2.7,2.10,7]),
 modelYaw:0,background:'#dedfe5',exposure:1.1,
});

// Poses change the skeleton only. Keep the original portrait crop, even when
// hands or the lower body extend beyond it, for previews and every PNG export.
export function portraitPoseComposition(){return {};}

function compositionWith(overrides={}){
 const composition={...PORTRAIT_COMPOSITION,...overrides};
 for(const key of ['width','height'])if(!Number.isInteger(composition[key])||composition[key]<1||composition[key]>8192)throw Error('Portrait dimensions must be whole numbers between 1 and 8192 pixels.');
 if(!Number.isFinite(composition.spanHeight)||composition.spanHeight<=0)throw Error('Portrait framing must have a positive height.');
 for(const key of ['target','cameraPosition'])if(!Array.isArray(composition[key])||composition[key].length!==3||!composition[key].every(Number.isFinite))throw Error('Portrait camera positions must contain three finite coordinates.');
 if(!Number.isFinite(composition.modelYaw)||!Number.isFinite(composition.exposure)||composition.exposure<=0)throw Error('Portrait rotation and exposure must be finite.');
 return composition;
}

// createAvatar must create a fresh showroom clone. A fresh zero-delta update
// samples Neutral at exactly t=0; no warm-up loop or studio state is involved.
// Deliberately omit update from this facade so the portrait stays frozen.
export async function createPortraitAvatar({THREE,createAvatar,appearance,composition,pose=''}={}){
 if(typeof createAvatar!=='function')throw Error('A character factory is required for the portrait.');
 const framing=compositionWith(composition),avatar=await createAvatar({appearance});
 let card,followCard;
 function setPose(value){
  const id=normalizePortraitPose(value),holding=id==='holdcard';
  if(holding&&!card){
   if(!THREE)throw Error('Card portraits require THREE.');
   card=createHeldCard(THREE);avatar.model.add(card);followCard=createHeldCardFollower({THREE,card,avatar});
  }
  avatar.setPose?.(holding?'':id,{static:true,holding});
  avatar.update(0,0,holding,0,{crouch:0,jumpTime:-1});avatar.model.updateMatrixWorld(true);
  if(card){card.visible=holding;if(holding)followCard();}
 }
 try{
  avatar.model.position.set(0,0,0);avatar.model.rotation.set(0,framing.modelYaw,0);avatar.model.scale.setScalar(1);
  setPose(pose);
 }catch(error){if(card)disposeHeldCard(card);avatar.dispose();throw error;}
 return {model:avatar.model,get appearance(){return avatar.appearance;},setAppearance(value){return avatar.setAppearance(value);},setPose,dispose(){if(card)disposeHeldCard(card);avatar.dispose();}};
}

export function configurePortraitCamera(THREE,camera,composition){
 const framing=compositionWith(composition);
 if(!camera?.isOrthographicCamera)throw Error('Portraits require an orthographic camera.');
 const halfHeight=framing.spanHeight/2,halfWidth=halfHeight*framing.width/framing.height;
 camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;
 camera.near=.01;camera.far=100;
 camera.position.fromArray(framing.cameraPosition);camera.up.set(0,1,0);
 camera.lookAt(new THREE.Vector3().fromArray(framing.target));
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 return camera;
}

// A dedicated renderer avoids resizing or resetting the live studio renderer.
// Clone the camera too: exporting must not alter either visible preview mode.
export async function capturePortrait({THREE,scene,camera,composition,rendererFactory,environmentFactory}={}){
 const framing=compositionWith(composition),exportCamera=configurePortraitCamera(THREE,camera.clone(),framing);
 const createRenderer=rendererFactory??(options=>new THREE.WebGLRenderer(options));
 let renderer,environment;
 const exportScene=scene.clone(false);
 exportScene.children=[...scene.children];
 try{
  renderer=createRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(framing.width,framing.height,false);
  renderer.setClearColor(framing.background==='rainbow'?0:framing.background,1);
  setPortraitSceneBackground(THREE,exportScene,framing.background);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=framing.exposure;
  if(environmentFactory){environment=environmentFactory(renderer);exportScene.environment=environment.texture;}
  renderer.render(exportScene,exportCamera);
  return await new Promise((resolve,reject)=>{
   renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('The portrait could not be encoded as a PNG. Please try again.')),'image/png');
  });
 }finally{
  disposePortraitBackground(exportScene);environment?.dispose();
  if(renderer){try{renderer.dispose();}finally{renderer.forceContextLoss?.();}}
 }
}
