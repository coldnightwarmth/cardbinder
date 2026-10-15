"""Mi Note studies: 108 separately skinned sculptures, in the original bind space.
Source cards and labels live in minote-catalog.json. Broad bevels, fitted shells,
sculpted folds and recessed sockets supply detail; no decorative curve strokes.
"""
from mathutils.bvhtree import BVHTree
from mathutils.geometry import tessellate_polygon
MN_CATALOG=json.loads((ROOT/'scripts/showroom-assets/minote-catalog.json').read_text())
MN_VARIANTS={k.title():[r['id'] for r in rows] for k,rows in MN_CATALOG.items() if k in ['head','eyes','brows','mouth','nose','ears','tattoo','shirt','legs','hat','accessory','extra']}
MN_FULLBODY=['mnchoirrobe','mnrainponcho','mnsainttabard','mnpetaldress']
MN_EAR_HEADS=['mnangelmask','mnbellhead','mnjokermask','mnvoxelhead','mnduckhead','mnsharkhead','mnmitrehead','mncakehead']
mn_ink=material('Drif_MiNote_Ink',(.019,.027,.038),.76)
mn_paper=material('Drif_MiNote_Paper',(.86,.82,.69),.96)
mn_white=material('Drif_MiNote_Porcelain',(.94,.94,.86),.3)
mn_blue=material('Drif_MiNote_Indigo',(.10,.21,.36),.76)
mn_sky=material('Drif_MiNote_WaterBlue',(.29,.57,.66),.64)
mn_teal=material('Drif_MiNote_Lagoon',(.11,.39,.41),.45)
mn_red=material('Drif_MiNote_Berry',(.69,.065,.10),.58)
mn_rose=material('Drif_MiNote_Rose',(.77,.32,.39),.7)
mn_gold=material('Drif_MiNote_Brass',(.61,.42,.12),.3,.72)
mn_green=material('Drif_MiNote_Leaf',(.27,.40,.13),.8)
mn_yellow=material('Drif_MiNote_Ochre',(.91,.52,.055),.55)
mn_purple=material('Drif_MiNote_Violet',(.30,.23,.46),.7)
mn_glass=material('Drif_MiNote_Dew',(.32,.72,.79),.13,.25)
mn_palette=[mn_blue,mn_sky,mn_rose,mn_green,mn_paper,mn_red,mn_purple,mn_gold,mn_teal]
mn_head=bpy.data.objects['Drif_Head_original'];mn_bvh=BVHTree.FromPolygons([v.co[:] for v in mn_head.data.vertices],[tuple(f.vertices) for f in mn_head.data.polygons])

def mn_ell(p,c,r,mat,bone='Head',n=24,m=12):return ell(p,c,r,mat,bone,n=n,m=m)
def mn_facepoint(x,z,offset=.005):
 hit,normal,idx,dist=mn_bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
 return (x,(hit.y if hit else -.35)-offset,z)
def mn_badge(p,x,z,size,mat,shape='star',y=-.4,bone='Chest'):
 if shape=='star':pts=[(x+size*(1 if j%2==0 else .44)*math.sin(j*math.pi/5),z+size*(1 if j%2==0 else .44)*math.cos(j*math.pi/5)) for j in range(10)]
 elif shape=='heart':pts=[(x+size*math.sin(a)**3,z+size*(13*math.cos(a)-5*math.cos(2*a)-2*math.cos(3*a)-math.cos(4*a))/16) for a in [j*math.tau/32 for j in range(32)]]
 else:pts=[(x-size*.6,z-size),(x+size*.6,z-size),(x+size*.6,z-size*.2),(x+size,z-size*.2),(x+size,z+size*.2),(x+size*.6,z+size*.2),(x+size*.6,z+size),(x-size*.6,z+size),(x-size*.6,z+size*.2),(x-size,z+size*.2),(x-size,z-size*.2),(x-size*.6,z-size*.2)]
 return sc_profile(p,pts,y,.035,mat,bone,.007)
