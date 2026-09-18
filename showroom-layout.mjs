// Each category grows independently, three binders per table, nearest slot first.
export function seatFor(index, side = -1) {
  return { side, row: Math.floor(index / 3), slot: 2 - index % 3 };
}
export function canWalkAt(x, z, endZ, tables) {
  return Math.abs(x) < 450 && z < 450 && z > Math.min(-450, endZ - 200)
    && !tables.some(t => Math.abs(x - t.x) < 1.08 && Math.abs(z - t.z) < 2.5);
}

// Stable, restrained variation around a straight, aisle-facing placement.
export function facingStart(x, z, seed = 0) {
  const random = Math.sin((seed + 1) * 127.1 + x * 31.7 + z * 17.3) * 43758.5453;
  return (x < 0 ? Math.PI / 2 : -Math.PI / 2) + ((random - Math.floor(random)) - .5) * .12;
}
