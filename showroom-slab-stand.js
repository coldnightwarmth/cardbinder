import * as THREE from 'three';
import { createShowroomSlab } from './showroom-slab.js?v=3';

export function createShowroomSlabStand(display,environment) {
  const slab=createShowroomSlab(display,environment);
  slab.group.rotation.set(-THREE.MathUtils.degToRad(15),0,0);
  slab.group.position.set(0,.239,0);
  const root=new THREE.Group();root.name='showroom-drifella-slab-stand';root.add(slab.group);
  const acrylic=new THREE.MeshPhysicalMaterial({color:0xf5fcff,roughness:.055,transmission:.97,thickness:.009,ior:1.49,clearcoat:.5,envMap:environment,envMapIntensity:.7});
  // Two clear, cut acrylic side profiles form rear braces and front retaining lips.
  const profile=new THREE.Shape();
  profile.moveTo(-.105,.008);profile.lineTo(.10,.008);
  profile.lineTo(.10,.055);profile.quadraticCurveTo(.10,.067,.088,.067);
  profile.lineTo(.071,.032);profile.lineTo(.044,.032);
  profile.lineTo(-.022,.295);profile.quadraticCurveTo(-.027,.31,-.039,.302);
  profile.lineTo(-.096,.029);profile.lineTo(-.105,.008);
  const geometry=new THREE.ExtrudeGeometry(profile,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.0015,bevelSegments:3,curveSegments:8,steps:1});
  for(const x of [-.101,.101]) {
    const support=new THREE.Mesh(geometry,acrylic);
    support.rotation.y=-Math.PI/2;support.position.x=x+.0045;root.add(support);
  }
  const crossGeometry=new THREE.BoxGeometry(.214,.009,.014);
  for(const [y,z] of [[.014,-.09],[.29,-.035]]) {
    const crossbar=new THREE.Mesh(crossGeometry,acrylic);crossbar.position.set(0,y,z);root.add(crossbar);
  }
  root.scale.setScalar(.95);
  root.rotation.y=Math.PI/2;
  return {group:root,update:slab.update,dispose(){slab.dispose();geometry.dispose();crossGeometry.dispose();acrylic.dispose();}};
}