def mn_artmat(card):
 name='Drif_MiNote_Art_'+str(card);mat=bpy.data.materials.get(name)
 if mat:return mat
 mat=material(name,(1,1,1),.87);im=bpy.data.images.load(str(OUT/'textures/minote'/f'{card}.webp'),check_existing=True);im.pack()
 tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='EXTEND';bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);return mat

def mn_artpanel(p,card,c=(0,-.30,1.14),size=(.42,.48),bone='Chest'):
 x,y,z=c;w,h=size;obj=sc_box(p,c,(w,.028,h),mn_artmat(card),bone,.008)
 uv=obj.data.uv_layers.new(name='Mi Note artwork');uv.active_render=True
 for f in obj.data.polygons:
  for li in f.loop_indices:
   v=obj.data.vertices[obj.data.loops[li].vertex_index].co;uv.data[li].uv=((v.x-x)/w+.5,(v.z-z)/h+.5)
 return obj

def mn_inkpatch(p,outline,mat=mn_ink):
 poly=[Vector((x,z,0)) for x,z in outline];tri=tessellate_polygon([poly]);verts=[];faces=[]
 for triangle in tri:
  a,b,c=[poly[v] if isinstance(v,int) else v for v in triangle]
  # Four subdivisions follow the curved forehead without floating edges.
  queue=[(a,b,c)]
  for k in range(3):
   nxt=[]
   for a,b,c in queue:
    ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2;nxt.extend([(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)])
   queue=nxt
  for triangle in queue:
   n=len(verts);verts.extend(mn_facepoint(v.x,v.y,.006) for v in triangle);faces.append((n,n+1,n+2))
 return mesh(p,verts,faces,mat,'Head')

# EYES — shaped whites and lids; no inherited black globes.
for index,style in enumerate(MN_VARIANTS['Eyes']):
 p='Drif_Eyes_'+style
 for s in [-1,1]:
  x=s*.30;z=2.23
  if style=='mnjestereye':
   sf_solid(p+'_diamond',[(x-.15,z),(x,z+.23),(x+.15,z),(x,z-.22)],-.55,.05,mn_rose,.13,.018)
   sf_iris(p,x,z,.068,.12,mn_green,y=-.595)
  elif style=='mninkwink' and s==1:
   sf_lid(p+'_wink',x,2.19,.16,.07,mn_ink,y=-.55)
  else:
   rx=.15 if style!='mnroundspecs' else .14;rz=.17 if style!='mnnightlash' else .14
   mn_ell(p+'_white',(x,-.51,z),(rx,.073,rz),mn_white)
   iris=[mn_blue,mn_green,mn_sky,mn_green,mn_ink,mn_blue,mn_green,mn_ink,mn_gold][index]
   sf_iris(p,x-s*.014,z-.015,.068,.10,iris,y=-.585)
   if style in ['mnsoftgaze','mnbluesad','mnemeraldiris']:
    sf_lid(p+'_upperlid',x,2.32,.155,.063,mn_blue if style=='mnbluesad' else mn_ink,y=-.55,slope=-s*.10)
   if style=='mnroundspecs':sc_ring(p+'_rim',(x,-.615,z),.178,.19,.014,mn_gold,'Head',n=32,m=6)
   if style in ['mndeweyes','mnbluesad']:
    outline=[(x-.065,2.13),(x+.06,2.13),(x+.045,2.04),(x+.022,1.99),(x,2.015),(x-.028,2.08)]
    sf_solid(p+'_tear',outline,-.56,.04,mn_glass,.12,.018)
   if style=='mnnightlash':
    for k in range(3):sf_solid(p+'_lash',[(x+s*.09,2.30),(x+s*(.17+k*.023),2.34+k*.02),(x+s*.14,2.27)],-.553,.035,mn_ink,.06,0)
   if style=='mnstarcatch':mn_badge(p+'_spark',x-.025,2.25,.036,mn_white,'star',-.624,'Head')
 if style=='mnroundspecs':sc_box(p+'_bridge',(0,-.60,2.24),(.23,.032,.025),mn_gold,'Head',.01)

