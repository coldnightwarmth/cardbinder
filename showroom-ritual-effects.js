import * as THREE from 'three';
import {PORTAL_ROOM_SIZE} from './showroom-portal-layout.mjs';

// Page-local only: reconnects keep the current effect; a refresh creates a new
// multiplayer identity and starts with the ordinary showroom rendering again.
export function createRitualCameraState(onChange) {
  let lastId=null,mode=null;
  return {
    get mode(){return mode;},
    sync(effect,playerId){
      if(!effect||effect.id===lastId)return;
      lastId=effect.id;
      if(!['native','quarter'].includes(effect.kind)||!effect.recipients?.includes(playerId))return;
      mode=effect.kind;onChange(mode);
    },
  };
}
export function ritualPixelRatio(mode,dpr,ordinaryRatio) {
  return mode==='native'?dpr:mode==='quarter'?dpr/4:ordinaryRatio;
}

export function createShowroomRitualEffects({room,renderer,onCameraChange,onDirty}) {
  const cameraState=createRitualCameraState(onCameraChange);
  const material=new THREE.MeshBasicMaterial({toneMapped:false});
  const art=new THREE.Mesh(new THREE.PlaneGeometry(PORTAL_ROOM_SIZE*.85,PORTAL_ROOM_SIZE*.85*1327/3125),material);
  art.name='drif-triptych-summon';art.position.set(PORTAL_ROOM_SIZE/2-.025,art.geometry.parameters.height/2+.45,-PORTAL_ROOM_SIZE/2);art.rotation.y=-Math.PI/2;
  art.visible=false;room.add(art);
  let wallArt=null,ready=false;
  const texture=new THREE.TextureLoader().load(new URL('./assets/showroom/rituals/drif-triptych.jpg',import.meta.url).href,
    loaded=>{renderer.initTexture(loaded);ready=true;onDirty();},undefined,error=>console.warn('Ritual artwork unavailable',error));
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.map=texture;
  function update(now){
    const visible=ready&&wallArt?.kind==='drif-triptych'&&wallArt.expiresAt>now;
    if(art.visible!==!!visible){art.visible=!!visible;onDirty();}
  }
  return {
    get cameraMode(){return cameraState.mode;},
    sync(state,playerId,now){wallArt=state.wallArt||null;cameraState.sync(state.lastRitualEffect,playerId);update(now);},
    update,
  };
}
