"""Seven source-studied hats and ten hand/forearm props, in original bind space.
Closed beveled shells, sculpted folds, machined recesses and real thickness.
The first four Afella sources and both LSW hoods were visually inspected.
"""
STAGECRAFT_VARIANTS={'Shirt':['hardcoretechno','seedoilfree','ainsliejersey'],'Hat':['lavendercowl','cablesnood','officerpeak','kettlevisor','parchmentwitch','burgerstack','storybookbow'],
 'Accessory':['arcadegauntlet','wristcassette','gemcuffs','punchmitts','aegisbracer','potionstaff','foldingfan','stagemic','instantcam','handlantern']}
STAGECRAFT_SOURCES={'lavendercowl':'Little Swag World #1685, wrapped lavender cloth hood',
 'cablesnood':'Little Swag World #2382, chunky ivory cable knit hood',
 'officerpeak':'Afella 2 #0, black leather peaked cap', 'kettlevisor':'Afella 2 #93 and #348, silver visor/helmet',
 'parchmentwitch':'Afella 2 #285, wide red-lined parchment witch hat',
 'burgerstack':'Afella 2 #224, stacked burger headwear','storybookbow':'Afella 2 #328, red hair bow and blue/ivory palette'}
st_blackleather=material('Drif_Stage_BlackLeather',(.016,.018,.024),.38)
st_lilac=material('Drif_Stage_Lavender',(.46,.32,.55),.91)
st_cream=material('Drif_Stage_Knit',(.79,.72,.60),.95)
st_glass=material('Drif_Stage_Potion',(.02,.42,.28),.16,.24)
st_light=sp_glow('StageLantern',(1,.62,.15),1.5)

def st_cuff(p,side,bone,mat,start=.87,end=1.12,radius=.205):
 # Hollow articulated cuff around the arm's X axis; original sleeves fit inside.
 verts=[];n=40;profile=[(start,radius-.025),(start+.018,radius),(end-.018,radius),(end,radius-.025),(end,radius-.06),(start,radius-.06)]
 for x,r in profile:
  for j in range(n):
   a=j*math.tau/n;verts.append((side*x,r*math.cos(a),1.465+r*math.sin(a)))
 return mesh(p,verts,[(i*n+j,i*n+(j+1)%n,((i+1)%len(profile))*n+(j+1)%n,((i+1)%len(profile))*n+j) for i in range(len(profile)) for j in range(n)],mat,bone)

def st_dome(p,mat,rx=.65,ry=.57,z=2.78,height=.36,fold=0):
 verts=[];n=64;m=20
 for i in range(m+1):
  t=i/m*math.pi/2
  for j in range(n):
   a=j*math.tau/n;r=math.cos(t);wrinkle=fold*math.sin(a*9+t*12)*math.sin(t*2)
   verts.append(((rx+wrinkle)*r*math.cos(a),.02+(ry+wrinkle)*r*math.sin(a),z+height*math.sin(t)))
 ob=mesh(p+'_crown',verts,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(m) for j in range(n)],mat,'Head')
 mod=ob.modifiers.new('Crown fabric thickness','SOLIDIFY');mod.thickness=.035;sc_apply(ob,mod)
 return ob

def st_bill(p,mat,z=2.78,width=.65,depth=.30):
 verts=[];n=40
 for t in [0,.35,.7,1]:
  for j in range(n):
   a=math.pi+j/(n-1)*math.pi;x=width*math.cos(a);y=.02+.56*math.sin(a)
   verts.append((x*(1+.10*t),y-depth*t*abs(math.sin(a)),z-.07*t+.035*(x/width)**2))
 ob=mesh(p+'_bill',verts,[(i*n+j,i*n+j+1,(i+1)*n+j+1,(i+1)*n+j) for i in range(3) for j in range(n-1)],mat,'Head')
 mod=ob.modifiers.new('Layered bill','SOLIDIFY');mod.thickness=.045;sc_apply(ob,mod)
 return ob

