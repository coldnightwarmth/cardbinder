import * as THREE from 'three';

// Fixed-size footstep history; no geometry, textures, or allocations per frame.
export function createShowroomRipples() {
  const steps = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -100, 0));
  const walkers=new Map();
  let cursor=0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    steps,
    forget(id){walkers.delete(id);},
    update(now, camera, id="local") {
      const { x, z } = camera.position;
      if(!walkers.has(id)){walkers.set(id,{lastX:x,lastZ:z,distance:.72,foot:1});return;}
      const walker=walkers.get(id);
      let {lastX,lastZ,distance,foot}=walker;
      const dx = x - lastX, dz = z - lastZ, moved = Math.hypot(dx, dz);
      walker.lastX=x;walker.lastZ=z;
      if (reduced.matches || moved < .0001) return;
      if (moved > 2) { walker.distance = 0; return; }
      distance += moved;walker.distance=distance;
      if (distance < .85) return;
      distance %= .85;walker.distance=distance;
      // Alternate feet perpendicular to the actual travel direction.
      steps[cursor].set(x - dz / moved * .12 * foot, z + dx / moved * .12 * foot, now * .001, 1);
      cursor = (cursor + 1) % steps.length; walker.foot *= -1;
    },
  };
}
