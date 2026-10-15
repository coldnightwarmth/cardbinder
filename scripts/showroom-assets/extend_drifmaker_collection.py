"""Sculpted adaptations of the user's Drifella 2 source layers and hood reference.

All geometry uses the existing bind space and Head/torso/arm weights. Source
art is reference material only; the exported meshes do not embed those layers.
"""
COLLECTION_VARIANTS={
 'Eyes':['gengar','ghastly','cartoon','scarlet','pixelcry','money'],
 'Mouth':['gengarsmile','catopen','grimer','grit','ghastlysmile','rainbowtongue'],
 'Hat':['ponchohood','aliencap'],'Shirt':['militaryvest'],
}
COLLECTION_REFERENCES={
 'eyes':{'gengar':'9eyes/gengar$7.PNG','ghastly':'9eyes/ghaslty.PNG','cartoon':'9eyes/cartoon.PNG','scarlet':'9eyes/scarlet eyes$7.PNG','pixelcry':'9eyes/pixel cry.PNG','money':'9eyes/moneys$8.PNG'},
 'mouth':{'gengarsmile':'7mouth/gengar smile$1.PNG','catopen':'7mouth/cat open.PNG','grimer':'7mouth/grimer.PNG','grit':'7mouth/grit.PNG','ghastlysmile':'7mouth/ghastly smile$1.PNG','rainbowtongue':'7mouth/rainbow.PNG'},
 'hat':{'aliencap':'91head/alien hat.PNG','ponchohood':'User-supplied red-and-black poncho hood reference'},
 'shirt':{'militaryvest':'5cloth/tek vest hoodie.PNG'},
}
co_black=material('Drif_Collection_Ink',(.006,.009,.013),.42)
co_white=material('Drif_Collection_Ivory',(.95,.94,.85),.55)
co_red=material('Drif_Collection_Scarlet',(.85,.018,.006),.27)
co_lilac=material('Drif_Collection_Lilac',(.31,.15,.37),.67)
co_pink=material('Drif_Collection_Pink',(.96,.055,.17),.51)
co_yellow=material('Drif_Collection_Teeth',(.82,.60,.23),.72)
co_olive=material('Drif_Collection_Carrier',(.20,.23,.15),.91)
co_webbing=material('Drif_Collection_Webbing',(.12,.145,.085),.96)
co_lime=material('Drif_Collection_Alien',(.55,.77,.055),.55)
co_limeedge=material('Drif_Collection_Alien_Edge',(.30,.48,.025),.72)
co_green=material('Drif_Collection_Alien_Mouth',(.10,.42,.075),.61)

def co_eye(prefix,side,outline,mat,y=-.532,depth=.014):
    # Rounded center on a shaped silhouette: no standard black eye orb beneath.
    cx=side*.302
    border=[(cx+side*u,y+.025*(abs(u)/.20)**2,2.19+v) for u,v in outline]
    mid=tuple(sum(p[i] for p in border)/len(border) for i in range(3))
    mid=(mid[0],y-depth,mid[2]);n=len(border)
    return mesh(prefix,border+[mid],[(i,(i+1)%n,n) for i in range(n)],mat,'Head')

def co_eye_edge(prefix,side,outline,mat=co_black,y=-.546,r=.011):
    return line(prefix,[(side*(.302+u),y+.025*(abs(u)/.20)**2,2.19+v) for u,v in outline+[outline[0]]],r,mat,'Head',7)