def st_hood(p,mat,cable=False):
 # A continuous lined shell follows the round skull, with an open face and
 # side ports for the original fins. The lower back gathers above the collar.
 n=96;rows=32;verts=[];faces=[]
 for i in range(rows+1):
  f=i/rows
  for j in range(n):
   a=j*math.tau/n;opening=.98+.025*math.sin(a)
   t=opening+(math.pi-opening)*f
   wave=.010*math.cos(a*11+t*15)*math.sin(t)**2
   if cable:wave+=.014*math.cos(a*34+1.4*math.sin(t*25))*math.sin(t)**2
   # The rolled face opening is part of the fabric surface.
   roll=.023*math.exp(-((f-.018)/.026)**2)
   x=(.670+wave+roll)*math.sin(t)*math.cos(a)
   y=.085-(.635+wave+roll)*math.cos(t)
   z=2.10+(.710+wave+roll)*math.sin(t)*math.sin(a)
   if z<1.80:z=1.80+(z-1.80)*.45
   verts.append((x,y,z))
 for i in range(rows):
  for j in range(n):
   ids=(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j)
   x,y,z=[sum(verts[k][axis] for k in ids)/4 for axis in range(3)]
   if abs(x)>.49 and -.04<y<.16 and 2.00<z<2.62:continue
   faces.append(ids)
 o=mesh(p+'_fittedhood',verts,faces,mat,'Head')
 mod=o.modifiers.new('Lined hood and rolled openings','SOLIDIFY');mod.thickness=.030;sc_apply(o,mod)
 return o

for style in STAGECRAFT_VARIANTS['Hat']:
 p='Drif_Hat_'+style
 if style in ['lavendercowl','cablesnood']:
  st_hood(p,st_lilac if style=='lavendercowl' else st_cream,style=='cablesnood')
 elif style=='officerpeak':
  st_dome(p,st_blackleather,.68,.59,2.79,.29,.015);st_bill(p,sw_ink)
  sw_loft(p+'_band',[(2.76,.63,.56,0,.02),(2.82,.65,.58,0,.02),(2.87,.65,.57,0,.02)],sw_ink,'Head',48,0,0,.03)
  sc_profile(p+'_badge',[(-.10,2.91),(0,3.04),(.10,2.91),(.065,2.83),(-.065,2.83)],-.58,.04,sw_gold,'Head',.012)
  for side in [-1,1]:sc_lathe(p+'_rivet',(side*.48,-.41,2.82),[(0,.025),(-.015,.028)],sw_gold,'Head',20,'y')
 elif style=='kettlevisor':
  st_dome(p,sw_silver,.66,.59,2.78,.36);st_bill(p,sw_silver,2.78,.66,.18)
  sc_box(p+'_visorbar',(0,-.62,2.78),(1.02,.10,.12),sw_ink,'Head',.035)
  for side in [-1,1]:
   sc_lathe(p+'_pivot',(side*.56,-.43,2.78),[(0,.10),(-.025,.11),(-.06,.073)],sw_silver,'Head',32,'y')
   sc_profile(p+'_cheekguard',[(side*.53,2.84),(side*.70,2.80),(side*.68,2.52),(side*.56,2.56)],-.28,.085,sw_silver,'Head',.025)
  sc_box(p+'_foreheadplate',(0,-.55,2.98),(.21,.09,.22),sw_chrome,'Head',.025)
 elif style=='parchmentwitch':
  # Uneven brim and bent asymmetrical tip, with a contrasting inner underside.
  sw_loft(p+'_brim',[(2.75,.82,.72,0,.01),(2.78,.85,.74,0,.01),(2.81,.61,.53,0,.01)],sw_wine,'Head',64,8,.018,.025)
  sw_loft(p+'_cone',[(2.80,.52,.46,0,.02),(2.96,.46,.40,.02,.03),(3.17,.34,.30,.05,.04),(3.38,.20,.18,.10,.03),(3.49,.10,.10,.19,.02),(3.42,.008,.008,.36,0)],sw_tan,'Head',56,7,.013,.025)
  sw_loft(p+'_sash',[(2.83,.52,.47,0,.02),(2.95,.48,.42,.02,.03)],sw_red,'Head',48,0,0,.03)
  sc_box(p+'_buckle',(0,-.48,2.89),(.15,.055,.12),sw_gold,'Head',.012)
  sc_box(p+'_bucklewell',(0,-.512,2.89),(.09,.01,.065),sw_wine,'Head',.007)
 elif style=='burgerstack':
  for z,r,h,mat in [(2.80,.62,.09,sw_tan),(2.87,.64,.045,sw_lime),(2.94,.60,.075,sw_wood),(3.015,.65,.045,sw_orange),(3.07,.61,.04,sw_red)]:
   sw_loft(p+'_layer',[(z,r*.96,r*.82,0,.02),(z+h*.5,r,r*.86,0,.02),(z+h,r*.97,r*.82,0,.02)],mat,'Head',48,7,.012,.025)
  st_dome(p,sw_tan,.64,.55,3.10,.23,.006)
  for j in range(24):
   a=j*2.4;r=.51*math.sqrt((j+.5)/24);x=r*math.cos(a);y=.02+r*.84*math.sin(a);z=3.10+.23*math.sqrt(max(0,1-(r/.64)**2))
   o=ell(p+'_sesame',(x,y,z+.008),(.026,.011,.009),st_cream,'Head',n=10,m=6);sc_transform([o],(x,y,z),(0,0,a))
 else:
  # The band arches over the forehead and crown, rather than floating as
  # a horizontal ring. Its depth follows the head's ellipsoidal cross section.
  verts=[];n=64
  for y in [-.25,-.18,-.10]:
   f=math.sqrt(1-((y-.085)/.635)**2)
   for j in range(n+1):
    a=-1.36+j/n*2.72
    verts.append((.655*f*math.sin(a),y,2.10+.685*f*math.cos(a)))
  o=mesh(p+'_headband',verts,[(i*(n+1)+j,i*(n+1)+j+1,(i+1)*(n+1)+j+1,(i+1)*(n+1)+j) for i in range(2) for j in range(n)],sw_blue,'Head')
  mod=o.modifiers.new('Padded headband','SOLIDIFY');mod.thickness=.030;sc_apply(o,mod)
  for side in [-1,1]:
   sc_profile(p+'_bow',[(side*.025,2.84),(side*.14,3.045),(side*.34,3.00),(side*.31,2.79),(side*.10,2.77)],-.17,.14,sw_red,'Head',.032)
   sc_profile(p+'_fold',[(side*.07,2.86),(side*.28,2.96),(side*.25,2.83)],-.25,.018,sw_wine,'Head',.007)
   sc_profile(p+'_tail',[(side*.05,2.83),(side*.14,2.79),(side*.22,2.65),(side*.12,2.67),(side*.075,2.62)],-.10,.05,sw_red,'Head',.012)
  ell(p+'_knot',(0,-.19,2.84),(.09,.10,.09),sw_red,'Head',n=24,m=16)

