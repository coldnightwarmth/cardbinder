export const SHOWROOM_EYE_HEIGHT=1.65;
export const CROUCH_DEPTH=.2;
// Fixed gravity with small integration steps keeps jump height stable at low FPS.
export function createVerticalMovement(){
 let crouch=0,height=0,velocity=0;
 return {
  jump(){if(height>0||velocity>0)return false;velocity=4;return true;},
  update(dt,duck){
   dt=Math.min(.1,Math.max(0,dt));
   for(let remaining=dt;remaining>0;){
    const step=Math.min(remaining,1/120);remaining-=step;
    if(height>0||velocity>0){height+=velocity*step-6*step*step;velocity-=12*step;if(height<=0){height=0;velocity=0;}}
   }
   crouch+=((duck&&height===0?1:0)-crouch)*(1-Math.exp(-dt*16));
   // Ease out of crouch during takeoff rather than snapping the camera upward.
   return SHOWROOM_EYE_HEIGHT+height-crouch*CROUCH_DEPTH;
  },
 };
}