for s in [-1,1]:
 x=s*.302
 # Gengar: pointed red wedges, steep outer corners and narrow black pupils.
 p='Drif_Eyes_gengar'
 contour=[(-.16,-.075),(-.09,-.12),(.02,-.145),(.12,-.07),(.18,.20),(.07,.105),(-.03,.015)]
 co_eye(p+'_red',s,contour,co_red);co_eye_edge(p+'_outline',s,contour)
 ell(p+'_pupil',(x+s*.025,-.558,2.18),(.018,.009,.055),co_black,n=12,m=8)
 ell(p+'_shine',(x+s*.083,-.554,2.24),(.021,.008,.043),dm_yellow,n=10,m=8)
 # Ghastly: hanging pale angular eyes, tiny pupils high under the lids.
 p='Drif_Eyes_ghastly'
 contour=[(-.17,.08),(-.12,-.11),(-.05,-.20),(.045,-.205),(.13,-.14),(.19,-.02),(.185,.22),(.07,.16)]
 co_eye(p+'_white',s,contour,co_white);co_eye_edge(p+'_edge',s,contour)
 ell(p+'_pupil',(x-s*.025,-.558,2.285),(.014,.009,.028),co_black,n=10,m=8)
 # Cartoon: tall white eye, large lower pupil and a pie-cut white glint.
 p='Drif_Eyes_cartoon'
 outline=[(.14*math.cos(j*math.tau/32),.245*math.sin(j*math.tau/32)) for j in range(32)]
 co_eye(p+'_white',s,outline,co_white);co_eye_edge(p+'_edge',s,outline,r=.013)
 pupil=[(-.125,.055),(-.07,.08),(.055,.08),(.12,.04),(.135,-.15),(.09,-.215),(-.06,-.235),(-.12,-.16)]
 co_eye(p+'_pupil',s,pupil,co_black,y=-.556,depth=.004)
 co_eye(p+'_piecut',s,[(-.09,-.075),(-.015,-.13),(-.10,-.18)],co_white,y=-.567,depth=.003)
 # Scarlet: translucent-looking red iris in an ivory eye with a lavender rim.
 p='Drif_Eyes_scarlet'
 ell(p+'_rim',(x,-.433,2.19),(.18,.099,.216),co_lilac,n=24,m=14)
 ell(p+'_white',(x,-.468,2.19),(.159,.088,.191),co_white,n=24,m=14)
 ell(p+'_iris',(x-s*.015,-.548,2.20),(.102,.025,.128),co_red,n=24,m=14)
 ell(p+'_pupil',(x-s*.015,-.57,2.225),(.048,.014,.064),co_black,n=18,m=12)
 ell(p+'_glint',(x-.041,-.583,2.265),(.027,.009,.034),glint,n=12,m=8)
 ell(p+'_glint',(x+.034,-.576,2.15),(.018,.008,.022),glint,n=10,m=8)
 # Pixel cry: checkerboard eyes and staggered violet/blue pixel tears.
 p='Drif_Eyes_pixelcry';palette=[co_black,navy,dm_lilac,dm_sky,cyan,co_pink]
 for row in range(7):
  for col in range(6):
   if (row in [0,6] and col in [0,5]):continue
   color=palette[(row*11+col*7)%len(palette)] if row>2 else palette[(col+row)%2]
   dm_box(p+'_pixel',(x+(col-2.5)*.046,-.527,2.35-row*.046),(.047,.025,.047),color,'Head')
 for j in range(9):
  xx=x+s*(.10+.026*math.sin(j*1.7));zz=2.02-j*.025
  dm_box(p+'_tear',(xx,-.529,zz),(.046-j*.003,.021,.031),palette[2+j%4],'Head')
 # Money: pale metallic eye and raised, double-struck dollar sign.
 p='Drif_Eyes_money'
 outline=[(.143*math.cos(j*math.tau/28),.218*math.sin(j*math.tau/28)) for j in range(28)]
 co_eye(p+'_silver',s,outline,dm_silver);co_eye_edge(p+'_rim',s,outline,dm_steel,r=.007)
 dollar=[(.062,.125),(.015,.151),(-.044,.135),(-.069,.085),(-.046,.036),(.044,-.006),(.067,-.055),(.043,-.115),(-.015,-.139),(-.067,-.114)]
 line(p+'_dollar',[(x+u,-.565,2.19+v) for u,v in dollar],.014,co_black,'Head',8)
 for dx in [-.019,.019]:line(p+'_bar',[(x+dx,-.569,2.02),(x+dx,-.569,2.36)],.008,co_black,'Head',7)

# Lift the long source silhouettes above the projecting muzzle. This keeps
# their lower outline and dollar strokes complete in the portrait camera.
for obj in collection.objects:
 if obj.type=='MESH' and obj.name.startswith(('Drif_Eyes_ghastly_','Drif_Eyes_cartoon_','Drif_Eyes_money_')):
  for v in obj.data.vertices:v.co.z=2.19+(v.co.z-2.19)*.73+.077

# MOUTHS: fitted to the original protruding muzzle rather than flat planes.
p='Drif_Mouth_gengarsmile'
top=[(-.255+i*.51/24,1.865-.049*math.sin(math.pi*i/24)) for i in range(25)]
bottom=[(-.255+i*.51/24,1.865-.151*math.sin(math.pi*i/24)) for i in range(24,-1,-1)]
mouth_panel(p+'_teeth',top+bottom,co_white,.021);mouth_line(p+'_edge',top+bottom+[top[0]],co_black,.009,.028)
for x in [-.18,-.105,-.025,.065,.15,.21]:
 t=(x+.255)/.51;sn=math.sin(math.pi*t)
 mouth_line(p+'_seam',[(x,1.865-.049*sn),(x,1.865-.151*sn)],co_black,.005,.03)