# Lower the actual seating planes into the curved crown and reduce overhang.
# Values are applied to freshly authored geometry, never cumulatively.
STAGECRAFT_HAT_FITS={
 'officerpeak':(.82,.85,1.10,2.78,2.60),
 'kettlevisor':(.86,.88,.95,2.78,2.50),
 'parchmentwitch':(.84,.86,.90,2.78,2.61),
 'burgerstack':(.80,.90,.85,2.80,2.59),
}
for style,(sx,sy,sz,pivot,seat) in STAGECRAFT_HAT_FITS.items():
 for o in collection.objects:
  if o.type=='MESH' and o.name.startswith('Drif_Hat_'+style+'_'):
   for v in o.data.vertices:
    v.co.x*=sx;v.co.y=.065+(v.co.y-.02)*sy;v.co.z=seat+(v.co.z-pivot)*sz
    if style=='parchmentwitch' and '_brim' in o.name:
     # The fin ports scallop only the outside of the brim. Keep the inner
     # opening broad enough for the skull; the cone covers the upper crown.
     edge=max(0,min(1,(abs(v.co.x)-.48)/.20))
     v.co.x*=1-.28*edge*math.exp(-((v.co.y-.065)/.19)**2)

for style in STAGECRAFT_VARIANTS['Accessory']:
 p='Drif_Accessory_'+style
 if style in ['arcadegauntlet','wristcassette']:
  st_cuff(p+'_strap',-1,'Forearm.R',sw_ink,.87,1.12,.21)
  sc_box(p+'_device',(-.99,-.20,1.49),(.29,.13,.27),sw_violet if style=='arcadegauntlet' else sw_silver,'Forearm.R',.035)
  sc_box(p+'_recess',(-.99,-.275,1.53),(.23,.025,.13),sw_ink,'Forearm.R',.012)
  if style=='arcadegauntlet':
   sc_box(p+'_screen',(-.99,-.292,1.54),(.185,.008,.09),sw_cyan,'Forearm.R',.005)
   sc_box(p+'_dpad',(-1.06,-.28,1.42),(.075,.025,.026),sw_ivory,'Forearm.R',.005);sc_box(p+'_dpad',(-1.06,-.28,1.42),(.026,.025,.075),sw_ivory,'Forearm.R',.005)
   for x in [-.95,-.90]:ell(p+'_button',(x,-.285,1.42),(.017,.015,.017),sw_red,'Forearm.R',n=12,m=8)
  else:
   for x in [-1.05,-.93]:sc_lathe(p+'_reel',(x,-.296,1.53),[(0,.039),(-.012,.04),(-.017,.013)],sw_ivory,'Forearm.R',24,'y')
   for x in [-1.07,-1.01,-.95,-.89]:sc_box(p+'_key',(x,-.28,1.40),(.035,.024,.026),sw_ink,'Forearm.R',.004)
 elif style=='gemcuffs':
  for side,label in [(-1,'R'),(1,'L')]:
   bone='Forearm.'+label;st_cuff(p+'_gold',side,bone,sw_gold,.89,1.10,.21)
   for j in range(8):
    a=j*math.tau/8;y=.218*math.cos(a);z=1.465+.218*math.sin(a)
    ell(p+'_mount',(side*.99,y,z),(.06,.047,.047),sw_gold,bone,n=12,m=8)
    o=ell(p+'_gem',(side*.99,y*1.08,1.465+(z-1.465)*1.08),(.043,.041,.041),[sw_cyan,sw_wine,sw_violet][j%3],bone,n=8,m=4)
    for face in o.data.polygons:face.use_smooth=False
 elif style=='punchmitts':
  for side,label in [(-1,'R'),(1,'L')]:
   bone='Hand.'+label;st_cuff(p+'_cuff',side,bone,sw_ivory,1.09,1.22,.19)
   ell(p+'_glove',(side*1.34,0,1.47),(.23,.22,.22),sw_red,bone,n=32,m=20)
   ell(p+'_thumb',(side*1.23,-.18,1.38),(.11,.12,.13),sw_wine,bone,n=24,m=14)
   sc_box(p+'_label',(side*1.15,-.188,1.47),(.09,.02,.075),sw_ink,bone,.009)
 elif style=='aegisbracer':
  st_cuff(p+'_strap',1,'Forearm.L',sw_leather,.85,1.13,.21)
  sc_profile(p+'_shield',[(.77,1.73),(1.19,1.73),(1.25,1.50),(.99,1.16),(.73,1.50)],-.26,.11,sw_gold,'Forearm.L',.035)
  sc_profile(p+'_inlay',[(.81,1.68),(1.15,1.68),(1.18,1.49),(.99,1.24),(.80,1.49)],-.327,.025,sw_blue,'Forearm.L',.025)
  ell(p+'_boss',(.99,-.37,1.50),(.09,.065,.09),sw_chrome,'Forearm.L',n=24,m=16)
 else:
  # Hand-held models share a grip center at the mitten and are rigid to Hand.R.
  x,y,z=-1.30,-.08,1.465;bone='Hand.R'
  if style in ['potionstaff','stagemic','handlantern']:
   sc_lathe(p+'_grip',(x,y,z),[(-.19,.045),(.15,.045),(.18,.052)],sw_leather,bone,28)
  if style=='potionstaff':
   sc_lathe(p+'_stem',(x,y,z),[(.12,.035),(.62,.035),(.65,.08)],sw_gold,bone,28)
   ell(p+'_vessel',(x,y,z+.76),(.16,.13,.18),st_glass,bone,n=32,m=22)
   for side in [-1,1]:sc_profile(p+'_claw',[(x+side*.07,z+.57),(x+side*.19,z+.70),(x+side*.17,z+.88),(x+side*.12,z+.72)],y,.08,sw_gold,bone,.015)
   sc_lathe(p+'_stopper',(x,y,z+.90),[(0,.06),(.05,.065),(.085,.025)],sw_gold,bone,24)
  elif style=='stagemic':
   sc_lathe(p+'_handle',(x,y,z),[(.05,.052),(.37,.065),(.40,.075)],sw_ink,bone,32)
   o=ell(p+'_grille',(x,y,z+.46),(.12,.10,.15),sw_silver,bone,n=40,m=24)
   # Recessed perforations formed in the grille vertices.
   for v in o.data.vertices:
    q=v.co-Vector((x,y,z+.46));f=1-.045*(.5+.5*math.cos(math.atan2(q.y,q.x)*20))*math.sin((q.z/.15)*math.pi*9)**2;v.co=Vector((x,y,z+.46))+q*f
   sc_box(p+'_switch',(x,y-.066,z+.24),(.037,.014,.07),sw_red,bone,.005)
  elif style=='handlantern':
   sc_ring(p+'_handle',(x,y,z+.16),.17,.19,.027,sw_gold,bone,n=40)
   sc_lathe(p+'_base',(x,y,z-.23),[(-.06,.16),(0,.18),(.035,.13)],sw_ink,bone,32)
   ell(p+'_light',(x,y,z-.05),(.10,.09,.16),st_light,bone,n=24,m=16)
   for dx,dy in [(-.12,-.08),(.12,-.08),(-.12,.08),(.12,.08)]:sc_box(p+'_post',(x+dx,y+dy,z-.05),(.025,.025,.34),sw_gold,bone,.004)
   sc_lathe(p+'_roof',(x,y,z+.12),[(0,.18),(.035,.17),(.11,.07),(.13,.04)],sw_ink,bone,32)
  elif style=='foldingfan':
   n=14;verts=[]
   for r in [.07,.42,.48]:
    for j in range(n+1):
     a=.10+math.pi*.94*j/n;verts.append((x+r*math.cos(a),y-.14+(.028 if j%2 else -.028),z+r*math.sin(a)))
   o=mesh(p+'_pleatedleaf',verts,[(i*(n+1)+j,i*(n+1)+j+1,(i+1)*(n+1)+j+1,(i+1)*(n+1)+j) for i in range(2) for j in range(n)],sw_red,bone,False)
   mod=o.modifiers.new('Folded fan thickness','SOLIDIFY');mod.thickness=.016;sc_apply(o,mod)
   for j in range(0,n+1,2):
    a=.1+math.pi*.94*j/n;sc_profile(p+'_rib',[(x-.008,z),(x+.008,z),(x+.47*math.cos(a)+.009,z+.47*math.sin(a)),(x+.47*math.cos(a)-.009,z+.47*math.sin(a))],y-.105,.022,sw_gold,bone,.003)
   sc_lathe(p+'_pivot',(x,y-.16,z),[(0,.035),(-.025,.038)],sw_gold,bone,24,'y')
  else:
   sc_box(p+'_body',(x,y-.16,z+.11),(.41,.19,.32),st_cream,bone,.045)
   sc_box(p+'_grip',(x-.16,y-.27,z+.09),(.075,.05,.22),sw_ink,bone,.02)
   sc_lathe(p+'_lens',(x+.015,y-.27,z+.11),[(0,.105),(-.055,.11),(-.08,.08)],sw_ink,bone,40,'y')
   sc_lathe(p+'_glass',(x+.015,y-.355,z+.11),[(0,.065),(-.006,.065)],sw_cyan,bone,32,'y')
   sc_box(p+'_flash',(x+.115,y-.262,z+.23),(.10,.015,.045),sw_ivory,bone,.008)
   sc_box(p+'_slot',(x,y-.265,z-.02),(.24,.012,.02),sw_ink,bone,.004)
   sc_box(p+'_print',(x,y-.20,z-.12),(.21,.015,.17),sw_ivory,bone,.008)
   sc_box(p+'_picture',(x,y-.211,z-.10),(.17,.005,.10),sw_violet,bone,.003)


