import {PORTRAIT_OVERLAYS,setPortraitOverlay,renderPortraitScene,disposePortraitOverlay} from './drifmaker-portrait-art.mjs?v=2';
import {createHeldCard,createHeldCardFollower,disposeHeldCard} from './drifmaker-held-card.mjs?v=1';
import {validPortraitBackground,backgroundCSS,setPortraitSceneBackground,disposePortraitBackground} from './drifmaker-background.mjs?v=3';
import {createLookHistory,normalizeLook} from './drifmaker-bookmarks.mjs?v=13';
import {createBookmarkControls} from './drifmaker-bookmark-controls.mjs?v=13';
import {createBookmarkRenderer} from './drifmaker-bookmark-renderer.mjs?v=13';
import {POSES,PORTRAIT_POSES,normalizePose,normalizePortraitPose} from './drifmaker-poses.mjs?v=5';
import {randomizeLook,exportRarity,importRarity} from './drifmaker-rarity.mjs?v=15';
import {createRarityEditor} from './drifmaker-rarity-controls.mjs?v=15';
import * as THREE from 'three';
import {createShowroomAvatar} from './showroom-avatar.js?v=29';
import {BODY_COLORS,BODY_STYLES,BODY_STYLE_COLORS,LEG_OVERRIDE_TOPS,isOriginalHead,EAR_COMPATIBLE_HEADS,PORTRAIT_BACKGROUNDS,CATEGORIES,DEFAULT_APPEARANCE,normalizeAppearance,loadAppearance} from './drifmaker-config.mjs?v=16';
import {PORTRAIT_COMPOSITION,createPortraitAvatar,configurePortraitCamera,capturePortrait,portraitPoseComposition} from './drifmaker-portrait.mjs?v=9';
import {createDrifmakerEnvironment} from './drifmaker-lighting.mjs?v=1';
import {jumpHeight} from './showroom-locomotion.mjs?v=2';

