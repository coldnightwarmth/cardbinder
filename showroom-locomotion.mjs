export const SHOWROOM_EYE_HEIGHT=1.65;
export const CROUCH_DEPTH=.29;
export const JUMP_DURATION=1.1;
export const JUMP_TAKEOFF=.14;
export const JUMP_FLIGHT=2/3;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function jumpHeight(time){
 const flight=time-JUMP_TAKEOFF;
 return flight>0&&flight<JUMP_FLIGHT?4*flight-6*flight*flight:0;
}
export function createVerticalMovement(){
 let crouch=0,jumpTime=-1;
 return {
  get pose(){return {crouch,jumpTime};},
  jump(){if(jumpTime>=0)return false;jumpTime=0;return true;},
  update(dt,duck){
   dt=clamp(dt,0,.1);
   if(jumpTime>=0){jumpTime+=dt;if(jumpTime>=JUMP_DURATION)jumpTime=-1;}
   crouch+=((duck&&jumpTime<0?1:0)-crouch)*(1-Math.exp(-dt*12));
   const anticipation=jumpTime>=0&&jumpTime<JUMP_TAKEOFF?.075*Math.sin(Math.PI*jumpTime/JUMP_TAKEOFF):0;
   const landing=jumpTime>JUMP_TAKEOFF+JUMP_FLIGHT?.10*Math.sin(Math.PI*(jumpTime-JUMP_TAKEOFF-JUMP_FLIGHT)/(JUMP_DURATION-JUMP_TAKEOFF-JUMP_FLIGHT)):0;
   return SHOWROOM_EYE_HEIGHT+jumpHeight(jumpTime)-crouch*CROUCH_DEPTH-anticipation-landing;
  },
 };
}