STAGECRAFT_SHIRTS={
 'hardcoretechno':('hardcore-techno-reference.jpg',(.69,.66,.58),(395,835,855,1279),False),
 'seedoilfree':('seed-oil-free-reference.jpg',(.008,.009,.011),(420,880,860,1090),True),
 'ainsliejersey':('ainslie-football-reference.jpg',(.72,.74,.69),(445,860,806,1240),True),
}
for style,(filename,color,crop,short) in STAGECRAFT_SHIRTS.items():
 p='Drif_Shirt_'+style;cloth=material('Drif_Stage_Cloth_'+style,color,.88)
 printmat=material('Drif_Stage_Print_'+style,(1,1,1),.88)
 photo=bpy.data.images.load(str(OUT/'textures'/filename),check_existing=True);photo.pack()
 tex=printmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=photo;tex.interpolation='Linear'
 bs=next(n for n in printmat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 printmat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 profile=[(.75,.405,.265,0,0),(.80,.428,.282,0,0),(.94,.438,.288,0,0),(1.08,.430,.286,0,0),(1.24,.418,.273,0,0),(1.40,.393,.248,0,0),(1.50,.335,.21,0,0),(1.58,.225,.17,0,0)]
 sw_profiles[p]=profile
 body=sw_loft(p+'_fabric',profile,cloth,torso_weights,64,9,.009,.025)
 body.data.materials.append(printmat);uv=body.data.uv_layers.new(name='Photo garment artwork')
 # UVs select only the photographed fabric/artwork. The source JPEG stays
 # unchanged and packed; head/background/arms never enter the garment UV region.
 left,top,right,bottom=crop;w,h=photo.size
 for poly in body.data.polygons:
  center=poly.center
  # Outer front semicircle, excluding the inner cloth wall and rolled edges.
  if poly.index<(len(profile)-1)*64 and center.y<-.12:
   poly.material_index=1
  for li in poly.loop_indices:
   v=body.data.vertices[body.data.loops[li].vertex_index].co
   u=max(0,min(1,(v.x+.40)/.80));t=max(0,min(1,(v.z-.80)/(.59 if style=='ainsliejersey' else .69)))
   uv.data[li].uv=((left+u*(right-left))/w,1-(bottom-t*(bottom-top))/h)
 for side,label in [(-1,'R'),(1,'L')]:
  if not short:sw_arm(p,side,label,cloth,True,cloth)
  else:
   verts=[];n=40;sections=[(.32,.148),(.40,.188),(.49,.202),(.57,.204),(.65,.198),(.70,.20),(.73,.183)]
   for i,(x,r) in enumerate(sections):
    for j in range(n):
     a=j*math.tau/n;fold=.008*math.cos(a*7+x*22)*math.sin(math.pi*i/(len(sections)-1))
     verts.append((side*x,(r+fold)*math.cos(a),1.465+(r+fold)*math.sin(a)))
   o=mesh(p+'_shortsleeve',verts,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sections)-1) for j in range(n)],cloth,lambda co,label=label:dm_arm_weights(co,label))
   mod=o.modifiers.new('Folded sleeve edge','SOLIDIFY');mod.thickness=.025;sc_apply(o,mod)
   st_cuff(p+'_sleevehem',side,'UpperArm.'+label,sw_ink if style=='ainsliejersey' else cloth,.685,.73,.204)
   sw_sweep(p+'_bareforearm',[(side*.68,0,1.465,.14),(side*.82,0,1.465,.142),(side*1.13,0,1.465,.13)],blue,lambda co,label=label:dm_arm_weights(co,label),24)
 sw_loft(p+'_hem',[(.75,.414,.273,0,0),(.78,.436,.294,0,0),(.805,.436,.294,0,0)],cloth,torso_weights,64,0,0,.03)
 collar=sw_ink if style=='ainsliejersey' else cloth
 sw_loft(p+'_neckband',[(1.52,.27,.19,0,0),(1.565,.245,.182,0,0),(1.595,.225,.172,0,0)],collar,'Chest',48,0,0,.03)
 if style=='ainsliejersey':
  for side in [-1,1]:
   sw_solid(p+'_foldedcollar',[(side*.10,-.19,1.59),(side*.27,-.18,1.53),(side*.20,-.26,1.38),(side*.045,-.24,1.49)],.045,sw_ink,'Chest',.009)