const $=selector=>document.querySelector(selector);
const canvas=$('#characterView'),stage=$('#stage'),controls=$('#editorControls');
const saved=loadAppearance();
let appearance={...saved},avatar,renderer,scene,camera,card,environment;
let portraitPose='salute',portraitPosesEnabled=false;
let motion='idle',holding=false,autoRotate=false,elapsed=0,settled=0,yaw=.18,pitch=.08,distance=7.0;
let viewMode='studio',portraitAvatar,portraitScene,portraitCamera,portraitDirty=true,exporting=false;
let portraitBackground=PORTRAIT_COMPOSITION.background,portraitOverlay='none';
let toastTimer,changeVersion=0,disposed=false,frameId,previousTime=0;
const target=new THREE.Vector3(0,1.55,0),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let bookmarkControls,followHeldCard;
function activateSidebar(name,focus=false){
 for(const id of ['editor','bookmarks']){const active=id===name,button=$('#'+id+'Tab');button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('#'+id+'Panel').hidden=!active;if(active&&focus)button.focus();}
 if(name==='bookmarks')bookmarkControls?.refresh();
}
for(const name of ['editor','bookmarks'])$('#'+name+'Tab').onclick=()=>activateSidebar(name);
$('.sidebar-tabs').onkeydown=event=>{const current=$('#editorTab').getAttribute('aria-selected')==='true'?'editor':'bookmarks';const next={ArrowLeft:current==='editor'?'bookmarks':'editor',ArrowRight:current==='editor'?'bookmarks':'editor',Home:'editor',End:'bookmarks'}[event.key];if(next){event.preventDefault();activateSidebar(next,true);}};
const bookmarkRenderer=createBookmarkRenderer({THREE,createAvatar:createShowroomAvatar,environmentFactory:createDrifmakerEnvironment});
function currentLook(){return {appearance,portrait:{background:portraitBackground,overlay:portraitOverlay,posesEnabled:portraitPosesEnabled,pose:portraitPose}};}
const history=createLookHistory(currentLook());
const titles={brows:'Eyebrows',eyes:'Eyes',mouth:'Mouth',shirt:'Tops',legs:'Pants & legs',hat:'Hats',accessory:'Accessories',head:'Heads',extra:'Extra',nose:'Nose',ears:'Ears',tattoo:'Tattoos',overlay:'Overlay',background:'Background',pose:'Poses'};
const categoryOrder=['body','head','eyes','brows','mouth','nose','ears','tattoo','shirt','legs','hat','accessory','extra','background','overlay','pose'];
let activeCategory='eyes';
const rarityEditor=createRarityEditor({onError:toast});
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
 for(const color of BODY_COLORS){const button=document.createElement('button');button.className='swatch';button.type='button';button.style.setProperty('--swatch',color.style==='holographic'?'linear-gradient(125deg,#ff8ccc,#b1fff1,#f1f393,#a8b8ff,#fc93e5)':color.hex);button.dataset.color=color.hex;button.title=color.label;button.setAttribute('aria-label',`${color.label} body color`);button.onclick=()=>select({bodyColor:color.hex,bodyStyle:color.style||(Object.hasOwn(BODY_STYLE_COLORS,appearance.bodyStyle)?'solid':appearance.bodyStyle)});body.querySelector('.palette').append(button);rarityEditor.mount(button,'bodyColor',color.id);}
 const custom=document.createElement('label');custom.className='custom-color';custom.title='Custom body color';custom.innerHTML='<input type="color" id="customColor" aria-label="Custom body color"><span aria-hidden="true">+</span>';body.querySelector('.palette').append(custom);custom.querySelector('input').addEventListener('change',event=>select({bodyColor:event.target.value,bodyStyle:Object.hasOwn(BODY_STYLE_COLORS,appearance.bodyStyle)?'solid':appearance.bodyStyle}));const finish=document.createElement('div');finish.className='body-finishes';finish.setAttribute('role','group');finish.setAttribute('aria-label','Body finish');
 for(const style of BODY_STYLES){const button=document.createElement('button');button.type='button';button.dataset.bodyStyle=style.id;button.textContent=style.label;button.title=style.label;button.onclick=()=>select({bodyStyle:style.id});finish.append(button);rarityEditor.mount(button,'bodyStyle',style.id);}
 body.append(finish);controls.append(body);
 for(const category of Object.keys(CATEGORIES)){
  const options=CATEGORIES[category],section=panel(category);
  const heading=document.createElement('div');heading.className='section-heading';heading.innerHTML=`<h3>${titles[category]}</h3><span class="selected-label" data-label="${category}"></span>`;section.append(heading);
  if(category==='legs'){const note=document.createElement('p');note.className='head-override-note';note.dataset.legOverride='';note.textContent='Robe overrides legs.';note.hidden=true;section.append(note);}
  if(['eyes','brows','mouth','nose','ears','tattoo'].includes(category)){const note=document.createElement('p');note.className='head-override-note';note.dataset.overrideNotice=category;note.textContent='Head overrides face traits.';note.hidden=true;section.append(note);}
  const grid=document.createElement('div');grid.className='options';grid.setAttribute('role','group');grid.setAttribute('aria-label',titles[category]);
  for(const option of options){const button=document.createElement('button');button.className='option';button.type='button';button.dataset.category=category;button.dataset.option=option.id;button.title=option.label;button.innerHTML=`<span class="option-art">${icon(category,option.id)}</span>`;const label=document.createElement('span');label.className='option-label';label.textContent=option.label;button.append(label);button.onclick=()=>select({[category]:option.id});grid.append(button);rarityEditor.mount(button,category,option.id);}
  section.append(grid);controls.append(section);
 }
 for(const [category,options] of [['background',PORTRAIT_BACKGROUNDS.map(item=>({...item,id:item.hex}))],['overlay',PORTRAIT_OVERLAYS],['pose',PORTRAIT_POSES]]){
  const section=panel(category),heading=document.createElement('div');heading.className='section-heading';heading.innerHTML=`<h3>${titles[category]}</h3><span class="selected-label">Portrait only</span>`;section.append(heading);
  const grid=document.createElement('div');grid.className='options';grid.setAttribute('role','group');grid.setAttribute('aria-label',titles[category]);
  for(const option of options){
   const button=document.createElement('button');button.type='button';button.className='option';button.dataset.portraitCategory=category;button.dataset.portraitOption=option.id;button.title=option.label;
   const art=document.createElement('span');art.className='option-art';
   if(category==='background')art.style.background=backgroundCSS(option.id);
   else if(option.src){const image=document.createElement('img');image.src=option.src;image.alt='';image.loading='lazy';art.append(image);}
   else art.innerHTML=icon(category,option.id);
   const label=document.createElement('span');label.className='option-label';label.textContent=option.label;button.append(art,label);
   button.onclick=()=>{changePortrait({[category]:option.id,...(category==='pose'?{posesEnabled:true}:{})});setViewMode('portrait');};
   grid.append(button);rarityEditor.mount(button,category,option.id);
  }
  section.append(grid);
  if(category==='background'){const custom=document.createElement('label');custom.className='custom-background';custom.innerHTML='Custom color<input type="color" id="customBackground" aria-label="Custom portrait background">';custom.querySelector('input').onchange=event=>changePortrait({background:event.target.value});section.append(custom);}
  controls.append(section);
 }
 const bookmarks=$('#bookmarksPanel');
 bookmarkControls=createBookmarkControls({panel:bookmarks,saveButton:$('#saveBookmark'),getLook:currentLook,loadLook:async look=>{await changeLook(look);setViewMode('portrait');},render:(...args)=>bookmarkRenderer.render(...args),download,toast});
 updateControls();activateCategory(activeCategory);
}
function updateControls(){
 for(const button of controls.querySelectorAll('[data-portrait-option]'))button.setAttribute('aria-pressed',String(currentLook().portrait[button.dataset.portraitCategory]===button.dataset.portraitOption&&(button.dataset.portraitCategory!=='pose'||portraitPosesEnabled)));
 for(const notice of controls.querySelectorAll('[data-leg-override]'))notice.hidden=!LEG_OVERRIDE_TOPS.includes(appearance.shirt);
 for(const button of controls.querySelectorAll('[data-body-style]'))button.setAttribute('aria-pressed',String(button.dataset.bodyStyle===appearance.bodyStyle));
 for(const notice of controls.querySelectorAll('[data-override-notice]')){const ears=notice.dataset.overrideNotice==='ears';notice.hidden=isOriginalHead(appearance.head)||(ears&&EAR_COMPATIBLE_HEADS.includes(appearance.head));notice.textContent='Head overrides face traits.';}
 for(const button of controls.querySelectorAll('[data-color]'))button.setAttribute('aria-pressed',String(button.dataset.color.toLowerCase()===appearance.bodyColor.toLowerCase()));
 $('#bodyLabel').textContent=BODY_COLORS.find(color=>color.hex.toLowerCase()===appearance.bodyColor.toLowerCase())?.label||'Custom';$('#customColor').value=appearance.bodyColor;
 for(const button of controls.querySelectorAll('[data-option]'))button.setAttribute('aria-pressed',String(appearance[button.dataset.category]===button.dataset.option));
 for(const [category,options] of Object.entries(CATEGORIES)){const option=options.find(option=>option.id===appearance[category]);controls.querySelector(`[data-label="${category}"]`).textContent=option?.label||'';}
}
function updateHistory(){
 const button=$('#undoLook');button.disabled=!history.canUndo&&!history.canRedo;
 button.setAttribute('aria-disabled',String(!history.canUndo&&!history.canRedo));button.dataset.canUndo=String(history.canUndo);
 button.title=history.canRedo?'Undo (right-click to redo)':'Undo';
 bookmarkControls?.updateActive();
}
async function applyLookState(value){
 const next=normalizeLook(value),version=++changeVersion;
 appearance=next.appearance;portraitOverlay=next.portrait.overlay;portraitBackground=next.portrait.background;portraitPosesEnabled=next.portrait.posesEnabled;portraitPose=next.portrait.pose;
 updateControls();setPortraitBackground(portraitBackground);if(portraitScene)void setPortraitOverlay(THREE,portraitScene,portraitOverlay).then(()=>portraitDirty=true).catch(()=>toast('Overlay could not load. Try selecting it again.'));
 $('#enablePortraitPoses').checked=portraitPosesEnabled;$('#portraitPose').hidden=!portraitPosesEnabled;$('#portraitPose').value=portraitPose;applyPortraitPose();updateHistory();
 try{if(avatar)await avatar.setAppearance(next.appearance);if(version!==changeVersion)return;if(portraitAvatar)await portraitAvatar.setAppearance(next.appearance);if(version!==changeVersion)return;applyPortraitPose();portraitDirty=true;}
 catch(error){console.error(error);toast('That look could not load. Try again or use Undo.');}
}
function changeLook(value){if(!history.commit(value))return Promise.resolve();return applyLookState(history.current);}
function select(patch){return changeLook({...currentLook(),appearance:{...appearance,...patch}});}
function changePortrait(patch){return changeLook({...currentLook(),portrait:{...currentLook().portrait,...patch}});}
function stepHistory(redo=false){const look=redo?history.redo():history.undo();if(look)void applyLookState(look);}
$('#undoLook').onclick=()=>stepHistory();
$('#undoLook').oncontextmenu=event=>{event.preventDefault();stepHistory(true);};
$('#undoLook').onkeydown=event=>{if(event.shiftKey&&event.key==='Enter'){event.preventDefault();stepHistory(true);}};
addEventListener('keydown',event=>{
 if(event.target.closest('input,select,textarea,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
 if((event.metaKey||event.ctrlKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();stepHistory(event.shiftKey||event.key.toLowerCase()==='y');}
});
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#randomize').onclick=()=>{const next=randomizeLook({rarity:rarityEditor.value,appearance,background:portraitBackground,overlay:portraitOverlay,pose:portraitPose,posesEnabled:portraitPosesEnabled});changeLook({appearance:next.appearance,portrait:{posesEnabled:portraitPosesEnabled,pose:portraitPosesEnabled?next.pose:portraitPose,background:next.background,overlay:next.overlay}});};
$('#exportRarity').onclick=()=>{download(new Blob([JSON.stringify(exportRarity(rarityEditor.value),null,2)],{type:'application/json'}),'drifmaker-rarity.json');toast('Rarity exported.');};
$('#importRarity').onclick=()=>$('#rarityFile').click();
$('#rarityFile').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{if(file.size>131072)throw Error('Too large');const rarity=importRarity(JSON.parse(await file.text()));rarityEditor.replace(rarity);toast('Rarity imported.');}
 catch{toast('Choose a valid Drifmaker rarity settings JSON.');}
};
for(const button of document.querySelectorAll('[data-motion]'))button.onclick=()=>{avatar?.setPose('');$('#studioPose').value='';motion=button.dataset.motion;elapsed=0;settled=0;for(const option of document.querySelectorAll('[data-motion]'))option.setAttribute('aria-pressed',String(option===button));};
$('#holdCard').onchange=event=>{avatar?.setPose('');$('#studioPose').value='';holding=event.target.checked;settled=0;if(card)card.visible=holding;};
for(const [id,poses] of [['studioPose',POSES],['portraitPose',PORTRAIT_POSES]])for(const pose of poses){const option=document.createElement('option');option.value=pose.id;option.textContent=pose.label;$(`#${id}`).append(option);}
$('#studioPose').onchange=event=>{const id=normalizePose(event.target.value);motion='idle';elapsed=0;settled=0;holding=false;$('#holdCard').checked=false;if(card)card.visible=false;for(const button of document.querySelectorAll('[data-motion]'))button.setAttribute('aria-pressed',String(!id&&button.dataset.motion==='idle'));avatar?.setPose(id,{static:reducedMotion});};
function portraitComposition(){return {...portraitPoseComposition(portraitPosesEnabled?portraitPose:''),background:portraitBackground,overlay:portraitOverlay};}
function applyPortraitPose(){portraitAvatar?.setPose(portraitPosesEnabled?portraitPose:'');if(portraitCamera)configurePortraitCamera(THREE,portraitCamera,portraitComposition());portraitDirty=true;}
$('#enablePortraitPoses').onchange=event=>changePortrait({posesEnabled:event.target.checked});
$('#portraitPose').onchange=event=>changePortrait({pose:normalizePortraitPose(event.target.value)||'salute'});
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
 if(viewMode==='portrait'){if(portraitDirty&&portraitScene){renderPortraitScene(renderer,portraitScene,portraitCamera);portraitDirty=false;}return;}
 elapsed+=dt;settled+=dt;if(autoRotate&&pointers.size===0)yaw+=dt*.3;
 if(avatar){const jumpTime=motion==='jump'?((elapsed%2.4)<1.1?elapsed%2.4:-1):-1,crouch=['crouch','sneak'].includes(motion)?1:0,velocity=motion==='walk'?1.25:motion==='sneak'?.65:0;
  avatar.update(reducedMotion&&motion==='idle'&&settled>.8?0:dt,velocity,holding,0,{crouch,jumpTime});avatar.model.position.y=jumpHeight(jumpTime);if(holding)followHeldCard?.();
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
function setPortraitBackground(value){
 if(!validPortraitBackground(value))return;
 portraitBackground=value.toLowerCase();
 if(portraitScene)Promise.resolve(setPortraitSceneBackground(THREE,portraitScene,portraitBackground)).then(()=>portraitDirty=true).catch(()=>toast('Background could not load. Try selecting it again.'));
 $('#backgroundPreview').style.background=backgroundCSS(portraitBackground);
 $('#backgroundPreview').title=PORTRAIT_BACKGROUNDS.find(color=>color.hex===portraitBackground)?.label||'Custom';
 if(/^#/.test(portraitBackground)&&$('#customBackground'))$('#customBackground').value=portraitBackground;
 portraitDirty=true;
}
$('#chooseBackground').onclick=()=>{activateSidebar('editor');activateCategory('background');};
setPortraitBackground(portraitBackground);
async function exportPortrait(){
 if(!portraitAvatar||exporting)return;
 exporting=true;$('#exportPortrait').disabled=true;$('#captureView').disabled=true;$('#exportPortrait').textContent='Preparing PNG…';
 try{
  const blob=await capturePortrait({THREE,scene:portraitScene,camera:portraitCamera,composition:portraitComposition(),environmentFactory:createDrifmakerEnvironment});
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
 portraitAvatar=await createPortraitAvatar({THREE,createAvatar:createShowroomAvatar,appearance,pose:portraitPosesEnabled?portraitPose:''});if(disposed){portraitAvatar.dispose();return;}
 await portraitAvatar.setAppearance(appearance);
 portraitScene=new THREE.Scene();portraitScene.environment=environment.texture;await setPortraitSceneBackground(THREE,portraitScene,portraitBackground);await setPortraitOverlay(THREE,portraitScene,portraitOverlay);portraitScene.add(portraitAvatar.model);
 portraitScene.add(new THREE.HemisphereLight(0xf7fcff,0x748b79,2.2));
 const key=new THREE.DirectionalLight(0xfff5df,3.2);key.position.set(-3,7,5);portraitScene.add(key);
 const fill=new THREE.DirectionalLight(0xa9d4ec,1.2);fill.position.set(4,3,-4);portraitScene.add(fill);
 portraitCamera=configurePortraitCamera(THREE,new THREE.OrthographicCamera(),portraitComposition());
 applyPortraitPose();$('#portraitMode').disabled=false;$('#exportPortrait').disabled=false;
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
  const views={brows:{y:2.47,height:.75},eyes:{y:2.23,height:.70},mouth:{y:1.87,height:.60},shirt:{y:1.18,height:1.45},legs:{y:.47,height:1.08},hat:{y:2.82,height:1.68},accessory:{y:1.5,height:2.55},head:{y:2.25,height:2.05},extra:{y:1.80,height:3.25},nose:{y:1.98,height:.40},ears:{y:2.35,height:2.0},tattoo:{y:2.22,height:1.25}};
  const remaining=[...controls.querySelectorAll('[data-option]')].filter(button=>button.dataset.option!=='none');
  while(remaining.length&&!disposed){
   for(let batch=0;batch<3&&remaining.length;batch++){
    const preferred=remaining.findIndex(button=>button.dataset.category===activeCategory),button=remaining.splice(preferred<0?0:preferred,1)[0],{category,option}=button.dataset;
    const view=views[category],rear=category==='accessory'&&['jetpack','backpack','wings','skateboard','sword','angelwings','batwings','mechwings','shield','machinegun'].includes(option);
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
  card=createHeldCard(THREE);card.visible=holding;card.castShadow=true;scene.add(card);followHeldCard=createHeldCardFollower({THREE,card,avatar});followHeldCard();
  settled=0;$('#loadState').hidden=true;controls.inert=false;$('#bookmarksPanel').inert=false;for(const id of ['randomize','saveBookmark','exportRarity','importRarity','captureView','studioMode','studioPose'])$(`#${id}`).disabled=false;
  void setupPortrait().catch(error=>{console.error(error);toast('Portrait mode could not load. Reload to try again.');});
  void makeThumbnails();
 }catch(error){console.error(error);$('#loadState').replaceChildren();const message=document.createElement('strong');message.textContent='Model could not load.';const detail=document.createElement('span');detail.textContent='Check your connection and retry.';const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();$('#loadState').append(message,detail,retry);}
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('The 3D preview was interrupted. Reload to restore it.');$('#saveBookmark').disabled=true;});
function cleanup(){if(disposed)return;disposed=true;bookmarkControls?.dispose();void bookmarkRenderer.dispose();cancelAnimationFrame(frameId);clearTimeout(toastTimer);resizeObserver.disconnect();if(card)disposeHeldCard(card);avatar?.dispose();portraitAvatar?.dispose();if(portraitScene){disposePortraitOverlay(portraitScene);disposePortraitBackground(portraitScene);}scene?.traverse(node=>{if(node===card||!node.isSkinnedMesh){node.geometry?.dispose();if(node.material)for(const material of [].concat(node.material))material.dispose();}});environment?.dispose();renderer?.dispose();}
addEventListener('pagehide',event=>{if(!event.persisted)cleanup();});
makeControls();setPortraitBackground(portraitBackground);updateHistory();
init();
