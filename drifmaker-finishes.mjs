// Directly studied source layers, rather than inferred materials from names.
// /Users/kyl/Documents/share_kit_3500-4512/drifella assets/drifella2 main/3drifellabody/
// black gem.PNG; lava.PNG; woods.PNG; mossy.PNG; pink leather latex.PNG; cow hide.PNG
// In particular, black gem is smooth glossy resin in the artwork, not facets.
// All coordinates below are unposed mesh coordinates: the finish follows skinning
// without extra textures, world-space swimming, or changes to silhouette/rigging.
const finish=(color,roughness,metalness,envMapIntensity,source)=>Object.freeze({color,roughness,metalness,envMapIntensity,source});
export const COLLECTION_FINISHES=Object.freeze({
 blueporcelain:finish('#e0e8ef',0.2,0.03,1.0,'Original stagecraft material'),
 verdigris:finish('#49a68d',0.62,0.65,1.25,'Original stagecraft material'),
 pearl:finish('#e9d6ee',0.19,0.35,1.65,'Original stagecraft material'),
 amethyst:finish('#8d4ac3',0.22,0.26,1.35,'Original stagecraft material'),
 carbonfiber:finish('#252b35',0.28,0.5,1.25,'Original stagecraft material'),
 candyglaze:finish('#ff7d45',0.14,0.05,1.5,'Original stagecraft material'),

 blackgem:finish('#151722',.14,.32,1.7,'black gem.PNG'),
 lava:finish('#dd4818',.72,.08,.8,'lava.PNG'),
 woods:finish('#926442',.83,0,.55,'woods.PNG'),
 mossy:finish('#73833f',.96,0,.4,'mossy.PNG'),
 pinklatex:finish('#e785ad',.19,.02,1.45,'pink leather latex.PNG'),
 cowhide:finish('#decbb0',.88,0,.5,'cow hide.PNG'),
});

const common=`
varying vec3 vDrifFinishPosition;
float drifSurfaceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float drifSurfaceNoise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(drifSurfaceHash(i),drifSurfaceHash(i+vec3(1,0,0)),f.x),mix(drifSurfaceHash(i+vec3(0,1,0)),drifSurfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(drifSurfaceHash(i+vec3(0,0,1)),drifSurfaceHash(i+vec3(1,0,1)),f.x),mix(drifSurfaceHash(i+vec3(0,1,1)),drifSurfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float drifSurfaceFbm(vec3 p){return .57*drifSurfaceNoise(p)+.29*drifSurfaceNoise(p*2.07+7.0)+.14*drifSurfaceNoise(p*4.13+17.0);}
// Colors are authored in sRGB, while Three's material lighting is linear.
vec3 drifSurfaceLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
// Analytic surface-gradient bump in view space, valid on every rigged part and
// with no UV requirement. The small height range preserves the modeled shape.
vec3 drifSurfaceNormal(vec3 n,float height,vec3 viewPosition,float faceDirection){
 vec3 dx=dFdx(-viewPosition),dy=dFdy(-viewPosition);
 vec3 r1=cross(dy,n),r2=cross(n,dx);
 float determinant=dot(dx,r1)*faceDirection;
 vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
 return normalize(max(abs(determinant),1e-8)*n-gradient);
}
`;

