import * as THREE from 'three';

export function createShowroomSpeech(figure) {
  const bubble=document.createElement('div');
  bubble.className='showroom-speech';bubble.hidden=true;
  bubble.textContent="Hey- You like cards? These three binders here contain cards created by the artist Evil Biscuit. They're pretty sick ngl. Bummed I missed the mints... Buncha other cool cards in all the other binders here too! Anyway, enjoy the show.";
  document.body.append(bubble);
  const ray=new THREE.Raycaster(), hit=new THREE.Vector3(), anchor=new THREE.Vector3();
  const bounds=new THREE.Box3(), low=new THREE.Vector3(), high=new THREE.Vector3();
  const offsetLow=new THREE.Vector3(-.38,1.2,-.4), offsetHigh=new THREE.Vector3(.38,2.16,.4);
  const direction=new THREE.Vector3();
  const restingYaw=figure.rotation.y;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let lastHover=-Infinity, previousTime;
  return {
    update(now,camera,pointer,enabled) {
      low.copy(figure.position).add(offsetLow);
      high.copy(figure.position).add(offsetHigh);
      bounds.set(low,high);
      camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);
      if(enabled && ray.ray.intersectBox(bounds,hit) && hit.distanceTo(camera.position)<8) lastHover=now;
      const visible=enabled && now-lastHover<160;
      anchor.copy(figure.position);anchor.y+=2.18;
      const inFront=direction.copy(anchor).sub(camera.position).dot(camera.getWorldDirection(hit))>0;
      bubble.hidden=!visible || !inFront;
      const dt=previousTime===undefined ? 1/60 : Math.min((now-previousTime)/1000,.05);
      previousTime=now;
      const targetYaw=bubble.hidden ? restingYaw
        : Math.atan2(camera.position.x-figure.position.x,camera.position.z-figure.position.z);
      // Turn along the shortest arc, keeping the feet planted and the body upright.
      const delta=Math.atan2(Math.sin(targetYaw-figure.rotation.y),Math.cos(targetYaw-figure.rotation.y));
      figure.rotation.y+=delta*(reducedMotion.matches ? 1 : 1-Math.exp(-8*dt));
      if(bubble.hidden)return;
      anchor.project(camera);
      const x=(anchor.x+1)*innerWidth/2, y=(1-anchor.y)*innerHeight/2;
      const width=bubble.offsetWidth, height=bubble.offsetHeight;
      bubble.style.left=`${Math.max(12,Math.min(innerWidth-width-12,x-width-18))}px`;
      bubble.style.top=`${Math.max(12,Math.min(innerHeight-height-12,y-height-10))}px`;
    },
  };
}
