import {PORTAL_RADIUS,PORTAL_SPRING_HEIGHT} from './showroom-portal-layout.mjs';

// Translate between the two spaces before projecting a DOM overlay. The bubble
// is never clipped by the low-resolution WebGL/stencil passes, but its speaker
// must still be on this side or visible through the actual doorway aperture.
export function chatAnchor(position,speakerRoom,inside,portalZ) {
 const other=(speakerRoom==='cube')!==inside;
 return {x:position.x,y:position.y+.2,z:position.z+(other?(inside?-portalZ:portalZ):0),other};
}
export function chatVisibleThroughDoor(eye,anchor,inside,portalZ) {
 if(!anchor.other)return true;
 const dz=anchor.z-eye.z;
 if(Math.abs(dz)<1e-8)return false;
 const t=((inside?0:portalZ)-eye.z)/dz;
 if(t<0||t>1)return false;
 const x=eye.x+(anchor.x-eye.x)*t,y=eye.y+(anchor.y-eye.y)*t;
 return Math.abs(x)<PORTAL_RADIUS&&y>=0&&(y<=PORTAL_SPRING_HEIGHT||x*x+(y-PORTAL_SPRING_HEIGHT)**2<PORTAL_RADIUS**2);
}