# BROWS — broad padded silhouettes with deliberate expressions.
for i,style in enumerate(MN_VARIANTS['Brows']):
 p='Drif_Brows_'+style
 for s in [-1,1]:
  x=s*.30;rise=[.02,.11,.065,.085,-.04,.12,.075,0,-.07][i]
  outline=[(x-s*.17,2.44+rise),(x-s*.09,2.50+rise),(x+s*.07,2.48),(x+s*.17,2.42),(x+s*.08,2.43),(x-s*.09,2.46+rise)]
  if i==7:outline=[(x-.15,2.44),(x+.14,2.44),(x+.14,2.51),(x-.15,2.51)]
  if i in [3,6]:outline=[(x+dx*s,2.46+dz) for dx,dz in [(-.17,0),(-.14,.06),(-.07,.12),(-.01,.075),(.06,.10),(.16,0),(.02,.03),(-.08,.015)]]
  o=sf_solid(p+'_brow',outline,-.47,.05,mn_ink if i not in [3,6] else mn_gold if i==3 else mn_rose,.16,.016)
  # Fit all layers to the actual skull surface, keeping the bevel's relief.
  for v in o.data.vertices:v.co.y=mn_facepoint(v.co.x,v.co.z,.025)[1]+(v.co.y+.47)
  if i==4:
   # Negative gap in the jester brow is genuine topology, not a painted line.
   sc_box(p+'_separate',(x+s*.22,-.40,2.45),(.045,.045,.085),mn_rose,'Head',.01)

# MOUTHS — low profile against the muzzle, projecting parts along -Y.
for i,style in enumerate(MN_VARIANTS['Mouth']):
 p='Drif_Mouth_'+style
 if i in [0,1,2,8]:
  rx,rz=[(.18,.04),(.09,.055),(.105,.053),(.073,.10)][[0,1,2,8].index(i)]
  sf_cavity(p,sf_outline(0,1.82,rx,rz,24,.8),-.67,mn_rose if i in [1,2] else mn_ink,mn_ink,.20,.035)
  if i==2:
   for s in [-1,1]:mn_ell(p+'_lip',(s*.044,-.714,1.842),(.055,.025,.028),mn_rose,n=16,m=8)
 elif i==3:
  sf_cavity(p,[(-.25,1.90),(-.17,1.83),(0,1.79),(.18,1.84),(.25,1.91),(.20,1.73),(0,1.68),(-.21,1.74)],-.68,mn_red,mn_ink,.12,.055)
  for j in range(7):sf_tooth(p+'_tooth',(j-3)*.055,1.80+abs(j-3)*.014,.049,.052,mn_white,y=-.733)
 elif i==4:
  for z,r in [(1.84,.061),(1.775,.032)]:mn_ell(p+'_bill',(0,-.77,z),(.25,.20,r),mn_yellow,n=32,m=10)
  for s in [-1,1]:mn_ell(p+'_nostril',(s*.07,-.87,1.89),(.02,.028,.009),mn_ink,n=12,m=6)
 elif i==5:
  sf_cavity(p,sf_outline(0,1.81,.25,.13,32,.7),-.68,mn_blue,mn_ink,.13,.07)
  for j in range(8):
   x=(j-3.5)*.055;sf_tooth(p+'_fang',x,1.90-abs(x)*.15,.052,.08,mn_white,y=-.748,pointed=True)
   sf_tooth(p+'_lower',x,1.72+abs(x)*.12,.044,-.065,mn_white,y=-.75,pointed=True)
 elif i==6:
  sf_cavity(p,sf_outline(0,1.81,.09,.06,24),-.68,mn_rose,mn_ink,.18,.03)
  mn_ell(p+'_gum',(0,-.83,1.81),(.155,.16,.15),mn_rose,n=32,m=16)
  mn_ell(p+'_shine',(-.05,-.965,1.87),(.025,.009,.045),mn_white,n=12,m=8)
 else:
  sf_cavity(p,sf_outline(0,1.81,.16,.075,24),-.68,mn_rose,mn_ink,.18,.04)
  for s in [-1,1]:sf_tooth(p+'_incisor',s*.043,1.88,.08,.135,mn_white,y=-.735)