// Each shader returns its own color, roughness, microscopic height and emission.
// Broad bands/patches remain readable at portrait size; fine detail is filtered
// through derivatives rather than screen-space noise or decorative line meshes.
const samples={
 blueporcelain:`float swirls=sin(p.y*21.0+sin(p.x*13.0)*2.0+sin(p.z*12.0));
 float flower=sin(atan(p.z,p.x)*8.0+length(p.xz)*19.0);
 float ink=smoothstep(.65,.90,swirls*flower);
 color=drifSurfaceLinear(mix(vec3(.92,.95,.98),vec3(.025,.12,.42),ink));
 roughness=.16+.07*drifSurfaceNoise(p*80.0);height=ink*.0004;`,
 verdigris:`float field=drifSurfaceFbm(p*6.2);float patina=smoothstep(.37,.58,field);
 color=drifSurfaceLinear(mix(vec3(.66,.30,.12),mix(vec3(.025,.22,.17),vec3(.23,.65,.48),drifSurfaceNoise(p*30.0)),patina));
 roughness=mix(.25,.88,patina);height=patina*drifSurfaceNoise(p*70.0)*.003;`,
 pearl:`float bands=sin(p.y*22.0+drifSurfaceFbm(p*8.0)*9.0);
 vec3 nacre=.80+.14*cos(vec3(0.0,2.0,4.0)+bands*1.9+p.x*4.0);
 color=drifSurfaceLinear(nacre);roughness=.13+.08*drifSurfaceNoise(p*30.0);height=bands*.0008;`,
 amethyst:`vec3 q=p*10.0,base=floor(q),local=fract(q);float nearest=10.0,second=10.0,crystal=0.0;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
  vec3 cell=vec3(float(x),float(y),float(z));vec3 id=base+cell;
  vec3 seed=vec3(drifSurfaceHash(id),drifSurfaceHash(id+13.7),drifSurfaceHash(id+37.1));
  float distanceToSeed=length(cell+seed-local);
  if(distanceToSeed<nearest){second=nearest;nearest=distanceToSeed;crystal=drifSurfaceHash(id+71.0);}else{second=min(second,distanceToSeed);}
 }
 float quartz=1.0-smoothstep(.015,.07,second-nearest);
 color=drifSurfaceLinear(mix(vec3(.22,.045,.39),vec3(.70,.41,.86),crystal));
 color=mix(color,drifSurfaceLinear(vec3(.78,.60,.87)),quartz*.45);roughness=.15+crystal*.14;height=nearest*.002;`,
 carbonfiber:`vec2 uv=p.xy*46.0;vec2 cell=floor(uv);vec2 f=fract(uv);
 float orientation=mod(cell.x+cell.y,2.0);float strand=mix(f.x,f.y,orientation);
 float yarn=pow(sin(strand*3.14159265),.5);float rib=.5+.5*sin(strand*50.0);
 color=drifSurfaceLinear(mix(vec3(.025,.035,.05),vec3(.16,.18,.21),yarn*(.70+.30*orientation)));
 roughness=.23+.13*(1.0-yarn);height=yarn*.0016+rib*.00012;`,
 candyglaze:`float swirl=.5+.5*sin(p.y*16.0+p.x*9.0+drifSurfaceFbm(p*4.0)*8.0);
 color=drifSurfaceLinear(mix(vec3(.95,.12,.04),vec3(1.0,.72,.25),smoothstep(.20,.80,swirl)));
 float sugar=drifSurfaceNoise(p*170.0);roughness=.095+.09*sugar;height=(sugar-.5)*.0003;`,

 blackgem:`
 float cloud=drifSurfaceFbm(p*3.4);
 float polish=drifSurfaceNoise(p*105.0);
 color=drifSurfaceLinear(mix(vec3(.018,.024,.039),vec3(.10,.115,.16),cloud*.75));
 roughness=mix(.105,.19,polish);height=(polish-.5)*.00018;
 `,
 lava:`
 vec3 flow=p*vec3(5.2,2.8,5.2);
 flow+=vec3(drifSurfaceNoise(flow*.7),drifSurfaceNoise(flow*.7+8.0),drifSurfaceNoise(flow*.7+16.0))*1.7;
 float field=drifSurfaceFbm(flow);
 float channel=abs(field-.50);
 float edge=max(fwidth(channel),.008);
 float heat=1.0-smoothstep(.045-edge,.080+edge,channel);
 float core=1.0-smoothstep(.006,.035,channel);
 float crust=drifSurfaceFbm(p*38.0);
 vec3 rock=mix(vec3(.035,.027,.029),vec3(.13,.09,.075),crust);
 vec3 molten=mix(vec3(1.0,.17,.015),vec3(1.0,.83,.24),core);
 color=drifSurfaceLinear(mix(rock,molten,heat));
 roughness=mix(.87,.27,heat);height=crust*.004-heat*.006;
 glow=drifSurfaceLinear(molten)*heat*.85;
 `,
 woods:`
 float warp=drifSurfaceFbm(p*vec3(3.0,1.1,3.0));
 float rings=length(p.xz*vec2(1.0,1.3)+vec2(.27,-.19))*30.0+warp*5.0+p.y*.38;
 float wave=.5+.5*sin(rings*6.2831853);
 float grain=smoothstep(.50,.83,wave);
 float pores=drifSurfaceNoise(p*vec3(140.0,9.0,140.0));
 color=drifSurfaceLinear(mix(vec3(.22,.115,.057),vec3(.64,.43,.24),.17+.72*grain));
 color*=.80+.20*pores;
 roughness=.73+.20*(1.0-grain);height=grain*.0028+pores*.0006;
 `,
 mossy:`
 float cover=drifSurfaceFbm(p*5.5+vec3(0,5,0));
 float moss=smoothstep(.40,.60,cover);
 float tufts=drifSurfaceFbm(p*67.0);
 float stone=drifSurfaceNoise(p*19.0);
 vec3 base=mix(vec3(.42,.36,.25),vec3(.71,.65,.48),stone);
 vec3 green=mix(vec3(.12,.20,.035),vec3(.48,.58,.12),tufts);
 color=drifSurfaceLinear(mix(base,green,moss));
 roughness=mix(.84,1.0,moss);height=(tufts*.004+.003)*moss+stone*.0007;
 `,
 pinklatex:`
 float broad=drifSurfaceNoise(p*2.5);
 float pebble=drifSurfaceNoise(p*135.0);
 color=drifSurfaceLinear(mix(vec3(.78,.28,.47),vec3(.98,.62,.74),broad*.8+.2));
 roughness=.12+.09*pebble;height=(pebble-.5)*.0003;
 `,
 cowhide:`
 float patches=drifSurfaceFbm(p*7.0+vec3(2,0,5));
 float border=max(fwidth(patches)*1.4,.009);
 float brown=smoothstep(.51-border,.51+border,patches);
 float shade=drifSurfaceNoise(p*16.0);
 vec3 cream=vec3(.94,.88,.74),tan=mix(vec3(.23,.10,.038),vec3(.60,.34,.15),shade);
 float fibers=drifSurfaceNoise(p*vec3(230.0,13.0,230.0));
 color=drifSurfaceLinear(mix(cream,tan,brown))*(.90+.10*fibers);
 roughness=.83+.14*fibers;height=(fibers-.5)*.00065;
 `,
};

