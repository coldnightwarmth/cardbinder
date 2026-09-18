import * as THREE from 'three';

// A solid desk tent with its printed face sloping toward the aisle.
export function createShowroomNameplate(entry, side, z) {
  const group = new THREE.Group();
  group.scale.setScalar(.55);
  group.position.set(side * 2.37, .833, z);
  group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-.085, 0); shape.lineTo(.085, 0); shape.lineTo(0, .17); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.02, bevelEnabled: false });
  geometry.translate(0, 0, -.51);
  geometry.rotateY(Math.PI / 2);
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0x292d32, metalness: .45, roughness: .48,
  }));
  group.add(body);
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#292d32'; ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = '#eee8dc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wallet = !entry.collectionId;
  ctx.font = `${wallet ? 44 : 52}px Georgia, "Times New Roman", serif`;
  const title = entry.label || entry.walletAddress || '';
  let lines = [];
  if (wallet) {
    const middle = Math.ceil(title.length / 2);
    lines = [title.slice(0, middle), title.slice(middle)];
  } else {
    let line = '';
    for (const word of title.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > 930) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
  }
  const step = Math.min(64, 156 / Math.max(1, lines.length));
  lines.forEach((line, i) => ctx.fillText(line, 512, 96 + (i - (lines.length - 1) / 2) * step, 940));
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.99, Math.hypot(.17, .085) * .95),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  face.rotation.x = -Math.atan2(.085, .17);
  face.position.set(0, .085, .0435);
  group.add(face);
  group.userData.ownedTextures = [texture];
  return group;
}