for i,style in enumerate(MN_VARIANTS['Nose']):
 p='Drif_Nose_'+style
 if i in [0,4,6]:
  outline=[(-.06,2.065),(0,2.13),(.06,2.065),(.045,1.99),(0,1.96),(-.045,1.99)] if i==0 else [(-.07,2.11),(.07,2.11),(.11,1.98),(0,1.94),(-.11,1.98)]
  sf_solid(p+'_bridge',outline,-.71,.08,[mn_glass,mn_paper,mn_blue][[0,4,6].index(i)],.10,.035)
  if i==6:
   for s in [-1,1]:sf_cavity(p+'_nostril',sf_outline(s*.058,1.986,.021,.014,16),-.754,mn_blue,mn_ink,.2,.02)
 elif i==3:
  mn_ell(p+'_saddle',(0,-.72,2.015),(.13,.10,.044),mn_yellow)
  for s in [-1,1]:mn_ell(p+'_hole',(s*.065,-.795,2.03),(.02,.015,.012),mn_ink,n=12,m=6)
 elif i==7:
  sc_box(p+'_pad',(0,-.713,2.015),(.17,.06,.10),mn_paper,'Head',.025)
  for s in [-1,1]:
   for z in [1.99,2.035]:mn_ell(p+'_hole',(s*.055,-.746,z),(.009,.004,.009),mn_ink,n=8,m=4)
 elif i==8:
  mn_ell(p+'_fruit',(0,-.735,2.015),(.075,.08,.085),mn_red)
  for k in range(6):a=k*math.tau/6;mn_ell(p+'_seed',(.055*math.cos(a),-.799,2.015+.06*math.sin(a)),(.008,.005,.012),mn_gold,n=8,m=4)
 else:
  mn_ell(p+'_tip',(0,-.72,2.015),[(.064,.06,.057),(.11,.105,.105),(.055,.05,.095)][[1,2,5].index(i)],[mn_rose,mn_red,mn_white][[1,2,5].index(i)])

