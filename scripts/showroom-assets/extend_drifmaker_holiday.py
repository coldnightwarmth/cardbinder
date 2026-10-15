"""Mirrored eyewear, soft holiday pieces, and an ankle-length animated robe."""
import colorsys

HOLIDAY_VARIANTS={'Eyes':['mog','virtualboy'],'Mouth':['fluffybeard'],'Hat':['santa'],'Shirt':['wizardrobe'],'Ears':['smallfins','largefins','blackfins','droopyfins']}
hd_black=material('Drif_Holiday_Black',(.006,.009,.012),.28)
hd_red=material('Drif_Holiday_Red',(.62,.012,.018),.58)
hd_fur=material('Drif_Holiday_Fur',(.96,.94,.87),.96)
hd_furshade=material('Drif_Holiday_Fur_Shade',(.83,.83,.77),1)
hd_blue=material('Drif_Wizard_Velvet',(.018,.055,.40),.92)
hd_trim=material('Drif_Wizard_Gold',(.95,.66,.18),.52,.25)

# A single curved shield lens with a nose cutout and a mirrored rainbow coating.
# The texture is generated from a color ramp, not a screenshot of the reference.
image=bpy.data.images.new('Drif_Mog_Mirror_Ramp',width=256,height=32,alpha=True)
pixels=[]
for row in range(32):
 for col in range(256):
  rgb=colorsys.hsv_to_rgb(.42*abs(col/255*2-1),.98,.97)
  pixels.extend((*rgb,1))
