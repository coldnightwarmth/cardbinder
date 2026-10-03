import * as THREE from '../vendor/three.module.min.js';

// Use the exact star from the supplied reference as a texture. Only the
// surrounding, edge-connected white background is excluded from the die cut.
export function createSeal(parent,width,spine,onReady){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');
 let alpha=new Uint8ClampedArray(512*512*4);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const artwork=new Image();
 artwork.onload=()=>{
  ctx.drawImage(artwork,40,150,700,680,0,0,512,512);
  const image=ctx.getImageData(0,0,512,512),pixels=image.data;
  const visited=new Uint8Array(512*512),queue=new Uint32Array(512*512);let head=0,tail=0;
  const enqueue=i=>{
   if(visited[i])return;visited[i]=1;
   const k=i*4,min=Math.min(pixels[k],pixels[k+1],pixels[k+2]),max=Math.max(pixels[k],pixels[k+1],pixels[k+2]);
   if(min>210&&max-min<38){queue[tail++]=i;pixels[k+3]=0;}
  };
  for(let n=0;n<512;n++){enqueue(n);enqueue(511*512+n);enqueue(n*512);enqueue(n*512+511);}
  while(head<tail){const i=queue[head++],x=i%512,y=Math.floor(i/512);if(x)enqueue(i-1);if(x<511)enqueue(i+1);if(y)enqueue(i-512);if(y<511)enqueue(i+512);}
  alpha=pixels;ctx.putImageData(image,0,0);map.needsUpdate=true;onReady();
 };
 artwork.src=new URL('./assets/star-sticker-reference.png',import.meta.url).href;
 const material=new THREE.MeshStandardMaterial({map,roughness:.22,metalness:.28,side:THREE.DoubleSide,alphaTest:.4});
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float foil = smoothstep(0.12, 0.42, diffuseColor.b);
   float angle = dot(normalize(vViewPosition), normal);
   vec3 rainbow = 0.5 + 0.5*cos(6.28318*(vec3(0.,.33,.67)+vMapUv.x*.8+vMapUv.y*.65+angle*2.4));
   if(gl_FrontFacing) outgoingLight = mix(outgoingLight, outgoingLight*.3+rainbow*.95+vec3(.04), .60*foil+.07);
   else outgoingLight = vec3(.78,.76,.68);
   #include <opaque_fragment>`);
 };
 const geometry=new THREE.PlaneGeometry(.56,.544,160,48),mesh=new THREE.Mesh(geometry,material);
 mesh.userData.seal=true;mesh.frustumCulled=false;parent.add(mesh);
 let progress=0,peeling=false,peeled=false,shakeTime=0;
 function pose(){
  const pos=geometry.attributes.position,uv=geometry.attributes.uv;
  const p=progress**3*(10-15*progress+6*progress*progress);
  for(let i=0;i<pos.count;i++){
   const angle=5*Math.PI/180,x=(uv.getX(i)-.5)*.56,y=(uv.getY(i)-.5)*.544;
   const rotatedX=x*Math.cos(angle)-y*Math.sin(angle);
   const rotatedY=x*Math.sin(angle)+y*Math.cos(angle);
   const point=sealPoint(rotatedX/.56+.5,p,width,spine);
   pos.setXYZ(i,point.x,rotatedY,point.z);
  }
  pos.needsUpdate=true;geometry.computeVertexNormals();
 }
 pose();
 return {
  get locked(){return !peeled;},
  get peeling(){return peeling;},
  shake(){if(!peeling)shakeTime=.65;},
  peel(){if(!peeled&&!peeling){peeling=true;shakeTime=0;}},
  acceptsHit(hit){if(hit.object!==mesh)return true;const uv=hit.uv;if(!uv)return false;const x=Math.min(511,Math.max(0,Math.floor(uv.x*512))),y=Math.min(511,Math.max(0,Math.floor((1-uv.y)*512)));return alpha[(y*512+x)*4+3]>102;},
  update(dt,reduced){
   if(peeling){progress=Math.min(1,progress+dt/(reduced?.2:1.2));pose();if(progress===1){peeling=false;peeled=true;}}
   shakeTime=Math.max(0,shakeTime-dt);
   return !reduced&&shakeTime>0?Math.sin((.65-shakeTime)*38)*.055*(shakeTime/.65)**2:0;
  },
  get active(){return peeling||shakeTime>0;}
 };
}

// Map distance along an inextensible strip onto a circular bend and tangent.
// The same surface bridges the front, outer edge and back: no disconnected
// planes, vertical shearing, or shrinking/stretching artwork during peeling.
export function sealPoint(u,progress,width,spine){
 const back=-.0035,radius=(spine+.007)/2;
 const distance=(.605-u)*.56;
 if(distance<=0)return {x:width+distance,z:back};
 const angle=Math.PI*(1-progress)+.85*progress;
 const length=Math.PI*radius*(1-progress)+.25*progress;
 const r=length/angle,theta=Math.min(distance/ r,angle);
 const tail=Math.max(0,distance-length);
 const tipStart=.012,tipLength=Math.max(0,tail-tipStart),straight=Math.min(tail,tipStart);
 // Roll the free tip back in the opposite direction without shearing the art.
 // Curl the tip only once the front has lifted clear. Applying this to
 // the long, still-adhered section early made it wind up and then unwind.
 const curl=Math.max(0,Math.min(1,(progress-.65)/.35));
 const curvature=-24*curl*curl*(3-2*curl);
 let tipX=tipLength*Math.cos(angle),tipZ=tipLength*Math.sin(angle);
 if(Math.abs(curvature)>.00001){
  tipX=(Math.sin(angle+curvature*tipLength)-Math.sin(angle))/curvature;
  tipZ=(Math.cos(angle)-Math.cos(angle+curvature*tipLength))/curvature;
 }
 return {x:width+r*Math.sin(theta)+straight*Math.cos(angle)+tipX,
  z:back+r*(1-Math.cos(theta))+straight*Math.sin(angle)+tipZ};
}
