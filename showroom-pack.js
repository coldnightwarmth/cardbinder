import * as THREE from 'three';

export function createPackGeometry() {
  const nx=64,ny=96,width=.34,height=.59;
  const positions=[],uvs=[],indices=[];
  const stride=nx+1,faceSize=stride*(ny+1);
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  for(const side of [1,-1])for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++) {
    const u=i/nx,v=j/ny,edge=Math.min(v,1-v);
    const body=smooth((edge-.072)/.065);
    const across=Math.sin(Math.PI*u);
    // Rounded shoulders surround the thicker, mostly flat stack of cards.
    const sideRound=smooth(Math.min(u,1-u)/.075);
    const fullness=.026*sideRound*body;
    const crimp=.0003*Math.sin(u*Math.PI*96)*(1-body);
    const wrinkles=.00075*Math.sin(u*43+v*31)*Math.sin(v*73-u*17)*body*sideRound*(1-across*.65);
    const halfDepth=.0008+fullness+crimp+wrinkles;
    const edgeWave=.0006*Math.sin(u*93)*(1-body);
    positions.push((u-.5)*width,(v-.5)*height+edgeWave,side*halfDepth);
    // Sample only the wrapper in the supplied photo, excluding its white margin.
    const photoU=side===1?u:1-u;
    uvs.push((381+photoU*531)/1280,1-(1126-v*935)/1280);
  }
  const groups=[];
  for(let side=0;side<2;side++)for(let j=0;j<ny;j++) {
    const start=indices.length;
    for(let i=0;i<nx;i++) {
      const a=side*faceSize+j*stride+i,b=a+1,c=a+stride,d=c+1;
      if(side===0)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d);
    }
    groups.push([start,indices.length-start,j<7||j>=87?1:0]);
  }
  // Close the perimeter with a thin metallic foil edge.
  const start=indices.length;
  const edge=[];
  for(let i=0;i<=nx;i++)edge.push(i);
  for(let j=1;j<=ny;j++)edge.push(j*stride+nx);
  for(let i=nx-1;i>=0;i--)edge.push(ny*stride+i);
  for(let j=ny-1;j>0;j--)edge.push(j*stride);
  for(let i=0;i<edge.length;i++) {
    const a=edge[i],b=edge[(i+1)%edge.length];
    indices.push(a,a+faceSize,b,b,a+faceSize,b+faceSize);
  }
  groups.push([start,indices.length-start,1]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();
  // Merge adjacent rows with the same material to keep draw calls bounded.
  for(const [start,count,materialIndex] of groups) {
    const previous=geometry.groups.at(-1);
    if(previous?.materialIndex===materialIndex && previous.start+previous.count===start)previous.count+=count;
    else geometry.addGroup(start,count,materialIndex);
  }
  return geometry;
}

export async function createShowroomPack(renderer) {
  const map=await new THREE.TextureLoader().loadAsync(new URL('./assets/models/showroom-pack/wrapper.jpg',import.meta.url).href);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());renderer.initTexture(map);
  const printed=new THREE.MeshPhysicalMaterial({map,color:0xb0b0b0,roughness:.65,metalness:.1,clearcoat:.12,clearcoatRoughness:.55,envMapIntensity:.6});
  const silver=new THREE.MeshPhysicalMaterial({map,color:0xbebebe,roughness:.5,metalness:.65,clearcoat:.08,envMapIntensity:.65});
  // Adjust the sampled artwork before lighting; preserve the original photo.
  for(const material of [printed,silver]) {
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  // Contrast around middle gray in linear space (sRGB 0.5 is ~0.214).
  sampledDiffuseColor.rgb = clamp((sampledDiffuseColor.rgb - 0.214) * 1.22 + 0.214, 0.0, 1.0);
  diffuseColor *= sampledDiffuseColor;
#endif
`);
    };
    material.customProgramCacheKey=()=> 'pack-artwork-contrast-1';
  }
  const pack=new THREE.Mesh(createPackGeometry(),[printed,silver]);
  pack.scale.setScalar(.75);
  pack.name='showroom-cardnft2-pack';
  pack.rotation.order='YXZ';pack.rotation.set(-Math.PI/2,-Math.PI/2+THREE.MathUtils.degToRad(7),0);
  return pack;
}