image.pixels=pixels;image.pack()
hd_lens=material('Drif_Mog_Mirrored_Lens',(1,1,1),.15,.65)
nodes=hd_lens.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image
hd_lens.node_tree.links.new(tex.outputs['Color'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'])
p='Drif_Eyes_mog'
def mog_point(u,v):
 x=(u*2-1)*.58
 top=2.425+.018*math.cos(x*3)
 bottom=2.025+.19*math.exp(-(x/.12)**2)+.035*(abs(x)/.58)**3
 return (x,-.665+.36*(x/.58)**2,bottom+(top-bottom)*v)
cols=48;rows=8
verts=[mog_point(i/cols,j/rows) for j in range(rows+1) for i in range(cols+1)]
faces=[(j*(cols+1)+i,j*(cols+1)+i+1,(j+1)*(cols+1)+i+1,(j+1)*(cols+1)+i) for j in range(rows) for i in range(cols)]
obj=mesh(p+'_lens',verts,faces,hd_lens,'Head')
uv=obj.data.uv_layers.new(name='Mirror UV')
for face in obj.data.polygons:
 for loop_index in face.loop_indices:
  index=obj.data.loops[loop_index].vertex_index
  uv.data[loop_index].uv=(index%(cols+1)/cols,index//(cols+1)/rows)
line(p+'_brow',[mog_point(i/48,1) for i in range(49)],.025,hd_black,'Head',8)
line(p+'_edge',[mog_point(i/48,0) for i in range(49)],.012,hd_black,'Head',6)
for s in [-1,1]:
 line(p+'_hinge',[(s*.578,-.305,2.43),(s*.59,-.29,2.30)],.027,hd_black,'Head',8)
 line(p+'_arm',[(s*.59,-.30,2.37),(s*.635,-.10,2.35),(s*.61,.17,2.28)],.022,hd_black,'Head',8)

# A red-and-black, Virtual Boy-inspired headset with padded rim and head strap.
p='Drif_Eyes_virtualboy'
ell(p+'_padding',(0,-.51,2.23),(.55,.16,.25),hd_black,n=28,m=16)
plaque(p+'_shell',[(-.50,2.06),(-.54,2.14),(-.54,2.38),(-.46,2.45),(.46,2.45),(.54,2.38),(.54,2.14),(.50,2.06)],-.87,.27,hd_red)
plaque(p+'_front',[(-.43,2.12),(-.46,2.17),(-.46,2.35),(-.40,2.39),(.40,2.39),(.46,2.35),(.46,2.17),(.43,2.12)],-.887,.025,hd_black)
for s in [-1,1]:
 ell(p+'_optics',(s*.22,-.916,2.255),(.13,.04,.095),dm_burgundy,n=18,m=12)
 ell(p+'_glass',(s*.22,-.951,2.255),(.085,.012,.058),hd_red,n=16,m=10)
 for j in range(3):dm_box(p+'_vent',(s*.49,-.72,2.16+j*.075),(.025,.16,.023),hd_black,'Head')
line(p+'_strap',[(.53,-.51,2.25),(.62,-.05,2.25),(.49,.40,2.25),(0,.63,2.25),(-.49,.40,2.25),(-.62,-.05,2.25),(-.53,-.51,2.25)],.034,hd_black,'Head',8)
dm_box(p+'_dial',(.565,-.67,2.26),(.07,.12,.10),dm_steel,'Head')
ell(p+'_light',(.36,-.92,2.35),(.018,.01,.018),sp_glowgold,n=8,m=6)

# Rounded masses plus tapered curls make a full beard rather than a flat decal.
p='Drif_Mouth_fluffybeard'
ell(p+'_volume',(0,-.565,1.61),(.37,.22,.32),hd_fur,n=28,m=18)
for s in [-1,1]:
 for j in range(5):
  x=s*(.12+j*.057);z=1.46+j*.086
  ell(p+'_sidecurl',(x,-.59, z),(.105,.12,.16),hd_fur,n=14,m=10)
for row in range(3):
 for j in range(7-row*2):
  x=(j-(6-row*2)/2)*.09;z=1.65-row*.12
  ell(p+'_curl',(x,-.737+row*.025,z),(.073,.061,.105),hd_fur if (j+row)%3 else hd_furshade,n=12,m=10)
for s in [-1,1]:
 ell(p+'_moustache',(s*.14,-.739,1.865),(.185,.075,.085),hd_fur,n=20,m=12)
line(p+'_smile',[(-.09,-.786,1.817),(0,-.795,1.795),(.09,-.786,1.817)],.012,mouth_cavity,'Head',6)
ell(p+'_tip',(0,-.56,1.31),(.12,.12,.12),hd_fur,n=16,m=12)

# Low, folded Santa cap: the point and pom stay inside the portrait composition.
p='Drif_Hat_santa'
rings(p+'_cap',[(2.70,.40,.34,0,0),(2.88,.35,.30,.015,0),(3.04,.21,.19,.13,0),(3.07,.12,.11,.31,0),(2.97,.063,.065,.46,-.015),(2.87,.008,.008,.51,-.025)],hd_red,'Head',32)
for j in range(26):
 a=j*math.tau/26
 ell(p+'_brim',(.405*math.cos(a),.345*math.sin(a),2.72),(.075,.065,.072),hd_fur,n=12,m=8)
ell(p+'_pom',(.52,-.025,2.84),(.12,.115,.12),hd_fur,n=16,m=12)
for j in range(9):
 a=j*math.tau/9
 ell(p+'_pomtuft',(.52+.09*math.cos(a),-.06,2.84+.09*math.sin(a)),(.045,.07,.045),hd_fur,n=10,m=8)

# Continuous flared robe. The lower cloth blends between pelvis and thighs;
# its own classic feet remain animated when all selected leg meshes are hidden.
p='Drif_Shirt_wizardrobe'
def robe_weights(co):
 if co.z>=.80:return torso_weights(co)
 t=max(0,min(.80,(.80-co.z)/.72))
 left=max(0,min(1,.5+co.x/.28))
 return {'Pelvis':1-t,'Thigh.L':t*left,'Thigh.R':t*(1-left)}
robe_sections=[(.17,.51,.32),(.25,.505,.32),(.43,.49,.31),(.62,.46,.29),(.82,.425,.28),(1.04,.42,.28),(1.29,.41,.26),(1.48,.36,.22),(1.56,.237,.17)]
def robe_radii(z):
 for low,high in zip(robe_sections,robe_sections[1:]):
  if z<=high[0]:
   t=max(0,(z-low[0])/(high[0]-low[0]));return (low[1]*(1-t)+high[1]*t,low[2]*(1-t)+high[2]*t)
 return robe_sections[-1][1:]
verts=[];sides=48
for z,rx,ry in robe_sections:
 for j in range(sides):
  a=j*math.tau/sides;fold=.014*math.cos(12*a)*max(0,1.2-z)
  verts.append(((rx+fold)*math.cos(a),(ry+fold)*math.sin(a),z))
faces=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(robe_sections)-1) for j in range(sides)]
mesh(p+'_cloth',verts,faces,hd_blue,robe_weights)
for side,label in [(-1,'R'),(1,'L')]:
 sleeve=dm_sleeve(p,side,label,hd_blue,hd_trim)
 # Full bell sleeves above the fitted wrist opening.
 for v in sleeve.data.vertices:
  flare=1+.30*max(0,1-abs(abs(v.co.x)-.90)/.20)
  v.co.y*=flare;v.co.z=1.465+(v.co.z-1.465)*flare
dm_loop(p+'_collar',(0,0,1.548),(.238,.174),.022,hd_trim,'Chest','xy',32)
dm_loop(p+'_belt',(0,0,.84),(.432,.29),.017,hd_trim,robe_weights,'xy',48)
line(p+'_tie',[(-.02,-.30,.85),(.045,-.32,.79),(.075,-.34,.59)],.014,hd_trim,robe_weights,8)
for z in [.19,.225]:
 dm_loop(p+'_hem',(0,0,z),(.515,.331),.013,hd_trim,robe_weights,'xy',48)
for row,z in enumerate([.36,.61,.98,1.24]):
 for x in ([-.30,0,.30] if row%2==0 else [-.19,.19]):
  radius=.064 if z<1.1 else .054
  points=[]
  for j in range(10):
   a=math.pi/2+j*math.pi/5;r=radius if j%2==0 else radius*.43
   xx=x+math.cos(a)*r;zz=z+math.sin(a)*r;rx,ry=robe_radii(zz)
   yy=-ry*math.sqrt(max(.05,1-(xx/rx)**2))-.024
   points.append((xx,yy,zz))
  mesh(p+'_star',points,[tuple(reversed(range(10)))],hd_trim,robe_weights,False)
for side,label in [(-1,'R'),(1,'L')]:
 star(p+'_sleevestar',(side*.61,-.205,1.465),.065,.028,hd_trim,'UpperArm.'+label,points=5)
subset(p+'_feet',foot_polygons)

# Preserve the original faceted fins, attachment and Head weights. Scale around
# the pierced outer-face region so the gold earring still sits on the fin.
for style in HOLIDAY_VARIANTS['Ears']:
 obj=subset('Drif_Ears_'+style,groups['Drif_Ears_original'])
 if style=='blackfins':
  obj.data.materials.clear();obj.data.materials.append(hd_black)
  for face in obj.data.polygons:face.material_index=0
 for v in obj.data.vertices:
  s=1 if v.co.x>=0 else -1;x=abs(v.co.x);z=v.co.z
  if style in ['smallfins','largefins']:
   scale=.70 if style=='smallfins' else 1.18
   v.co.x=s*(.82+(x-.82)*scale);v.co.z=2.29+(z-2.29)*scale
   v.co.y*=scale
  elif style=='droopyfins':
   dz=z-2.29
   v.co.x=s*(x+.24*max(0,dz))
   v.co.z=2.29+(.72*dz if dz<0 else -.78*dz)-.22*max(0,x-.82)
