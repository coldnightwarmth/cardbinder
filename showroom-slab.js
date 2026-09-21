import * as THREE from 'three';

export function createShowroomSlab(display, environment) {
  const root=new THREE.Group();root.name='showroom-sun-slab';
  // The existing card renderer supplies the art, reverse and animated atlas.
  display.group.scale.multiplyScalar(.353);
  display.group.position.y-=.006;
  root.add(display.group);
  // Transmission's scene capture includes opaque artwork, not transparent card
  // overlays. Keep both printed faces in that pass so the lid refracts the card.
  for(const face of [display.group.userData.frontMesh,display.group.userData.backMesh]) {
    if(!face)continue;
    face.material.transparent=false;face.material.opacity=1;face.material.depthWrite=true;face.material.needsUpdate=true;
  }
  const shape=(w,h,r)=>{
    const s=new THREE.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  };
  const glass=new THREE.MeshPhysicalMaterial({color:0xf4fcff,roughness:.025,metalness:0,transmission:.97,thickness:.009,ior:1.49,clearcoat:.6,clearcoatRoughness:.12,envMap:environment,envMapIntensity:.6});
  const plateGeometry=new THREE.ExtrudeGeometry(shape(.294,.42,.015),{depth:.003,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,curveSegments:8,steps:1});
  for(const z of [-.011,.008]){const plate=new THREE.Mesh(plateGeometry,glass);plate.position.z=z;root.add(plate);}
  const rimShape=shape(.294,.42,.015);
  rimShape.holes.push(new THREE.Path(shape(.272,.397,.009).getPoints(12)));
  const rimGeometry=new THREE.ExtrudeGeometry(rimShape,{depth:.018,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,steps:1,curveSegments:8});
  const rim=new THREE.Mesh(rimGeometry,glass);rim.position.z=-.009;root.add(rim);
  root.rotation.order='YXZ';root.rotation.set(-Math.PI/2,Math.PI/2-THREE.MathUtils.degToRad(8),0);
  return {group:root,update:display.update,dispose(){display.dispose();plateGeometry.dispose();rimGeometry.dispose();glass.dispose();}};
}
