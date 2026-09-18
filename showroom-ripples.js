import * as THREE from 'three';

// Fixed-size footstep history; no geometry, textures, or allocations per frame.
export function createShowroomRipples() {
  const steps = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -100, 0));
  let lastX, lastZ, distance = .72, cursor = 0, foot = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    steps,
    update(now, camera) {
      const { x, z } = camera.position;
      if (lastX === undefined) { lastX = x; lastZ = z; return; }
      const dx = x - lastX, dz = z - lastZ, moved = Math.hypot(dx, dz);
      lastX = x; lastZ = z;
      if (reduced.matches || moved < .0001) return;
      if (moved > 2) { distance = 0; return; }
      distance += moved;
      if (distance < .85) return;
      distance %= .85;
      // Alternate feet perpendicular to the actual travel direction.
      steps[cursor].set(x - dz / moved * .12 * foot, z + dx / moved * .12 * foot, now * .001, 1);
      cursor = (cursor + 1) % steps.length; foot *= -1;
    },
  };
}
