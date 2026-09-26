import {createChatInput} from './showroom-chat.js?v=2';
import {createShowroomRitualEffects,ritualPixelRatio} from './showroom-ritual-effects.js?v=2';
import { createExhibitBudget } from './showroom-exhibit-lod.js?v=1';
import { createShowroomMultiplayer } from './showroom-multiplayer.js?v=9';
import { createShowroomSky } from './showroom-sky.js?v=5';
import * as THREE from 'three';
import { createShowroomColumns } from './showroom-columns.js?v=11';
import { createShowroomPortal } from './showroom-portal.js?v=6';
import { createShowroomSpeech } from './showroom-speech.js?v=7';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { createResolutionBudget, createShowroomQuality } from './showroom-performance.mjs?v=2';
import { createShowroomRipples } from './showroom-ripples.js?v=players-1';
import { createShowroomNameplate } from './showroom-nameplate.js?v=compact-3';
import { createShowroomStars } from './showroom-stars.js?v=subfloor-2';

import { Reflector } from './vendor/Reflector.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

import { seatFor, canWalkAt, facingStart } from './showroom-layout.mjs?v=collection-rows-1';

export async function initShowroom(bridge) {
  const canvas = document.createElement('canvas');
  canvas.id = 'showroomCanvas'; canvas.setAttribute('aria-label', 'First person card show floor');
  document.body.prepend(canvas);
  const hud = document.createElement('div'); hud.id = 'showroomHud';
  hud.innerHTML = `<div id="showroomTop"><div class="showroom-title"><small>CARDS.ART / COMMUNITY</small><strong>The show floor</strong><span id="showroomCount">Loading public binders…</span></div><a href="/">Home</a><button id="showroomReturn">Back to table</button></div><div id="showroomCrosshair"></div><div id="showroomHint"><span id="showroomStatus" role="status">WASD to walk · Mouse to look · Esc to release mouse</span> <button id="showroomEnter">Enter show floor</button></div><div id="showroomTouchJoystick" role="application" aria-label="Movement joystick" hidden><div id="showroomTouchJoystickBase"><span id="showroomTouchJoystickThumb"></span></div></div><button id="showroomOpenBinder" type="button" hidden>Open</button>`;
  document.body.append(hud);
  const leave = document.createElement('a');
  leave.id='showroomLeave'; leave.textContent='Leave Show Room'; leave.hidden=true;
  leave.href='/';
  const legacyReturn=new URLSearchParams(location.search).get('returnTo');
  let savedReturn='';
  try {
    if(legacyReturn) sessionStorage.setItem('cards:showroom-return',legacyReturn);
    savedReturn=sessionStorage.getItem('cards:showroom-return') || '';
  } catch {}
  const returnTo=legacyReturn || savedReturn || document.referrer;
  if(location.pathname!=='/show' || location.search || location.hash) {
    history.replaceState(history.state,'','/show');
  }
  try {
    const destination=new URL(returnTo || '/',location.origin);
    if(destination.origin===location.origin && !/^\/show\/?$/.test(destination.pathname)) {
      leave.href=destination.pathname+destination.search+destination.hash;
    }
  } catch { /* Invalid return destinations go to the main page. */ }
  hud.append(leave);
  // Escape may be consumed by native pointer lock, so also watch lock loss.
  document.addEventListener('keydown',event=>{
    if(event.code==='Escape' && !active && !busy) leave.hidden=false;
  });
  document.addEventListener('pointerlockchange',()=>{
    leave.hidden=document.body.classList.contains('showroom-touch')
      || document.pointerLockElement===canvas
      || Boolean(active || busy);
  });
  const status = hud.querySelector('#showroomStatus'), count = hud.querySelector('#showroomCount');
  const touchJoystick = hud.querySelector('#showroomTouchJoystick');
  const touchJoystickBase = hud.querySelector('#showroomTouchJoystickBase');
  const touchJoystickThumb = hud.querySelector('#showroomTouchJoystickThumb');
  const openBinderButton = hud.querySelector('#showroomOpenBinder');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, stencil:true });
  const showroomMaxRatio=Math.min(devicePixelRatio,2);
  const resolution=createResolutionBudget(showroomMaxRatio);
  const quality=createShowroomQuality(1),exhibitBudget=createExhibitBudget();
  let qualitySettings=quality.settings,lastExhibitUpdate=0;
  // A finer pixel grid retains small exhibit artwork. Keep a quality floor so
  // adaptive resolution cannot turn cards into unreadable blocks on Retina screens.
  // Nearest-neighbor presentation includes the portal without another render pass.
  // Expanded binders and card viewers retain their independent full-res canvases.
  let ritualCameraMode=null;
  const showroomPixelRatio=ratio=>ritualPixelRatio(ritualCameraMode,devicePixelRatio,Math.max(.6,ratio/showroomMaxRatio*.75));
  canvas.style.imageRendering='pixelated';
  renderer.setPixelRatio(showroomPixelRatio(resolution.ratio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  // The reflective floor supplies grounding without unstable shadow-map passes.
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, .05, 600);
  const sky=createShowroomSky();scene.add(sky.object);
  // The room itself never moves. Static descendants can keep their world
  // matrices between the main and reflection passes.
  scene.updateMatrix();scene.matrixAutoUpdate=false;
  camera.position.set(0, 1.72, 3.5); camera.rotation.order = 'YXZ';
  camera.rotation.x = -.12;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .025).texture;
  environment.dispose(); pmrem.dispose();
  const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x867766, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffeedb, 3.3); sun.position.set(-3, 9, 4); scene.add(sun, sun.target);

  const fill=new THREE.DirectionalLight(0xc8dcff,1.3); fill.position.set(4,5,-8);scene.add(fill);
  const wood = new THREE.MeshStandardMaterial({ roughness:.82, metalness:0, envMapIntensity:.16 });
  const metal = new THREE.MeshStandardMaterial({ color:0x5e6369, metalness:.85, roughness:.27 });
  const trim = new THREE.MeshStandardMaterial({ color:0x383533, metalness:.4, roughness:.42 });
  function box(w,h,d,mat,x,y,z,parent=scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); mesh.position.set(x,y,z);
    mesh.castShadow=true; mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function createEvilTableGhost() {
    const count=1400;
    const positions=new Float32Array(count*3);
    const phases=new Float32Array(count);
    const drifts=new Float32Array(count);
    const sizes=new Float32Array(count);
    const veils=new Float32Array(count);
    let seed=0x51a7e1;
    const random=()=>{
      seed|=0;seed=seed+0x6D2B79F5|0;
      let value=Math.imul(seed^seed>>>15,1|seed);
      value=value+Math.imul(value^value>>>7,61|value)^value;
      return ((value^value>>>14)>>>0)/4294967296;
    };
    const spread=radius=>(random()+random()+random()-1.5)*radius;
    const write=(index,x,y,z,veil=1,drift=.025,size=8)=>{
      const offset=index*3;
      positions[offset]=x;positions[offset+1]=y;positions[offset+2]=z;
      phases[index]=random()*Math.PI*2;
      drifts[index]=drift*(.55+random()*.9);
      sizes[index]=size*(.72+random()*.62);
      veils[index]=veil*(.72+random()*.28);
    };
    // Roughly eight head lengths tall, with a defined neck, shoulders,
    // hips, knees, wrists and planted feet. Local +Z is the face direction.
    const ellipsoid=(index,cx,cy,cz,rx,ry,rz,drift=.012)=>{
      const angle=random()*Math.PI*2, v=1-2*random();
      const radial=.65+random()*.35, ring=Math.sqrt(1-v*v);
      write(index,cx+Math.cos(angle)*ring*rx*radial,cy+v*ry*radial,
        cz+Math.sin(angle)*ring*rz*radial,1,drift,6.5);
    };
    for(let index=0;index<count;index++) {
      const part=random(), side=random()<.5?-1:1;
      if(part<.14) {
        ellipsoid(index,0,1.905,.015,.10,.135,.115);
      } else if(part<.18) {
        ellipsoid(index,0,1.735,0,.065,.065,.065);
      } else if(part<.47) {
        const t=random(), y=1.03+t*.66;
        const width=t<.35 ? .155-t*.05 : .137+(t-.35)/.65*.10;
        const angle=random()*Math.PI*2, radial=.6+random()*.4;
        write(index,Math.cos(angle)*width*radial,y,
          Math.sin(angle)*(.105+.025*t)*radial,1,.012,6.8);
      } else if(part<.66) {
        const t=random(), upper=t<.5;
        const x=side*(upper ? .235+t*.09 : .28-(t-.5)*.025);
        const radius=upper ? .055-t*.025 : .042-(t-.5)*.026;
        const angle=random()*Math.PI*2;
        write(index,x+Math.cos(angle)*radius,1.62-t*.68,
          .015+Math.sin(angle)*radius+t*.045,1,.013,6.2);
      } else if(part<.70) {
        ellipsoid(index,side*.267,.91,.07,.037,.075,.028);
      } else if(part<.94) {
        const t=random(), angle=random()*Math.PI*2;
        const radius=t<.5 ? .09-t*.075 : .065-(t-.5)*.06;
        write(index,side*(.105+t*.045)+Math.cos(angle)*radius,
          1.04-t*.94,Math.sin(angle)*radius*.9,1,.009,6.5);
      } else if(part<.99) {
        // The sole remains at floor level, including during particle drift.
        ellipsoid(index,side*.15,.045,.075,.057,.043,.125,.003);
      } else {
        write(index,spread(.40),.12+random()*1.86,spread(.22),.32,.035,5.5);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geometry.setAttribute('phase',new THREE.BufferAttribute(phases,1));
    geometry.setAttribute('drift',new THREE.BufferAttribute(drifts,1));
    geometry.setAttribute('pointSize',new THREE.BufferAttribute(sizes,1));
    geometry.setAttribute('veil',new THREE.BufferAttribute(veils,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{
        time:{value:0},
        pixelRatio:{value:Math.min(devicePixelRatio,2)},
        coreColor:{value:new THREE.Color(0x030306)},
        edgeColor:{value:new THREE.Color(0x222331)},
      },
      vertexShader:`
        uniform float time;
        uniform float pixelRatio;
        attribute float phase;
        attribute float drift;
        attribute float pointSize;
        attribute float veil;
        varying float vVeil;
        varying float vPulse;
        void main() {
          vec3 shifted=position;
          shifted.x+=sin(time*.58+position.y*3.7+phase)*drift;
          shifted.z+=cos(time*.43+position.y*2.9+phase*.73)*drift*.8;
          shifted.y=max(.002,shifted.y+sin(time*.71+phase*.41)*drift*.24);
          vec4 viewPosition=modelViewMatrix*vec4(shifted,1.);
          gl_Position=projectionMatrix*viewPosition;
          gl_PointSize=pointSize*pixelRatio*clamp(2./max(1.,-viewPosition.z),.32,1.3);
          vVeil=veil;
          vPulse=.5+.5*sin(time*.82+phase);
        }
      `,
      fragmentShader:`
        uniform vec3 coreColor;
        uniform vec3 edgeColor;
        varying float vVeil;
        varying float vPulse;
        void main() {
          float distanceFromCenter=length(gl_PointCoord-vec2(.5));
          float particle=1.-smoothstep(.19,.5,distanceFromCenter);
          if(particle<.01) discard;
          float core=1.-smoothstep(.03,.35,distanceFromCenter);
          vec3 color=mix(edgeColor,coreColor,core);
          gl_FragColor=vec4(color,particle*vVeil*(.58+vPulse*.24));
        }
      `,
      transparent:true,
      depthWrite:false,
      blending:THREE.NormalBlending,
      toneMapped:false,
    });
    const ghost=new THREE.Points(geometry,material);
    ghost.name='evil-biscuit-table-ghost';
    // The three evil binders occupy the first right-hand table at x=3, z=0.
    // Moving farther from the aisle places the figure immediately behind it.
    ghost.position.set(4.28,0,.04);
    ghost.rotation.y=-Math.PI/2;
    ghost.frustumCulled=false;
    return ghost;
  }
  const evilTableGhost=createEvilTableGhost();scene.add(evilTableGhost);
  const speech=createShowroomSpeech(evilTableGhost);
  // Planar reflection uses the r165 Reflector bundled alongside the site's Three.js.
  const ripples=createShowroomRipples();
  let floorReflectionSize=qualitySettings.reflectionSize;
  const shader = THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms);
  shader.footsteps={value:ripples.steps};
  shader.rippleTime={value:0};
  shader.horizonColor={value:new THREE.Color()};
  shader.strength={value:.27}; shader.texel={value:new THREE.Vector2(1/floorReflectionSize,1/floorReflectionSize)};
  const floor = new Reflector(new THREE.PlaneGeometry(2000,2000), {
    textureWidth:floorReflectionSize,textureHeight:floorReflectionSize,multisample:0,color:0x25272b,
    shader:{ uniforms:shader, vertexShader:Reflector.ReflectorShader.vertexShader
      .replace('void main()', 'varying vec3 floorWorld;\nvoid main()')
      .replace('void main() {', 'void main() {\nfloorWorld = (modelMatrix * vec4(position, 1.)).xyz;'),
      fragmentShader:`
        varying vec3 floorWorld;
        uniform vec4 footsteps[16];
        uniform float rippleTime;
        uniform vec3 color;
        uniform vec3 horizonColor;
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform vec2 texel;
        varying vec4 vUv;
        void main() {
          vec2 rippleSlope=vec2(0.);
          float rippleLight=0.;
          for(int i=0;i<16;i++) {
            float age=rippleTime-footsteps[i].z;
            if(age<0. || age>2.9 || footsteps[i].w<.5) continue;
            vec2 delta=floorWorld.xz-footsteps[i].xy;
            // Outside the wave band its contribution is below display precision.
            float radius=length(delta);
            if(abs(radius-(.06+age*.65))>.6) continue;
            float wave=radius-(.06+age*.65);
            float envelope=exp(-wave*wave/ .018)
              * smoothstep(0.,.16,age)*pow(1.-age/2.9,2.);
            float crest=cos(wave*42.);
            rippleSlope+=delta/max(radius,.001)*sin(wave*42.)*envelope;
            rippleLight+=crest*envelope;
          }
          vec2 uv=vUv.xy/vUv.w + rippleSlope*.0018;

          vec3 reflected=texture2D(tDiffuse,uv).rgb*.28;
          reflected+=texture2D(tDiffuse,uv+texel*vec2(2.,0.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv-texel*vec2(2.,0.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv+texel*vec2(0.,2.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv-texel*vec2(0.,2.)).rgb*.18;
          float fade=1.-smoothstep(12.,65.,vUv.w);
          gl_FragColor=vec4(mix(color,reflected,strength*fade),1.);
          gl_FragColor.rgb += vec3(.065,.08,.09)*max(0.,rippleLight) - vec3(.009)*max(0.,-rippleLight);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          gl_FragColor.rgb=mix(gl_FragColor.rgb,horizonColor,smoothstep(18.,85.,vUv.w));
        }`,
    },
  });
  // Let the submerged stars show through while tables and binders still occlude them.
  floor.material.uniforms.footsteps.value=ripples.steps;
  floor.material.depthWrite=false;
  floor.rotation.x=-Math.PI/2;scene.add(floor);
  const stars=createShowroomStars();scene.add(stars.object);
  // Keep the interaction outline and particles out of the reflection pass.
  const reflect=floor.onBeforeRender;
  const reflectedView=new THREE.Matrix4(), reflectedProjection=new THREE.Matrix4();
  let reflectionReady=false, reflectionAt=0;
  floor.onBeforeRender=function(...args) {
    const viewCamera=args[2] || camera;
    // A moving camera needs a matching reflected view every frame. Throttling
    // it reuses an old projection and makes sharp doorway edges jump.
    const viewUnchanged=reflectedView.equals(viewCamera.matrixWorld) && reflectedProjection.equals(viewCamera.projectionMatrix);
    if(reflectionReady && viewUnchanged && performance.now()-reflectionAt<qualitySettings.reflectionInterval && !busy)return;
    if(reflectionReady && performance.now()-reflectionAt<1000 && !sceneDirty && !busy && reflectedView.equals(viewCamera.matrixWorld)
      && reflectedProjection.equals(viewCamera.projectionMatrix)) return;
    reflectedView.copy(viewCamera.matrixWorld);reflectedProjection.copy(viewCamera.projectionMatrix);reflectionReady=true;reflectionAt=performance.now();
    const visible=outline.visible, ghostVisible=evilTableGhost.visible;
    outline.visible=false;stars.object.visible=false;evilTableGhost.visible=false;
    const portalVisible=portal.surface.visible;portal.surface.visible=false;
    const hiddenPlayers=[];
    scene.traverse(object=>{if(object.userData.excludeFloorReflection&&object.visible){hiddenPlayers.push(object);object.visible=false;}});
    const stencilMaterials=[];
    scene.traverse(object=>{
      for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
        if(material?.stencilWrite) {stencilMaterials.push(material);material.stencilWrite=false;}
      }
    });
    const restoreExhibits=exhibitBudget.reflection();
    try { reflect.apply(this,args); }
    finally {
      restoreExhibits();
      for(const player of hiddenPlayers)player.visible=true;
      for(const material of stencilMaterials)material.stencilWrite=true;
      outline.visible=visible;stars.object.visible=true;evilTableGhost.visible=ghostVisible;portal.surface.visible=portalVisible;
    }
  };
  let sceneDirty=true, multiplayerDirty=false;
  let showroomBuffersSuspended=false;
  function suspendShowroomBuffers() {
    if(showroomBuffersSuspended)return;
    showroomBuffersSuspended=true;
    // The binder and individual card use their own WebGL contexts. Release the
    // showroom's largest offscreen target while either is active so multi-million
    // vertex clear-card models fit reliably on mobile GPUs.
    floor.getRenderTarget().setSize(1,1);
    portal.suspend();
    renderer.renderLists.dispose();
  }
  function restoreShowroomBuffers() {
    if(!showroomBuffersSuspended)return;
    showroomBuffersSuspended=false;
    floor.getRenderTarget().setSize(floorReflectionSize,floorReflectionSize);
    reflectionReady=false;sceneDirty=true;
  }
  const textures = await Promise.all(['table-wood-seamless.png','table-wood-light-seamless.png'].map(async name => {
    try { const t = await new THREE.TextureLoader().loadAsync(`/assets/ui/${name}`); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,2); return t; } catch { return null; }
  }));
  let currentTheme;
  function theme() {
    const light=false;
    if(light===currentTheme)return;
    currentTheme=light;sceneDirty=true;
    stars.theme(light);
    scene.background=new THREE.Color(light ? 0xe4e2de:0x181d23);
    sky.setTheme(scene.background,light);
    scene.fog=new THREE.Fog(scene.background, 14, 75);
    floor.material.uniforms.horizonColor.value.copy(scene.background).convertLinearToSRGB();
    floor.material.uniforms.color.value.set(light?0xb7b6b3:0x15191f);
    floor.material.uniforms.strength.value=light?.23:.34;
    metal.color.set(light?0x73787c:0x555d66);
    wood.map=textures[light?1:0]; wood.color.set(light?0xf2e5d2:0xb09376); wood.needsUpdate=true;
    evilTableGhost.material.uniforms.coreColor.value.set(light?0x161b24:0xf1f7ff);
    evilTableGhost.material.uniforms.edgeColor.value.set(light?0x505b70:0xa6c7ed);
    hemi.intensity=light?2.8:2.1;
    sun.intensity=light?3.3:3.8;
  }
  new MutationObserver(theme).observe(document.body,{attributes:true,attributeFilter:['class']}); theme();

  const tables=[], binders=[], addresses=new Set(), keys=new Set();
  let endZ=-8, active=null, hovered=null, busy=false, directoryLoading=false;
  let columns=null, hoveredColumn=null, sharedRowsBuilt=0;
  const portal=createShowroomPortal({renderer,scene,camera,
    canWalkOutside:(x,z)=>canWalkAt(x,z,endZ,tables),
    canWalkRoom:(x,z)=>columns?.canWalk(x,z) ?? true,
    onCross:()=>{outline.visible=false;hovered=null;},
  });
  columns=createShowroomColumns({room:portal.room,camera,renderer,bridge,resume:()=>{if(!touchMode)lock(true);}});
  function activateColumn(column=hoveredColumn) {
    if(!column)return false;
    if(column.card || column.ritual)return columns.activate(column);
    keys.clear();releaseTouchInputs();document.exitPointerLock?.();
    return columns.activate(column);
  }
  const ritualEffects=createShowroomRitualEffects({room:portal.room,renderer,onDirty:()=>{sceneDirty=true;},onCameraChange:mode=>{
    ritualCameraMode=mode;canvas.style.imageRendering=mode==='native'?'auto':'pixelated';
    renderer.setPixelRatio(showroomPixelRatio(resolution.ratio));sceneDirty=true;
  }});
  const multiplayer=createShowroomMultiplayer({scene,room:portal.room,camera,portal,bridge,columns,ripples,onDirty:()=>{multiplayerDirty=true;},
    onRoomState:(state,id,now)=>ritualEffects.sync(state,id,now),onOwnChat:text=>chat.record(text)});
  const chat=createChatInput(hud,multiplayer.network);
  const renderShowroom=()=>portal.render();
  let fallback=false, dragging=false, dragged=false, touchMode=false, touchLook=null;
  let suppressTouchClickUntil=0;
  let touchJoystickPointerId=null;
  const touchMove={x:0,y:0};
  let lockRequest=0;
  const ray=new THREE.Raycaster(), center=new THREE.Vector2(), mousePoint=new THREE.Vector2();
  const outline=new THREE.Group(); outline.visible=false; scene.add(outline);
  const outlineBounds=new THREE.Box3();
  const outlineBox=new THREE.Box3Helper(outlineBounds,0xffdd8c);outline.add(outlineBox);
  const outlineInverse=new THREE.Matrix4(),outlineTransform=new THREE.Matrix4(),outlineMeshBounds=new THREE.Box3();
  function fitBinderOutline(group) {
    group.updateWorldMatrix(true,true);
    outlineInverse.copy(group.matrixWorld).invert();outlineBounds.makeEmpty();
    group.traverseVisible(object=>{
      if(!object.isMesh || !object.geometry)return;
      // Instanced page geometry is centered at the origin; its instances are
      // shifted into the closed binder. Bound the instances, not the template.
      if(object.isInstancedMesh && !object.boundingBox)object.computeBoundingBox();
      if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      outlineTransform.multiplyMatrices(outlineInverse,object.matrixWorld);
      outlineMeshBounds.copy(object.isInstancedMesh ? object.boundingBox : object.geometry.boundingBox).applyMatrix4(outlineTransform);
      outlineBounds.union(outlineMeshBounds);
    });
    outlineBounds.expandByScalar(.008);
    group.matrixWorld.decompose(outline.position,outline.quaternion,outline.scale);
  }
  function roundedSlab(width,length,depth,radius,material,x,y,z) {
    const shape=new THREE.Shape(), w=width/2, h=length/2, r=radius;
    shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);
    shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);
    shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:8});
    // Match the table view's broad grain without stretching a box face UV.
    const positions=geometry.attributes.position, uvs=geometry.attributes.uv;
    for(let i=0;i<uvs.count;i++)uvs.setXY(i,(positions.getX(i)+w)/width,(positions.getY(i)+h)/length);
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  const tableTemplates=[];
  function addTable(side,row) {
    const tableX=side*3, tableZ=-row*5;
    if(tableTemplates.length) {
      for(const template of tableTemplates) {
        const mesh=template.clone();
        mesh.position.set(tableX,0,tableZ);mesh.updateMatrix();scene.add(mesh);
      }
      tables.push({x:tableX,z:tableZ});return;
    }
    const firstMesh=scene.children.length;
    const x=0, z=0;
    roundedSlab(1.7,4.5,.046,.13,wood,x,.78,z);
    roundedSlab(1.68,4.48,.017,.12,trim,x,.757,z);
    const rubber=new THREE.MeshStandardMaterial({color:0x171a1d,roughness:.96});
    function tube(start,end,radius,material=metal) {
      const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,a.distanceTo(b),12),material);
      mesh.position.copy(a).add(b).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
      mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    }
    for (const dz of [-1.65,1.65]) {
      for (const direction of [-1,1]) {
        tube([x+direction*.64,.035,z+dz],[x+direction*.58,.746,z+dz],.025);
        tube([x+direction*.64,.008,z+dz],[x+direction*.637,.065,z+dz],.034,rubber);
      }
      tube([x-.623,.23,z+dz],[x+.623,.23,z+dz],.020);
      // Endpoints lie on the actual leg centerlines, so both diagonals fully connect.
      tube([x-.623,.23,z+dz],[x+.584,.70,z+dz],.014);
      tube([x+.623,.23,z+dz],[x-.584,.70,z+dz],.014);
    }
    box(.038,.055,3.65,metal,x-.57,.714,z);
    box(.038,.055,3.65,metal,x+.57,.714,z);
    // Bake static components by material: 18 meshes become four per table.
    // Each table retains its own bounds for normal camera/reflection culling.
    const batches=new Map();
    for(const mesh of scene.children.slice(firstMesh)) {
      mesh.updateMatrix();
      const geometry=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      if(!batches.has(mesh.material))batches.set(mesh.material,[]);
      batches.get(mesh.material).push(geometry);
      mesh.removeFromParent();mesh.geometry.dispose();
    }
    for(const [material,parts] of batches) {
      const geometry=mergeGeometries(parts,false);
      parts.forEach(part=>part.dispose());
      const mesh=new THREE.Mesh(geometry,material);
      geometry.computeBoundingSphere();
      mesh.position.set(tableX,0,tableZ);mesh.updateMatrix();
      mesh.matrixAutoUpdate=false;tableTemplates.push(mesh);scene.add(mesh);
    }
    tables.push({x:tableX,z:tableZ});
  }
  const modelQueue=[];let modelWorkers=0;
  const modelTasks=[];
  function scheduleModelWork(task) {
    return new Promise((resolve,reject)=>modelTasks.push({task,resolve,reject}));
  }
  function flushModelWork() {
    if(active || busy || portal.nearThreshold || document.hidden || !modelTasks.length)return;
    // One build, texture upload, or model insertion per frame. Promise
    // completions must not upload several newly arrived covers in one paint.
    const {task,resolve,reject}=modelTasks.shift();
    try {resolve(task());} catch(error) {reject(error);}
  }
  function freezeModel(model) {
    model.traverse(object=>{
      object.updateMatrix();object.matrixAutoUpdate=false;
      if(object.geometry && !object.geometry.boundingSphere)object.geometry.computeBoundingSphere();
    });
  }
  const uploadedTextures=new WeakMap();
  async function prepareModel(model) {
    const textures=new Set();
    model.traverse(object=>{
      for(const material of [].concat(object.material || [])) {
        for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      }
    });
    for(const texture of textures) {
      if(uploadedTextures.get(texture)===texture.version)continue;
      await scheduleModelWork(()=>{
        if(uploadedTextures.get(texture)===texture.version)return;
        renderer.initTexture(texture);uploadedTextures.set(texture,texture.version);
      });
    }
    freezeModel(model);
    // Compile against the room's real lights/environment before the model
    // becomes visible; supported drivers can finish this off the main thread.
    await scheduleModelWork(()=>renderer.compileAsync(model,camera,scene));
  }
  function disposeModel(model) {
    model.traverse(o=>{o.userData.showroomTitleTexture?.dispose();if(o.isInstancedMesh)o.dispose();o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});
    for(const texture of model.userData.ownedTextures || []) texture.dispose();
  }
  function updateNearbyModels() {
    if(active || busy || portal.inside || document.hidden)return;
    for(const item of binders) {
      if(item===active)continue;
      const distance=item.home.distanceTo(camera.position);
      if(distance<24 && !item.modelLoaded && !item.modelQueued && performance.now()>(item.retryAt||0)) {
        item.modelQueued=true;modelQueue.push(item);
      } else if(distance>36 && item.modelLoaded && !item.unloadQueued) {
        item.unloadQueued=true;
        void scheduleModelWork(()=>{
          item.unloadQueued=false;
          if(item.removed || item.home.distanceToSquared(camera.position)<=36*36)return;
          const placeholder=bridge.placeholder(item.entry);freezeModel(placeholder);
          item.group.remove(item.model);disposeModel(item.model);
          item.model=placeholder;item.group.add(placeholder);
          placeholder.traverse(o=>o.userData.binder=item);item.modelLoaded=false;sceneDirty=true;
        });
      }
    }
    modelQueue.sort((a,b)=>a.home.distanceToSquared(camera.position)-b.home.distanceToSquared(camera.position));
    pumpModels();
  }
  function pumpModels() {
    if(active || busy || portal.inside || document.hidden)return;
    while(modelWorkers<3 && modelQueue.length) {
      const item=modelQueue.shift();
      if(item.removed || item.home.distanceToSquared(camera.position)>36*36) {item.modelQueued=false;continue;}
      modelWorkers++;
      bridge.model(item.entry,scheduleModelWork).then(async model=>{
        try {
          await prepareModel(model);
          await scheduleModelWork(()=>{
            if(item.removed || item.home.distanceToSquared(camera.position)>36*36) {disposeModel(model);return;}
            const old=item.model;
            item.group.remove(old);item.group.add(model);item.model=model;item.modelLoaded=true;sceneDirty=true;
            model.traverse(o=>o.userData.binder=item);
            // Shared cover textures survive; model-owned artwork is released.
            disposeModel(old);
          });
        } catch(error) {disposeModel(model);throw error;}
      }).catch(()=>{item.retryAt=performance.now()+30000;}).finally(()=>{item.modelQueued=false;modelWorkers--;pumpModels();});
    }
  }
  let sunSlab=null,sunSlabLoading=false;
  const sunSlabWallet='HxdFH2HsqwtJJCbdaW3Dh5KuBuov3Q9fMz7BL4pmmNVh';
  async function addSunSlab(item) {
    if(sunSlab || sunSlabLoading)return;
    sunSlabLoading=true;
    let display;
    try {
      const {createShowroomSlab}=await import('./showroom-slab.js?v=4');
      display=await bridge.createSunSlabCard();
      if(item.removed){display.dispose();return;}
      sunSlab=createShowroomSlab(display,scene.environment);
      sunSlab.group.scale.setScalar(.95);
      sunSlab.group.position.set(item.home.x+.38,.85,item.home.z-.63);
      const bounds=new THREE.Box3().setFromObject(sunSlab.group);
      sunSlab.group.position.y+=.834-bounds.min.y;
      scene.add(sunSlab.group);exhibitBudget.register(sunSlab.group);sceneDirty=true;
    } catch(error){display?.dispose();console.warn('Unable to load the Sun slab',error);}
    finally{sunSlabLoading=false;}
  }
  let drifellaSlab=null,drifellaSlabLoading=false;
  async function addDrifellaSlab(item) {
    if(drifellaSlab || drifellaSlabLoading)return;
    drifellaSlabLoading=true;
    let display;
    try {
      const {createShowroomSlabStand}=await import('./showroom-slab-stand.js?v=3');
      display=await bridge.createDrifellaSlabCard();
      if(item.removed){display.dispose();return;}
      drifellaSlab=createShowroomSlabStand(display,scene.environment);
      drifellaSlab.group.position.set(item.home.x-.12,.834,item.home.z-.67);
      scene.add(drifellaSlab.group);exhibitBudget.register(drifellaSlab.group);sceneDirty=true;
    } catch(error){display?.dispose();console.warn('Unable to load the Drifella slab stand',error);}
    finally{drifellaSlabLoading=false;}
  }
  function addBinder(entry) {
    const side=entry.collectionId ? 1 : -1;
    const occupied=new Set(binders.filter(item=>item.side===side).map(item=>item.seatIndex));
    let i=entry.walletAddress?multiplayer.seats.indexOf(entry.walletAddress):-1;
    if(i<0){i=0;while(occupied.has(i))i++;}
    const seat=seatFor(i,side);
    if (!tables.some(table=>table.x===seat.side*3 && table.z===-seat.row*5)) addTable(seat.side,seat.row);
    const group=new THREE.Group(); scene.add(group);
    const x=seat.side*3,z=-seat.row*5+(seat.slot-1)*1.4;
    group.position.set(x,.838,z);
    group.rotation.order='YXZ';group.rotation.set(-Math.PI/2,facingStart(x,z,i),0);
    if(entry.collectionId==='clear') {
      group.rotation.y+=THREE.MathUtils.degToRad(17);
      group.position.z-=.20;
    }
    if(entry.collectionId==='reflection2')group.position.z+=.12;
    if(entry.collectionId==='cardnft2') {
      group.position.z+=.06;
      group.rotation.y-=THREE.MathUtils.degToRad(4);
    }
    const model=bridge.placeholder(entry);freezeModel(model);group.add(model);
    group.updateMatrix();group.matrixAutoUpdate=false;
    const nameplate=createShowroomNameplate(entry,side,z);freezeModel(nameplate);scene.add(nameplate);
    const item={group,model,nameplate,entry,side,seatIndex:i,home:group.position.clone(),rotation:group.quaternion.clone()};binders.push(item);
    group.traverse(o=>o.userData.binder=item);
    if(entry.walletAddress===sunSlabWallet)void addSunSlab(item);
    if(entry.walletAddress?.startsWith('7A5BtUh'))void addDrifellaSlab(item);
  }
  let prefetching=0;
  const warmed=new Map();
  function warmNearby() {
    if(active || portal.inside || document.hidden || prefetching>=2) return;
    const nearby=binders.filter(item=>item.home.distanceToSquared(camera.position)<49)
      .sort((a,b)=>a===hovered?-1:b===hovered?1:a.home.distanceToSquared(camera.position)-b.home.distanceToSquared(camera.position));
    for(const item of nearby) {
      if(prefetching>=2) break;
      if(Date.now()-(warmed.get(item)||0)<45000)continue;
      warmed.set(item,Date.now());prefetching++;
      bridge.prefetch(item.entry).catch(()=>warmed.set(item,Date.now()-35000)).finally(()=>{
        prefetching--;if(!active && !document.hidden)setTimeout(warmNearby,0);
      });
    }
  }
  function touchExploreStatus() {
    return binders.length
      ? 'Drag to look · Use the joystick to walk · Tap a highlighted binder'
      : 'No public binders yet. New binders will appear here automatically.';
  }
  function resetTouchJoystick() {
    touchJoystickPointerId=null;
    touchMove.x=0;touchMove.y=0;
    touchJoystickThumb.style.transform='translate(-50%, -50%)';
    touchJoystick.classList.remove('is-active');
  }
  function releaseTouchInputs() {
    touchLook=null;dragging=false;dragged=false;
    resetTouchJoystick();
  }
  function activateTouchMode() {
    if(touchMode)return;
    touchMode=true;fallback=false;lockRequest++;
    document.body.classList.add('showroom-touch');
    touchJoystick.hidden=false;
    hud.querySelector('#showroomEnter').hidden=true;
    if(document.pointerLockElement===canvas)document.exitPointerLock?.();
    status.textContent=touchExploreStatus();
  }
  window.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')activateTouchMode();
  },{capture:true,passive:true});
  function updateTouchJoystick(event) {
    const rect=touchJoystickBase.getBoundingClientRect();
    const radius=Math.max(24,Math.min(rect.width,rect.height)*.34);
    let dx=event.clientX-(rect.left+rect.width/2);
    let dy=event.clientY-(rect.top+rect.height/2);
    const distance=Math.hypot(dx,dy);
    if(distance>radius){dx*=radius/distance;dy*=radius/distance;}
    touchMove.x=THREE.MathUtils.clamp(dx/radius,-1,1);
    touchMove.y=THREE.MathUtils.clamp(dy/radius,-1,1);
    touchJoystickThumb.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  touchJoystick.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch' || active || busy)return;
    activateTouchMode();touchJoystickPointerId=event.pointerId;
    touchJoystick.classList.add('is-active');
    touchJoystick.setPointerCapture?.(event.pointerId);
    updateTouchJoystick(event);event.preventDefault();event.stopPropagation();
  });
  touchJoystick.addEventListener('pointermove',event=>{
    if(event.pointerId!==touchJoystickPointerId)return;
    updateTouchJoystick(event);event.preventDefault();event.stopPropagation();
  });
  const finishTouchJoystick=event=>{
    if(event.pointerId!==touchJoystickPointerId)return;
    resetTouchJoystick();event.preventDefault();event.stopPropagation();
  };
  touchJoystick.addEventListener('pointerup',finishTouchJoystick);
  touchJoystick.addEventListener('pointercancel',finishTouchJoystick);
  touchJoystick.addEventListener('lostpointercapture',event=>{
    if(event.pointerId===touchJoystickPointerId)resetTouchJoystick();
  });
  async function refresh() {
    if (directoryLoading || active) return;
    directoryLoading=true;
    try {
      let cursor='', seen=new Set();
      const eligible=new Map();
      do {
        const payload=await bridge.list(cursor);
        for (const entry of payload.binders || []) {
          if(entry.walletAddress) eligible.set(entry.walletAddress,entry);
        }
        cursor=payload.nextCursor || '';
        if(cursor && seen.has(cursor)) throw new Error('Repeated directory cursor');
        seen.add(cursor);
      } while(cursor);
      // Reconcile only a complete successful snapshot. A failed page must not
      // remove valid binders, and an open binder must stay stable until returned.
      if(active) return;
      for(let i=binders.length-1;i>=0;i--) {
        const item=binders[i];
        if(item.entry.collectionId || eligible.has(item.entry.walletAddress))continue;
        if(item.entry.walletAddress===sunSlabWallet && sunSlab){exhibitBudget.unregister(sunSlab.group);scene.remove(sunSlab.group);sunSlab.dispose();sunSlab=null;}
        if(item.entry.walletAddress?.startsWith('7A5BtUh') && drifellaSlab){exhibitBudget.unregister(drifellaSlab.group);scene.remove(drifellaSlab.group);drifellaSlab.dispose();drifellaSlab=null;}
        item.removed=true;scene.remove(item.group,item.nameplate);disposeModel(item.model);disposeModel(item.nameplate);
        warmed.delete(item);addresses.delete(item.entry.walletAddress);binders.splice(i,1);
      }
      await multiplayer.registerSeats([...eligible.keys()]);
      const sharedSeats=multiplayer.seats;
      for(const entry of [...eligible.values()].sort((a,b)=>{
        const ai=sharedSeats.indexOf(a.walletAddress),bi=sharedSeats.indexOf(b.walletAddress);
        return (ai<0?Infinity:ai)-(bi<0?Infinity:bi)||a.walletAddress.localeCompare(b.walletAddress);
      })) {
        if(addresses.has(entry.walletAddress))continue;
        await scheduleModelWork(()=>{addresses.add(entry.walletAddress);addBinder(entry);sceneDirty=true;});
      }
      updateNearbyModels();
      endZ=-Math.max(1,...binders.map(item=>seatFor(item.seatIndex).row+1))*5-3;
      sceneDirty=true;
      count.textContent=`${binders.length} public binders · An open collection`;
      status.textContent=touchMode
        ? touchExploreStatus()
        : binders.length?'WASD to walk · Mouse to look · Click an outlined binder':'No public binders yet. New binders will appear here automatically.';
    } catch { count.textContent='Could not refresh binders'; status.textContent='Retrying shortly. You can still explore the room.'; }
    finally { directoryLoading=false; }
  }
  function lock(resuming=false) {
    if ((active || busy) && !resuming) return;
    if(touchMode)return;
    leave.hidden=true;
    const request=++lockRequest;
    const failed=error=>{
      if(request!==lockRequest || document.pointerLockElement===canvas)return;
      // Escape can cause a transient rejection. It must never permanently
      // switch a pointer-lock-capable browser into drag-to-look mode.
      fallback=!canvas.requestPointerLock || ['NotSupportedError','SecurityError'].includes(error?.name);
      status.textContent=fallback
        ? 'WASD to walk · Drag to look · Click a nearby binder'
        : 'Click the scene to resume mouse look';
      hud.querySelector('#showroomEnter').hidden=fallback;
    };
    try {
      if(!canvas.requestPointerLock) {failed();return;}
      canvas.requestPointerLock()?.catch(failed);
    } catch(error) {failed(error);}
  }
  hud.querySelector('#showroomEnter').onclick=()=>lock();
  document.addEventListener('pointerlockchange',()=>{
    lockRequest++;
    fallback=false; dragging=false; dragged=false; keys.clear();
    hud.querySelector('#showroomEnter').hidden=touchMode || document.pointerLockElement===canvas;
  });
  function touchBinderAt(clientX,clientY) {
    const pointer=new THREE.Vector2(clientX/innerWidth*2-1,1-clientY/innerHeight*2);
    return pickBinder(pointer);
  }
  function beginTouchLook(event) {
    if(event.pointerType!=='touch' || active || busy || touchLook || columns.selecting)return false;
    activateTouchMode();
    touchLook={
      pointerId:event.pointerId,
      startX:event.clientX,startY:event.clientY,
      lastX:event.clientX,lastY:event.clientY,
      startedAt:performance.now(),moved:false,
    };
    dragging=true;dragged=false;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }
  function moveTouchLook(event) {
    if(!touchLook || event.pointerId!==touchLook.pointerId)return false;
    const dx=event.clientX-touchLook.lastX,dy=event.clientY-touchLook.lastY;
    touchLook.lastX=event.clientX;touchLook.lastY=event.clientY;
    if(Math.hypot(event.clientX-touchLook.startX,event.clientY-touchLook.startY)>8) {
      touchLook.moved=true;dragged=true;
    }
    camera.rotation.y-=dx*.0034;
    camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.0034,-1.35,1.35);
    sceneDirty=true;event.preventDefault();
    return true;
  }
  function finishTouchLook(event,cancelled=false) {
    if(!touchLook || event.pointerId!==touchLook.pointerId)return false;
    const look=touchLook;
    const isTap=!cancelled && !look.moved && performance.now()-look.startedAt<650;
    suppressTouchClickUntil=performance.now()+700;
    touchLook=null;dragging=false;dragged=false;
    if(isTap && !active && !busy && portal.inside) {
      const pointer=new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
      activateColumn(columns.pick(pointer) || hoveredColumn);
    } else if(isTap && !active && !busy) {
      const target=touchBinderAt(event.clientX,event.clientY) || hovered;
      if(target)void open(target);
    }
    event.preventDefault();
    return true;
  }
  canvas.addEventListener('pointermove',event=>{
    mousePoint.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
    if(event.pointerType==='touch')moveTouchLook(event);
  },{passive:false});
  canvas.addEventListener('pointerdown',event=>{
    if(beginTouchLook(event))return;
    if(event.pointerType!=='touch' && event.button===0){dragging=true;dragged=false;}
  },{passive:false});
  canvas.addEventListener('pointerup',event=>finishTouchLook(event));
  canvas.addEventListener('pointercancel',event=>finishTouchLook(event,true));
  canvas.addEventListener('lostpointercapture',event=>finishTouchLook(event,true));
  document.addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch')dragging=false;
  });
  document.addEventListener('mousemove',e=>{
    if ((document.pointerLockElement!==canvas && !(fallback && dragging)) || active) return;
    if (Math.abs(e.movementX)+Math.abs(e.movementY)>2) dragged=true;
    camera.rotation.y-=e.movementX*.002;
    camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-e.movementY*.002,-1.35,1.35);
  });
  document.addEventListener('keydown',e=>{
    if (active || (document.pointerLockElement!==canvas && !fallback)) return;
    if (e.code==='Escape') {lockRequest++;fallback=false;dragging=false;keys.clear();hud.querySelector('#showroomEnter').hidden=false;return;}
    if (['ShiftLeft','ShiftRight'].includes(e.code)) {keys.add(e.code);e.preventDefault();}
    if (['KeyW','KeyA','KeyS','KeyD'].includes(e.code)) {keys.add(e.code);if(!e.repeat) move(1/60);e.preventDefault();}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code)); window.addEventListener('blur',()=>{keys.clear();releaseTouchInputs();});
  function pickupPosition(item) {
    const frame=bridge.pickupFrame();
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const ndcHeight=Math.abs(frame.top.y-frame.bottom.y);
    const distance=.94 / (Math.max(.01,ndcHeight)*tangent);
    const center=camera.localToWorld(new THREE.Vector3(
      frame.center.x*distance*tangent*camera.aspect,frame.center.y*distance*tangent,-distance,
    ));
    item.group.updateWorldMatrix(true,true);
    const face=item.model.getObjectByName('showroom-front-cover');
    const offset=item.group.worldToLocal(face.getWorldPosition(new THREE.Vector3()));
    return center.sub(offset.applyQuaternion(camera.quaternion));
  }
  function tween(item,returning=false) {
    const from=item.group.position.clone(), q=item.group.quaternion.clone();
    const to=returning?item.home:pickupPosition(item);
    const rot=returning?item.rotation:camera.quaternion.clone();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    return new Promise(resolve=>{
      const start=performance.now();
      function step(now) {
        const t=reduced?1:Math.min(1,(now-start)/550), ease=t*t*(3-2*t);
        item.group.position.lerpVectors(from,to,ease); item.group.quaternion.slerpQuaternions(q,rot,ease);
        const coverShade=item.model?.userData.showroomCoverShade;
        if(coverShade) {
          const pickupProgress=returning?1-ease:ease;
          const scale=THREE.MathUtils.lerp(coverShade.restScale,1,pickupProgress);
          for(const entry of coverShade.materials) {
            entry.material.color.copy(entry.originalColor).multiplyScalar(scale);
            entry.material.emissive.copy(entry.originalEmissive).multiplyScalar(scale);
          }
        }
        item.group.updateMatrix();
        if(t<1) requestAnimationFrame(step);
        else {
          // Paint the exact endpoint before handing off to the interactive canvas.
          renderShowroom();
          resolve();
        }
      } requestAnimationFrame(step);
    });
  }
  async function open(item) {
    if(active || busy) return;
    active=item;busy=true; openBinderButton.hidden=true; leave.hidden=true; keys.clear(); releaseTouchInputs(); document.exitPointerLock?.(); outline.visible=false;
    status.textContent='Opening binder…';
    try {
      await bridge.open(item.entry);
      await tween(item);
      item.group.visible=false;
      // Remove the moving proxy from the backdrop before revealing the real
      // binder, rather than leaving its previous frame behind for one paint.
      renderShowroom(); sceneDirty=false;
      document.body.classList.remove('showroom-walking');
      suspendShowroomBuffers();
      status.textContent='Browse the binder · Back to table to keep exploring';
    } catch (error) {
      console.warn("Showroom binder could not load", error);
      await tween(item,true); bridge.close(); active=null;
      status.textContent='This binder could not load. Click it to retry.';
    } finally {busy=false;}
  }
  async function close() {
    if(!active || active.hand || busy) return;
    busy=true; const item=active;
    restoreShowroomBuffers();
    // Request capture inside the return-button gesture, before the animation awaits.
    // Movement stays frozen until the binder has landed.
    if(!fallback && !touchMode) lock(true);
    document.body.classList.add('showroom-walking'); bridge.close(); item.group.visible=true;
    await tween(item,true); active=null;busy=false;
    updateNearbyModels();warmNearby();
    status.textContent=touchMode
      ? touchExploreStatus()
      : 'WASD to walk · Mouse to look · Click an outlined binder';
    hud.querySelector('#showroomEnter').hidden=touchMode || fallback || document.pointerLockElement===canvas;
  }
  async function releaseBinderToHand() {
    if (!active || active.hand || busy) throw new Error('Binder is not ready');
    busy=true;
    const item=active;
    restoreShowroomBuffers();
    item.group.position.copy(item.home); item.group.quaternion.copy(item.rotation); item.group.updateMatrix();
    const shade=item.model?.userData.showroomCoverShade;
    for(const entry of shade?.materials || []) {
      entry.material.color.copy(entry.originalColor).multiplyScalar(shade.restScale);
      entry.material.emissive.copy(entry.originalEmissive).multiplyScalar(shade.restScale);
    }
    const materials=new Map();
    item.group.traverse(object => {
      for(const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if(material && !materials.has(material)) {
          materials.set(material,{opacity:material.opacity,transparent:material.transparent});
          material.transparent=true;material.opacity=0;material.needsUpdate=true;
        }
      }
    });
    item.group.visible=true;
    document.body.classList.add('showroom-walking');bridge.close();
    // Capture during the hand-button gesture, before the fade awaits.
    // Active/busy keep movement frozen until the binder is back on the table.
    if(!fallback && !touchMode) lock(true);
    try {
      await new Promise(resolve => {
        const start=performance.now(), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        function step(now) {
          const t=reduced?1:Math.min(1,(now-start)/420);
          for(const [material,original] of materials) material.opacity=original.opacity*t;
          sceneDirty=true;
          if(t<1) requestAnimationFrame(step); else resolve();
        }
        requestAnimationFrame(step);
      });
    } finally {
      for(const [material,original] of materials) {
        material.opacity=original.opacity;material.transparent=original.transparent;material.needsUpdate=true;
      }
      active=null;busy=false;leave.hidden=touchMode || document.pointerLockElement===canvas;sceneDirty=true;
      updateNearbyModels();warmNearby();
    }
  }
  function beginHandView() {
    active={hand:true};keys.clear();releaseTouchInputs();document.exitPointerLock?.();
    leave.hidden=true;outline.visible=false;
    renderShowroom();sceneDirty=false;multiplayerDirty=false;
    document.body.classList.remove('showroom-walking');
    suspendShowroomBuffers();
  }
  function endHandView() {
    active=null;restoreShowroomBuffers();
    document.body.classList.add('showroom-walking');leave.hidden=false;
  }
  window.addEventListener('showroom-return',close); hud.querySelector('#showroomReturn').onclick=close;
  openBinderButton.onclick=()=>{
    if(portal.inside){activateColumn();return;}
    if(hovered && !active && !busy)void open(hovered);
  };
  canvas.onclick=e=>{
    if(active || busy)return;
    if(performance.now()<suppressTouchClickUntil)return;
    if(portal.inside && !columns.selecting){
      const point=document.pointerLockElement===canvas?center:new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
      if(activateColumn(columns.pick(point)))return;
    }
    if(columns.selecting)return;
    if(document.pointerLockElement===canvas) {
      if(hovered)void open(hovered);
      return;
    }
    if(dragged)return;
    // Keep fallback binder interaction available in embedded browsers without
    // racing a capture request against opening the binder.
    if (fallback) {
      const pointer=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
      const hit=pickBinder(pointer);
      if(hit) {void open(hit);return;}
    }
    // An earlier blocked request never prevents a fresh scene click retry.
    lock();
  };
  function move(dt) {
      if(columns.selecting)return;
      const forward=THREE.MathUtils.clamp(
        Number(keys.has('KeyW'))-Number(keys.has('KeyS'))-touchMove.y,
        -1,1,
      );
      const right=THREE.MathUtils.clamp(
        Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+touchMove.x,
        -1,1,
      );
      const norm=Math.hypot(forward,right);
      if(norm<.001)return;
      const amount=Math.min(1,norm);
      const speed=dt*2.7*(keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.25 : 1)*amount/norm, yaw=camera.rotation.y;
      const dx=(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed;
      const dz=(-forward*Math.cos(yaw)-right*Math.sin(yaw))*speed;
      portal.move(dx,dz);
  }
  const pickTargets=[], pickHits=[];
  const pickView=new THREE.Matrix4(), pickPoint=new THREE.Vector2(Infinity,Infinity);
  let pickedBinder=null;
  function pickBinder(point) {
    if(portal.inside)return null;
    camera.updateMatrixWorld();
    if(!sceneDirty && pickView.equals(camera.matrixWorld) && pickPoint.equals(point))return pickedBinder;
    pickView.copy(camera.matrixWorld);pickPoint.copy(point);
    pickTargets.length=0;pickHits.length=0;
    for(const item of binders) {
      if(item.group.visible && item.home.distanceToSquared(camera.position)<16)pickTargets.push(item.group);
    }
    for(const target of pickTargets)target.updateWorldMatrix(true,true);
    ray.setFromCamera(point,camera);ray.far=2.7;
    ray.intersectObjects(pickTargets,true,pickHits);
    pickedBinder=pickHits[0]?.object.userData.binder || null;
    return pickedBinder;
  }
  window.addEventListener('scene-transition-start',()=>{keys.clear();releaseTouchInputs();document.exitPointerLock?.();});
  let previous=performance.now();
  function frame(now) {
    sky.update(now);
    if(sunSlab && !document.hidden)sunSlab.update(now*.001,camera);
    if(drifellaSlab && !document.hidden)drifellaSlab.update(now*.001,camera);
    const frameMs=now-previous;
    const dt=Math.min(frameMs/1000,.04);previous=now;
    if(document.hidden || window.cardSceneTransition?.departing) {requestAnimationFrame(frame);return;}
    if(!active && !busy && !portal.crossingZone) {
      const nextQuality=quality.sample(frameMs);
      if(nextQuality){
        qualitySettings=nextQuality;floorReflectionSize=nextQuality.reflectionSize;
        if(!showroomBuffersSuspended)floor.getRenderTarget().setSize(floorReflectionSize,floorReflectionSize);
        floor.material.uniforms.texel.value.set(1/floorReflectionSize,1/floorReflectionSize);
        reflectionReady=false;sceneDirty=true;
      }
      if(now-lastExhibitUpdate>350){exhibitBudget.update(camera,qualitySettings.tier,prepareModel);lastExhibitUpdate=now;}
      const ratio=resolution.sample(frameMs);
      if(ratio!==null) {renderer.setPixelRatio(showroomPixelRatio(ratio));sceneDirty=true;}
    }
    if(!active && (document.pointerLockElement===canvas || fallback || touchMode)) {
      move(dt);
    }
    portal.place(tables);
    speech.update(now,camera,document.pointerLockElement===canvas || touchMode || dragging ? center : mousePoint,!active && !busy && !portal.inside);
    multiplayer.update(now);
    ritualEffects.update(multiplayer.network.now());
    chat.update(!active && !busy && !fallback && document.pointerLockElement!==canvas && !leave.hidden);
    // Reserve the shared wallet-table footprint even when a visitor's private
    // directory fetch differs. Portal position and player coordinates agree.
    const sharedRows=Math.ceil(multiplayer.seats.length/3);
    for(let row=sharedRowsBuilt;row<sharedRows;row++)if(!tables.some(table=>table.x===-3&&table.z===-row*5))addTable(-1,row);
    sharedRowsBuilt=sharedRows;
    if(sharedRows)endZ=Math.min(endZ,-sharedRows*5-3);
    hoveredColumn=columns.update(now,document.pointerLockElement===canvas || touchMode?center:mousePoint,
      portal.inside && !active && !busy);
    const oldHovered=hovered;
    hovered=null;
    if(!active) {
      hovered=pickBinder(fallback && !touchMode && !dragging ? mousePoint : center);
      outline.visible=!!hovered;
      if(hovered && (hovered!==oldHovered || sceneDirty)){fitBinderOutline(hovered.group); status.textContent=`${touchMode?'Tap':'Click'} to open ${hovered.entry.label || `${hovered.entry.walletAddress?.slice(0,4)}…${hovered.entry.walletAddress?.slice(-4)}`}`;}
      else if(!hovered && oldHovered && touchMode) status.textContent='Drag to look · Use the joystick to walk · Center and tap a binder';
      else if(!hovered && oldHovered && document.pointerLockElement===canvas) status.textContent='WASD to walk · Mouse to look · Approach a binder to open it';
      if(hovered && hovered!==oldHovered)warmNearby();
    }
    openBinderButton.hidden=!touchMode || !(hovered || hoveredColumn) || Boolean(active || busy || columns.selecting);
    openBinderButton.textContent=hoveredColumn?(hoveredColumn.ritual?'Begin ritual':hoveredColumn.card?'Take card':'Place card'):'Open';
    if(hoveredColumn)openBinderButton.setAttribute('aria-label',hoveredColumn.ritual?'Begin ritual with the three displayed cards':hoveredColumn.card?'Take displayed card into your hand':'Choose a card to display');
    if(!openBinderButton.hidden && hovered && hovered!==oldHovered) {
      openBinderButton.setAttribute('aria-label',`Open ${hovered.entry.label || hovered.entry.walletAddress || 'binder'}`);
    }

    if(!document.hidden && (!active || busy || sceneDirty || multiplayerDirty)) {
      if(!portal.inside)ripples.update(now,camera);
      floor.material.uniforms.rippleTime.value=now*.001;
      evilTableGhost.material.uniforms.time.value=now*.001;
      evilTableGhost.material.uniforms.pixelRatio.value=renderer.getPixelRatio();
      stars.update(now,portal.exteriorCamera,renderer);
      renderShowroom();sceneDirty=false;multiplayerDirty=false;
    }
    flushModelWork();
    requestAnimationFrame(frame);
  }
  function resize(){sceneDirty=true;renderer.setPixelRatio(showroomPixelRatio(resolution.ratio));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
  setInterval(()=>{warmNearby();if(!document.hidden)updateNearbyModels();},1000);
  for(const entry of bridge.collections) await scheduleModelWork(()=>{addBinder(entry);sceneDirty=true;});
  const clearBinder=binders.find(item=>item.entry.collectionId==='clear');
  if(clearBinder) {
    try {
      const {createShowroomDratini}=await import('./showroom-dratini.js?v=8');
      const display=await createShowroomDratini(renderer,scene.environment);
      display.position.set(clearBinder.home.x+.35,.803+display.userData.tableHeightOffset,clearBinder.home.z+.57);
      display.rotation.y=-Math.PI/2;
      // Rotate the arrangement around its shared center, then save the binder's
      // new resting pose so pickup and return animations still use world space.
      const pivot=clearBinder.home.clone().add(display.position).multiplyScalar(.5);
      const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(-12));
      for(const object of [clearBinder.group,display]) {
        object.position.sub(pivot).applyQuaternion(turn).add(pivot);
        object.quaternion.premultiply(turn);object.updateMatrix();
      }
      clearBinder.home.copy(clearBinder.group.position);
      clearBinder.rotation.copy(clearBinder.group.quaternion);
      freezeModel(display);scene.add(display);exhibitBudget.register(display);sceneDirty=true;
    } catch(error) { console.warn('Unable to load the Dratini table display',error); }
  }
  const reflectionBinder=binders.find(item=>item.entry.collectionId==='reflection2');
  if(reflectionBinder) {
    try {
      const {createShowroomGremlin}=await import('./showroom-gremlin.js?v=5');
      const figure=await createShowroomGremlin();
      // Left from the aisle, with the feet on the tabletop and the face toward visitors.
      // Table top: .78 base + .046 extrusion + .006 bevel; allow .002 clearance.
      figure.position.set(reflectionBinder.home.x+.08,.834,reflectionBinder.home.z-.60);
      figure.rotation.y=-Math.PI/2+THREE.MathUtils.degToRad(25);
      freezeModel(figure);scene.add(figure);exhibitBudget.register(figure);sceneDirty=true;
    } catch(error) { console.warn('Unable to load the thumbs-up table figure',error); }
  }
  const valkyrieBinder=binders.find(item=>item.entry.collectionId==='godsofdestiny');
  if(valkyrieBinder) {
    try {
      const {createShowroomAngelgotchi}=await import('./showroom-angelgotchi.js?v=3');
      const figure=await createShowroomAngelgotchi();
      figure.position.set(valkyrieBinder.home.x+.38,.834,valkyrieBinder.home.z-.59);
      figure.rotation.y=-Math.PI/2-THREE.MathUtils.degToRad(12);
      freezeModel(figure);scene.add(figure);exhibitBudget.register(figure);sceneDirty=true;
    } catch(error) {console.warn('Unable to load the Angelgotchi table figure',error);}
  }
  const cardNft2Binder=binders.find(item=>item.entry.collectionId==='cardnft2');
  if(cardNft2Binder) {
    try {
      const {createShowroomPack}=await import('./showroom-pack.js?v=5');
      const pack=await createShowroomPack(renderer);
      pack.position.set(cardNft2Binder.home.x,.832,cardNft2Binder.home.z-.64);
      const bounds=new THREE.Box3().setFromObject(pack);
      pack.position.y+=.833-bounds.min.y;
      freezeModel(pack);scene.add(pack);sceneDirty=true;
    } catch(error) { console.warn('Unable to load the Card NFT 2 pack',error); }
  }
  portal.place(tables);
  await portal.prepare();
  updateNearbyModels();
  const initialDirectory=refresh();
  setInterval(()=>{if(!document.hidden)void refresh();},60000);
  if(window.cardSceneTransition?.arriving) {
    // Hold the curtain for the directory and nearby cover models, not distant rows.
    await Promise.race([initialDirectory,new Promise(resolve=>setTimeout(resolve,12000))]);
    updateNearbyModels();
    const started=performance.now();
    while((modelWorkers || modelQueue.length) && performance.now()-started<6000) {
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    await renderer.compileAsync(scene,camera);
    renderShowroom();
  }
  return { releaseBinderToHand, beginHandView, endHandView, setHand:hand=>{columns.setHand(hand);multiplayer.setHand(hand);} };
}