for s in [-1,1]:mouth_line(p+'_corner',[(s*.255,1.862),(s*.269,1.884)],co_black,.008,.027)

p='Drif_Mouth_catopen'
contour=[(.125*math.cos(j*math.tau/32),1.80+.118*math.sin(j*math.tau/32)) for j in range(32)]
mouth_panel(p+'_cavity',contour,mouth_cavity,.018);mouth_line(p+'_lip',contour+[contour[0]],co_black,.012,.024)
mouth_panel(p+'_tongue',[(-.065,1.75),(-.046,1.78),(0,1.79),(.051,1.77),(.061,1.735),(.032,1.695),(-.026,1.692)],mouth_pink,.033)
for s in [-1,1]:mouth_panel(p+'_fang',[(s*.051,1.885),(s*.089,1.867),(s*.072,1.824)],co_white,.035)

p='Drif_Mouth_grimer'
contour=[(-.105,1.909),(-.126,1.865),(-.095,1.82),(-.10,1.747),(-.072,1.698),(-.025,1.706),(.016,1.692),(.077,1.709),(.107,1.754),(.091,1.827),(.12,1.908),(.037,1.896),(-.037,1.917)]
mouth_panel(p+'_dark',contour,dm_burgundy,.02);mouth_line(p+'_purplelip',contour+[contour[0]],co_lilac,.016,.03)
mouth_panel(p+'_tongue',[(-.074,1.75),(-.067,1.80),(-.02,1.84),(.036,1.824),(.071,1.78),(.066,1.725),(.025,1.711),(-.031,1.718)],dm_lilac,.041)

p='Drif_Mouth_grit'
outline=[(-.24,1.77),(-.20,1.86),(-.12,1.895),(.07,1.878),(.18,1.83),(.23,1.77),(.06,1.79),(-.12,1.77)]
mouth_panel(p+'_cavity',outline,mouth_cavity,.02)
for j in range(7):
 x=(j-3)*.052;z=1.85-.025*abs(j-3)/3
 tooth(p+'_tooth',x,z,.049,.057+(j%2)*.014,co_yellow)
mouth_line(p+'_gum',[(-.22,1.83),(-.16,1.88),(-.04,1.889),(.08,1.871),(.19,1.819)],dm_leather,.012,.036)

p='Drif_Mouth_ghastlysmile'
top=[(-.25+i*.5/24,1.875-.035*math.sin(math.pi*i/24)) for i in range(25)]
bottom=[(-.25+i*.5/24,1.875-.17*math.sin(math.pi*i/24)) for i in range(24,-1,-1)]
mouth_panel(p+'_pink',top+bottom,co_pink,.022);mouth_line(p+'_edge',top+bottom+[top[0]],co_black,.009,.029)
for s in [-1,1]:mouth_panel(p+'_fang',[(s*.152,1.85),(s*.199,1.858),(s*.174,1.804)],co_white,.04)

p='Drif_Mouth_rainbowtongue'
mouth_oval(p+'_opening',.17,.045,1.83,mouth_cavity,.021)
path=[(.12,-.673,1.83),(.075,-.704,1.785),(0,-.734,1.758),(-.09,-.753,1.765),(-.18,-.752,1.79),(-.23,-.739,1.84),(-.24,-.731,1.89),(-.22,-.735,1.93),(-.19,-.742,1.936)]
obj=line(p+'_tongue',path,.04,co_red,'Head',12)
colors=[material('Drif_Collection_Rainbow_'+str(i),rgb,.42) for i,rgb in enumerate(rainbow)]
for mat in colors:obj.data.materials.append(mat)
for polygon in obj.data.polygons:
 center=polygon.center;polygon.material_index=1+int((center.x+.28)*41+center.z*37)%len(colors)
# Widen the root into a flattened tongue while retaining its curled tip.
for i,point in enumerate(path):
 for j in range(12):
  v=obj.data.vertices[i*12+j];taper=1 if i<4 else 1-.12*(i-3)
  v.co=Vector(point)+(v.co-Vector(point))*taper
  v.co.y=point[1]+(v.co.y-point[1])*.4
  v.co.z=point[2]+(v.co.z-point[2])*(1.8 if i<3 else 1.0)

