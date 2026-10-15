export function createHeldCard(THREE){
 const edge=new THREE.MeshStandardMaterial({color:0xf4e7c7});
 const card=new THREE.Mesh(new THREE.BoxGeometry(.19,.27,.009),[edge,edge,edge,edge,new THREE.MeshStandardMaterial({color:0xd5ed7c,roughness:.7}),new THREE.MeshStandardMaterial({color:0x354d43,roughness:.6})]);
 card.name='DrifmakerHeldCard';card.castShadow=true;return card;
}
export function disposeHeldCard(card){card.removeFromParent();card.geometry.dispose();for(const material of new Set([].concat(card.material)))material.dispose();}

// Like the showroom, follow the animated socket's position without inheriting
// its wrist rotation. The studio avatar faces +Z (the showroom avatar faces -Z).
export function createHeldCardFollower({THREE,card,avatar}){
 const rotation=new THREE.Quaternion(),parentRotation=new THREE.Quaternion(),offset=new THREE.Vector3();
 return ()=>{
  if(!avatar.socket||!card.parent)return;
  avatar.socket.getWorldPosition(card.position);
  avatar.model.getWorldQuaternion(rotation);
  const tilt=.16+(avatar.handPitch||0);
  offset.set(0,.12,.093).applyQuaternion(rotation);card.position.add(offset);
  card.parent.worldToLocal(card.position);
  card.parent.getWorldQuaternion(parentRotation).invert();
  card.quaternion.copy(parentRotation).multiply(rotation);
  card.rotateX(tilt);
 };
}
