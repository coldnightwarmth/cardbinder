import * as THREE from 'three';

import { Reflector } from './vendor/Reflector.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

import { seatFor, canWalkAt, facingStart } from './showroom-layout.mjs';

export async function initShowroom(bridge) {
  const canvas = document.createElement('canvas');
  canvas.id = 'showroomCanvas'; canvas.setAttribute('aria-label', 'First person card show floor');
  document.body.prepend(canvas);
  const hud = document.createElement('div'); hud.id = 'showroomHud';
  hud.innerHTML = `<div id="showroomTop"><div class="showroom-title"><small>CARDS.ART / COMMUNITY</small><strong>The show floor</strong><span id="showroomCount">Loading public binders…</span></div><a href="/">Home</a><button id="showroomTheme">Switch style</button><button id="showroomReturn">Back to table</button></div><div id="showroomCrosshair"></div><div id="showroomHint"><span id="showroomStatus" role="status">WASD to walk · Mouse to look · Esc to release mouse</span> <button id="showroomEnter">Enter show floor</button></div>`;
  document.body.append(hud);
  const status = hud.querySelector('#showroomStatus'), count = hud.querySelector('#showroomCount');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, .05, 600);
  camera.position.set(0, 1.65, 3.5); camera.rotation.order = 'YXZ';
  camera.rotation.x = -.12;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .025).texture;
  environment.dispose(); pmrem.dispose();
  const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x867766, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffeedb, 3.3); sun.position.set(-3, 9, 4); scene.add(sun, sun.target);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:18,bottom:-18,near:.5,far:40});
  sun.shadow.bias=-.0003; sun.shadow.normalBias=.02; sun.shadow.radius=3;
  const fill=new THREE.DirectionalLight(0xc8dcff,1.3); fill.position.set(4,5,-8);scene.add(fill);
  const wood = new THREE.MeshStandardMaterial({ roughness:.82, metalness:0, envMapIntensity:.16 });
  const metal = new THREE.MeshStandardMaterial({ color:0x5e6369, metalness:.85, roughness:.27 });
  const trim = new THREE.MeshStandardMaterial({ color:0x383533, metalness:.4, roughness:.42 });
  function box(w,h,d,mat,x,y,z,parent=scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); mesh.position.set(x,y,z);
    mesh.castShadow=true; mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Planar reflection uses the r165 Reflector bundled alongside the site's Three.js.
  const shader = THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms);
  shader.horizonColor={value:new THREE.Color()};
  shader.strength={value:.27}; shader.texel={value:new THREE.Vector2(1/1024,1/1024)};
  const floor = new Reflector(new THREE.PlaneGeometry(2000,2000), {
    textureWidth:1024,textureHeight:1024,multisample:0,color:0x25272b,
    shader:{ uniforms:shader, vertexShader:Reflector.ReflectorShader.vertexShader,
      fragmentShader:`
        uniform vec3 color;
        uniform vec3 horizonColor;
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform vec2 texel;
        varying vec4 vUv;
        void main() {
          vec2 uv=vUv.xy/vUv.w;
          vec3 reflected=texture2D(tDiffuse,uv).rgb*.28;
          reflected+=texture2D(tDiffuse,uv+texel*vec2(2.,0.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv-texel*vec2(2.,0.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv+texel*vec2(0.,2.)).rgb*.18;
          reflected+=texture2D(tDiffuse,uv-texel*vec2(0.,2.)).rgb*.18;
          float fade=1.-smoothstep(12.,65.,vUv.w);
          gl_FragColor=vec4(mix(color,reflected,strength*fade),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          gl_FragColor.rgb=mix(gl_FragColor.rgb,horizonColor,smoothstep(18.,85.,vUv.w));
        }`,
    },
  });
  floor.rotation.x=-Math.PI/2;scene.add(floor);
  const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.ShadowMaterial({opacity:.11}));
  shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=.002;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
  // Hide the hover outline and shadow receiver from the reflected pass.
  const reflect=floor.onBeforeRender;
  floor.onBeforeRender=function(...args) {
    const visible=outline.visible;outline.visible=false;shadowFloor.visible=false;
    reflect.apply(this,args);outline.visible=visible;shadowFloor.visible=true;
  };
  let sceneDirty=true;
  const textures = await Promise.all(['table-wood-seamless.png','table-wood-light-seamless.png'].map(async name => {
    try { const t = await new THREE.TextureLoader().loadAsync(`/assets/ui/${name}`); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,2); return t; } catch { return null; }
  }));
  function theme() {
    sceneDirty=true;
    const light=document.body.classList.contains('is-light');
    scene.background=new THREE.Color(light ? 0xe4e2de:0x181d23);
    scene.fog=new THREE.Fog(scene.background, 14, 75);
    floor.material.uniforms.horizonColor.value.copy(scene.background).convertLinearToSRGB();
    floor.material.uniforms.color.value.set(light?0xb7b6b3:0x15191f);
    floor.material.uniforms.strength.value=light?.23:.34;
    metal.color.set(light?0x73787c:0x555d66);
    wood.map=textures[light?1:0]; wood.color.set(light?0xf2e5d2:0xb09376); wood.needsUpdate=true;
    hemi.intensity=light?2.8:2.1;
    sun.intensity=light?3.3:3.8;
  }
  new MutationObserver(theme).observe(document.body,{attributes:true,attributeFilter:['class']}); theme();
  hud.querySelector('#showroomTheme').onclick=()=>document.querySelector('#themeToggle').click();
  const tables=[], binders=[], addresses=new Set(), keys=new Set();
  let endZ=-8, active=null, hovered=null, busy=false, directoryLoading=false;
  let fallback=false, dragging=false, dragged=false;
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
    tables.push({x,z});
  }
  const modelQueue=[];let modelWorkers=0;
  function disposeModel(model) {
    model.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});
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
        item.model.traverse(o=>o.userData.binder=item);item.modelLoaded=false;
      }
    }
    modelQueue.sort((a,b)=>a.home.distanceToSquared(camera.position)-b.home.distanceToSquared(camera.position));
    pumpModels();
  }
  function pumpModels() {
    while(modelWorkers<3 && modelQueue.length) {
      const item=modelQueue.shift();
      if(item.removed) continue;
      modelWorkers++;
      bridge.model(item.entry).then(model=>{
        if(item.removed) {disposeModel(model);return;}
        const old=item.model;
        item.group.remove(old);item.group.add(model);item.model=model;item.modelLoaded=true;
        model.traverse(o=>o.userData.binder=item);
        // Dispose only geometry/material; cover textures belong to the shared cache.
        disposeModel(old);
      }).catch(()=>{item.retryAt=performance.now()+30000;}).finally(()=>{item.modelQueued=false;modelWorkers--;pumpModels();});
    }
  }
  function addBinder(entry) {
    const occupied=new Set(binders.map(item=>item.seatIndex));
    let i=0;while(occupied.has(i))i++;
    const seat=seatFor(i);
    if (!tables.some(table=>table.x===seat.side*3 && table.z===-seat.row*5)) addTable(seat.side,seat.row);
    const group=new THREE.Group(); scene.add(group);
    const x=seat.side*3,z=-seat.row*5+(seat.slot-1)*1.4;
    group.position.set(x,.838,z);
    group.rotation.order='YXZ';group.rotation.set(-Math.PI/2,facingStart(x,z,i),0);
    const model=bridge.placeholder(entry);group.add(model);
    const item={group,model,entry,seatIndex:i,home:group.position.clone(),rotation:group.quaternion.clone()};binders.push(item);
    group.traverse(o=>o.userData.binder=item);
    updateNearbyModels();
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
      bridge.prefetch(item.entry.walletAddress).catch(()=>warmed.delete(item)).finally(()=>prefetching--);
    }
  }
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
        if(eligible.has(item.entry.walletAddress))continue;
        item.removed=true;scene.remove(item.group);disposeModel(item.model);
        warmed.delete(item);addresses.delete(item.entry.walletAddress);binders.splice(i,1);
      }
      for(const entry of eligible.values()) {
        if(addresses.has(entry.walletAddress))continue;
        addresses.add(entry.walletAddress);addBinder(entry);
      }
      endZ=-Math.max(1,...binders.map(item=>seatFor(item.seatIndex).row+1))*5-3;
      sceneDirty=true;
      count.textContent=`${binders.length} public binders · An open collection`;
      status.textContent=binders.length?'WASD to walk · Mouse to look · Click an outlined binder':'No public binders yet. New binders will appear here automatically.';
    } catch { count.textContent='Could not refresh binders'; status.textContent='Retrying shortly. You can still explore the room.'; }
    finally { directoryLoading=false; }
  }
  function lock(resuming=false) {
    if ((active || busy) && !resuming) return;
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
    hud.querySelector('#showroomEnter').hidden=document.pointerLockElement===canvas;
  });
  canvas.addEventListener('pointermove',e=>mousePoint.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2));
  canvas.addEventListener('pointerdown',()=>{ dragging=true; dragged=false; });
  document.addEventListener('pointerup',()=>{dragging=false;});
  document.addEventListener('mousemove',e=>{
    if ((document.pointerLockElement!==canvas && !(fallback && dragging)) || active) return;
    if (Math.abs(e.movementX)+Math.abs(e.movementY)>2) dragged=true;
    camera.rotation.y-=e.movementX*.002;
    camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-e.movementY*.002,-1.35,1.35);
  });
  document.addEventListener('keydown',e=>{
    if (active || (document.pointerLockElement!==canvas && !fallback)) return;
    if (e.code==='Escape') {lockRequest++;fallback=false;dragging=false;keys.clear();hud.querySelector('#showroomEnter').hidden=false;return;}
    if (['KeyW','KeyA','KeyS','KeyD'].includes(e.code)) {keys.add(e.code);if(!e.repeat) move(1/60);e.preventDefault();}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code)); window.addEventListener('blur',()=>{keys.clear();dragging=false;});
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
    active=item;busy=true; keys.clear(); document.exitPointerLock?.(); outline.visible=false;
    status.textContent='Opening wallet binder…';
    try {
      await bridge.open(item.entry.walletAddress);
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
    if(!fallback) lock(true);
    document.body.classList.add('showroom-walking'); bridge.close(); item.group.visible=true;
    await tween(item,true); active=null;busy=false;
    status.textContent='WASD to walk · Mouse to look · Click an outlined binder';
    hud.querySelector('#showroomEnter').hidden=fallback || document.pointerLockElement===canvas;
  }
  window.addEventListener('showroom-return',close); hud.querySelector('#showroomReturn').onclick=close;
  canvas.onclick=e=>{
    if(active || busy)return;
    if(document.pointerLockElement===canvas) {
      if(hovered)void open(hovered);
      return;
    }
    if(dragged)return;
    // Keep fallback binder interaction available in embedded browsers without
    // racing a capture request against opening the binder.
    if (fallback) {
      const pointer=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
      ray.setFromCamera(pointer,camera);ray.far=2.7;
      const hit=ray.intersectObjects(binders.map(b=>b.group),true)[0];
      if(hit) {void open(hit.object.userData.binder);return;}
    }
    // An earlier blocked request never prevents a fresh scene click retry.
    lock();
  };
  function canWalk(x,z) {
    return canWalkAt(x,z,endZ,tables);
  }
  function move(dt) {
      const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
      const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
      const norm=Math.hypot(forward,right)||1, speed=dt*2.7/norm, yaw=camera.rotation.y;
      const dx=(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed;
      const dz=(-forward*Math.cos(yaw)-right*Math.sin(yaw))*speed;
      if(canWalk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
      if(canWalk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
  }
  let previous=performance.now();
  function frame(now) {
    const dt=Math.min((now-previous)/1000,.04);previous=now;
    if(!active && (document.pointerLockElement===canvas || fallback)) {
      move(dt);
    }
    hovered=null;
    if(!active) {
      ray.setFromCamera(fallback && !dragging ? mousePoint : center,camera); ray.far=2.7;
      const hits=ray.intersectObjects(binders.map(b=>b.group),true);
      if(hits.length) hovered=hits[0].object.userData.binder;
      outline.visible=!!hovered;
      if(hovered){outline.setFromObject(hovered.group); status.textContent=`Click to open ${hovered.entry.walletAddress.slice(0,4)}…${hovered.entry.walletAddress.slice(-4)}`;}
      else if(document.pointerLockElement===canvas) status.textContent='WASD to walk · Mouse to look · Approach a binder to open it';
    }
    const shadowZ=Math.round(camera.position.z/4)*4;
    sun.position.z=shadowZ+4;sun.target.position.set(0,0,shadowZ-6);
    if(!active || busy || sceneDirty) { renderer.render(scene,camera);sceneDirty=false; }
    requestAnimationFrame(frame);
  }
  function resize(){sceneDirty=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
  setInterval(()=>{warmNearby();if(!document.hidden)updateNearbyModels();},1000);
  void refresh(); setInterval(()=>{if(!document.hidden)void refresh();},60000);
}
