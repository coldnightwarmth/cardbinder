import * as THREE from 'three';

export function createShowroomSky() {
  // A tiny repeating noise field supplies three cloud depths in one sky draw.
  const size=128,data=new Uint8Array(size*size*4);
  let seed=78121;
  for(let i=0;i<size*size;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=seed>>>24;data.set([value,value,value,255],i*4);
  }
  const noise=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  noise.wrapS=noise.wrapT=THREE.RepeatWrapping;
  noise.magFilter=THREE.LinearFilter;noise.minFilter=THREE.LinearMipmapLinearFilter;
  noise.generateMipmaps=true;noise.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,depthTest:true,fog:false,toneMapped:false,
    uniforms:{noise:{value:noise},time:{value:0},baseColor:{value:new THREE.Color()},lightMode:{value:0},flashes:{value:[0,0,0]},flashSpreads:{value:[24,24,24]},flashDirections:{value:Array.from({length:3},()=>new THREE.Vector3(0,1,0))}},
    vertexShader:`varying vec3 skyDirection;
      void main(){skyDirection=position;vec4 clip=projectionMatrix*viewMatrix*vec4(cameraPosition+position,1.0);gl_Position=clip.xyww;}`,
    fragmentShader:`uniform sampler2D noise;uniform float time;uniform vec3 baseColor;uniform float lightMode;uniform float flashes[3];uniform float flashSpreads[3];uniform vec3 flashDirections[3];
      varying vec3 skyDirection;
      float cloud(vec2 p){
        float n=texture2D(noise,p).r*.57+texture2D(noise,p*2.03+0.17).r*.29+texture2D(noise,p*4.07+0.43).r*.14;
        return smoothstep(.38,.7,n);
      }
      void main(){
        vec3 d=normalize(skyDirection);
        vec2 sky=d.xz/(max(d.y,0.0)+.28);
        float t=time*.0007;
        float nearCloud=cloud(sky*.022+cameraPosition.xz*.00032+vec2(t,t*.36));
        float middleCloud=cloud(sky*.013+cameraPosition.xz*.00013+vec2(-t*.55,t*.19)+.31);
        float farCloud=cloud(sky*.008+cameraPosition.xz*.00005+vec2(t*.22,-t*.13)+.67);
        float haze=(nearCloud*.48+middleCloud*.33+farCloud*.19)*smoothstep(-.025,.23,d.y);
        vec3 tint=mix(vec3(.135,.16,.20),vec3(.72,.74,.77),lightMode);
        vec3 color=mix(baseColor,tint,haze*.38);
        float illumination=0.0;
        for(int i=0;i<3;i++) {
          float glow=exp(-max(0.0,1.0-dot(d,flashDirections[i]))*flashSpreads[i]);
          illumination+=flashes[i]*glow;
        }
        color+=vec3(.53,.64,.85)*min(illumination,.5)*haze;
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),material);
  mesh.name='showroom-cloud-sky';mesh.frustumCulled=false;mesh.renderOrder=-10000;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let nextFlash=0,remaining=0,slot=0,angle=Math.random()*Math.PI*2;
  const starts=[-10000,-10000,-10000],strengths=[0,0,0];
  return {object:mesh,update(now){
    material.uniforms.time.value=now*.001;
    if(!nextFlash)nextFlash=now+1800+Math.random()*3000;
    if(now>=nextFlash) {
      if(!remaining)remaining=Math.random()<.55?2+Math.floor(Math.random()*2):1;
      starts[slot]=now;
      // Move each burst to a different patch while allowing the previous glow to fade.
      angle+=.8+Math.random()*3.4;
      const elevation=.4+Math.random()*.45;
      material.uniforms.flashDirections.value[slot].set(Math.cos(angle),elevation,Math.sin(angle)).normalize();
      strengths[slot]=.4+Math.random()*.3;
      material.uniforms.flashSpreads.value[slot]=8+Math.random()*16;
      slot=(slot+1)%3;remaining--;
      nextFlash=now+(remaining?320+Math.random()*480:2200+Math.random()*4800);
    }
    for(let i=0;i<3;i++) {
      const elapsed=(now-starts[i])/1000;
      const pulse=elapsed>=0 && elapsed<1.2 ? (1-Math.exp(-elapsed*28))*Math.exp(-elapsed*5) : 0;
      material.uniforms.flashes.value[i]=reducedMotion.matches?0:pulse*strengths[i];
    }
  },setTheme(color,light){material.uniforms.baseColor.value.copy(color);material.uniforms.lightMode.value=light?1:0;}};
}