# MILITARY VEST: cloth underlayer, fitted carrier plates, straps and MOLLE rows.
p='Drif_Shirt_militaryvest'
rings(p+'_undershirt',[(.75,.365,.23,0,0),(.82,.403,.248,0,0),(1.10,.405,.26,0,0),(1.40,.37,.22,0,0),(1.55,.23,.16,0,0)],charcoal,torso_weights,28)
for s,label in [(-1,'R'),(1,'L')]:dm_sleeve(p,s,label,charcoal,co_webbing)
front=[(-.29,.86),(.29,.86),(.33,1.25),(.25,1.43),(.16,1.47),(-.16,1.47),(-.25,1.43),(-.33,1.25)]
plaque(p+'_carrier',front,-.292,.045,co_olive,torso_weights)
plaque(p+'_backplate',front,.245,.05,co_olive,torso_weights)
plaque(p+'_plate',[(-.23,1.16),(.23,1.16),(.25,1.35),(.17,1.43),(-.17,1.43),(-.25,1.35)],-.314,.025,co_webbing,'Chest')
for s in [-1,1]:
 for y in [-.21,.21]:dm_box(p+'_strap',(s*.20,y,1.47),(.095,.07,.19),co_olive,'Chest')
 line(p+'_shoulderstrap',[(s*.20,-.21,1.47),(s*.20,-.12,1.56),(s*.20,.10,1.56),(s*.20,.22,1.47)],.045,co_webbing,'Chest',8)
 dm_box(p+'_buckle',(s*.20,-.259,1.45),(.082,.025,.065),dm_steel,'Chest')
 for z in [.91,1.04]:dm_box(p+'_sidestrap',(s*.37,0,z),(.06,.46,.065),co_webbing,torso_weights)
for z in [1.17,1.25,1.33]:
 for x in [-.18,-.09,0,.09,.18]:dm_box(p+'_molle',(x,-.339,z),(.073,.015,.035),co_olive,torso_weights)
for x in [-.21,-.07,.07,.21]:
 dm_box(p+'_pouch',(x,-.323,1.005),(.12,.074,.20),co_olive,torso_weights)
 dm_box(p+'_flap',(x,-.367,1.075),(.123,.024,.059),co_webbing,torso_weights)
 ell(p+'_snap',(x,-.382,1.058),(.012,.006,.012),dm_steel,torso_weights,n=8,m=6)
dm_box(p+'_label',(0,-.343,1.39),(.15,.013,.041),co_black,'Chest')
for s in [-1,1]:dm_box(p+'_labelstitch',(s*.062,-.352,1.39),(.005,.006,.03),dm_tan,'Chest')

# ALIEN CAP: three raised eyes, little side ears and a short antenna.
p='Drif_Hat_aliencap'
rings(p+'_crown',[(2.65,.445,.40,0,.02),(2.78,.44,.39,0,.03),(2.90,.33,.30,0,.04),(2.96,.15,.15,0,.045),(2.975,.018,.018,0,.045)],co_lime,'Head',36)
ell(p+'_brim',(0,-.385,2.65),(.47,.31,.031),co_lime,n=32,m=10)
line(p+'_brimedge',[(.47*math.cos(j*math.pi/24),-.385-.31*math.sin(j*math.pi/24),2.646) for j in range(25)],.01,co_limeedge,'Head',7)
for x in [-.23,0,.23]:
 y=-.366+(abs(x)/.23)*.015;z=2.81+(1-abs(x)/.23)*.035
 ell(p+'_eyerim',(x,y,z),(.093,.027,.078),co_limeedge,n=20,m=12)
 ell(p+'_eye',(x,y-.022,z),(.081,.020,.066),co_white,n=20,m=12)
 ell(p+'_pupil',(x,y-.041,z),(.031,.012,.035),co_black,n=16,m=10)
 ell(p+'_shine',(x-.009,y-.052,z+.014),(.009,.005,.009),glint,n=8,m=6)
line(p+'_smile',[(x,-.44+.026*(x/.19)**2,2.697+.027*(x/.19)**2) for x in [-.19+i*.38/24 for i in range(25)]],.007,co_black,'Head',7)
ell(p+'_mouth',(0,-.453,2.708),(.075,.016,.024),co_green,n=20,m=10)
for s in [-1,1]:
 plaque(p+'_ear',[(s*.40,2.73),(s*.50,2.77),(s*.56,2.91),(s*.50,2.94),(s*.42,2.87)],-.02,.07,co_lime)
 line(p+'_earfold',[(s*.46,-.035,2.79),(s*.50,-.035,2.88),(s*.47,-.035,2.86)],.01,co_limeedge,'Head',7)
