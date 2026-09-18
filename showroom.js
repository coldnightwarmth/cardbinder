import * as THREE from 'three';
import { createShowroomSpeech } from './showroom-speech.js?v=4';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { createResolutionBudget } from './showroom-performance.mjs';
import { createShowroomRipples } from './showroom-ripples.js?v=soft-2';
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
  hud.innerHTML = `<div id="showroomTop"><div class="showroom-title"><small>CARDS.ART / COMMUNITY</small><strong>The show floor</strong><span id="showroomCount">Loading public binders…</span></div><a href="/">Home</a><button id="showroomTheme">Switch style</button><button id="showroomReturn">Back to table</button></div><div id="showroomCrosshair"></div><div id="showroomHint"><span id="showroomStatus" role="status">WASD to walk · Mouse to look · Esc to release mouse</span> <button id="showroomEnter">Enter show floor</button></div><div id="showroomTouchJoystick" role="application" aria-label="Movement joystick" hidden><div id="showroomTouchJoystickBase"><span id="showroomTouchJoystickThumb"></span></div></div>`;
  document.body.append(hud);
  const leave = document.createElement('a');
  leave.id='showroomLeave'; leave.textContent='Leave Show Room'; leave.hidden=true;
  leave.href='/';
  const returnTo=new URLSearchParams(location.search).get('returnTo') || document.referrer;
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  const resolution=createResolutionBudget(Math.min(devicePixelRatio,2));
  renderer.setPixelRatio(resolution.ratio); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  // The reflective floor supplies grounding without unstable shadow-map passes.
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, .05, 600);
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
  const shader = THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms);
  shader.footsteps={value:ripples.steps};
  shader.rippleTime={value:0};
  shader.horizonColor={value:new THREE.Color()};
  shader.strength={value:.27}; shader.texel={value:new THREE.Vector2(1/1024,1/1024)};
  const floor = new Reflector(new THREE.PlaneGeometry(2000,2000), {
    textureWidth:1024,textureHeight:1024,multisample:0,color:0x25272b,
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
    if(reflectionReady && performance.now()-reflectionAt<1000 && !sceneDirty && !busy && reflectedView.equals(camera.matrixWorld)
      && reflectedProjection.equals(camera.projectionMatrix)) return;
    reflectedView.copy(camera.matrixWorld);reflectedProjection.copy(camera.projectionMatrix);reflectionReady=true;reflectionAt=performance.now();
    const visible=outline.visible, ghostVisible=evilTableGhost.visible;
    outline.visible=false;stars.object.visible=false;evilTableGhost.visible=false;
    try { reflect.apply(this,args); }
    finally { outline.visible=visible;stars.object.visible=true;evilTableGhost.visible=ghostVisible; }
  };
  let sceneDirty=true;
  const textures = await Promise.all(['table-wood-seamless.png','table-wood-light-seamless.png'].map(async name => {
    try { const t = await new THREE.TextureLoader().loadAsync(`/assets/ui/${name}`); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,2); return t; } catch { return null; }
  }));
  let currentTheme;
  function theme() {
    const light=document.body.classList.contains('is-light');
    if(light===currentTheme)return;
    currentTheme=light;sceneDirty=true;
    stars.theme(light);
    scene.background=new THREE.Color(light ? 0xe4e2de:0x181d23);
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
  hud.querySelector('#showroomTheme').onclick=()=>document.querySelector('#themeToggle').click();
  const tables=[], binders=[], addresses=new Set(), keys=new Set();
  let endZ=-8, active=null, hovered=null, busy=false, directoryLoading=false;
  let fallback=false, dragging=false, dragged=false, touchMode=false, touchLook=null;
  let suppressTouchClickUntil=0;
  let touchJoystickPointerId=null;
  const touchMove={x:0,y:0};
  let lockRequest=0;
  const ray=new THREE.Raycaster(), center=new THREE.Vector2(), mousePoint=new THREE.Vector2();
  const outline=new THREE.BoxHelper(new THREE.Object3D(),0xffdd8c); outline.visible=false; scene.add(outline);
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
  function addTable(side,row) {
    const firstMesh=scene.children.length;
    const x=side*3, z=-row*5;
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
      mesh.matrixAutoUpdate=false;scene.add(mesh);
    }
    tables.push({x,z});
  }
  const modelQueue=[];let modelWorkers=0;
  function disposeModel(model) {
    model.traverse(o=>{o.userData.showroomTitleTexture?.dispose();o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});
    for(const texture of model.userData.ownedTextures || []) texture.dispose();
  }
  function updateNearbyModels() {
    for(const item of binders) {
      if(item===active)continue;
      const distance=item.home.distanceTo(camera.position);
      if(distance<24 && !item.modelLoaded && !item.modelQueued && performance.now()>(item.retryAt||0)) {
        item.modelQueued=true;modelQueue.push(item);
      } else if(distance>36 && item.modelLoaded) {
        item.group.remove(item.model);disposeModel(item.model);
        item.model=bridge.placeholder(item.entry);item.group.add(item.model);
        item.model.traverse(o=>o.userData.binder=item);item.modelLoaded=false;sceneDirty=true;
      }
    }
    modelQueue.sort((a,b)=>a.home.distanceToSquared(camera.position)-b.home.distanceToSquared(camera.position));
    pumpModels();
  }
  function pumpModels() {
    while(modelWorkers<3 && modelQueue.length) {
      const item=modelQueue.shift();
      if(item.removed || item.home.distanceToSquared(camera.position)>36*36) {item.modelQueued=false;continue;}
      modelWorkers++;
      bridge.model(item.entry).then(model=>{
        if(item.removed) {disposeModel(model);return;}
        const old=item.model;
        item.group.remove(old);item.group.add(model);item.model=model;item.modelLoaded=true;sceneDirty=true;
        model.traverse(o=>o.userData.binder=item);
        // Dispose only geometry/material; cover textures belong to the shared cache.
        disposeModel(old);
      }).catch(()=>{item.retryAt=performance.now()+30000;}).finally(()=>{item.modelQueued=false;modelWorkers--;pumpModels();});
    }
  }
  function addBinder(entry) {
    const side=entry.collectionId ? 1 : -1;
    const occupied=new Set(binders.filter(item=>item.side===side).map(item=>item.seatIndex));
    let i=0;while(occupied.has(i))i++;
    const seat=seatFor(i,side);
    if (!tables.some(table=>table.x===seat.side*3 && table.z===-seat.row*5)) addTable(seat.side,seat.row);
    const group=new THREE.Group(); scene.add(group);
    const x=seat.side*3,z=-seat.row*5+(seat.slot-1)*1.4;
    group.position.set(x,.838,z);
    group.rotation.order='YXZ';group.rotation.set(-Math.PI/2,facingStart(x,z,i),0);
    const model=bridge.placeholder(entry);group.add(model);
    const nameplate=createShowroomNameplate(entry,side,z); scene.add(nameplate);
    const item={group,model,nameplate,entry,side,seatIndex:i,home:group.position.clone(),rotation:group.quaternion.clone()};binders.push(item);
    group.traverse(o=>o.userData.binder=item);
  }
  let prefetching=0;
  const warmed=new Map();
  function warmNearby() {
    if(active || document.hidden || prefetching>=2) return;
    const nearby=binders.filter(item=>item.home.distanceTo(camera.position)<7)
      .sort((a,b)=>a.home.distanceToSquared(camera.position)-b.home.distanceToSquared(camera.position));
    for(const item of nearby) {
      if(prefetching>=2) break;
      if(Date.now()-(warmed.get(item)||0)<45000)continue;
      warmed.set(item,Date.now());prefetching++;
      bridge.prefetch(item.entry).catch(()=>warmed.delete(item)).finally(()=>prefetching--);
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
        item.removed=true;scene.remove(item.group,item.nameplate);disposeModel(item.model);disposeModel(item.nameplate);
        warmed.delete(item);addresses.delete(item.entry.walletAddress);binders.splice(i,1);
      }
      for(const entry of eligible.values()) {
        if(addresses.has(entry.walletAddress))continue;
        addresses.add(entry.walletAddress);addBinder(entry);
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
    if(event.pointerType!=='touch' || active || busy || touchLook)return false;
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
    if(isTap && !active && !busy) {
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
        if(t<1) requestAnimationFrame(step);
        else {
          // Paint the exact endpoint before handing off to the interactive canvas.
          renderer.render(scene,camera);
          resolve();
        }
      } requestAnimationFrame(step);
    });
  }
  async function open(item) {
    if(active || busy) return;
    active=item;busy=true; leave.hidden=true; keys.clear(); releaseTouchInputs(); document.exitPointerLock?.(); outline.visible=false;
    status.textContent='Opening binder…';
    try {
      await bridge.open(item.entry);
      await tween(item);
      item.group.visible=false;
      // Remove the moving proxy from the backdrop before revealing the real
      // binder, rather than leaving its previous frame behind for one paint.
      renderer.render(scene,camera); sceneDirty=false;
      document.body.classList.remove('showroom-walking');
      status.textContent='Browse the binder · Back to table to keep exploring';
    } catch (error) {
      console.warn("Showroom binder could not load", error);
      await tween(item,true); bridge.close(); active=null;
      status.textContent='This binder could not load. Click it to retry.';
    } finally {busy=false;}
  }
  async function close() {
    if(!active || busy) return;
    busy=true; const item=active;
    // Request capture inside the return-button gesture, before the animation awaits.
    // Movement stays frozen until the binder has landed.
    if(!fallback && !touchMode) lock(true);
    document.body.classList.add('showroom-walking'); bridge.close(); item.group.visible=true;
    await tween(item,true); active=null;busy=false;
    status.textContent=touchMode
      ? touchExploreStatus()
      : 'WASD to walk · Mouse to look · Click an outlined binder';
    hud.querySelector('#showroomEnter').hidden=touchMode || fallback || document.pointerLockElement===canvas;
  }
  window.addEventListener('showroom-return',close); hud.querySelector('#showroomReturn').onclick=close;
  canvas.onclick=e=>{
    if(active || busy)return;
    if(performance.now()<suppressTouchClickUntil)return;
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
  function canWalk(x,z) {
    return canWalkAt(x,z,endZ,tables);
  }
  function move(dt) {
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
      if(canWalk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
      if(canWalk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
  }
  const pickTargets=[], pickHits=[];
  function pickBinder(point) {
    pickTargets.length=0;pickHits.length=0;
    for(const item of binders) {
      if(item.group.visible && item.home.distanceToSquared(camera.position)<16)pickTargets.push(item.group);
    }
    camera.updateMatrixWorld();
    ray.setFromCamera(point,camera);ray.far=2.7;
    ray.intersectObjects(pickTargets,true,pickHits);
    return pickHits[0]?.object.userData.binder || null;
  }
  let previous=performance.now();
  function frame(now) {
    const frameMs=now-previous;
    const dt=Math.min(frameMs/1000,.04);previous=now;
    if(document.hidden) {requestAnimationFrame(frame);return;}
    if(!active && !busy) {
      const ratio=resolution.sample(frameMs);
      if(ratio!==null) {renderer.setPixelRatio(ratio);sceneDirty=true;}
    }
    if(!active && (document.pointerLockElement===canvas || fallback || touchMode)) {
      move(dt);
    }
    speech.update(now,camera,document.pointerLockElement===canvas || touchMode || dragging ? center : mousePoint,!active && !busy);
    const oldHovered=hovered;
    hovered=null;
    if(!active) {
      hovered=pickBinder(fallback && !touchMode && !dragging ? mousePoint : center);
      outline.visible=!!hovered;
      if(hovered && (hovered!==oldHovered || sceneDirty)){outline.setFromObject(hovered.group); status.textContent=`${touchMode?'Tap':'Click'} to open ${hovered.entry.label || `${hovered.entry.walletAddress?.slice(0,4)}…${hovered.entry.walletAddress?.slice(-4)}`}`;}
      else if(!hovered && oldHovered && touchMode) status.textContent='Drag to look · Use the joystick to walk · Center and tap a binder';
      else if(!hovered && oldHovered && document.pointerLockElement===canvas) status.textContent='WASD to walk · Mouse to look · Approach a binder to open it';
    }

    if(!document.hidden && (!active || busy || sceneDirty)) {
      ripples.update(now,camera);
      floor.material.uniforms.rippleTime.value=now*.001;
      evilTableGhost.material.uniforms.time.value=now*.001;
      evilTableGhost.material.uniforms.pixelRatio.value=renderer.getPixelRatio();
      stars.update(now,camera,renderer);
      renderer.render(scene,camera);sceneDirty=false;
    }
    requestAnimationFrame(frame);
  }
  function resize(){sceneDirty=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
  setInterval(()=>{warmNearby();if(!document.hidden)updateNearbyModels();},1000);
  for(const entry of bridge.collections) addBinder(entry);
  updateNearbyModels();
  void refresh(); setInterval(()=>{if(!document.hidden)void refresh();},60000);
}
