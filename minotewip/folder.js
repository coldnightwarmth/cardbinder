import {createSealHint} from './seal-hint.js?v=4';
import {createSeal} from './seal.js?v=7';
import * as THREE from '../vendor/three.module.min.js';
import {MINOTE_CARDS} from './cards.js';
import {spring,settle,snapToNearest,tiltSpring} from './motion.js?v=2';

const canvas=document.querySelector('canvas'),notice=document.querySelector('#notice');
const ui={toggle:document.querySelector('#folderToggle'),left:document.querySelector('#leftCard'),right:document.querySelector('#rightCard'),back:document.querySelector('#returnCard')};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf7f7f4);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
// Nothing comes within a world unit of the camera. Keeping the near plane
// here gives thin paper/card layers substantially more depth precision.
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,1,40);
camera.position.set(0,0,6.4);
scene.add(new THREE.HemisphereLight(0xffffff,0xb1b9ac,2.2));
const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(-3,5,7);scene.add(key);
const fill=new THREE.DirectionalLight(0xe7f0ff,.8);fill.position.set(4,0,4);scene.add(fill);

// Folder panels are only a little larger than a card. All pocket/hinge paths
// share these dimensions so the paper, cards, and folds remain connected.
const CARD_W=1.1525,CARD_H=1.6135,CARD_T=.0036,WIDTH=1.29,HEIGHT=1.82,THICKNESS=.0018;
const POCKET_H=.56,POCKET_TOP=-HEIGHT/2+POCKET_H,HOME_Y=-.005,HOME_Z=.0039;
const SPINE=.0158,HINGE_OFFSET=SPINE/2,SPINE_SEGMENTS=8;
const POCKET_BASE=.0069,POCKET_BOW=.0038,LINER_Z=THICKNESS/2;
const LIFT_Y=POCKET_TOP+.085+CARD_H/2;
const fiberCanvas=document.createElement('canvas');fiberCanvas.width=fiberCanvas.height=128;
const ctx=fiberCanvas.getContext('2d'),pixels=ctx.createImageData(128,128);let seed=931;
for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=118+(seed>>>27);pixels.data.set([value,value,value,255],i);}
ctx.putImageData(pixels,0,0);
const fiber=new THREE.CanvasTexture(fiberCanvas);fiber.wrapS=fiber.wrapT=THREE.RepeatWrapping;fiber.repeat.set(5,7);
// A small repeating stock texture: fine grain with a few short, irregular
// fibres. This lives in the material, not in a second face above the cover.
const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;
const grainContext=grainCanvas.getContext('2d'),grainPixels=grainContext.createImageData(256,256);
let grainSeed=1847;
function grainRandom(){grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;return grainSeed/4294967296;}
const mottling=Array.from({length:32*32},()=>grainRandom());
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const gx=x/8,gy=y/8,ix=Math.floor(gx),iy=Math.floor(gy),u=ease(gx-ix),v=ease(gy-iy);
 const sample=(a,b)=>mottling[(b%32)*32+(a%32)];
 const cloud=THREE.MathUtils.lerp(THREE.MathUtils.lerp(sample(ix,iy),sample(ix+1,iy),u),THREE.MathUtils.lerp(sample(ix,iy+1),sample(ix+1,iy+1),u),v);
 const value=Math.round(239+(grainRandom()-.5)*18+(cloud-.5)*12);
 grainPixels.data.set([value,value,value,255],(y*256+x)*4);
}
grainContext.putImageData(grainPixels,0,0);grainContext.lineWidth=.55;
for(let i=0;i<1600;i++){
 const x=grainRandom()*256,y=grainRandom()*256,angle=grainRandom()*Math.PI*2,length=.7+grainRandom()*2.4;
 grainContext.strokeStyle=grainRandom()>.5?'rgba(255,255,255,.18)':'rgba(125,125,125,.10)';
 grainContext.beginPath();grainContext.moveTo(x,y);grainContext.lineTo(x+Math.cos(angle)*length,y+Math.sin(angle)*length);grainContext.stroke();
}
const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(2,3);
grain.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
// The grain is a linear modulation map, with its average compensated so the
// existing green is retained. Mipmaps keep its fine detail stable in motion.
const green=new THREE.MeshStandardMaterial({color:new THREE.Color(0x0b552b).multiplyScalar(255/239),map:grain,roughness:.97,bumpMap:grain,bumpScale:.00055});
const paper=new THREE.MeshStandardMaterial({color:0xf1eedf,roughness:1,bumpMap:fiber,bumpScale:.00045});
const cutEdge=new THREE.MeshStandardMaterial({color:0x9aa888,roughness:1});
const foldGreen=green.clone();foldGreen.color.setHex(0x105d30).multiplyScalar(255/239);foldGreen.side=THREE.DoubleSide;
const folder=new THREE.Group(),flipRoot=new THREE.Group(),book=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();
scene.add(folder);folder.add(flipRoot);flipRoot.add(book);book.add(right,left);folder.rotation.set(.055,-.12,-.016);
flipRoot.position.z=SPINE/2;book.position.z=-SPINE/2;
const pockets=[];
function roundedShape(w,h,r){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
 s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function faceGeometry(shape,w,h){
 const g=new THREE.ShapeGeometry(shape,12),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return g;
}
function sheetOutline(side){
 const s=new THREE.Shape(),r=.016,outer=side*WIDTH/2,hinge=-outer;
 // Only the outside corners round off; the two hinge edges meet flush.
 s.moveTo(hinge,-HEIGHT/2);s.lineTo(outer-side*r,-HEIGHT/2);
 s.quadraticCurveTo(outer,-HEIGHT/2,outer,-HEIGHT/2+r);
 s.lineTo(outer,HEIGHT/2-r);s.quadraticCurveTo(outer,HEIGHT/2,outer-side*r,HEIGHT/2);
 s.lineTo(hinge,HEIGHT/2);s.closePath();return s;
}
function innerSheetShapes(){
 const edge=WIDTH-.052,bottom=-HEIGHT/2,top=HEIGHT/2,r=.016;
 const tabY=POCKET_TOP+.012,tabHalfHeight=.0083,tabReach=.024;
 // The liner and green folded edge share one cut line. Their triangles are
 // adjacent, so neither has a hidden, almost-coplanar surface underneath it.
 const liner=new THREE.Shape();
 liner.moveTo(0,bottom);liner.lineTo(edge,bottom);liner.lineTo(edge,tabY-tabHalfHeight);
 liner.bezierCurveTo(edge+tabReach,tabY-tabHalfHeight,edge+tabReach,tabY+tabHalfHeight,edge,tabY+tabHalfHeight);
 liner.lineTo(edge,top);liner.lineTo(0,top);liner.closePath();
 const border=new THREE.Shape();
 border.moveTo(edge,bottom);border.lineTo(WIDTH-r,bottom);border.quadraticCurveTo(WIDTH,bottom,WIDTH,bottom+r);
 border.lineTo(WIDTH,top-r);border.quadraticCurveTo(WIDTH,top,WIDTH-r,top);border.lineTo(edge,top);
 border.lineTo(edge,tabY+tabHalfHeight);
 border.bezierCurveTo(edge+tabReach,tabY+tabHalfHeight,edge+tabReach,tabY-tabHalfHeight,edge,tabY-tabHalfHeight);
 border.closePath();return {liner,border};
}
function pocketInsideEdge(v){
 const bottom=-HEIGHT/2,roundHeight=.045,inset=.095;
 if(v<.8)return new THREE.Vector2(inset*v/.8,bottom+(POCKET_H-roundHeight)*v/.8);
 const t=(v-.8)/.2,control=inset+roundHeight*inset/(POCKET_H-roundHeight);
 return new THREE.Vector2((1-t)**2*inset+2*(1-t)*t*control+t*t*.15,POCKET_TOP-roundHeight*(1-t)**2);
}
function pocketDepth(x,y,base,bow){
 return base+bow*Math.sin(Math.PI*THREE.MathUtils.clamp(x/WIDTH+.5,0,1))*THREE.MathUtils.clamp((y+HEIGHT/2)/POCKET_H,0,1);
}
function sheet(group,side){
 const center=side*WIDTH/2,shape=sheetOutline(side);
 const coreGeometry=new THREE.ExtrudeGeometry(shape,{depth:THICKNESS,bevelEnabled:false,curveSegments:12});coreGeometry.translate(0,0,-THICKNESS/2);
 // Extrusion caps duplicated both cover faces. Render only the cut perimeter.
 const perimeter=coreGeometry.groups.find(group=>group.materialIndex===1);coreGeometry.setDrawRange(perimeter.start,perimeter.count);
 const core=new THREE.Mesh(coreGeometry,cutEdge);core.position.x=center;group.add(core);
 const outer=new THREE.Mesh(faceGeometry(sheetOutline(-side),WIDTH,HEIGHT),green);outer.position.set(center,0,-THICKNESS/2);outer.rotation.y=Math.PI;group.add(outer);
 // Uncoated white stock inside, with a full-height green flap folded over
 // the outer edge and a small rounded paper tab above the pocket lip.
 const inside=innerSheetShapes();
 const liner=new THREE.Mesh(faceGeometry(inside.liner,WIDTH,HEIGHT),paper);
 liner.position.z=LINER_Z;liner.scale.x=side;group.add(liner);
 const flap=new THREE.Mesh(faceGeometry(inside.border,WIDTH,HEIGHT),green);
 flap.position.z=LINER_Z;flap.scale.x=side;group.add(flap);
 // Cut back beside the crease, rounding into the top of each pocket.
 const pocketGeometry=new THREE.PlaneGeometry(WIDTH,POCKET_H,28,30),p=pocketGeometry.attributes.position,uv=pocketGeometry.attributes.uv;
 for(let i=0;i<p.count;i++){
  const edge=pocketInsideEdge(uv.getY(i)),u=side>0?uv.getX(i):1-uv.getX(i);
  const x=side*THREE.MathUtils.lerp(edge.x,WIDTH,u)-center;
  p.setXYZ(i,x,edge.y+HEIGHT/2-POCKET_H/2,pocketDepth(x,edge.y,POCKET_BASE,POCKET_BOW));
 }
 pocketGeometry.computeVertexNormals();
 const pocket=new THREE.Mesh(pocketGeometry,foldGreen);pocket.position.set(center,-HEIGHT/2+POCKET_H/2,0);group.add(pocket);
 // A fine paper edge follows both the rounded cut-in and the upper lip.
 const lipPoints=[];
 for(let i=0;i<=24;i++){
  const edge=pocketInsideEdge(i/24),x=side*edge.x;
  lipPoints.push(new THREE.Vector3(x,edge.y,pocketDepth(x-center,edge.y,POCKET_BASE,POCKET_BOW)));
 }
 for(let i=1;i<=40;i++){
  const x=side*THREE.MathUtils.lerp(.15,WIDTH,i/40);
  lipPoints.push(new THREE.Vector3(x,POCKET_TOP,pocketDepth(x-center,POCKET_TOP,POCKET_BASE,POCKET_BOW)));
 }
 const lip=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPoints),96,.00045,4,false),green);group.add(lip);
 pockets.push({geometry:pocketGeometry,lip,lipBase:lip.geometry.attributes.position.array.slice(),center});
 const bottom=new THREE.Mesh(new THREE.BoxGeometry(WIDTH,.003,.004),green);bottom.position.set(center,-HEIGHT/2+.0015,.0038);group.add(bottom);
 const seam=new THREE.Mesh(new THREE.BoxGeometry(.004,POCKET_H,.004),green);seam.position.set(side*(WIDTH-.005),-HEIGHT/2+POCKET_H/2,.0038);group.add(seam);
 group.traverse(o=>{o.userData.leaf=side;});
}
sheet(left,-1);sheet(right,1);
// A thin, gently pinched paper fold. Its small bow avoids a box-like edge,
// while the pockets flatten to leave only the clearance their cards require.
const spineGeometry=new THREE.PlaneGeometry(1,HEIGHT,SPINE_SEGMENTS,1),spinePositions=spineGeometry.attributes.position;
const spine=new THREE.Mesh(spineGeometry,foldGreen);spine.frustumCulled=false;book.add(spine);
const centerSeam=new THREE.Mesh(new THREE.PlaneGeometry(.0015,HEIGHT),paper);centerSeam.position.z=LINER_Z+.0001;book.add(centerSeam);
let phase=0,targetPhase=0,selected=null,transition=null,request=0,lastTime=0,drag=null,outerFlip=null,pendingCard=null;
const cards=[],ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const stageCenter=new THREE.Vector3(0,0,1.4),identity=new THREE.Quaternion();
const foldMotion={value:0,velocity:0},cameraMotion={value:6.4,velocity:0};
const floatMotion={pitch:{value:.055,velocity:0},yaw:{value:-.12,velocity:0},roll:{value:-.016,velocity:0},height:{value:0,velocity:0}};
const hover=new THREE.Vector2(),cardTiltTarget=new THREE.Vector2();
const cardTilt={pitch:{value:0,velocity:0},yaw:{value:0,velocity:0}};
const sealHint=createSealHint(document.querySelector('#sealHint'));
const hintPoint=new THREE.Vector3();
function shakeSealedFolder(){seal.shake();if(!seal.peeling&&!outerFlip)sealHint.tap(performance.now());}
const seal=createSeal(right,WIDTH,SPINE,invalidate);
const peelButton=document.querySelector('#peelSticker');
peelButton.onclick=()=>{seal.peel();invalidate();};
let motionTime=0;
function ease(t){return t*t*(3-2*t);}
function invalidate(){if(!request&&!document.hidden)request=requestAnimationFrame(frame);}
function syncUI(){
 peelButton.hidden=!seal.locked||seal.peeling||phase!==0||!!outerFlip;
 ui.toggle.textContent=targetPhase===1?'Close folder':'Open folder';ui.toggle.hidden=!!selected;
 ui.left.hidden=ui.right.hidden=targetPhase!==1||!!selected||cards.length!==2;ui.back.hidden=!selected;
}
function beginOuterFlip(dragging=false){
 if(seal.peeling)return;
 if(selected||transition||outerFlip||![0,2].includes(phase))return;
 sealHint.dismiss(performance.now());
 outerFlip={from:phase,to:2-phase,progress:0,target:dragging?0:1,dragging,motion:{value:0,velocity:0}};
 invalidate();
}
function setPhase(value){
 if(seal.locked){if(!seal.peeling&&value!==1)beginOuterFlip();else{shakeSealedFolder();invalidate();}return;}
 if(selected||transition||outerFlip)return;
 pendingCard=null;
 if((value<0&&phase===0)||(value>2&&phase===2)){beginOuterFlip();return;}
 targetPhase=THREE.MathUtils.clamp(value,0,2);syncUI();invalidate();
}
function updateOuterFlip(dt){
 if(!outerFlip)return;
 const f=outerFlip;
 if(!f.dragging){
  if(reduced){f.motion.value=f.target;f.motion.velocity=0;}
  else{spring(f.motion,f.target,13,dt);settle(f.motion,f.target);}
  f.progress=THREE.MathUtils.clamp(f.motion.value,0,1);
 }
 const swapped=f.progress>=.5;
 phase=targetPhase=swapped?f.to:f.from;
 const sign=f.direction??(f.from===0?1:-1);
 flipRoot.rotation.y=sign*Math.PI*(f.progress-(swapped?1:0));
 if(!f.dragging&&f.progress===f.target){flipRoot.rotation.y=0;foldMotion.value=phase;foldMotion.velocity=0;outerFlip=null;syncUI();}
}
function toggle(){if(refreshing)return;if(seal.locked){shakeSealedFolder();invalidate();return;}if(transition)return;if(selected){putBack();return;}setPhase(targetPhase===1?0:1);}
let lastFoldPhase=NaN;
function poseFolder(){
 if(phase===lastFoldPhase)return;lastFoldPhase=phase;
 const frontAngle=Math.PI*(1-Math.min(phase,1)),backAngle=Math.PI*Math.max(phase-1,0);
 left.rotation.y=frontAngle;left.position.set(-HINGE_OFFSET*Math.sin(frontAngle),0,HINGE_OFFSET*(1-Math.cos(frontAngle)));
 right.rotation.y=-backAngle;right.position.set(HINGE_OFFSET*Math.sin(backAngle),0,HINGE_OFFSET*(1-Math.cos(backAngle)));
 // Recenter with the cover's rotation, so it does not slide sideways before
 // the paper has begun unfolding. Both end poses share the same center.
 book.position.x=WIDTH/4*(Math.cos(frontAngle)-Math.cos(backAngle));
 const angle=Math.max(frontAngle,backAngle),side=phase>1?1:-1;
 spine.visible=angle>.001;centerSeam.visible=angle<.04;
 const endX=side*HINGE_OFFSET*Math.sin(angle),endZ=HINGE_OFFSET*(1-Math.cos(angle));
 for(let i=0;i<spinePositions.count;i++){
  const t=(i%(SPINE_SEGMENTS+1))/SPINE_SEGMENTS;
  const pinch=.0014*Math.sin(angle/2)**2*Math.sin(Math.PI*t);
  spinePositions.setXYZ(i,endX*t+side*pinch,i<=SPINE_SEGMENTS?HEIGHT/2:-HEIGHT/2,endZ*t);
 }
 spinePositions.needsUpdate=true;spineGeometry.computeVertexNormals();
 const spread=1-Math.abs(phase-1),base=POCKET_BASE,bow=.0003+(POCKET_BOW-.0003)*spread;
 for(const pocket of pockets){
  const p=pocket.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   p.setZ(i,pocketDepth(p.getX(i),p.getY(i)-HEIGHT/2+POCKET_H/2,base,bow));
  }
  p.needsUpdate=true;pocket.geometry.computeVertexNormals();
  const lip=pocket.lip.geometry.attributes.position;
  for(let i=0;i<lip.count;i++){
   const x=pocket.lipBase[i*3]-pocket.center,y=pocket.lipBase[i*3+1];
   lip.setZ(i,pocket.lipBase[i*3+2]+pocketDepth(x,y,base,bow)-pocketDepth(x,y,POCKET_BASE,POCKET_BOW));
  }
  lip.needsUpdate=true;pocket.lip.geometry.computeVertexNormals();
 }
}
const loader=new THREE.TextureLoader();
async function texture(url){const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();renderer.initTexture(t);return t;}
async function loadCards(){
 const available=MINOTE_CARDS,first=Math.floor(Math.random()*available.length),second=(first+1+Math.floor(Math.random()*(available.length-1)))%available.length;
 // Picking geometry exists immediately, independently of image/network readiness.
 const jobs=[];
 const backs=[];
 for(const [i,data] of [available[first],available[second]].entries()){
  const shape=roundedShape(CARD_W,CARD_H,.045),face=faceGeometry(shape,CARD_W,CARD_H);
  const model=new THREE.Group(),edgeGeometry=new THREE.ExtrudeGeometry(shape,{depth:CARD_T,bevelEnabled:false,curveSegments:12});edgeGeometry.translate(0,0,-CARD_T/2);
  const edges=edgeGeometry.groups.find(g=>g.materialIndex===1);if(edges)edgeGeometry.setDrawRange(edges.start,edges.count);
  model.add(new THREE.Mesh(edgeGeometry,new THREE.MeshStandardMaterial({color:0xe7dfc9,roughness:.9})));
  const front=new THREE.Mesh(face,new THREE.MeshBasicMaterial({color:0xf3eddd,toneMapped:false}));front.position.z=CARD_T/2+.0001;
  const rear=new THREE.Mesh(face,new THREE.MeshBasicMaterial({color:0x384432,toneMapped:false}));rear.position.z=-CARD_T/2-.0001;rear.rotation.y=Math.PI;model.add(front,rear);
  const parent=i?right:left,home=new THREE.Vector3((i?1:-1)*(WIDTH/2-.022),HOME_Y,HOME_Z);model.position.copy(home);parent.add(model);
  model.traverse(o=>{o.userData.card=i;});cards.push({model,parent,home,data});ui[i?'right':'left'].textContent='View '+data.title;invalidate();
  backs.push(rear.material);
  jobs.push(texture(new URL('../'+data.file,import.meta.url).href).then(map=>{
   front.material.map=map;front.material.color.setHex(0xffffff);front.material.needsUpdate=true;invalidate();
  }));
 }
 syncUI();
 jobs.push(texture(new URL('../assets/poncho/backs/poncho-pack.webp',import.meta.url).href).then(map=>{
  for(const material of backs){material.map=map;material.color.setHex(0xffffff);material.needsUpdate=true;}invalidate();
 }));
 const results=await Promise.allSettled(jobs);
 if(results.some(result=>result.status==='rejected'))throw new Error('Some card artwork could not load');
}
function cardPath(card){
 folder.updateMatrixWorld(true);
 const home=card.parent.localToWorld(card.home.clone());
 const lift=card.parent.localToWorld(new THREE.Vector3(card.home.x,LIFT_Y,HOME_Z));
 // Match the straight lift's velocity to the curve's first tangent, then
 // curve forward without stopping at intermediate waypoints.
 const tangent=lift.clone().sub(home).multiplyScalar(.6/(.4*3));
 const curve=new THREE.CubicBezierCurve3(lift,lift.clone().add(tangent),stageCenter,stageCenter);
 return {lift,home,curve,homeRotation:card.parent.getWorldQuaternion(new THREE.Quaternion())};
}
function poseOnCardPath(model,t,p){
 if(p<.4){
  const u=p/.4,up=u*u*(2-u);
  model.position.lerpVectors(t.home,t.lift,up);
  model.quaternion.copy(t.homeRotation);model.scale.setScalar(1);
 }else{
  const u=(p-.4)/.6;
  t.curve.getPoint(u,model.position);
  // Grow and turn only after moving far enough forward to clear the lip.
  const turn=ease(THREE.MathUtils.clamp((u-.32)/.68,0,1));
  model.quaternion.slerpQuaternions(t.homeRotation,identity,turn);
  model.scale.setScalar(1+.28*turn);
 }
}
function selectCard(index){
 if(transition||outerFlip||selected)return;const card=cards[index];if(!card)return;
 // A visible card click always requests pickup, even before the fold settles.
 if(Math.abs(phase-1)>.015){pendingCard=index;targetPhase=1;syncUI();invalidate();return;}
 pendingCard=null;phase=targetPhase=foldMotion.value=1;foldMotion.velocity=0;poseFolder();
 resetCardTilt();
 const path=cardPath(card);selected=card;scene.attach(card.model);
 transition={kind:'out',time:0,...path};syncUI();invalidate();
}
function putBack(){
 if(!selected||transition)return;const model=selected.model;
 resetCardTilt();
 transition={kind:'back',time:0,...cardPath(selected),start:model.position.clone(),rotation:model.quaternion.clone(),scale:model.scale.x};syncUI();invalidate();
}
function animateCard(dt){
 if(!transition)return;
 const t=transition,model=selected.model; t.time+=dt;
 const p=Math.min(1,t.time/(reduced?.16:t.kind==='out'?.60:.56));
 if(t.kind==='out')poseOnCardPath(model,t,p);
 else if(p<.18){
  // Ease the tilted card to face forward, then retrace the extraction path.
  const u=ease(p/.18);
  model.position.copy(t.start);model.quaternion.slerpQuaternions(t.rotation,identity,u);
  model.scale.setScalar(THREE.MathUtils.lerp(t.scale,1.28,u));
 }else poseOnCardPath(model,t,1-(p-.18)/.82);
 if(p===1){if(t.kind==='back'){selected.parent.attach(model);model.position.copy(selected.home);model.quaternion.identity();model.scale.setScalar(1);selected=null;}transition=null;syncUI();}
}
function floatFolder(dt){
 // Hold the folder still while a card follows the pocket-clearance path.
 // Pausing the float clock keeps the pose continuous when the card returns.
 if(selected||pendingCard!==null||drag||reduced)return;
 motionTime+=dt;
 const t=motionTime,v=THREE.MathUtils.clamp(foldMotion.velocity,-3,3);
 const pitch=.055-hover.y*.12+Math.sin(t*.81)*.024;
 const yaw=-.12+hover.x*.22+Math.sin(t*.59)*.052-v*.027;
 const roll=-.016-hover.x*.026+Math.sin(t*.73+.6)*.016+v*.015;
 const height=Math.sin(t*.94)*.025+Math.sin(t*.43)*.012;
 folder.rotation.set(spring(floatMotion.pitch,pitch,7,dt),spring(floatMotion.yaw,yaw,7,dt),spring(floatMotion.roll,roll,7,dt));
 folder.position.y=spring(floatMotion.height,height,6,dt);
}
function resetCardTilt(){
 cardTiltTarget.set(0,0);
 for(const state of Object.values(cardTilt)){state.value=0;state.velocity=0;}
}
function updateCardTiltInput(e){
 if(!selected||transition)return;
 const r=canvas.getBoundingClientRect(),center=stageCenter.clone().project(camera);
 const height=CARD_H*1.28*r.height/(2*(camera.position.z-stageCenter.z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
 const x=(e.clientX-r.left-(center.x+1)*r.width/2)/(height*CARD_W/CARD_H/2);
 const y=(e.clientY-r.top-(1-center.y)*r.height/2)/(height/2);
 cardTiltTarget.set(THREE.MathUtils.clamp(y,-1,1)*.28,THREE.MathUtils.clamp(x,-1,1)*.38);
 invalidate();
}
function animateCardTilt(dt){
 if(!selected||transition)return false;
 let moving=false;
 for(const [key,target] of [['pitch',cardTiltTarget.x],['yaw',cardTiltTarget.y]]){
  const state=cardTilt[key];
  if(reduced){state.value=0;state.velocity=0;}
  else{tiltSpring(state,target,dt);if(!settle(state,target,.00005))moving=true;}
 }
 selected.model.rotation.set(cardTilt.pitch.value,cardTilt.yaw.value,0);
 return moving;
}
function frame(now){
 request=0;const dt=Math.min((now-(lastTime||now-16.67))/1000,.05);lastTime=now;
 updateOuterFlip(dt);
 if(!outerFlip&&!(drag?.hit&&!selected)){
  if(reduced){foldMotion.value=targetPhase;foldMotion.velocity=0;}
  else{spring(foldMotion,targetPhase,16,dt);settle(foldMotion,targetPhase);}
  phase=THREE.MathUtils.clamp(foldMotion.value,0,2);
  if(phase!==foldMotion.value){foldMotion.value=phase;foldMotion.velocity=0;}
 }
 poseFolder();
 if(pendingCard!==null&&!drag&&Math.abs(phase-1)<=.015)selectCard(pendingCard);
 floatFolder(dt);
 const sealShake=seal.update(dt,reduced);
 if(!selected&&!reduced)folder.rotation.z=floatMotion.roll.value+sealShake;
 peelButton.hidden=!seal.locked||seal.peeling||phase!==0||!!outerFlip;
 const open=1-Math.abs(phase-1),viewWidth=selected?2.7:1.9+1.15*open;
 const distance=Math.max(5.9,viewWidth/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
 if(reduced){cameraMotion.value=distance;cameraMotion.velocity=0;}
 else{spring(cameraMotion,distance,12,dt);settle(cameraMotion,distance,.002);}
 camera.position.z=cameraMotion.value;
 animateCard(dt);const tilting=animateCardTilt(dt);renderer.render(scene,camera);
 if(seal.peeling||!seal.locked||outerFlip)sealHint.dismiss(now);
 right.localToWorld(hintPoint.set(WIDTH,0,SPINE/2));hintPoint.project(camera);
 sealHint.update(now,(hintPoint.x+1)*innerWidth/2,(1-hintPoint.y)*innerHeight/2,phase>1,reduced);
 if((!reduced&&!selected)||phase!==targetPhase||transition||outerFlip||seal.active||sealHint.active||tilting||camera.position.z!==distance)invalidate();else lastTime=0;
}
function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects(selected?[selected.model]:[folder],true).find(intersection=>seal.acceptsHit(intersection));}
canvas.addEventListener('pointerdown',e=>{
 if(drag||transition||e.button!==0)return;const intersection=hit(e);
 canvas.focus({preventScroll:true});
 if(selected&&intersection)updateCardTiltInput(e);
 // A second quick grab takes over the pose currently on screen, including a
 // cover flip that is still settling. It must not be ignored until the flip ends.
 const outerStart=intersection&&outerFlip?outerFlip.progress:null;
 if(outerStart!==null){outerFlip.dragging=true;outerFlip.motion.velocity=0;}
 else if(intersection&&!selected){foldMotion.value=phase;foldMotion.velocity=0;}
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lastTime:e.timeStamp,moved:false,mode:null,startPhase:phase,outerStart,outerTarget:outerFlip?.target,seal:intersection?.object.userData.seal,sealFront:phase===0,card:intersection?.object.userData.card,leaf:intersection?.object.userData.leaf,hit:!!intersection};
 canvas.setPointerCapture(e.pointerId);
});
function moveDrag(e){
 if(seal.peeling)return;
 if(drag&&drag.id===e.pointerId){
  const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY,totalX=e.clientX-drag.x,totalY=e.clientY-drag.y;
  if(dx===0&&dy===0)return;
  const elapsed=THREE.MathUtils.clamp((e.timeStamp-drag.lastTime)/1000,1/240,.08);
  if(!drag.moved&&Math.hypot(totalX,totalY)>5){
   drag.moved=true;drag.mode=selected&&drag.hit?'card':'none';
  }
  // A little vertical jitter at the start must not disqualify the entire swipe.
  if(drag.moved&&drag.mode==='none'&&!selected&&drag.hit&&Math.abs(totalX)>5&&Math.abs(totalX)>=Math.abs(totalY)){
   drag.mode='fold';
   if(drag.outerStart!==null)drag.mode='outer';
   else if(seal.locked){drag.mode='outer';beginOuterFlip(true);if(outerFlip)outerFlip.direction=Math.sign(totalX);}
   else if((drag.startPhase===0&&totalX>0)||(drag.startPhase===2&&totalX<0)){
    drag.mode='outer';beginOuterFlip(true);
   }
  }
  if(drag.moved){
   if(drag.mode==='outer'&&outerFlip){
    const direction=outerFlip.direction??(outerFlip.from===0?1:-1);
    const progress=THREE.MathUtils.clamp((drag.outerStart??0)+direction*totalX/Math.max(145,Math.min(280,innerWidth*.4)),0,1);
    outerFlip.motion.velocity=THREE.MathUtils.lerp(outerFlip.motion.velocity,(progress-outerFlip.progress)/elapsed,.35);
    outerFlip.progress=outerFlip.motion.value=progress;
   }else if(drag.mode==='fold'){
    const value=THREE.MathUtils.clamp(drag.startPhase-totalX/Math.max(145,Math.min(280,innerWidth*.4)),0,2);
    foldMotion.velocity=THREE.MathUtils.lerp(foldMotion.velocity,(value-phase)/elapsed,.35);
    phase=targetPhase=foldMotion.value=value;
   }
   else if(drag.mode==='card'&&selected)updateCardTiltInput(e);
   invalidate();
  }
  drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastTime=e.timeStamp;
 }
}
canvas.addEventListener('pointermove',e=>{
 if(drag){moveDrag(e);}
 else{
  const intersection=hit(e);canvas.style.cursor=intersection?(intersection.object.userData.seal&&seal.locked?'pointer':selected?'default':'grab'):'default';
  if(selected){if(intersection)updateCardTiltInput(e);else{cardTiltTarget.set(0,0);invalidate();}}
  if(e.pointerType!=='touch'){hover.set(pointer.x,pointer.y);invalidate();}
 }
});
canvas.addEventListener('pointerleave',()=>{cardTiltTarget.set(0,0);if(!drag)hover.set(0,0);invalidate();});
window.addEventListener('blur',()=>{cardTiltTarget.set(0,0);invalidate();});
function finishDrag(e,cancelled=false){
 if(!drag||drag.id!==e.pointerId)return;
 // Fast releases can arrive beyond the last pointermove. Consume that final
 // position before deciding which side of the midpoint the folder is on.
 if(!cancelled)moveDrag(e);
 const state=drag;drag=null;
 if(selected){cardTiltTarget.set(0,0);invalidate();}
if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 const paused=e.timeStamp-state.lastTime>90;
 if(outerFlip?.dragging){
  outerFlip.dragging=false;
  outerFlip.motion.value=outerFlip.progress;
  if(!cancelled&&!state.moved&&state.outerTarget!==undefined){
   outerFlip.target=state.outerTarget;
   if(seal.locked&&state.hit){
    if(state.seal&&state.sealFront)seal.peel();else shakeSealedFolder();
    syncUI();
   }
  }else outerFlip.target=snapToNearest(outerFlip.motion,1,13,paused||cancelled);
  invalidate();return;
 }
 if(seal.locked){
  if(!cancelled&&!state.moved&&state.hit){if(state.seal&&state.sealFront)seal.peel();else shakeSealedFolder();syncUI();invalidate();}
  return;
 }
 if(state.moved){
  if(state.hit&&!selected){
   foldMotion.value=phase;
   targetPhase=snapToNearest(foldMotion,2,16,paused||cancelled);
   syncUI();invalidate();
  }else if(state.mode==='card'){
   cardTiltTarget.set(0,0);invalidate();
  }return;
 }
 if(cancelled)return;
 if(selected){if(!state.hit)putBack();}
 else if(Number.isInteger(state.card))selectCard(state.card);
 else if(Number.isInteger(hit(e)?.object.userData.card))selectCard(hit(e).object.userData.card);
 else if(state.hit||targetPhase===1){
  // When open, each leaf closes in its natural direction: the left leaf to
  // the front cover and the right leaf to the back cover.
  if(targetPhase===1&&state.leaf===1)setPhase(2);else toggle();
 }
}
canvas.addEventListener('pointerup',e=>finishDrag(e));canvas.addEventListener('pointercancel',e=>finishDrag(e,true));
canvas.addEventListener('lostpointercapture',e=>finishDrag(e,true));
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(selected)putBack();else if(targetPhase===1)toggle();}
 else if(e.target===canvas&&['Space','Enter'].includes(e.code)){e.preventDefault();toggle();}
 else if(e.target===canvas&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(seal.locked)beginOuterFlip();else setPhase(Math.round(targetPhase)+(e.code==='ArrowLeft'?-1:1));}
});
ui.toggle.onclick=toggle;ui.left.onclick=()=>selectCard(0);ui.right.onclick=()=>selectCard(1);ui.back.onclick=putBack;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();invalidate();}
window.addEventListener('resize',resize);resize();syncUI();
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){cancelAnimationFrame(request);request=0;lastTime=0;}
 else invalidate();
});
let cardsReady=loadCards().catch(error=>{console.error(error);notice.hidden=false;notice.textContent='Some artwork could not load. Cards can still be opened; refresh to retry the artwork.';});

