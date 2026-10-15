"""Reference-led additions, authored in bind space for the existing showroom rig.
The supplied Swag World photo is embedded unchanged and sampled with tailored UVs.
"""
SIGNATURE_VARIANTS={
 'Tattoo':['teardrops','stars','lightning','tribal','rose','runes','freckles','skull'],
 'Nose':['button','heart','cat','pig','clown'],
 'Ears':['round','elf','bunny','bat','finlets'],
 'Accessory':['goldearring','machinegun'],
 'Head':['hayabusa'], 'Hat':['mcdonalds'], 'Shirt':['mcdonalds','swagworld'],
}
sg_ink=material('Drif_Signature_Ink',(.008,.012,.021),.98)
sg_red=material('Drif_Signature_Red',(.67,.012,.019),.65)
sg_gold=material('Drif_Signature_Gold',(.95,.60,.08),.17,.92)
sg_blue=material('Drif_Signature_Blue',(.008,.035,.49),.87)
sg_silver=material('Drif_Signature_Silver',(.74,.80,.85),.23,.88)
sg_engraving=material('Drif_Signature_Engraving',(.12,.17,.21),.42,.65)

# Thin ink geometry follows the actual head/muzzle surface via ray casting.
from mathutils.bvhtree import BVHTree
sg_head=bpy.data.objects['Drif_Head_original']
sg_bvh=BVHTree.FromPolygons([v.co[:] for v in sg_head.data.vertices],[tuple(p.vertices) for p in sg_head.data.polygons])
def sg_facepoint(x,z,offset=.005):
 hit,normal,idx,dist=sg_bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
 return (x,(hit.y if hit else -.42)-offset,z)
def sg_inkline(p,points,r=.006):
 sampled=[]
 for a,b in zip(points,points[1:]):
  for j in range(6):
   t=j/6;sampled.append(sg_facepoint(a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t))
 sampled.append(sg_facepoint(*points[-1]));return line(p,sampled,r,sg_ink,'Head',5)
def sg_mark(p,points):
 verts=[sg_facepoint(x,z,.008) for x,z in points];return mesh(p,verts,[tuple(range(len(verts)))],sg_ink,'Head',False)