export function applyCollectionFinishShader(shader,id){
 if(!Object.hasOwn(COLLECTION_FINISHES,id))return false;
 const anchors=['color_fragment','roughnessmap_fragment','normal_fragment_maps','emissivemap_fragment'];
 if(!shader.vertexShader.includes('#include <begin_vertex>')||anchors.some(anchor=>!shader.fragmentShader.includes(`#include <${anchor}>`)))throw Error('Unsupported Three shader chunks for Drifmaker finish.');
 shader.vertexShader='varying vec3 vDrifFinishPosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDrifFinishPosition = position;');
 // Pass viewPosition and faceDirection explicitly: the former's declaration
 // follows this injected helper, and the latter is local to Three's main().
 shader.fragmentShader=common+`
void drifFinishSample(vec3 p,out vec3 color,out float roughness,out float height,out vec3 glow){
 glow=vec3(0.0);${samples[id]}
}
`+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 drifSurfaceColor,drifSurfaceGlow;
float drifSurfaceRoughness,drifSurfaceHeight;
drifFinishSample(vDrifFinishPosition,drifSurfaceColor,drifSurfaceRoughness,drifSurfaceHeight,drifSurfaceGlow);
diffuseColor.rgb=drifSurfaceColor;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=drifSurfaceRoughness;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=drifSurfaceNormal(normal,drifSurfaceHeight,vViewPosition,faceDirection);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=drifSurfaceGlow;');
 return true;
}
