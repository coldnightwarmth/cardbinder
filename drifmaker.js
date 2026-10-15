import * as THREE from 'three';
import {createShowroomAvatar} from './showroom-avatar.js?v=13';
import {BODY_COLORS,BODY_STYLES,PORTRAIT_BACKGROUNDS,CATEGORIES,DEFAULT_APPEARANCE,normalizeAppearance,loadAppearance,saveAppearance} from './drifmaker-config.mjs?v=4';
import {PORTRAIT_COMPOSITION,createPortraitAvatar,configurePortraitCamera,capturePortrait} from './drifmaker-portrait.mjs?v=2';
import {createDrifmakerEnvironment} from './drifmaker-lighting.mjs?v=1';
import {jumpHeight} from './showroom-locomotion.mjs?v=2';

const $=selector=>document.querySelector(selector);
const canvas=$('#characterView'),stage=$('#stage'),controls=$('#editorControls');
const saved=loadAppearance();
let appearance={...saved},avatar,renderer,scene,camera,card,environment;
let motion='idle',holding=false,autoRotate=false,elapsed=0,settled=0,yaw=.18,pitch=.08,distance=7.0;
let viewMode='studio',portraitAvatar,portraitScene,portraitCamera,portraitDirty=true,exporting=false;
let portraitBackground=PORTRAIT_COMPOSITION.background;
let toastTimer,changeVersion=0,disposed=false,frameId,previousTime=0;
const target=new THREE.Vector3(0,1.55,0),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const titles={eyes:'Eyes',mouth:'Mouth',shirt:'Tops',legs:'Pants & legs',hat:'Hats',accessory:'Accessories',head:'Heads',extra:'Extra',nose:'Nose',ears:'Ears',tattoo:'Tattoos'};
const categoryOrder=['body','head','eyes','mouth','nose','ears','tattoo','shirt','legs','hat','accessory','extra'];
let activeCategory='eyes';
const iconPaths={
  spiral:'<path d="M10 11c0-5-9-5-9 0s9 6 9 1-6-4-6-1 3 2 3 0m16 0c0-5-9-5-9 0s9 6 9 1-6-4-6-1 3 2 3 0"/>',
  backpack:'<path d="M7 7V5c0-4 10-4 10 0v2M4 8c0-3 16-3 16 0v12H4zM7 14h10v6H7zM2 10v8m20-8v8M9 10h1m4 0h1"/>',
  classic:'<path d="M4 9h5v8H4zM15 9h5v8h-5z"/><path d="M6 10v3m11-3v3" stroke-width="2.5"/>',
  sleepy:'<path d="M3 12c2 3 5 3 7 0m4 0c2 3 5 3 7 0M5 15l-1 2m14-2 1 2"/>',
  star:'<path d="m6 5 1.6 4 4.4.4-3.3 2.8 1 4.3L6 14l-3.7 2.5 1-4.3L0 9.4l4.4-.4zM18 5l1.6 4 4.4.4-3.3 2.8 1 4.3L18 14l-3.7 2.5 1-4.3L12 9.4l4.4-.4z"/>',
  shirt_original:'<path d="m8 4-5 3-2 7 4 1 1-4v10h12V11l1 4 4-1-2-7-5-3M8 4c0 5 8 5 8 0M9 16h6v3H9zM11 9v4m2-4v4"/>',
  denim:'<path d="m8 4-5 3-2 7 4 1 1-4v10h12V11l1 4 4-1-2-7-5-3M8 4l4 4 4-4M12 8v13M6 18h12M7 11l2 3 2-3M5 8v5m14-5v5"/>',
  bomber:'<path d="m8 4-5 3-2 7 4 1 1-4v10h12V11l1 4 4-1-2-7-5-3M8 4c0 4 8 4 8 0M12 7v14M6 18h12M7 13l2 2m8-2-2 2"/>',
  none:'<circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/><path d="m7 17 10-10"/>',
  cap:'<path d="M4 15V11a8 8 0 0 1 16 0v4H4Zm0 0c-5 2-4 5 3 4l13-4M12 4c-3 2-4 6-4 11M12 3v2"/>',
  beanie:'<path d="M5 15V10a7 7 0 0 1 14 0v5M4 15h16v6H4zM8 7v8m4-10v10m4-8v8M10 17h4v2h-4z"/>',
  party:'<path d="m12 3 9 18H3zM8 11h8M6 16h12"/><circle cx="12" cy="3" r="2"/>',
  accessory_original:'<path d="m5 3 13 13M7 3l13 13M5 14h13l2 7H4zM6 16h12M11 15v3"/>',
  headphones:'<path d="M4 14V10a8 8 0 0 1 16 0v4M6 12H3v8h4v-8Zm12 0h3v8h-4v-8ZM7 9a5 5 0 0 1 10 0"/>',
  necklace:'<path d="M5 3c0 11 14 11 14 0M12 11v2M7 18h10"/><circle cx="12" cy="18" r="5"/><circle cx="12" cy="18" r="1.3"/>',
};
function icon(category,id){return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[`${category}_${id}`]||iconPaths[id]||iconPaths.none}</svg>`;}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function activateCategory(category,focus=false){
 activeCategory=category;
 for(const button of document.querySelectorAll('[data-category-tab]')){
  const active=button.dataset.categoryTab===category;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  if(active&&focus)button.focus();
 }
 for(const section of controls.querySelectorAll('.control-section'))section.hidden=section.id!==`category-${category}`;
 controls.scrollTop=0;
}
function makeControls(){
 const nav=$('.category-nav');
 for(const category of categoryOrder){
  const button=document.createElement('button');button.type='button';button.dataset.categoryTab=category;button.id=`tab-${category}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',`category-${category}`);
  const label=category==='body'?'Color':category==='accessory'?'Gear':category==='legs'?'Legs':titles[category];
  button.textContent=label;
  button.onclick=()=>activateCategory(category);nav.append(button);
 }
 nav.addEventListener('keydown',event=>{
  const index=categoryOrder.indexOf(activeCategory),next={ArrowRight:(index+1)%categoryOrder.length,ArrowLeft:(index+categoryOrder.length-1)%categoryOrder.length,Home:0,End:categoryOrder.length-1}[event.key];
  if(next!==undefined){event.preventDefault();activateCategory(categoryOrder[next],true);}
 });
 const panel=(category)=>{const section=document.createElement('section');section.className='control-section';section.id=`category-${category}`;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',`tab-${category}`);return section;};
 const body=panel('body');
 body.innerHTML='<div class="section-heading"><h3>Body color</h3><span class="selected-label" id="bodyLabel"></span></div><div class="palette" role="group" aria-label="Body color"></div>';
 for(const color of BODY_COLORS){const button=document.createElement('button');button.className='swatch';button.type='button';button.style.setProperty('--swatch',color.hex);button.dataset.color=color.hex;button.title=color.label;button.setAttribute('aria-label',`${color.label} body color`);button.onclick=()=>select({bodyColor:color.hex,bodyStyle:color.style||(appearance.bodyStyle==='gold'?'solid':appearance.bodyStyle)});body.querySelector('.palette').append(button);}
 const custom=document.createElement('label');custom.className='custom-color';custom.title='Custom body color';custom.innerHTML='<input type="color" id="customColor" aria-label="Custom body color"><span aria-hidden="true">+</span>';body.querySelector('.palette').append(custom);custom.querySelector('input').addEventListener('input',event=>select({bodyColor:event.target.value,bodyStyle:appearance.bodyStyle==='gold'?'solid':appearance.bodyStyle}));const finish=document.createElement('div');finish.className='body-finishes';finish.setAttribute('role','group');finish.setAttribute('aria-label','Body finish');
 for(const style of BODY_STYLES){const button=document.createElement('button');button.type='button';button.dataset.bodyStyle=style.id;button.textContent=style.label;button.title=style.label;button.onclick=()=>select({bodyStyle:style.id});finish.append(button);}
 body.append(finish);controls.append(body);
 for(const category of categoryOrder.filter(item=>item!=='body')){
  const options=CATEGORIES[category],section=panel(category);
  const heading=document.createElement('div');heading.className='section-heading';heading.innerHTML=`<h3>${titles[category]}</h3><span class="selected-label" data-label="${category}"></span>`;section.append(heading);
  if(['eyes','mouth','nose','ears','tattoo'].includes(category)){const note=document.createElement('p');note.className='head-override-note';note.dataset.overrideNotice=category;note.textContent='Head overrides face traits.';note.hidden=true;section.append(note);}
  const grid=document.createElement('div');grid.className='options';grid.setAttribute('role','group');grid.setAttribute('aria-label',titles[category]);
  for(const option of options){const button=document.createElement('button');button.className='option';button.type='button';button.dataset.category=category;button.dataset.option=option.id;button.title=option.label;button.innerHTML=`<span class="option-art">${icon(category,option.id)}</span>`;const label=document.createElement('span');label.className='option-label';label.textContent=option.label;button.append(label);button.onclick=()=>select({[category]:option.id});grid.append(button);}
  section.append(grid);controls.append(section);
 }
 updateControls();activateCategory(activeCategory);
}
function updateControls(){
 for(const button of controls.querySelectorAll('[data-body-style]'))button.setAttribute('aria-pressed',String(button.dataset.bodyStyle===appearance.bodyStyle));
 for(const notice of controls.querySelectorAll('[data-override-notice]'))notice.hidden=appearance.head==='original';
 for(const button of controls.querySelectorAll('[data-color]'))button.setAttribute('aria-pressed',String(button.dataset.color.toLowerCase()===appearance.bodyColor.toLowerCase()));
 $('#bodyLabel').textContent=BODY_COLORS.find(color=>color.hex.toLowerCase()===appearance.bodyColor.toLowerCase())?.label||'Custom';$('#customColor').value=appearance.bodyColor;
 for(const button of controls.querySelectorAll('[data-option]'))button.setAttribute('aria-pressed',String(appearance[button.dataset.category]===button.dataset.option));
 for(const [category,options] of Object.entries(CATEGORIES)){const option=options.find(option=>option.id===appearance[category]);controls.querySelector(`[data-label="${category}"]`).textContent=option?.label||'';}
}
async function select(patch){
 const version=++changeVersion,previous=appearance;appearance=normalizeAppearance({...appearance,...patch});updateControls();
 if(!avatar)return;
 try{await avatar.setAppearance(appearance);if(portraitAvatar)await portraitAvatar.setAppearance(appearance);portraitDirty=true;}catch(error){if(version!==changeVersion)return;appearance=previous;updateControls();toast('That look could not load. Please try again.');console.error(error);}
}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#randomize').onclick=()=>{const random=items=>items[Math.floor(Math.random()*items.length)];setPortraitBackground(random(PORTRAIT_BACKGROUNDS).hex);select({bodyStyle:random(BODY_STYLES).id,bodyColor:random(BODY_COLORS).hex,...Object.fromEntries(Object.entries(CATEGORIES).map(([key,options])=>[key,random(options).id]))});};
$('#resetLook').onclick=()=>{select(DEFAULT_APPEARANCE);toast('Look reset.');};
$('#applyLook').onclick=async()=>{
 const button=$('#applyLook');button.disabled=true;
 try{await avatar.setAppearance(appearance);saveAppearance(appearance);updateControls();location.assign('/show');}
 catch(error){toast('Could not save this look. Check that browser storage is available.');console.error(error);button.disabled=false;}
};
$('#exportLook').onclick=()=>{download(new Blob([JSON.stringify({version:4,appearance},null,2)],{type:'application/json'}),'my-drifella.json');toast('Look exported.');};
$('#importLook').onclick=()=>$('#lookFile').click();
$('#lookFile').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{if(file.size>16384)throw Error('Too large');const data=JSON.parse(await file.text()),value=data.appearance||data;
  if((value?.bodyStyle!==undefined&&!BODY_STYLES.some(style=>style.id===value.bodyStyle))||!value||typeof value!=='object'||Array.isArray(value)||!/^#[a-f\d]{6}$/i.test(value.bodyColor)||!Object.entries(CATEGORIES).every(([key,options])=>(['legs','mouth','head','extra','nose','ears','tattoo'].includes(key)&&!Object.hasOwn(value,key))||options.some(option=>option.id===value[key])))throw Error('Invalid look');
  await select(normalizeAppearance(value));toast('Look imported.');
 }catch{toast('Choose a valid Drifmaker look exported from this editor.');}
};
for(const button of document.querySelectorAll('[data-motion]'))button.onclick=()=>{motion=button.dataset.motion;elapsed=0;settled=0;for(const option of document.querySelectorAll('[data-motion]'))option.setAttribute('aria-pressed',String(option===button));};
$('#holdCard').onchange=event=>{holding=event.target.checked;settled=0;if(card)card.visible=holding;};
$('#resetView').onclick=()=>{yaw=.18;pitch=.08;distance=7.0;autoRotate=false;$('#rotateView').setAttribute('aria-pressed','false');};
$('#rotateView').onclick=()=>{autoRotate=!autoRotate;$('#rotateView').setAttribute('aria-pressed',String(autoRotate));};
$('#captureView').onclick=()=>{if(viewMode==='portrait'){void exportPortrait();return;}if(!renderer)return;renderer.render(scene,camera);canvas.toBlob(blob=>{if(blob)download(blob,'my-drifella.png');else toast('The portrait could not be captured.');});};