for style in SIGNATURE_VARIANTS['Tattoo']:
 p='Drif_Tattoo_'+style
 if style=='teardrops':
  for x,z,r in [(-.49,1.99,.028),(-.47,1.89,.021),(.49,1.99,.026)]:
   sg_mark(p,[(x,z+r*2),(x-r,z),(x-r*.6,z-r),(x+r*.6,z-r),(x+r,z)])
 elif style=='stars':
  for x,z,r in [(-.5,2.04,.055),(.5,2.03,.045),(-.17,2.61,.03)]:
   sg_mark(p,[(x+(r if j%2==0 else r*.4)*math.sin(j*math.pi/5),z+(r if j%2==0 else r*.4)*math.cos(j*math.pi/5)) for j in range(10)])
 elif style=='lightning':
  for s in [-1,1]:sg_mark(p,[(s*.46,2.11),(s*.55,2.01),(s*.51,2.01),(s*.55,1.87),(s*.43,2.01),(s*.48,2.01)])
 elif style=='tribal':
  for s in [-1,1]:
   for j in range(3):sg_inkline(p,[(s*(.45+j*.025),2.16-j*.06),(s*(.55+j*.012),2.10-j*.06),(s*(.50+j*.015),1.94-j*.04)],.007)
  sg_inkline(p,[(-.15,2.65),(0,2.69),(.15,2.65)],.008)
 elif style=='rose':
  x,z=-.50,2.02
  for k in range(5):
   a=k*math.tau/5;cx=x+.025*math.cos(a);cz=z+.025*math.sin(a)
   sg_inkline(p,[(cx+.027*math.cos(j*math.tau/16),cz+.027*math.sin(j*math.tau/16)) for j in range(17)],.004)
  sg_inkline(p,[(x,z-.04),(x+.01,z-.14),(x-.02,z-.22)],.005)
  sg_mark(p,[(x+.01,z-.1),(x+.06,z-.08),(x+.03,z-.14)])
 elif style=='runes':
  for s in [-1,1]:
   sg_inkline(p,[(s*.49,1.92),(s*.51,2.13)],.006)
   sg_inkline(p,[(s*.46,2.02),(s*.55,2.07),(s*.47,2.12)],.006)
  sg_inkline(p,[(-.12,2.66),(0,2.60),(.12,2.66)],.005)
 elif style=='freckles':
  for s in [-1,1]:
   for j in range(8):
    x=s*(.23+(j%4)*.035);z=1.91+(j//4)*.042;sg_mark(p,[(x+.007*math.cos(k*math.tau/8),z+.007*math.sin(k*math.tau/8)) for k in range(8)])
 elif style=='skull':
  for s in [-1,1]:
   sg_inkline(p,[(s*.38,1.91),(s*.29,1.86),(s*.20,1.86)],.008)
   for j in range(3):x=s*(.23+j*.045);sg_inkline(p,[(x,1.83),(x,1.89)],.005)
  sg_inkline(p,[(-.16,2.65),(-.07,2.68),(0,2.64),(.07,2.68),(.16,2.65)],.006)

# Nose choices retain the common muzzle and existing mouth attachment height.
for style in SIGNATURE_VARIANTS['Nose']:
 p='Drif_Nose_'+style
 if style=='button':ell(p,(0,-.66,1.98),(.075,.055,.052),sg_ink,n=16,m=10)
 elif style=='heart':dm_heart(p,(0,-.686,1.985),.072,dm_rose)
 elif style=='cat':
  plaque(p,[(-.075,2.015),(.075,2.015),(0,1.94)],-.688,.025,sg_ink)
  line(p+'_philtrum',[(0,-.685,1.94),(0,-.688,1.9)],.006,sg_ink,'Head',5)
 elif style=='pig':
  ell(p,(0,-.679,1.98),(.105,.044,.065),pink,n=18,m=12)
  for s in [-1,1]:ell(p+'_nostril',(s*.04,-.72,1.98),(.014,.009,.025),sg_ink,n=10,m=8)
 elif style=='clown':ell(p,(0,-.70,1.99),(.09,.075,.09),sg_red,n=20,m=14)

# Ear roots share the original side attachment. Each choice replaces both fins.
for style in SIGNATURE_VARIANTS['Ears']:
 p='Drif_Ears_'+style
 for s in [-1,1]:
  if style=='round':
   ell(p+'_ear',(s*.63,.035,2.36),(.23,.105,.24),blue,n=18,m=12)
   ell(p+'_inner',(s*.65,-.06,2.36),(.14,.027,.16),pink,n=16,m=10)
  elif style=='elf':
   plaque(p+'_ear',[(s*.51,2.10),(s*.72,2.18),(s*.97,2.59),(s*.67,2.46),(s*.50,2.42)],-.045,.16,blue)
   plaque(p+'_inner',[(s*.60,2.20),(s*.73,2.28),(s*.86,2.48),(s*.63,2.39)],-.055,.012,pink)
  elif style=='bunny':
   ell(p+'_ear',(s*.58,.035,2.63),(.13,.10,.49),white,n=18,m=14)
   ell(p+'_inner',(s*.58,-.058,2.66),(.065,.018,.34),pink,n=14,m=12)
  elif style=='bat':
   plaque(p+'_ear',[(s*.5,2.15),(s*.75,2.19),(s*.87,2.89),(s*.66,2.64),(s*.49,2.43)],-.02,.17,charcoal)
   plaque(p+'_inner',[(s*.60,2.28),(s*.72,2.31),(s*.78,2.70),(s*.59,2.49)],-.03,.015,dm_burgundy)
  elif style=='finlets':
   for j in range(3):
    z=2.1+j*.18;plaque(p+'_fin',[(s*.50,z-.08),(s*.81,z+.06),(s*.66,z+.24),(s*.50,z+.12)],-.03,.12,blue if j%2 else white)

# A single hoop, attached close to the shared ear root so every ear set can wear it.
p='Drif_Accessory_goldearring'
dm_loop(p+'_hoop',(.65,-.14,2.12),(.075,.105),.019,sg_gold,steps=32)
ell(p+'_stud',(.65,-.14,2.225),(.027,.02,.027),sg_gold,n=12,m=8)

# Stylized back-mounted machine-gun prop; all hard parts remain Chest-bound.
p='Drif_Accessory_machinegun'
dm_box(p+'_receiver',(0,.45,1.35),(.17,.14,.49),dm_steel)
dm_box(p+'_stock',(0,.45,.85),(.20,.11,.30),charcoal)
dm_box(p+'_stockpad',(0,.45,.68),(.23,.15,.07),sg_ink)
line(p+'_barrel',[(0,.45,1.62),(0,.45,2.17)],.035,dm_steel,'Chest',10)
line(p+'_muzzle',[(0,.45,2.17),(0,.45,2.26)],.05,charcoal,'Chest',10)
dm_box(p+'_foregrip',(0,.45,1.78),(.11,.13,.25),charcoal)
for j in range(5):dm_box(p+'_ridge',(0,.53,1.67+j*.045),(.125,.015,.018),sg_engraving)
dm_box(p+'_magazine',(.14,.46,1.22),(.18,.12,.30),charcoal)
dm_box(p+'_grip',(.13,.45,.99),(.10,.10,.20),charcoal)
for z in [1.5,1.95]:dm_box(p+'_sight',(0,.53,z),(.045,.06,.05),dm_steel)
# Tilt the assembled silhouette diagonally before the common join/export pass.
for o in list(collection.objects):
 if o.name.startswith(p):
  for v in o.data.vertices:
   x,z=v.co.x,v.co.z-1.35;a=.48;v.co.x=x*math.cos(a)+z*math.sin(a)+.20;v.co.z=1.35-x*math.sin(a)+z*math.cos(a)
for s in [-1,1]:line(p+'_sling',[(s*.23,.31,1.48),(s*.26,-.21,1.43),(-s*.2,-.31,.98)],.022,dm_leather,torso_weights,7)

# McDonald's employee pieces: red visor and polo with raised golden arches.
def sg_arches(p,x,y,z,size,bone='Head'):
 for s in [-1,1]:
  pts=[(x+s*size*.5+size*.5*math.cos(math.pi*j/16),y,z+size*math.sin(math.pi*j/16)) for j in range(17)]
  line(p,pts,size*.11,dm_yellow,bone,6)
p='Drif_Hat_mcdonalds'
rings(p+'_band',[(2.62,.49,.40,0,0),(2.73,.49,.40,0,0)],sg_red,'Head',40,caps=False)
verts=[]
for r in [0,1]:
 for j in range(33):
  a=math.pi+j*math.pi/32;verts.append(((.49+r*.09)*math.cos(a),(.40+r*.28)*math.sin(a)-.015,2.635-r*.045))
mesh(p+'_visor',verts,[(j,j+1,j+34,j+33) for j in range(32)],sg_red,'Head',False)
sg_arches(p+'_arches',0,-.414,2.64,.07)
p,body,sleeves=dm_shirt_base('mcdonalds',sg_red,charcoal)
for s in [-1,1]:plaque(p+'_collar',[(s*.02,1.44),(s*.14,1.56),(s*.25,1.45),(s*.10,1.34)],-.245,.018,charcoal,'Chest')
line(p+'_placket',[(0,-.257,1.48),(0,-.28,1.24)],.017,sg_red,'Chest',6)
for z in [1.39,1.30]:dm_disc(p+'_button',(0,-.284,z),.012,sg_ink,'Chest',sides=8)
sg_arches(p+'_arches',-.20,-.279,1.29,.05,'Chest')
dm_box(p+'_badge',(.20,-.272,1.29),(.13,.016,.05),white,'Chest')

# Swag World hoodie uses the actual supplied image, packed into the GLB.
image_path=OUT/'textures/swagworld-hoodie.png'
assert image_path.exists(), 'Missing supplied Swag World texture'
photo=bpy.data.images.load(str(image_path),check_existing=True);photo.pack()
cloth=material('Drif_SwagWorld_Photo',(.015,.04,.5),.87)
bs=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
texture=next((n for n in cloth.node_tree.nodes if n.type=='TEX_IMAGE'),None) or cloth.node_tree.nodes.new('ShaderNodeTexImage');texture.image=photo
cloth.node_tree.links.new(texture.outputs['Color'],bs.inputs['Base Color'])
p,body,sleeves=dm_shirt_base('swagworld',sg_blue,sg_blue)
# Apply the torso photo only to front faces, with a dedicated photographic UV map.
body.data.materials.append(cloth);uv=body.data.uv_layers.new(name='SwagWorldUV')
for poly in body.data.polygons:
 c=sum((body.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 if c.y<-.075:
  poly.material_index=1
  for li in poly.loop_indices:
   co=body.data.vertices[body.data.loops[li].vertex_index].co
   py=835-(co.z-.75)/.81*510;half=155+(835-py)/510*100;px=720+co.x/.41*half
   uv.data[li].uv=(px/1443,1-py/877)
for index,sleeve in enumerate(sleeves):
 sleeve.data.materials.append(cloth);uv=sleeve.data.uv_layers.new(name='SwagWorldUV')
 for poly in sleeve.data.polygons:
  c=sum((sleeve.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
  if c.y<-.07:
   poly.material_index=1
   for li in poly.loop_indices:
    co=sleeve.data.vertices[sleeve.data.loops[li].vertex_index].co;t=max(0,min(1,(abs(co.x)-.33)/.79))
    px=480-t*455 if index==0 else 970+t*455
    top=317+125*t*t;bottom=554-45*t*t;py=bottom-(co.z-1.27)/.39*(bottom-top)
    uv.data[li].uv=(px/1443,1-py/877)
# Sculpted hood, drawstrings, pocket seams and ribbing give the printed fabric volume.
ell(p+'_hood',(0,.18,1.52),(.29,.21,.19),sg_blue,'Chest',n=22,m=14)
for s in [-1,1]:
 line(p+'_string',[(s*.11,-.19,1.53),(s*.13,-.28,1.35)],.009,sg_blue,'Chest',5)
 line(p+'_pocket',[(s*.23,-.269,.95),(s*.17,-.285,1.07),(0,-.29,1.08)],.005,navy,torso_weights,5)
for j in range(15):
 x=(j-7)*.047;line(p+'_hemstitch',[(x,-.248,.765),(x,-.26,.80)],.0035,sg_blue,'Pelvis',4)

# Hayabusa-style full head: layered silver falcon helmet over a navy ninja hood.
p='Drif_Head_hayabusa'
ell(p+'_hood',(0,.03,2.20),(.56,.45,.57),navy,n=28,m=18)
for s in [-1,1]:
 line(p+'_wrap',[(s*.1,.43,2.53),(s*.49,.20,2.51),(s*.55,-.10,2.30),(s*.46,-.30,2.10)],.045,dm_steel,'Head',8)
# Narrow shadowed eye aperture and recessed metallic eye shapes.
ell(p+'_slit',(0,-.444,2.23),(.43,.055,.11),sg_ink,n=24,m=10)
for s in [-1,1]:
 plaque(p+'_eye',[(s*.07,2.24),(s*.36,2.29),(s*.29,2.19),(s*.11,2.19)],-.508,.01,sg_engraving)
# Faceted crest shell, forehead plate, cheek guards, and lower face armor.
def sg_armor(name,outline,y,depth=.04):
 if name!='brow':return plaque(p+'_'+name,outline,y,depth,sg_silver)
 # A domed brow reflects across its sculpted curvature instead of a flat plate.
 cx,cz=0,2.58;n=len(outline);verts=[(cx,y-.17,cz)]
 for ring in range(1,7):
  r=ring/6
  for x,z in outline:verts.append((cx+(x-cx)*r,y-.17*(1-r*r),cz+(z-cz)*r))
 faces=[(0,1+j,1+(j+1)%n) for j in range(n)]
 for ring in range(5):
  for j in range(n):a=1+ring*n+j;b=1+ring*n+(j+1)%n;faces.append((a,b,b+n,a+n))
 back=len(verts);verts.extend((x,y+depth,z) for x,z in outline)
 for j in range(n):faces.append((1+5*n+j,1+5*n+(j+1)%n,back+(j+1)%n,back+j))
 faces.append(tuple(range(back,back+n)))
 return mesh(p+'_'+name,verts,faces,sg_silver,'Head')
sg_armor('brow',[(-.50,2.40),(-.46,2.65),(-.26,2.82),(0,2.91),(.26,2.82),(.46,2.65),(.50,2.40),(0,2.28)],-.48,.11)
sg_armor('face',[(-.37,2.12),(-.27,1.88),(0,1.79),(.27,1.88),(.37,2.12),(.20,2.18),(0,2.13),(-.20,2.18)],-.52,.08)
# Raised center ridge provides the beaked, three-dimensional nose profile.
mesh(p+'_beak',[(-.22,-.54,2.17),(.22,-.54,2.17),(0,-.69,2.04),(0,-.56,1.82)],[(0,1,2),(0,2,3),(2,1,3)],sg_silver,'Head',False)
sg_armor('crest',[(-.22,2.75),(-.11,3.14),(.025,3.06),(.20,2.78),(.07,2.60)],-.40,.15)
for s in [-1,1]:
 sg_armor('temple',[(s*.36,2.41),(s*.70,2.49),(s*.95,2.69),(s*.73,2.65),(s*.47,2.71),(s*.33,2.60)],-.30,.09)
 sg_armor('cheek',[(s*.39,2.18),(s*.53,2.27),(s*.55,1.99),(s*.37,1.87),(s*.30,1.96)],-.40,.06)
 line(p+'_browtrim',[(0,-.602,2.30),(s*.25,-.602,2.36),(s*.48,-.52,2.42)],.018,sg_silver,'Head',7)
 line(p+'_cheektrim',[(s*.38,-.50,2.17),(s*.29,-.57,1.90)],.014,sg_engraving,'Head',6)
 # Engraved feather/leaf lines on the silver brow plate and temple blades.
 for j in range(4):
  x=s*(.13+j*.065);z=2.47+j*.055
  line(p+'_etch',[(x,-.595,z),(x+s*.07,-.595,z+.035),(x+s*.035,-.595,z+.10)],.0045,sg_engraving,'Head',5)
 line(p+'_falcon',[(s*.05,-.598,2.63),(s*.12,-.598,2.74),(s*.25,-.598,2.72),(s*.17,-.598,2.62),(s*.11,-.598,2.54)],.006,sg_engraving,'Head',5)
 for j in range(3):line(p+'_templeetch',[(s*(.50+j*.10),-.405,2.51+j*.04),(s*(.58+j*.10),-.405,2.59+j*.03)],.006,sg_engraving,'Head',5)
# Raised scrollwork and recessed seams follow the curved brow surface.
for s in [-1,1]:
 for k in range(2):
  points=[]
  for j in range(29):
   t=j/28;a=t*math.tau*1.2;r=.09*(1-t*.75)
   points.append((s*(.20+k*.10+r*math.cos(a)),-.59,2.57+k*.08+r*math.sin(a)))
  line(p+'_scroll',points,.007,sg_silver,'Head',6)
brow=bpy.data.objects[p+'_brow']
bvh=BVHTree.FromPolygons([v.co[:] for v in brow.data.vertices],[tuple(face.vertices) for face in brow.data.polygons])
for obj in list(collection.objects):
 if obj.name.startswith(p) and any(token in obj.name for token in ['_etch','_falcon','_scroll','_browtrim']):
  for v in obj.data.vertices:
   hit,normal,index,distance=bvh.ray_cast(Vector((v.co.x,-2,v.co.z)),Vector((0,1,0)),4)
   if hit:v.co.y=hit.y-.006
line(p+'_chin',[(-.23,-.47,1.85),(0,-.55,1.76),(.23,-.47,1.85)],.035,navy,'Head',8)
print('SIGNATURE_VARIANTS_READY', {k:len(v) for k,v in SIGNATURE_VARIANTS.items()})