# Tattoo art lies on the source head; it is the intentional surface-only category.
for i,style in enumerate(MN_VARIANTS['Tattoo']):
 p='Drif_Tattoo_'+style
 for s in [-1,1]:
  x=s*.46;z=2.02
  if i in [0,2,5,8]:
   if i==0:pts=[(x+.06*(1 if j%2==0 else .40)*math.sin(j*math.pi/5),z+.07*(1 if j%2==0 else .40)*math.cos(j*math.pi/5)) for j in range(10)]
   elif i==2:pts=[(x-.04,z+.03),(x+.04,z+.03),(x+.03,z-.03),(x,z-.07),(x-.03,z-.03)]
   elif i==5:pts=[(x-.07,z-.03),(x-.08,z+.06),(x-.025,z+.015),(x,z+.08),(x+.03,z+.01),(x+.07,z+.06),(x+.06,z-.03)]
   else:pts=[(x+.055*math.cos(a)*(1+.24*math.cos(5*a)),z+.055*math.sin(a)*(1+.24*math.cos(5*a))) for a in [j*math.tau/30 for j in range(30)]]
   mn_inkpatch(p+'_stamp',pts,mn_red if i in [2,8] else mn_ink)
  elif i==1:
   for w,h in [(.012,.10),(.055,.015)]:mn_inkpatch(p+'_cross',[(x-w,z-h),(x+w,z-h),(x+w,z+h),(x-w,z+h)])
  elif i==3:mn_inkpatch(p+'_diamond',[(x-.035,z),(x,z+.10),(x+.035,z),(x,z-.09)],mn_rose)
  elif i==4:
   for k in range(2):xx=x+(k-.5)*.055;mn_inkpatch(p+'_tear',[(xx-.009,z+.10),(xx+.009,z+.10),(xx+.018,z-.09),(xx,z-.13),(xx-.012,z-.08)],mn_blue)
  elif i==6:
   for k in range(3):zz=z+k*.048;mn_inkpatch(p+'_rule',[(x-.07,zz),(x+.06,zz),(x+.06,zz+.008),(x-.07,zz+.008)],mn_blue)
  else:
   for k in range(6):xx=x+(k%3-1)*.035;zz=z+(k//3)*.045;mn_inkpatch(p+'_freckle',sf_outline(xx,zz,.009,.012,8),mn_blue)

# Fins keep the original three-point language, with real folded membranes.
for i,style in enumerate(MN_VARIANTS['Ears']):
 p='Drif_Ears_'+style
 for s in [-1,1]:
  before=set(collection.objects);o=sc_fin(p,s,'ribbedfins' if i not in [3,5] else 'quiltfins',mn_paper if i==7 else mn_green if i==8 else mn_palette[i]);
  objs=[o for o in collection.objects if o not in before and o.type=='MESH']
  for o in objs:
   for v in o.data.vertices:
    x=abs(v.co.x);t=max(0,(x-.52)/.52);z=v.co.z
    if i==0:v.co.y+=.075*math.sin((z-1.75)*23)*t;v.co.z+=.035*math.cos(x*25)*t
    elif i==1:v.co.y+=.11*t*t;v.co.z+=.055*math.sin(t*math.pi)
    elif i==2:v.co.z=2.28+(z-2.28)*1.08;v.co.y+=.04*abs(math.sin(z*17))*t
    elif i==3:v.co.y+=.065*math.cos(z*20+x*10)*t
    elif i==4:v.co.x*=1-.07*t;v.co.y-=.055*t;v.co.z-=max(0,z-2.55)*.27
    elif i==5:v.co.x+=s*.045*math.sin((z-1.7)*13)*t;v.co.y+=.07*math.sin(t*math.pi)
    elif i==6:v.co.x+=s*.035*math.sin(z*61)*t;v.co.z+=.025*math.cos(x*57)*t
    elif i==7:
     v.co.x=s*(.53+(x-.53)*.55);v.co.z=2.02+(z-1.75)*.98;v.co.y+=max(0,z-2.45)*.45
    else:v.co.x=s*(.53+(x-.53)*.85);v.co.y-=.13*math.sin(t*math.pi);v.co.z=2.25+(z-2.25)*.73
   # Polychrome fills articulate the molded panels; no attached wire ribs.
   if i in [1,2,6]:
    for mat in [mn_paper,mn_sky,mn_rose]:o.data.materials.append(mat)
    for face in o.data.polygons:face.material_index=1+int((face.center.z-1.7)*8)%3 if face.center.y<0 else 0

# Replacement heads fit the original center and include their own complete face.
for i,style in enumerate(MN_VARIANTS['Head']):
 p='Drif_Head_'+style
 if i==1:
  sc_lathe(p+'_bell',(0,.04,1.48),[(0,.42),(.06,.57),(.14,.61),(.23,.48),(.43,.43),(.75,.39),(.99,.28),(1.10,.06)],mn_gold,'Head',48)
  sc_ring(p+'_lip',(0,.04,1.58),.55,.50,.055,mn_gold,'Head',axis='xy',n=40,m=8)
 elif i==3:sc_box(p+'_block',(0,.045,2.12),(1.06,.94,1.16),mn_green,'Head',.065)
 elif i==7:
  mn_ell(p+'_icon',(0,.045,2.10),(.57,.49,.60),mn_paper,n=32,m=20)
  sc_profile(p+'_headdress',[(-.48,2.35),(-.43,2.72),(0,3.10),(.43,2.72),(.48,2.35)],.04,.37,mn_paper,'Head',.025)
  mn_badge(p+'_cross',0,2.80,.13,mn_gold,'cross',-.175,'Head')
 elif i==8:
  sc_lathe(p+'_cake',(0,.045,1.56),[(0,.40),(.08,.53),(.93,.53),(1.04,.43)],mn_white,'Head',40)
  for j in range(10):
   a=j*math.tau/10;mn_ell(p+'_icing',(.47*math.cos(a),.045+.47*math.sin(a),2.57),(.11,.11,.10),mn_rose,n=16,m=8)
  for j in range(5):a=j*math.tau/5;mn_ell(p+'_berry',(.29*math.cos(a),.045+.29*math.sin(a),2.72),(.08,.08,.095),mn_red,n=16,m=8)
 else:
  shell=mn_ell(p+'_mask',(0,.045,2.10),(.60,.53,.64),[mn_paper,mn_gold,mn_white,mn_green,mn_paper,mn_white,mn_blue][min(i,6)],n=36,m=24)
  for v in shell.data.vertices:
   if i==0:v.co.y+=.018*math.cos(v.co.x*32+v.co.z*9)
   if i==2:v.co.x*=1+.045*math.cos(v.co.z*17);v.co.y+=.012*math.sin(v.co.x*25)
  if i==4:
   for s in [-1,1]:
    ear=mn_ell(p+'_ear',(s*.35,.05,2.86),(.16,.13,.37),mn_paper,n=24,m=14)
    mn_ell(p+'_earwell',(s*.35,-.071,2.88),(.085,.025,.24),mn_rose)
    sc_transform([ear,pieces[-1]],(s*.35,.05,2.62),(0,s*.20,s*.10))
  if i==5:
   for z,rz in [(1.99,.095),(1.88,.055)]:mn_ell(p+'_bill',(0,-.57,z),(.31,.29,rz),mn_yellow,n=32,m=12)
  if i==6:
   mn_ell(p+'_snout',(0,-.47,1.98),(.43,.23,.27),mn_blue)
   sw_sweep(p+'_dorsal',[(0,.2,2.55,.16),(0,.27,2.90,.13),(0,.43,3.03,.008)],mn_blue,'Head',16)
 # Each new head has recessed eyes and a modeled expression. Earless masks keep
 # any user-selected fin trait; the rabbit supplies its own long ears.
 for s in [-1,1]:
  x=s*.245;y=-.50 if i not in [1,3,8] else -.46
  sf_cavity(p+'_socket',sf_outline(x,2.25,[.135,.12,.17,.12,.125,.15,.16,.10,.11][i],[.15,.16,.12,.12,.16,.12,.11,.14,.13][i],28,.78),y,mn_rose if i==2 else mn_ink,mn_ink,.14,.045)
  sf_iris(p+'_eye',x,2.25,.064,.095,mn_glass if i==1 else mn_blue,y=y-.045)
 if i not in [5]:
  sf_cavity(p+'_mouth',sf_outline(0,1.87,.18,.065 if i!=6 else .11,24,.65),-.53 if i!=6 else -.70,mn_rose,mn_ink,.17,.035)
  if i in [2,4,6]:
   for j in range(5):sf_tooth(p+'_tooth',(j-2)*.057,1.91,.05,.07,mn_white,y=-.58 if i!=6 else -.75,pointed=i==6)
 if i==0:
  for s in [-1,1]:sc_profile(p+'_fold',[(s*.06,2.12),(s*.45,2.46),(s*.52,2.25),(s*.38,1.95)],-.48,.05,mn_paper,'Head',.012)
 if i==2:
  for s in [-1,1]:sf_solid(p+'_makeup',[(s*.245-.08,2.40),(s*.245,2.57),(s*.245+.08,2.40)],-.46,.02,mn_red,.08,0)

exec(compile((ROOT/'scripts/showroom-assets/extend_drifmaker_minote_wardrobe.py').read_text(),'minote_wardrobe','exec'),globals())
exec(compile((ROOT/'scripts/showroom-assets/extend_drifmaker_minote_objects.py').read_text(),'minote_objects','exec'),globals())
