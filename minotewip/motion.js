// Analytic critically damped spring: continuous velocity when a gesture ends,
// with the same timing on high- and low-refresh-rate displays.
export function spring(state,target,frequency,dt){
 const offset=state.value-target,impulse=state.velocity+frequency*offset;
 const decay=Math.exp(-frequency*dt);
 state.value=target+(offset+impulse*dt)*decay;
 state.velocity=(state.velocity-frequency*impulse*dt)*decay;
 return state.value;
}

export function settle(state,target,tolerance=.0001){
 if(Math.abs(state.value-target)>tolerance||Math.abs(state.velocity)>tolerance*8)return false;
 state.value=target;state.velocity=0;return true;
}

// Pick from the actual release pose, never the gesture's starting side or a
// velocity-projected pose. Retain only momentum that can settle without crossing it.
export function snapToNearest(state,max,frequency,stopMomentum=false){
 state.value=Math.max(0,Math.min(max,state.value));
 const target=Math.round(state.value),remaining=target-state.value;
 state.velocity=stopMomentum||state.velocity*remaining<=0?0:
  Math.sign(remaining)*Math.min(Math.abs(state.velocity),3,frequency*Math.abs(remaining));
 return target;
}

// Underdamped spring for the card's soft overshoot, integrated analytically
// so the rebound remains consistent across display refresh rates.
export function tiltSpring(state,target,dt){
 const frequency=12,damping=.58,decayRate=frequency*damping;
 const angular=frequency*Math.sqrt(1-damping*damping),offset=state.value-target;
 const tangent=(state.velocity+decayRate*offset)/angular;
 const decay=Math.exp(-decayRate*dt),cos=Math.cos(angular*dt),sin=Math.sin(angular*dt);
 const wave=offset*cos+tangent*sin;
 state.value=target+decay*wave;
 state.velocity=decay*(-decayRate*wave+angular*(-offset*sin+tangent*cos));
 return state.value;
}
