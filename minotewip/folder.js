import * as THREE from '../vendor/three.module.min.js';
import {PONCHO_CARDS} from '../poncho-data.js';

const canvas=document.querySelector('canvas'),notice=document.querySelector('#notice');
const ui={toggle:document.querySelector('#folderToggle'),left:document.querySelector('#leftCard'),right:document.querySelector('#rightCard'),back:document.querySelector('#returnCard')};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf7f7f4);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,40);
camera.position.set(0,0,6.4);
scene.add(new THREE.HemisphereLight(0xffffff,0xb1b9ac,2.2));
const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(-3,5,7);scene.add(key);
const fill=new THREE.DirectionalLight(0xe7f0ff,.8);fill.position.set(4,0,4);scene.add(fill);

// Folder panels are only a little larger than a card. All pocket/hinge paths
// share these dimensions so the paper, cards, and folds remain connected.
const CARD_W=1.12,CARD_H=1.568,CARD_T=.006,WIDTH=1.29,HEIGHT=1.82,THICKNESS=.003;
const POCKET_H=.56,POCKET_TOP=-HEIGHT/2+POCKET_H,HOME_Y=-.035,HOME_Z=.007;
const SPINE=.03,HINGE_OFFSET=SPINE/2,SPINE_SEGMENTS=8;
const LIFT_Y=POCKET_TOP+.085+CARD_H/2;
const fiberCanvas=document.createElement('canvas');fiberCanvas.width=fiberCanvas.height=128;
const ctx=fiberCanvas.getContext('2d'),pixels=ctx.createImageData(128,128);let seed=931;
for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=118+(seed>>>27);pixels.data.set([value,value,value,255],i);}
ctx.putImageData(pixels,0,0);
const fiber=new THREE.CanvasTexture(fiberCanvas);fiber.wrapS=fiber.wrapT=THREE.RepeatWrapping;fiber.repeat.set(5,7);
const green=new THREE.MeshStandardMaterial({color:0x0b552b,roughness:.96,bumpMap:fiber,bumpScale:.005});
const paper=new THREE.MeshStandardMaterial({color:0xf1eedf,roughness:1,bumpMap:fiber,bumpScale:.003});
const cutEdge=new THREE.MeshStandardMaterial({color:0x9aa888,roughness:1});
const foldGreen=new THREE.MeshStandardMaterial({color:0x105d30,roughness:1,side:THREE.DoubleSide});
const folder=new THREE.Group(),flipRoot=new THREE.Group(),book=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();
scene.add(folder);folder.add(flipRoot);flipRoot.add(book);book.add(right,left);folder.rotation.set(.035,-.08,-.018);
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
 const core=new THREE.Mesh(coreGeometry,cutEdge);core.position.x=center;group.add(core);
 const face=faceGeometry(shape,WIDTH,HEIGHT);
 const inner=new THREE.Mesh(face,green);inner.position.set(center,0,THICKNESS/2+.0005);group.add(inner);
 const outer=new THREE.Mesh(faceGeometry(sheetOutline(-side),WIDTH,HEIGHT),green);outer.position.set(center,0,-THICKNESS/2-.0005);outer.rotation.y=Math.PI;group.add(outer);
 // Uncoated white stock inside, with a full-height green flap folded over
 // the outer edge and a small rounded paper tab above the pocket lip.
 const linerWidth=WIDTH-.052;
 const liner=new THREE.Mesh(new THREE.PlaneGeometry(linerWidth,HEIGHT),paper);
 liner.position.set(side*linerWidth/2,0,.0026);group.add(liner);
 const flapShape=new THREE.Shape();
 flapShape.moveTo(0,-HEIGHT/2+.006);flapShape.lineTo(.051,-HEIGHT/2+.006);
 flapShape.lineTo(.051,HEIGHT/2-.023);flapShape.lineTo(.009,HEIGHT/2-.006);flapShape.lineTo(0,HEIGHT/2-.006);flapShape.closePath();
 const flap=new THREE.Mesh(new THREE.ShapeGeometry(flapShape),foldGreen);
 flap.position.set(side*(WIDTH-.005),0,.0045);flap.scale.x=-side;group.add(flap);
 const tab=new THREE.Mesh(new THREE.CircleGeometry(.023,16),paper);tab.scale.y=.36;tab.position.set(side*(WIDTH-.055),POCKET_TOP+.012,.0052);group.add(tab);
 // Cut back beside the crease, rounding into the top of each pocket.
 const pocketGeometry=new THREE.PlaneGeometry(WIDTH,POCKET_H,28,30),p=pocketGeometry.attributes.position,uv=pocketGeometry.attributes.uv;
 for(let i=0;i<p.count;i++){
  const edge=pocketInsideEdge(uv.getY(i)),u=side>0?uv.getX(i):1-uv.getX(i);
  const x=side*THREE.MathUtils.lerp(edge.x,WIDTH,u)-center;
  p.setXYZ(i,x,edge.y+HEIGHT/2-POCKET_H/2,pocketDepth(x,edge.y,.014,.01));
 }
 pocketGeometry.computeVertexNormals();
 const pocket=new THREE.Mesh(pocketGeometry,foldGreen);pocket.position.set(center,-HEIGHT/2+POCKET_H/2,0);group.add(pocket);
 // A fine paper edge follows both the rounded cut-in and the upper lip.
 const lipPoints=[];
 for(let i=0;i<=24;i++){
  const edge=pocketInsideEdge(i/24),x=side*edge.x;
  lipPoints.push(new THREE.Vector3(x,edge.y,pocketDepth(x-center,edge.y,.014,.01)));
 }
 for(let i=1;i<=40;i++){
  const x=side*THREE.MathUtils.lerp(.15,WIDTH,i/40);
  lipPoints.push(new THREE.Vector3(x,POCKET_TOP,pocketDepth(x-center,POCKET_TOP,.014,.01)));
 }
 const lip=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPoints),96,.0007,4,false),green);group.add(lip);
 pockets.push({geometry:pocketGeometry,lip,lipBase:lip.geometry.attributes.position.array.slice(),center});
 const bottom=new THREE.Mesh(new THREE.BoxGeometry(WIDTH,.006,.008),green);bottom.position.set(center,-HEIGHT/2+.003,.006);group.add(bottom);
 const seam=new THREE.Mesh(new THREE.BoxGeometry(.006,POCKET_H,.008),green);seam.position.set(side*(WIDTH-.005),-HEIGHT/2+POCKET_H/2,.006);group.add(seam);
 group.traverse(o=>{o.userData.leaf=side;});
}
sheet(left,-1);sheet(right,1);
// A thin, gently pinched paper fold. Its small bow avoids a box-like edge,
// while the pockets flatten to leave only the clearance their cards require.
const spineGeometry=new THREE.PlaneGeometry(1,HEIGHT,SPINE_SEGMENTS,1),spinePositions=spineGeometry.attributes.position;
const spine=new THREE.Mesh(spineGeometry,foldGreen);spine.frustumCulled=false;book.add(spine);
const centerSeam=new THREE.Mesh(new THREE.PlaneGeometry(.002,HEIGHT),paper);centerSeam.position.z=.0027;book.add(centerSeam);
let phase=0,targetPhase=0,selected=null,transition=null,request=0,lastTime=0,drag=null,outerFlip=null;
const cards=[],ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),spin=new THREE.Quaternion(),axis=new THREE.Vector3();
const stageCenter=new THREE.Vector3(0,0,1.4),identity=new THREE.Quaternion();
function ease(t){return t*t*(3-2*t);}
function invalidate(){if(!request)request=requestAnimationFrame(frame);}
function syncUI(){
 ui.toggle.textContent=targetPhase===1?'Close folder':'Open folder';ui.toggle.hidden=!!selected;
 ui.left.hidden=ui.right.hidden=targetPhase!==1||!!selected||cards.length!==2;ui.back.hidden=!selected;
}
function beginOuterFlip(dragging=false){
 if(selected||transition||outerFlip||![0,2].includes(phase))return;
 outerFlip={from:phase,to:2-phase,progress:0,target:dragging?0:1,dragging};
 invalidate();
}
function setPhase(value){
 if(selected||transition||outerFlip)return;
 if((value<0&&phase===0)||(value>2&&phase===2)){beginOuterFlip();return;}
 targetPhase=THREE.MathUtils.clamp(value,0,2);syncUI();invalidate();
}
function updateOuterFlip(dt){
 if(!outerFlip)return;
 const f=outerFlip;
 if(!f.dragging){
  f.progress=THREE.MathUtils.lerp(f.progress,f.target,reduced?1:1-Math.exp(-dt*12));
  if(Math.abs(f.progress-f.target)<.0004)f.progress=f.target;
 }
 const swapped=f.progress>=.5;
 phase=targetPhase=swapped?f.to:f.from;
 const sign=f.from===0?1:-1;
 flipRoot.rotation.y=sign*Math.PI*(f.progress-(swapped?1:0));
 if(!f.dragging&&f.progress===f.target){flipRoot.rotation.y=0;outerFlip=null;syncUI();}
}
function toggle(){if(transition)return;if(selected){putBack();return;}setPhase(targetPhase===1?0:1);}
let lastFoldPhase=NaN;
function poseFolder(){
 if(phase===lastFoldPhase)return;lastFoldPhase=phase;
 const frontAngle=Math.PI*(1-Math.min(phase,1)),backAngle=Math.PI*Math.max(phase-1,0);
 left.rotation.y=frontAngle;left.position.set(-HINGE_OFFSET*Math.sin(frontAngle),0,HINGE_OFFSET*(1-Math.cos(frontAngle)));
 right.rotation.y=-backAngle;right.position.set(HINGE_OFFSET*Math.sin(backAngle),0,HINGE_OFFSET*(1-Math.cos(backAngle)));
 book.position.x=WIDTH/2*(phase-1);
 const angle=Math.max(frontAngle,backAngle),side=phase>1?1:-1;
 spine.visible=angle>.001;centerSeam.visible=angle<.04;
 const endX=side*HINGE_OFFSET*Math.sin(angle),endZ=HINGE_OFFSET*(1-Math.cos(angle));
 for(let i=0;i<spinePositions.count;i++){
  const t=(i%(SPINE_SEGMENTS+1))/SPINE_SEGMENTS;
  const pinch=.004*Math.sin(angle/2)**2*Math.sin(Math.PI*t);
  spinePositions.setXYZ(i,endX*t+side*pinch,i<=SPINE_SEGMENTS?HEIGHT/2:-HEIGHT/2,endZ*t);
 }
 spinePositions.needsUpdate=true;spineGeometry.computeVertexNormals();
 const spread=1-Math.abs(phase-1),base=.013+.001*spread,bow=.0005+.0095*spread;
 for(const pocket of pockets){
  const p=pocket.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   p.setZ(i,pocketDepth(p.getX(i),p.getY(i)-HEIGHT/2+POCKET_H/2,base,bow));
  }
  p.needsUpdate=true;pocket.geometry.computeVertexNormals();
  const lip=pocket.lip.geometry.attributes.position;
  for(let i=0;i<lip.count;i++){
   const x=pocket.lipBase[i*3]-pocket.center,y=pocket.lipBase[i*3+1];
   lip.setZ(i,pocket.lipBase[i*3+2]+pocketDepth(x,y,base,bow)-pocketDepth(x,y,.014,.01));
  }
  lip.needsUpdate=true;pocket.lip.geometry.computeVertexNormals();
 }
}
const loader=new THREE.TextureLoader();
async function texture(url){const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();renderer.initTexture(t);return t;}
async function loadCards(){
 const available=PONCHO_CARDS.filter(c=>c.status==='pulled'),first=Math.floor(Math.random()*available.length),second=(first+1+Math.floor(Math.random()*(available.length-1)))%available.length;
 const back=await texture(new URL('../assets/poncho/backs/poncho-pack.webp',import.meta.url).href);
 for(const [i,data] of [available[first],available[second]].entries()){
  const map=await texture(new URL('../'+data.file,import.meta.url).href),shape=roundedShape(CARD_W,CARD_H,.045),face=faceGeometry(shape,CARD_W,CARD_H);
  const model=new THREE.Group(),edgeGeometry=new THREE.ExtrudeGeometry(shape,{depth:CARD_T,bevelEnabled:false,curveSegments:12});edgeGeometry.translate(0,0,-CARD_T/2);
  const edges=edgeGeometry.groups.find(g=>g.materialIndex===1);if(edges)edgeGeometry.setDrawRange(edges.start,edges.count);
  model.add(new THREE.Mesh(edgeGeometry,new THREE.MeshStandardMaterial({color:0xe7dfc9,roughness:.9})));
  const front=new THREE.Mesh(face,new THREE.MeshBasicMaterial({map,toneMapped:false}));front.position.z=CARD_T/2+.0001;
  const rear=new THREE.Mesh(face,new THREE.MeshBasicMaterial({map:back,toneMapped:false}));rear.position.z=-CARD_T/2-.0001;rear.rotation.y=Math.PI;model.add(front,rear);
  const parent=i?right:left,home=new THREE.Vector3((i?1:-1)*WIDTH/2,HOME_Y,HOME_Z);model.position.copy(home);parent.add(model);
  model.traverse(o=>{o.userData.card=i;});cards.push({model,parent,home,data});ui[i?'right':'left'].textContent='View '+data.title;invalidate();
 }
 syncUI();
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
 if(transition||outerFlip||Math.abs(phase-1)>.001||selected)return;const card=cards[index];if(!card)return;
 const path=cardPath(card);selected=card;scene.attach(card.model);
 transition={kind:'out',time:0,...path};syncUI();invalidate();
}
function putBack(){
 if(!selected||transition)return;const model=selected.model;
 transition={kind:'back',time:0,...cardPath(selected),start:model.position.clone(),rotation:model.quaternion.clone(),scale:model.scale.x};syncUI();invalidate();
}
function animateCard(dt){
 if(!transition)return;
 const t=transition,model=selected.model; t.time+=dt;
 const p=Math.min(1,t.time/(reduced?.16:t.kind==='out'?.74:.7));
 if(t.kind==='out')poseOnCardPath(model,t,p);
 else if(p<.18){
  // Align the freely rotated card in front, then retrace the extraction path.
  const u=ease(p/.18);
  model.position.copy(t.start);model.quaternion.slerpQuaternions(t.rotation,identity,u);
  model.scale.setScalar(THREE.MathUtils.lerp(t.scale,1.28,u));
 }else poseOnCardPath(model,t,1-(p-.18)/.82);
 if(p===1){if(t.kind==='back'){selected.parent.attach(model);model.position.copy(selected.home);model.quaternion.identity();model.scale.setScalar(1);selected=null;}transition=null;syncUI();}
}
function frame(now){
 request=0;const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;
 updateOuterFlip(dt);
 if(!outerFlip&&(!drag||drag.mode!=='fold')){
  phase=THREE.MathUtils.lerp(phase,targetPhase,reduced?1:1-Math.exp(-dt*9));if(Math.abs(phase-targetPhase)<.0003)phase=targetPhase;
 }
 poseFolder();
 const open=1-Math.abs(phase-1),viewWidth=selected?2.7:1.9+1.15*open;
 const distance=Math.max(5.9,viewWidth/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
 camera.position.z=THREE.MathUtils.lerp(camera.position.z,distance,reduced?1:1-Math.exp(-dt*10));if(Math.abs(camera.position.z-distance)<.002)camera.position.z=distance;
 animateCard(dt);renderer.render(scene,camera);
 if(phase!==targetPhase||transition||outerFlip||camera.position.z!==distance)invalidate();else lastTime=0;
}
function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(selected?[selected.model]:[folder],true)[0];}
canvas.addEventListener('pointerdown',e=>{
 if(drag||transition||outerFlip||e.button!==0)return;const intersection=hit(e);
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,mode:null,startPhase:phase,card:intersection?.object.userData.card,hit:!!intersection};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(drag&&drag.id===e.pointerId){
  const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY,totalX=e.clientX-drag.x,totalY=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(totalX,totalY)>5){
   drag.moved=true;drag.mode=selected&&drag.hit?'card':!selected&&drag.hit&&Math.abs(totalX)>=Math.abs(totalY)?'fold':'none';
   if(drag.mode==='fold'&&((drag.startPhase===0&&totalX>0)||(drag.startPhase===2&&totalX<0))){
    drag.mode='outer';beginOuterFlip(true);
   }
  }
  if(drag.moved){
   if(drag.mode==='outer'&&outerFlip){
    const direction=outerFlip.from===0?1:-1;
    outerFlip.progress=THREE.MathUtils.clamp(direction*totalX/Math.max(145,Math.min(280,innerWidth*.4)),0,1);
   }else if(drag.mode==='fold'){phase=THREE.MathUtils.clamp(drag.startPhase-totalX/Math.max(145,Math.min(280,innerWidth*.4)),0,2);targetPhase=phase;}
   else if(drag.mode==='card'&&selected){
    axis.set(dy,dx,0).normalize();spin.setFromAxisAngle(axis,Math.hypot(dx,dy)*.008);selected.model.quaternion.premultiply(spin);
   }
   invalidate();
  }
  drag.lastX=e.clientX;drag.lastY=e.clientY;
 }else canvas.style.cursor=hit(e)?'grab':'default';
});
function finishDrag(e,cancelled=false){
 if(!drag||drag.id!==e.pointerId)return;const state=drag;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 if(state.moved){
  if(state.mode==='outer'&&outerFlip){outerFlip.dragging=false;outerFlip.target=cancelled?0:outerFlip.progress>.35?1:0;invalidate();}
  else if(state.mode==='fold'){targetPhase=Math.round(phase);syncUI();invalidate();}return;
 }
 if(cancelled)return;
 if(selected){if(!state.hit)putBack();}
 else if(Math.abs(phase-1)<.001&&Number.isInteger(state.card))selectCard(state.card);
 else if(state.hit||targetPhase===1)toggle();
}
canvas.addEventListener('pointerup',e=>finishDrag(e));canvas.addEventListener('pointercancel',e=>finishDrag(e,true));
canvas.addEventListener('lostpointercapture',e=>finishDrag(e,true));
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(selected)putBack();else if(targetPhase===1)toggle();}
 else if(e.target===canvas&&['Space','Enter'].includes(e.code)){e.preventDefault();toggle();}
 else if(e.target===canvas&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();setPhase(Math.round(targetPhase)+(e.code==='ArrowLeft'?-1:1));}
});
ui.toggle.onclick=toggle;ui.left.onclick=()=>selectCard(0);ui.right.onclick=()=>selectCard(1);ui.back.onclick=putBack;
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();invalidate();}
window.addEventListener('resize',resize);resize();syncUI();
loadCards().catch(error=>{console.error(error);notice.hidden=false;notice.textContent='The cards could not load. Refresh to try again.';});
