export const PORTAL_ROOM_SIZE = 13.5;
export const PORTAL_RADIUS = 1.3;
export const PORTAL_SPRING_HEIGHT = 2.25;
export const PORTAL_FRAME_WIDTH = .18;
const BODY_RADIUS = .2;

export function portalPositionForTables(tables) {
  return Math.min(0, ...tables.map(table => table.z)) - 5;
}

// The room has its own coordinates. Crossing preserves the distance travelled
// past the threshold, so neither slow walks nor sprinting snap the camera.
export function stepThroughPortal(position, delta, inside, portalZ, canWalkOutside) {
  const x = position.x + delta.x, z = position.z + delta.z;
  const opening = PORTAL_RADIUS - BODY_RADIUS;
  if (inside) {
    if (Math.abs(x) > PORTAL_ROOM_SIZE / 2 - BODY_RADIUS || z < -PORTAL_ROOM_SIZE + BODY_RADIUS) return null;
    if (z > -BODY_RADIUS && Math.abs(x) >= opening) return null;
    if (position.z <= 0 && z > 0) {
      if (!canWalkOutside(x, z + portalZ)) return null;
      return { x, z: z + portalZ, inside: false };
    }
    return { x, z, inside: true };
  }
  // Posts remain solid from either side, but the empty rear of the arch has
  // no room attached to it. Only the aisle-facing side is an entrance.
  const crossesFrame = Math.min(position.z, z) < portalZ + .16 + BODY_RADIUS
    && Math.max(position.z, z) > portalZ - .16 - BODY_RADIUS;
  if (crossesFrame && Math.abs(x) >= opening
    && Math.abs(x) < PORTAL_RADIUS + PORTAL_FRAME_WIDTH + BODY_RADIUS) return null;
  if (position.z >= portalZ && z < portalZ && Math.abs(x) < opening) {
    return { x, z: z - portalZ, inside: true };
  }
  return canWalkOutside(x, z) ? { x, z, inside: false } : null;
}

// A conservative aperture/frustum test. Test the arch's enclosing rectangle
// against only the four side planes in homogeneous clip space: projecting
// through w (or testing the near plane) incorrectly rejects an opening when
// the eye is crossing it. Extra pixels may render, but visible portal rays
// must never be culled. The small tolerance also retains exact-plane views.
export function apertureMayBeVisible(elements, planeZ) {
  let left=true, right=true, bottom=true, top=true;
  const epsilon=1e-6;
  for(const x of [-PORTAL_RADIUS,PORTAL_RADIUS])for(const y of [0,PORTAL_SPRING_HEIGHT+PORTAL_RADIUS]) {
    const clipX=elements[0]*x+elements[4]*y+elements[8]*planeZ+elements[12];
    const clipY=elements[1]*x+elements[5]*y+elements[9]*planeZ+elements[13];
    const clipW=elements[3]*x+elements[7]*y+elements[11]*planeZ+elements[15];
    left &&= clipX+clipW < -epsilon;
    right &&= clipW-clipX < -epsilon;
    bottom &&= clipY+clipW < -epsilon;
    top &&= clipW-clipY < -epsilon;
  }
  return !(left || right || bottom || top);
}