line(p+'_antenna',[(0,.045,2.96),(.008,.05,3.015),(.015,.05,3.075)],.022,co_lime,'Head',10)
ell(p+'_knob',(.015,.05,3.083),(.038,.038,.038),co_lime,n=16,m=10)

# PONCHO HOOD: an open face, fins passing through the side slits, creature-eye
# embroidery and a short collar flap. The hood itself follows Head, not Chest.
co_hood=material('Drif_Collection_Poncho_Fabric',(.37,.035,.035),.94)
co_hoodred=material('Drif_Collection_Poncho_Red',(.54,.06,.045),.94)
co_hooddark=material('Drif_Collection_Poncho_Dark',(.035,.025,.03),.94)
p='Drif_Hat_ponchohood'
sections=[(.69,.67,-.34),(.735,.72,-.12),(.73,.73,.12),(.60,.63,.37),(.35,.40,.56),(.01,.025,.64)]
verts=[];n=72
for rx,rz,y in sections:
 for j in range(n):
  a=j*math.tau/n;fold=.009*math.cos(14*a)
  verts.append(((rx+fold)*math.cos(a),y,2.24+(rz+fold)*math.sin(a)))
faces=[]
for i in range(len(sections)-1):
 for j in range(n):
  # Leave a side opening around each fin root at head mid-height.
  a=(j+.5)*math.tau/n
  if i in [1,2] and abs(math.sin(a))<.26:continue
  faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
obj=mesh(p+'_shell',verts,faces,co_hood,'Head')
obj.data.materials.append(co_hoodred);obj.data.materials.append(co_hooddark)
for face in obj.data.polygons:face.material_index=2 if face.index%11 in [0,3,6,7] else 1 if face.index%7 in [1,2,5] else 0
# A dense, deterministic fabric fleck pattern is baked to a small packed image.
import random
rng=random.Random(218);im=bpy.data.images.new('Drif_Poncho_Woven_Red',width=128,height=128,alpha=True)
pixels=[]
for iy in range(128):
 for ix in range(128):
  k=rng.random();c=(.045,.025,.032) if k<.40 else (.48,.055,.048) if k<.72 else (.28,.035,.045)
  pixels.extend((*c,1))
im.pixels=pixels;im.pack()
for mat in [co_hood,co_hoodred,co_hooddark]:
 tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
 mat.node_tree.links.new(tex.outputs['Color'],next(node for node in mat.node_tree.nodes if node.type=='BSDF_PRINCIPLED').inputs['Base Color'])
uv=obj.data.uv_layers.new(name='Poncho weave')
for face in obj.data.polygons:
 for li in face.loop_indices:
  v=obj.data.vertices[obj.data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*1.7+v.y*.6,v.z*1.7)
rim=[(.69*math.cos(j*math.tau/n),-.355,2.24+.67*math.sin(j*math.tau/n)) for j in range(n+1)]
line(p+'_facebinding',rim,.027,co_hooddark,'Head',8)
for s in [-1,1]:
 ell(p+'_creatureeye',(s*.32,-.383,2.804),(.105,.033,.075),co_black,n=20,m=12)
 ell(p+'_iris',(s*.32,-.414,2.788),(.073,.013,.044),dm_rose,n=18,m=10)
 ell(p+'_shine',(s*.32-.025,-.432,2.826),(.029,.010,.024),glint,n=12,m=8)
 for dx in [-.026,0,.026]:ell(p+'_eyeembroider',(s*.32+dx,-.433,2.777),(.014,.008,.012),co_white,n=8,m=6)
ell(p+'_foreheadmark',(0,-.358,2.909),(.065,.018,.031),co_white,n=16,m=10)
for s in [-1,1]:
 plaque(p+'_collar',[(0,1.67),(s*.28,1.70),(s*.44,1.54),(s*.11,1.57)],-.26,.04,co_hood,'Head')
 line(p+'_tie',[(s*.08,-.32,1.69),(s*.13,-.35,1.61),(s*.23,-.33,1.63)],.017,co_hoodred,'Head',8)
dm_loop(p+'_zipper',(0,-.35,1.61),(.03,.051),.009,dm_silver,'Head','xz',16)
