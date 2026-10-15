import {setPortraitOverlay,renderPortraitScene,disposePortraitOverlay} from './drifmaker-portrait-art.mjs?v=1';
import {setPortraitSceneBackground,disposePortraitBackground} from './drifmaker-background.mjs?v=2';
import {createPortraitAvatar,configurePortraitCamera,portraitPoseComposition,PORTRAIT_COMPOSITION} from './drifmaker-portrait.mjs?v=7';
import {normalizeLook} from './drifmaker-bookmarks.mjs?v=10';

// One private avatar/context serves the gallery and ZIP, serially. Neither
// exporting nor thumbnail generation changes the editor's active selection.
export function createBookmarkRenderer({THREE,createAvatar,environmentFactory,rendererFactory=options=>new THREE.WebGLRenderer(options)}){
 let session,queue=Promise.resolve(),closed=false;
 async function initialize(){
  let avatar,renderer,environment;
  try{
   avatar=await createPortraitAvatar({THREE,createAvatar});
   renderer=rendererFactory({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=PORTRAIT_COMPOSITION.exposure;
   environment=environmentFactory(renderer);
   const scene=new THREE.Scene();scene.environment=environment.texture;scene.add(avatar.model,new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
   const key=new THREE.DirectionalLight(0xfff5df,3.2);key.position.set(-3,7,5);scene.add(key);
   const fill=new THREE.DirectionalLight(0xa9d4ec,1.2);fill.position.set(4,3,-4);scene.add(fill);
   return {avatar,renderer,environment,scene,camera:new THREE.OrthographicCamera()};
  }catch(error){avatar?.dispose();environment?.dispose();renderer?.dispose();renderer?.forceContextLoss?.();throw error;}
 }
 return {
  render(value,{thumbnail=false}={}){
   const look=normalizeLook(value);
   const job=queue.then(async()=>{
    if(closed)throw Error('Portrait renderer is closed.');
    if(!session)session=await initialize();
    const {avatar,renderer,scene,camera}=session;
    await avatar.setAppearance(look.appearance);avatar.setPose(look.portrait.posesEnabled?look.portrait.pose:'');
    const composition={...PORTRAIT_COMPOSITION,...portraitPoseComposition(look.portrait.posesEnabled?look.portrait.pose:''),background:look.portrait.background,...(thumbnail?{width:240,height:259}:{})};
    configurePortraitCamera(THREE,camera,composition);renderer.setSize(composition.width,composition.height,false);renderer.setClearColor(/^#/.test(composition.background)?composition.background:0,1);await setPortraitSceneBackground(THREE,scene,composition.background);await setPortraitOverlay(THREE,scene,look.portrait.overlay);renderPortraitScene(renderer,scene,camera);
    return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('Could not render the bookmarked portrait.')),thumbnail?'image/webp':'image/png',.9));
   });
   queue=job.catch(()=>{});return job;
  },
  async dispose(){closed=true;await queue;if(session){disposePortraitOverlay(session.scene);disposePortraitBackground(session.scene);session.avatar.dispose();session.environment.dispose();session.renderer.dispose();session.renderer.forceContextLoss?.();session=null;}},
 };
}