let drag=null,pinchDistance=0;
const pointers=new Map();
const fingerDistance=()=>{const [a,b]=[...pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
canvas.addEventListener('pointerdown',event=>{
 if(viewMode==='portrait'||pointers.size>=2)return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);
 if(pointers.size===2){pinchDistance=fingerDistance();drag=null;}else drag={id:event.pointerId,x:event.clientX,y:event.clientY};
});
canvas.addEventListener('pointermove',event=>{
 if(viewMode==='portrait'||!pointers.has(event.pointerId))return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2){const next=fingerDistance();if(next>0&&pinchDistance>0)distance=THREE.MathUtils.clamp(distance*pinchDistance/next,3.8,9);pinchDistance=next;return;}
 if(!drag||drag.id!==event.pointerId)return;
 yaw-=(event.clientX-drag.x)*.007;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-drag.y)*.005,-.18,.7);drag.x=event.clientX;drag.y=event.clientY;
});
const release=event=>{pointers.delete(event.pointerId);pinchDistance=0;const remaining=[...pointers.entries()][0];drag=remaining?{id:remaining[0],...remaining[1]}:null;};
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('wheel',event=>{if(viewMode==='portrait')return;event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.006,3.8,9);},{passive:false});
canvas.addEventListener('keydown',event=>{if(viewMode==='portrait')return;const moves={ArrowLeft:()=>yaw-=.15,ArrowRight:()=>yaw+=.15,ArrowUp:()=>pitch=THREE.MathUtils.clamp(pitch+.1,-.18,.7),ArrowDown:()=>pitch=THREE.MathUtils.clamp(pitch-.1,-.18,.7),'+':()=>distance=Math.max(3.8,distance-.3),'=':()=>distance=Math.max(3.8,distance-.3),'-':()=>distance=Math.min(9,distance+.3)};if(moves[event.key]){event.preventDefault();moves[event.key]();}});
function resize(){
 if(!renderer)return;
 const {width,height}=stage.getBoundingClientRect();
 if(viewMode==='portrait'){
  const ratio=PORTRAIT_COMPOSITION.width/PORTRAIT_COMPOSITION.height,frameHeight=Math.max(1,Math.min(height-28,(width-48)/ratio)),frameWidth=frameHeight*ratio;
  renderer.setSize(Math.max(1,Math.round(frameWidth)),Math.max(1,Math.round(frameHeight)),false);canvas.style.width=`${frameWidth}px`;canvas.style.height=`${frameHeight}px`;portraitDirty=true;
 }else{renderer.setSize(width,height,false);canvas.style.width='100%';canvas.style.height='100%';camera.aspect=width/height;camera.updateProjectionMatrix();}
}
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
function cameraPose(){const jumping=motion==='jump',fitted=distance*Math.max(1,.8/camera.aspect)*(jumping?1.2:1),aimY=target.y+(jumping?.4+Math.max(0,avatar?.model.position.y||0)*.2:0);camera.position.set(Math.sin(yaw)*Math.cos(pitch)*fitted,aimY+Math.sin(pitch)*fitted,Math.cos(yaw)*Math.cos(pitch)*fitted);camera.lookAt(target.x,aimY,target.z);}
function frame(now){
 if(disposed)return;frameId=requestAnimationFrame(frame);if(document.hidden){previousTime=now;return;}
 const dt=Math.min((now-(previousTime||now))/1000,.05);previousTime=now;
 if(viewMode==='portrait'){if(portraitDirty&&portraitScene){renderer.render(portraitScene,portraitCamera);portraitDirty=false;}return;}
 elapsed+=dt;settled+=dt;if(autoRotate&&pointers.size===0)yaw+=dt*.3;
 if(avatar){const jumpTime=motion==='jump'?((elapsed%2.4)<1.1?elapsed%2.4:-1):-1,crouch=['crouch','sneak'].includes(motion)?1:0,velocity=motion==='walk'?1.25:motion==='sneak'?.65:0;
  avatar.update(reducedMotion&&motion==='idle'&&settled>.8?0:dt,velocity,holding,0,{crouch,jumpTime});avatar.model.position.y=jumpHeight(jumpTime);
 }
 cameraPose();renderer.render(scene,camera);
}
function setViewMode(mode){
 if(mode==='portrait'&&!portraitAvatar)return;
 viewMode=mode;pointers.clear();drag=null;pinchDistance=0;
 const fixed=mode==='portrait';$('.studio').classList.toggle('is-portrait',fixed);stage.dataset.view=mode;
 $('#studioMode').setAttribute('aria-pressed',String(!fixed));$('#portraitMode').setAttribute('aria-pressed',String(fixed));
 $('.motion-panel').hidden=fixed;$('#portraitControls').hidden=!fixed;
 $('#resetView').hidden=fixed;$('#rotateView').hidden=fixed;
 canvas.setAttribute('aria-label',fixed?'Drifella portrait preview. Fixed pose and camera.':'3D Drifella preview. Drag or use arrow keys to rotate. Scroll or use plus and minus to zoom.');
 canvas.tabIndex=fixed?-1:0;
 previousTime=0;resize();
}
$('#studioMode').onclick=()=>setViewMode('studio');$('#portraitMode').onclick=()=>setViewMode('portrait');
function setPortraitBackground(hex){
 if(!/^#[a-f\d]{6}$/i.test(hex))return;
 portraitBackground=hex.toLowerCase();portraitScene?.background.set(portraitBackground);portraitDirty=true;
 for(const swatch of $('#portraitPalette').children)swatch.setAttribute('aria-pressed',String(swatch.dataset.background===portraitBackground));
 $('#backgroundPreview').style.background=portraitBackground;
 $('#backgroundPreview').title=PORTRAIT_BACKGROUNDS.find(color=>color.hex===portraitBackground)?.label||'Custom';
 $('#customBackground').value=portraitBackground;
}
for(const background of PORTRAIT_BACKGROUNDS){
 const button=document.createElement('button');button.type='button';button.className='swatch';button.dataset.background=background.hex;button.style.setProperty('--swatch',background.hex);button.setAttribute('aria-label',`${background.label} portrait background`);button.title=background.label;
 button.onclick=()=>setPortraitBackground(background.hex);$('#portraitPalette').append(button);
}
$('#customBackground').addEventListener('input',event=>setPortraitBackground(event.target.value));
setPortraitBackground(portraitBackground);
async function exportPortrait(){
 if(!portraitAvatar||exporting)return;
 exporting=true;$('#exportPortrait').disabled=true;$('#captureView').disabled=true;$('#exportPortrait').textContent='Preparing PNG…';
 try{
  const blob=await capturePortrait({THREE,scene:portraitScene,camera:portraitCamera,composition:{background:portraitBackground},environmentFactory:createDrifmakerEnvironment});
  if(disposed)return;
  const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not prepare the PNG.'));reader.readAsDataURL(blob);});
  if(disposed)return;
  $('#exportedPortrait').src=dataURL;$('#savePortraitFile').href=dataURL;
  $('#savePortraitFile').download=`drifella-${PORTRAIT_COMPOSITION.width}x${PORTRAIT_COMPOSITION.height}.png`;
  $('#portraitFileDetails').textContent=`${PORTRAIT_COMPOSITION.width} × ${PORTRAIT_COMPOSITION.height} pixels · PNG · ${Math.round(blob.size/1024)} KB`;
  $('#portraitExportDialog').showModal();
 }catch(error){console.error(error);toast('The PNG could not be exported. Please try again.');}
 finally{exporting=false;$('#exportPortrait').disabled=false;$('#captureView').disabled=false;$('#exportPortrait').innerHTML='Export PNG <span aria-hidden="true">↗</span>';}
}
$('#exportPortrait').onclick=exportPortrait;$('#closePortraitDialog').onclick=()=>$('#portraitExportDialog').close();
async function setupPortrait(){
 portraitAvatar=await createPortraitAvatar({createAvatar:createShowroomAvatar,appearance});if(disposed){portraitAvatar.dispose();return;}
 await portraitAvatar.setAppearance(appearance);
 portraitScene=new THREE.Scene();portraitScene.environment=environment.texture;portraitScene.background=new THREE.Color(portraitBackground);portraitScene.add(portraitAvatar.model);
 portraitScene.add(new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
 const key=new THREE.DirectionalLight(0xfff5df,3.2);key.position.set(-3,7,5);portraitScene.add(key);
 const fill=new THREE.DirectionalLight(0xa9d4ec,1.2);fill.position.set(4,3,-4);portraitScene.add(fill);
 portraitCamera=configurePortraitCamera(THREE,new THREE.OrthographicCamera());
 $('#portraitMode').disabled=false;$('#exportPortrait').disabled=false;
}
// Render catalog portraits with an independent avatar, so browsing and animation
// remain responsive while thumbnails are prepared a few at a time.
async function makeThumbnails(){
 let preview,previewRenderer,previewEnvironment;
 try{
  preview=await createShowroomAvatar();if(disposed){preview.dispose();return;}
  preview.model.position.set(0,0,0);preview.model.rotation.set(0,0,0);preview.model.scale.setScalar(1);preview.update(.001,0,false);
  const thumbnailScene=new THREE.Scene();thumbnailScene.add(preview.model,new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
  const light=new THREE.DirectionalLight(0xfff5df,3.2);light.position.set(-3,7,5);thumbnailScene.add(light);
  const fill=new THREE.DirectionalLight(0xa9d4ec,1.2);fill.position.set(4,3,-4);thumbnailScene.add(fill);
  previewRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true});previewRenderer.setSize(180,132);previewRenderer.outputColorSpace=THREE.SRGBColorSpace;previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.1;
  previewEnvironment=createDrifmakerEnvironment(previewRenderer);thumbnailScene.environment=previewEnvironment.texture;
  const portraitCamera=new THREE.OrthographicCamera(-1,1,1,-1,.05,20);
  const views={eyes:{y:2.23,height:.70},mouth:{y:1.87,height:.60},shirt:{y:1.18,height:1.45},legs:{y:.47,height:1.08},hat:{y:2.82,height:1.68},accessory:{y:1.5,height:2.55},head:{y:2.25,height:2.05},extra:{y:1.80,height:3.25},nose:{y:1.98,height:.40},ears:{y:2.35,height:2.0},tattoo:{y:2.22,height:1.25}};
  const remaining=[...controls.querySelectorAll('[data-option]')].filter(button=>button.dataset.option!=='none');
  while(remaining.length&&!disposed){
   for(let batch=0;batch<3&&remaining.length;batch++){
    const preferred=remaining.findIndex(button=>button.dataset.category===activeCategory),button=remaining.splice(preferred<0?0:preferred,1)[0],{category,option}=button.dataset;
    const view=views[category],rear=category==='accessory'&&['backpack','wings','skateboard','sword','angelwings','batwings','mechwings','shield','machinegun'].includes(option);
    await preview.setAppearance({...DEFAULT_APPEARANCE,accessory:'none',[category]:option});
    portraitCamera.top=view.height/2;portraitCamera.bottom=-view.height/2;portraitCamera.right=view.height*180/132/2;portraitCamera.left=-portraitCamera.right;portraitCamera.updateProjectionMatrix();
    portraitCamera.position.set(category==='accessory'?(rear?-.9:.7):0,view.y+.03,rear?-5:5);portraitCamera.lookAt(0,view.y,0);
    previewRenderer.render(thumbnailScene,portraitCamera);
    const portrait=new Image();portrait.width=180;portrait.height=132;portrait.alt='';portrait.decoding='async';portrait.src=previewRenderer.domElement.toDataURL('image/webp',.88);button.querySelector('.option-art').replaceChildren(portrait);
   }
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
 }catch(error){console.warn('Wardrobe thumbnails are unavailable; the 3D editor is still ready.',error);}
 finally{preview?.dispose();previewEnvironment?.dispose();previewRenderer?.dispose();previewRenderer?.forceContextLoss();}
}
async function init(){
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();environment=createDrifmakerEnvironment(renderer);scene.environment=environment.texture;scene.background=new THREE.Color('#dfe7e5');scene.fog=new THREE.Fog('#dfe7e5',12,25);camera=new THREE.PerspectiveCamera(33,1,.05,40);
  scene.add(new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
  const key=new THREE.DirectionalLight(0xfff5df,3.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);
  const fill=new THREE.DirectionalLight(0xa9d4ec,1.2);fill.position.set(4,3,-4);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#dfe7e5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.055;ground.receiveShadow=true;scene.add(ground);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.99,1.02,.065,80),new THREE.MeshStandardMaterial({color:'#e9eee4',roughness:.8}));plinth.position.y=-.038;plinth.receiveShadow=true;scene.add(plinth);
  resize();frameId=requestAnimationFrame(frame);
  avatar=await createShowroomAvatar({appearance});if(disposed){avatar.dispose();return;}avatar.model.position.set(0,0,0);avatar.model.rotation.y=0;avatar.model.scale.setScalar(1);scene.add(avatar.model);
  avatar.model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
  card=new THREE.Mesh(new THREE.BoxGeometry(.19,.27,.009),[new THREE.MeshStandardMaterial({color:0xf4e7c7}),new THREE.MeshStandardMaterial({color:0xf4e7c7}),new THREE.MeshStandardMaterial({color:0xf4e7c7}),new THREE.MeshStandardMaterial({color:0xf4e7c7}),new THREE.MeshStandardMaterial({color:0xd5ed7c,roughness:.7}),new THREE.MeshStandardMaterial({color:0x354d43,roughness:.6})]);card.position.set(0,.11,0);card.visible=holding;card.castShadow=true;avatar.socket?.add(card);
  settled=0;$('#loadState').hidden=true;controls.inert=false;for(const id of ['randomize','resetLook','applyLook','exportLook','importLook','captureView','studioMode'])$(`#${id}`).disabled=false;
  void setupPortrait().catch(error=>{console.error(error);toast('Portrait mode could not load. Reload to try again.');});
  void makeThumbnails();
 }catch(error){console.error(error);$('#loadState').replaceChildren();const message=document.createElement('strong');message.textContent='Model could not load.';const detail=document.createElement('span');detail.textContent='Check your connection and retry.';const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();$('#loadState').append(message,detail,retry);}
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('The 3D preview was interrupted. Reload to restore it.');$('#applyLook').disabled=true;});
function cleanup(){if(disposed)return;disposed=true;cancelAnimationFrame(frameId);clearTimeout(toastTimer);resizeObserver.disconnect();if(card){card.removeFromParent();card.geometry.dispose();for(const material of [].concat(card.material))material.dispose();}avatar?.dispose();portraitAvatar?.dispose();scene?.traverse(node=>{if(node===card||!node.isSkinnedMesh){node.geometry?.dispose();if(node.material)for(const material of [].concat(node.material))material.dispose();}});environment?.dispose();renderer?.dispose();}
addEventListener('pagehide',event=>{if(!event.persisted)cleanup();});
makeControls();
init();