const folderPalette=[['Cobalt Blue','#3559B7'],['Marigold','#E7A62C'],['Emerald','#20866C'],['Berry','#A4416C']];
const extraPalettes={
 'Rich colors':[['Cherry Red','#C9363E'],['Brick Red','#A94B3F'],['Burnt Orange','#C66B38'],['Marigold','#E7A62C'],['Golden Ochre','#B99036'],['Olive Green','#808342'],['Moss Green','#526B43'],['Forest Green','#285B47'],['Emerald','#20866C'],['Deep Teal','#246E75'],['Ocean Blue','#297BA4'],['Cobalt Blue','#3559B7'],['Ink Navy','#293951'],['Indigo','#514D89'],['Plum','#704668'],['Berry','#A4416C'],['Terracotta','#BC7962'],['Caramel','#AC7C4B'],['Chocolate','#694B3C'],['Graphite','#44494C']],
 'Artwork colors':[['Poppy Rose','#E26D73'],['Warm Salmon','#E98F74'],['Honey Gold','#E6B74F'],['Pear Green','#B2C166'],['Jade Green','#70B18F'],['Lagoon','#6BB4BA'],['Cornflower','#7897D7'],['Soft Iris','#948BC2'],['Orchid','#B28AC6'],['Dusty Raspberry','#C27094']],
 'Pastels':[['Notebook Cream','#F3EBD9'],['Butter Yellow','#F4E3A1'],['Vanilla Peach','#F2D7B5'],['Apricot Milk','#EFC3A6'],['Soft Coral','#E9B3A8'],['Ballet Pink','#EBC5D1'],['Rosewater','#DDAFBF'],['Dusty Mauve','#CBB2C8'],['Lilac Paper','#D5C6E8'],['Lavender Fog','#BDB7DA'],['Periwinkle','#B6C4E8'],['Powder Blue','#BBD5E8'],['Mist Blue','#A9C9D5'],['Sea Glass','#B7DCD5'],['Mint Milk','#C5E3D0'],['Pistachio','#D5DDB4'],['Soft Sage','#BDCDB5'],['Eucalyptus','#A8C2B5'],['Oat Paper','#DDD1BF'],['Mushroom Pink','#CDBFBC']]
};
const colorControls=document.querySelector('#folderColors'),colorName=document.querySelector('#folderColorName'),colorPopup=document.querySelector('#folderColorPopup');
let activeFolderColor;
function setFolderColor(name,hex){
 activeFolderColor={name,hex};
 green.color.set(hex).multiplyScalar(255/239);foldGreen.color.copy(green.color);
 cutEdge.color.set(hex).lerp(new THREE.Color(0xf1eedf),.35);
 document.querySelectorAll('[data-folder-color]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.folderColor===hex));
 document.querySelector('#customFolderColor')?.classList.toggle('selected',name==='Custom');
 colorName.textContent=name;invalidate();
}
function colorButton(name,hex){
 const button=document.createElement('button');button.type='button';button.dataset.folderColor=hex;
 button.title=name;button.setAttribute('aria-label',name);button.style.setProperty('--swatch',hex);button.setAttribute('aria-pressed','false');
 button.onclick=()=>setFolderColor(name,hex);return button;
}
for(const color of folderPalette)colorControls.append(colorButton(...color));
const moreColors=document.createElement('button');moreColors.type='button';moreColors.className='more-colors';moreColors.textContent='+';
moreColors.setAttribute('aria-label','More folder colors');moreColors.setAttribute('aria-expanded','false');moreColors.setAttribute('aria-controls','folderColorPopup');colorControls.prepend(moreColors);
function closeColors(){colorPopup.hidden=true;moreColors.setAttribute('aria-expanded','false');}
moreColors.onclick=()=>{colorPopup.hidden=!colorPopup.hidden;moreColors.setAttribute('aria-expanded',String(!colorPopup.hidden));};
for(const [title,colors] of Object.entries(extraPalettes)){
 const heading=document.createElement('h2');heading.textContent=title;const grid=document.createElement('div');grid.className='color-grid';
 for(const color of colors)grid.append(colorButton(...color));colorPopup.append(heading,grid);
}
const customRow=document.createElement('label');customRow.className='custom-color-row';
const customPicker=document.createElement('input');customPicker.type='color';customPicker.id='customFolderColor';customPicker.value='#3559b7';customPicker.setAttribute('aria-label','Custom folder color');
const customLabel=document.createElement('span');customLabel.textContent='Custom';customRow.append(customPicker,customLabel);colorPopup.append(customRow);
customPicker.addEventListener('click',()=>setFolderColor('Custom',customPicker.value.toUpperCase()));
customPicker.addEventListener('input',()=>setFolderColor('Custom',customPicker.value.toUpperCase()));
customPicker.addEventListener('change',()=>setFolderColor('Custom',customPicker.value.toUpperCase()));
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#folderPalette'))closeColors();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!colorPopup.hidden){event.stopImmediatePropagation();event.preventDefault();closeColors();moreColors.focus();}},true);
setFolderColor(...folderPalette[0]);
let refreshing=false;
document.querySelector('#refreshFolder').onclick=async()=>{
 if(refreshing)return;refreshing=true;
 const refreshButton=document.querySelector('#refreshFolder');refreshButton.disabled=true;
 canvas.style.pointerEvents='none';
 const fade=async(from,to)=>{const animation=canvas.animate([{opacity:from},{opacity:to}],{duration:reduced?0:180,easing:'ease-in-out',fill:'forwards'});await animation.finished;return animation;};
 const fadeOut=await fade(1,0);
 try{
  await cardsReady;
  if(drag&&canvas.hasPointerCapture(drag.id)){const id=drag.id;drag=null;canvas.releasePointerCapture(id);}
  drag=null;selected=null;transition=null;pendingCard=null;outerFlip=null;
  phase=targetPhase=foldMotion.value=foldMotion.velocity=0;flipRoot.rotation.y=0;lastFoldPhase=NaN;
  cardTiltTarget.set(0,0);for(const state of Object.values(cardTilt)){state.value=state.velocity=0;}
  seal.reset();sealHint.reset();notice.hidden=true;
  setFolderColor(...folderPalette[Math.floor(Math.random()*folderPalette.length)]);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  for(const card of cards){card.model.removeFromParent();card.model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});}
  for(const material of materials){if(material.map)textures.add(material.map);material.dispose();}
  for(const geometry of geometries)geometry.dispose();for(const map of textures)map.dispose();cards.length=0;
  poseFolder();syncUI();invalidate();
  cardsReady=loadCards();await cardsReady;
 }catch(error){console.error(error);notice.hidden=false;notice.textContent='Some artwork could not load. Refresh to retry.';}
 finally{
  syncUI();invalidate();
  const fadeIn=await fade(0,1);fadeOut.cancel();fadeIn.cancel();
  canvas.style.pointerEvents='';refreshButton.disabled=false;refreshing=false;
 }
};
