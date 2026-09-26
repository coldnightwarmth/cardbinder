import * as THREE from 'three';
import { PORTAL_ROOM_SIZE as SIZE, PORTAL_RADIUS as RADIUS, PORTAL_SPRING_HEIGHT as SPRING,
  PORTAL_FRAME_WIDTH as FRAME, portalPositionForTables, stepThroughPortal } from './showroom-portal-layout.mjs';

export function createShowroomPortal({ renderer, scene, camera, canWalkOutside, canWalkRoom=()=>true, onCross }) {
  const room = new THREE.Scene(); room.background = new THREE.Color(0xf3f3f3);
  room.userData.cardEnvironment=scene.environment;
  room.add(new THREE.HemisphereLight(0xffffff, 0xb6b6b6, 2.1));
  const light = new THREE.DirectionalLight(0xffffff, 2.4); light.position.set(-4, 10, 3); room.add(light);
  const white = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, side:THREE.DoubleSide });
  function panel(w, h, x, y, z, rx = 0, ry = 0, material = white) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,0); room.add(mesh); return mesh;
  }
  panel(SIZE,SIZE,0,SIZE/2,-SIZE);
  panel(SIZE,SIZE,-SIZE/2,SIZE/2,-SIZE/2,0,Math.PI/2);
  panel(SIZE,SIZE,SIZE/2,SIZE/2,-SIZE/2,0,-Math.PI/2);
  panel(SIZE,SIZE,0,SIZE,-SIZE/2,Math.PI/2);
  const pixels = new Uint8Array([245,245,245,255, 12,12,12,255, 12,12,12,255, 245,245,245,255]);
  const checker = new THREE.DataTexture(pixels,2,2);
  checker.colorSpace=THREE.SRGBColorSpace; checker.wrapS=checker.wrapT=THREE.RepeatWrapping;
  checker.repeat.set(9,9); checker.magFilter=THREE.NearestFilter;
  checker.minFilter=THREE.LinearMipmapLinearFilter; checker.generateMipmaps=true;
  checker.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());checker.needsUpdate=true;
  panel(SIZE,SIZE,0,0,-SIZE/2,-Math.PI/2,0,
    new THREE.MeshStandardMaterial({map:checker,roughness:.95}));
  const front = new THREE.Shape();
  front.moveTo(-SIZE/2,0);front.lineTo(-RADIUS,0);front.lineTo(-RADIUS,SPRING);
  front.absarc(0,SPRING,RADIUS,Math.PI,0,true);front.lineTo(RADIUS,0);
  front.lineTo(SIZE/2,0);front.lineTo(SIZE/2,SIZE);front.lineTo(-SIZE/2,SIZE);front.closePath();
  room.add(new THREE.Mesh(new THREE.ShapeGeometry(front,48),white));

  const frameShape = new THREE.Shape(),outer=RADIUS+FRAME;
  frameShape.moveTo(-outer,0);frameShape.lineTo(-outer,SPRING);
  frameShape.absarc(0,SPRING,outer,Math.PI,0,true);frameShape.lineTo(outer,0);
  frameShape.lineTo(RADIUS,0);frameShape.lineTo(RADIUS,SPRING);
  frameShape.absarc(0,SPRING,RADIUS,0,Math.PI,false);frameShape.lineTo(-RADIUS,0);frameShape.closePath();
  const frameGeometry = new THREE.ExtrudeGeometry(frameShape,{depth:.24,bevelEnabled:true,
    bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:48});
  frameGeometry.translate(0,0,-.12);
  const frameMaterial = new THREE.MeshStandardMaterial({color:0xe7e5df,roughness:.7,metalness:.04});
  const entrance = new THREE.Group(); entrance.name='showroom-portal'; scene.add(entrance);
  entrance.add(new THREE.Mesh(frameGeometry,frameMaterial));
  room.add(new THREE.Mesh(frameGeometry,frameMaterial));

  // Draw both spaces into the same framebuffer. Stencil limits the second
  // scene to the arch, so its sky, floor and lighting use exactly the same
  // color pipeline as the ordinary showroom, without a texture handoff.
  const maskScene=new THREE.Scene();
  // Ray-test the aperture per pixel instead of projecting its triangles.
  // At the threshold, arch triangles straddle the eye/near plane and their
  // clipped projection cannot reliably describe which half of the view crosses.
  const maskMaterial=new THREE.ShaderMaterial({
    uniforms:{inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},
      viewProjection:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},
      planeZ:{value:0},travelSign:{value:-1},radius:{value:RADIUS},spring:{value:SPRING}},
    colorWrite:false,depthWrite:false,depthTest:true,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,
    stencilZPass:THREE.ReplaceStencilOp,
    vertexShader:`varying vec2 screenPosition;
      void main(){screenPosition=position.xy;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`varying vec2 screenPosition;
      uniform mat4 inverseProjection,cameraWorld,viewProjection;
      uniform vec3 eye;uniform float planeZ,travelSign,radius,spring;
      void main(){
        vec4 viewRay=inverseProjection*vec4(screenPosition,1.,1.);
        vec3 ray=normalize(mat3(cameraWorld)*(viewRay.xyz/viewRay.w));
        if(ray.z*travelSign<=0.0000001)discard;
        float t=(planeZ-eye.z)/ray.z;
        if(t<0.)discard;
        vec3 hit=eye+ray*t;
        if(abs(hit.x)>radius||hit.y<0.)discard;
        if(hit.y>spring&&dot(vec2(hit.x,hit.y-spring),vec2(hit.x,hit.y-spring))>radius*radius)discard;
        vec4 clip=viewProjection*vec4(hit,1.);
        // Keep the mask at the near depth when the doorway intersects the eye.
        gl_FragDepth=clip.w>0.000001?clamp(clip.z/clip.w*.5+.5,0.,1.):0.;
        gl_FragColor=vec4(0.);
      }`,
  });
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(2,2),maskMaterial);
  surface.frustumCulled=false;surface.name='portal-opening';maskScene.add(surface);
  const backgroundScene=new THREE.Scene(),backgroundCamera=new THREE.Camera();
  const backgroundMaterial=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc});
  backgroundScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),backgroundMaterial));
  const roomCamera=new THREE.PerspectiveCamera(),exteriorCamera=new THREE.PerspectiveCamera();
  const cornerRay=new THREE.Vector3();
  function syncCameras(){
    roomCamera.copy(camera);exteriorCamera.copy(camera);
    if(inside)exteriorCamera.position.z+=portalZ;else roomCamera.position.z-=portalZ;
    roomCamera.updateMatrixWorld(true);exteriorCamera.updateMatrixWorld(true);
  }
  function apertureInFront(){
    const z=inside?0:portalZ;
    for(const x of [-RADIUS,RADIUS])for(const y of [0,SPRING+RADIUS]) {
      cornerRay.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      if(cornerRay.z<0)return true;
    }
    return false;
  }
  function openingFillsView(){
    const planeZ=inside?0:portalZ;
    cornerRay.set(0,0,-1).applyQuaternion(camera.quaternion);
    if(inside?cornerRay.z<=0:cornerRay.z>=0)return false;
    for(const x of [-1,1])for(const y of [-1,1]) {
      cornerRay.set(x,y,.5).unproject(camera).sub(camera.position).normalize();
      if(inside?cornerRay.z<=0:cornerRay.z>=0)return false;
      const distance=(planeZ-camera.position.z)/cornerRay.z;
      if(!Number.isFinite(distance)||distance<0)return false;
      const hitX=camera.position.x+cornerRay.x*distance;
      const hitY=camera.position.y+cornerRay.y*distance;
      const radius=RADIUS-.04;
      if(Math.abs(hitX)>=radius || hitY<=.04 || hitY>=SPRING+Math.sqrt(radius*radius-hitX*hitX)-.04)return false;
    }
    return true;
  }
  const projectionView=new THREE.Matrix4();
  const stencilStates=new Map(), guardedObjects=new WeakSet();
  function guardTransmissionPass(object) {
    if(!object.material || guardedObjects.has(object))return;
    guardedObjects.add(object);
    const before=object.onBeforeRender,after=object.onAfterRender;
    let restoreStencil=false;
    object.onBeforeRender=function(renderer,scene,camera,geometry,material,group){
      before.call(this,renderer,scene,camera,geometry,material,group);
      // Refraction uses a separate framebuffer with no doorway stencil.
      // It must see the complete room, while the final draw stays masked.
      restoreStencil=Boolean(renderer.getRenderTarget() && material.stencilWrite);
      if(restoreStencil)material.stencilWrite=false;
    };
    object.onAfterRender=function(renderer,scene,camera,geometry,material,group){
      if(restoreStencil){material.stencilWrite=true;restoreStencil=false;}
      after.call(this,renderer,scene,camera,geometry,material,group);
    };
  }
  let inside=false,portalZ=-5,lastTableCount=-1,pendingZ=null;
  entrance.position.z=portalZ;

  function place(tables) {
    if(tables.length!==lastTableCount) {pendingZ=portalPositionForTables(tables);lastTableCount=tables.length;}
    if(pendingZ===null || inside || Math.hypot(camera.position.x,camera.position.z-portalZ)<3)return;
    portalZ=pendingZ;pendingZ=null;entrance.position.z=portalZ;
  }
  function move(dx,dz) {
    for(const delta of [{x:dx,z:0},{x:0,z:dz}]) {
      const next=stepThroughPortal(camera.position,delta,inside,portalZ,canWalkOutside);
      if(!next || (next.inside && !canWalkRoom(next.x,next.z)))continue;
      camera.position.x=next.x;camera.position.z=next.z;
      if(inside!==next.inside) {inside=next.inside;onCross?.(inside);}
    }
  }
  function render() {
    camera.updateMatrixWorld();syncCameras();
    // Close to the threshold, render the space filling the view directly.
    // This same camera and same pass continue uninterrupted after crossing.
    if(openingFillsView()) {
      renderer.render(inside?scene:room,inside?exteriorCamera:roomCamera);
      return;
    }
    const uniforms=maskMaterial.uniforms;
    uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
    uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.eye.value.copy(camera.position);
    uniforms.planeZ.value=inside?0:portalZ;uniforms.travelSign.value=inside?1:-1;
    projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    uniforms.viewProjection.value.copy(projectionView);
    const visible=(inside?camera.position.z<=0:camera.position.z>=portalZ) && apertureInFront();
    renderer.render(inside?room:scene,inside?roomCamera:exteriorCamera);
    if(!visible)return;
    const destinationCamera=inside?exteriorCamera:roomCamera;
    const destination=inside?scene:room;
    const background=destination.background,autoClear=renderer.autoClear,entranceVisible=entrance.visible;
    stencilStates.clear();
    destination.traverse(object=>{
      guardTransmissionPass(object);
      for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
        if(!material || stencilStates.has(material))continue;
        stencilStates.set(material,[material.stencilWrite,material.stencilRef,material.stencilFunc]);
        material.stencilWrite=true;material.stencilRef=1;material.stencilFunc=THREE.EqualStencilFunc;
      }
    });
    try {
      renderer.autoClear=false;
      renderer.render(maskScene,camera);
      renderer.clearDepth();
      backgroundMaterial.color.copy(background);
      renderer.render(backgroundScene,backgroundCamera);
      destination.background=null;entrance.visible=false;
      renderer.render(destination,destinationCamera);
    } finally {
      destination.background=background;entrance.visible=entranceVisible;renderer.autoClear=autoClear;
      for(const [material,values] of stencilStates) {
        [material.stencilWrite,material.stencilRef,material.stencilFunc]=values;
      }
    }
  }
  return {
    get inside(){return inside;},get z(){return portalZ;},
    get nearThreshold(){return inside || Math.hypot(camera.position.x,camera.position.z-portalZ)<3;},
    surface,room,place,move,render,
    get exteriorCamera(){syncCameras();return exteriorCamera;},
    get crossingZone(){return Math.abs(camera.position.x)<3 && Math.abs(inside?camera.position.z:camera.position.z-portalZ)<3;},
    suspend(){},invalidate(){},
    async prepare(){
      await Promise.all([renderer.compileAsync(room,roomCamera),renderer.compileAsync(scene,exteriorCamera),
        renderer.compileAsync(maskScene,camera),renderer.compileAsync(backgroundScene,backgroundCamera)]);
      // Exercise both complete passes while initializing, including first GPU
      // uploads and the reverse view, rather than on the first crossing.
      const position=camera.position.clone(),rotation=camera.quaternion.clone();
      try {
        camera.position.set(0,1.72,portalZ+2);camera.rotation.set(0,0,0);render();
        inside=true;camera.position.set(0,1.72,-2);camera.rotation.set(0,Math.PI,0);render();
      } finally {
        inside=false;camera.position.copy(position);camera.quaternion.copy(rotation);render();
      }
    },
  };
}
