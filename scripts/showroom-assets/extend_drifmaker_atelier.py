"""144 independently skinned traits. Drifella 2 source-layer studies, Little Swag
World's collectible silhouettes, and original textile/object designs. Generated
textures are packed into the blend/GLB; no network or reference paths at build.
"""
import colorsys, random
ATELIER_CATALOG=json.loads((ROOT/'scripts/showroom-assets/atelier-catalog.json').read_text())
ATELIER_VARIANTS={k.title():[x[0] for x in v] for k,v in ATELIER_CATALOG.items()}
a_ink=material('Drif_Atelier_Ink',(.008,.012,.021),.5)
a_cream=material('Drif_Atelier_Cream',(.92,.88,.73),.84)
a_cyan=material('Drif_Atelier_Hair',(.065,.66,.84),.39)
a_cyanshade=material('Drif_Atelier_Hair_Shade',(.025,.28,.41),.46)
a_cyanlight=material('Drif_Atelier_Hair_Light',(.33,.85,.96),.32)
a_orange=material('Drif_Atelier_Orange',(.96,.19,.025),.48)
a_rose=material('Drif_Atelier_Rose',(.79,.035,.18),.52)
a_lime=material('Drif_Atelier_Lime',(.48,.78,.07),.67)
a_purple=material('Drif_Atelier_Purple',(.29,.10,.45),.61)
a_brown=material('Drif_Atelier_Leather',(.15,.065,.035),.86)
a_gold=material('Drif_Atelier_Brass',(.64,.38,.10),.28,.72)
a_silver=material('Drif_Atelier_Chrome',(.69,.76,.82),.20,.88)
a_paper=material('Drif_Atelier_Paper',(.64,.42,.21),.96)
a_porcelain=material('Drif_Atelier_Porcelain',(.87,.94,.96),.18,.12)
a_blue=material('Drif_Atelier_Cobalt',(.014,.057,.39),.36,.22)
a_glass=sp_glow('AtelierGlass',(.31,.72,.91),.12,.48)
a_mint=material('Drif_Atelier_Mint',(.14,.47,.30),.88)
a_blackknit=material('Drif_Atelier_Knit',(.055,.052,.07),.96)
a_texmats={}

def at_uv(obj,scale=1.6,axis='body'):
 uv=obj.data.uv_layers.get('Atelier weave') or obj.data.uv_layers.new(name='Atelier weave')
 for f in obj.data.polygons:
  for li in f.loop_indices:
   co=obj.data.vertices[obj.data.loops[li].vertex_index].co
   uv.data[li].uv=((co.x*scale,co.z*scale) if axis=='body' else (co.x*scale,(co.y+co.z)*scale))
 return obj

def at_textile(name,kind,base,accent):
 """Small baked woven pattern, with controlled contrast and textile grain."""
 mat=material('Drif_Atelier_Fabric_'+name,(1,1,1),.89)
 im=bpy.data.images.get('Drif_Atelier_Print_'+name) or bpy.data.images.new('Drif_Atelier_Print_'+name,width=256,height=256,alpha=True)
 pix=[];rng=random.Random(name)
 for y in range(256):
  v=y/256
  for x in range(256):
   u=x/256;f=0
   if kind=='camo':f=.5+.5*math.sin(18*u+2*math.sin(v*20))*math.cos(22*v+2*math.sin(u*14));f=0 if f<.37 else .55 if f<.62 else 1
   elif kind=='checker':f=float((x//32+y//32)%2)
   elif kind=='stars':
    a=(x%64-32)/32;b=(y%64-32)/32;f=float(abs(a)*abs(b)<.035 and abs(a)+abs(b)<.62)
   elif kind=='flames':f=float(v<.38+.25*math.sin(u*32+v*6)+.10*math.sin(u*71))
   elif kind=='porcelain':f=max(0,math.sin(25*u+3*math.sin(v*14))*math.sin(19*v+3*math.sin(u*12)))**5
   elif kind=='knit':f=.5+.35*math.sin(u*120+math.sin(v*70)*2)+.15*math.cos(v*80)
   elif kind=='patch':f=((x//64)*3+(y//64)*5)%7/6
   elif kind=='quilt':f=float(abs((u+v)*8-round((u+v)*8))<.045 or abs((u-v)*8-round((u-v)*8))<.045)
   elif kind=='paint':f=float(math.sin(u*51+math.sin(v*41)*2)+math.cos(v*73+math.sin(u*29))>1.1)
   elif kind=='ripstop':f=.65 if x%32<2 or y%32<2 else 0
   elif kind=='cord':f=.5+.5*math.sin(u*100)
   elif kind=='petals':f=max(0,math.cos(math.atan2(v-.5,u-.5)*7))*math.exp(-((math.hypot(u-.5,v-.5)-.23)*11)**2)
   elif kind=='rally':f=float((int(u*12)+int(v*12))%2) if u<.25 else .12
   else:f=.12*math.sin(u*24)*math.sin(v*24)
   weave=(.955+.025*math.sin(x*math.pi/2)*math.cos(y*math.pi/2))*(.97+.06*rng.random())
   rgb=[round(max(0,min(1,(base[k]*(1-f)+accent[k]*f)*weave))*63)/63 for k in range(3)]
   pix.extend((*rgb,1))
 im.pixels=pix;im.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
 bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 a_texmats[name]=mat;return mat

def at_tube(p,controls,mat,bone='Head',sides=12,steps=5,depth=1):
 # Smooth tapered sweep, with cap topology and explicit bone weights.
 controls=[Vector(c) for c in controls];samples=[]
 for i in range(len(controls)-1):
  a,b,c,d=controls[max(0,i-1)],controls[i],controls[i+1],controls[min(len(controls)-1,i+2)]
  for j in range(steps):
   t=j/steps;samples.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 samples.append(controls[-1]);verts=[];faces=[]
 for i,c in enumerate(samples):
  center=Vector(c[:3]);tangent=(Vector(samples[min(len(samples)-1,i+1)][:3])-Vector(samples[max(0,i-1)][:3])).normalized()
  normal=tangent.cross(Vector((0,1,0))).normalized();side=tangent.cross(normal).normalized()
  for j in range(sides):
   a=j*math.tau/sides;verts.append(center+max(.002,c[3])*(math.cos(a)*normal+math.sin(a)*side*depth))
  if i:
   for j in range(sides):faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
 faces+=[tuple(reversed(range(sides))),tuple((len(samples)-1)*sides+j for j in range(sides))]
 return mesh(p,verts,faces,mat,bone)

def at_eye(p,x,z=2.22,iris=a_blue,rx=.15,rz=.185,dx=0):
 ell(p+'_white',(x,-.491,z),(rx,.075,rz),a_porcelain,n=24,m=14)
 ell(p+'_iris',(x+dx,-.562,z),(.076,.019,.106),iris,n=20,m=12)
 ell(p+'_pupil',(x+dx,-.581,z),(.035,.01,.066),a_ink,n=16,m=10)
 ell(p+'_shine',(x+dx-.023,-.592,z+.042),(.021,.007,.027),glint,n=10,m=8)

def at_flat(p,points,mat,y=-.552):return plaque(p,points,y,.012,mat)

# EYES: source silhouettes receive their own volume, with no inherited orbs.
for style in ATELIER_VARIANTS['Eyes'][:8]:
 p='Drif_Eyes_'+style
 for s in [-1,1]:
  x=s*.302
  if style=='thirdeye':at_eye(p,x,2.20,a_lime if s<0 else a_rose,rx=.137,rz=.157)
  elif style=='wireframes':
   at_eye(p,x,2.22,a_cyan,rx=.138,rz=.16)
   dm_loop(p+'_rim',(x,-.584,2.23),(.168,.185),.009,a_gold,steps=40)
   line(p+'_arm',[(s*.47,-.51,2.26),(s*.60,-.18,2.27),(s*.60,.15,2.23)],.012,a_gold,'Head')
  elif style=='astroboy':
   ell(p+'_white',(x,-.50,2.23),(.127,.059,.206),a_porcelain,n=24,m=16)
   ell(p+'_red',(x+s*.018,-.558,2.30),(.098,.021,.139),a_rose,n=20,m=14)
   ell(p+'_pupil',(x+s*.018,-.579,2.32),(.073,.013,.112),a_ink,n=20,m=14)
   ell(p+'_shine',(x-.025,-.596,2.37),(.025,.006,.033),glint,n=12,m=8)
   for j in range(3):line(p+'_lash',[(x+(j-1)*.065,-.535,2.40),(x+(j-1)*.085,-.53,2.46)],.007,a_ink,'Head',6)
  elif style=='bruised':
   if s<0:
    ell(p+'_bruise',(x,-.482,2.22),(.155,.057,.11),a_purple,n=20,m=12)
    line(p+'_closed',[(x-.13,-.548,2.22),(x,-.557,2.19),(x+.13,-.548,2.22)],.014,a_ink,'Head')
    for z in [2.27,2.19]:line(p+'_bandage',[(x-.09,-.563,z+.045),(x+.10,-.563,z-.045)],.026,a_cream,'Head')
   else:at_eye(p,x,2.23,dm_tan,rx=.14,rz=.16)
  elif style=='sidelong':
   at_eye(p,x,2.23,a_mint,rx=.162,rz=.14,dx=.055)
   line(p+'_lid',[(x-.15,-.553,2.28),(x,-.57,2.32),(x+.15,-.553,2.29)],.015,a_ink,'Head')
  elif style=='tvhearts':
   ell(p+'_wine',(x,-.50,2.23),(.148,.07,.18),dm_burgundy,n=24,m=16)
   dm_heart(p+'_heart',(x,-.574,2.24),.086,a_rose)
   for j in range(4):line(p+'_scan',[(x-.115,-.577,2.14+j*.06),(x+.115,-.577,2.14+j*.06)],.003,sp_glowpink,'Head',5)
   ell(p+'_glint',(x-.055,-.58,2.33),(.028,.008,.039),glint,n=12,m=8)
  elif style=='ghostglare':
   shape=[(-.17,.07),(-.06,-.07),(.10,-.06),(.19,.11),(.07,.035)]
   co_eye(p+'_white',s,shape,a_porcelain,y=-.544);co_eye_edge(p+'_edge',s,shape,a_ink,y=-.555,r=.016)
   ell(p+'_pupil',(x,-.57,2.20),(.035,.012,.045),a_rose,n=16,m=10)
  else:
   ell(p+'_socket',(x,-.46,2.23),(.17,.105,.18),a_porcelain,n=24,m=16)
   dx=-.04 if s<0 else .045;dz=.035 if s<0 else -.025
   ell(p+'_loosepupil',(x+dx,-.57,2.23+dz),(.063,.035,.068),a_ink,n=20,m=12)
   ell(p+'_shine',(x+dx-.02,-.60,2.26+dz),(.017,.007,.02),glint,n=10,m=8)
 if style=='thirdeye':
  ell(p+'_thirdwhite',(0,-.435,2.57),(.10,.035,.125),a_porcelain,n=20,m=12)
  ell(p+'_thirdiris',(0,-.47,2.57),(.055,.016,.087),a_cyan,n=18,m=12)
  ell(p+'_thirdpupil',(0,-.486,2.57),(.022,.007,.059),a_ink,n=12,m=8)
 if style=='wireframes':line(p+'_bridge',[(-.13,-.57,2.26),(0,-.55,2.29),(.13,-.57,2.26)],.012,a_gold,'Head')

# MOUTHS: shaped outlines and small physical details, all muzzle fitted.
for style in ATELIER_VARIANTS['Mouth'][:8]:
 p='Drif_Mouth_'+style
 if style=='mothseal':
  for s in [-1,1]:
   at_flat(p+'_wing',[(0,1.86),(s*.24,1.96),(s*.27,1.90),(s*.18,1.77),(s*.045,1.79)],a_brown,-.69)
   for j in range(3):mouth_line(p+'_vein',[(s*.03,1.85),(s*(.12+j*.04),1.90-j*.045)],a_gold,.009,.06)
  ell(p+'_body',(0,-.72,1.86),(.025,.022,.098),a_ink,n=12,m=8)
  ell(p+'_skull',(0,-.745,1.90),(.037,.009,.03),a_cream,n=12,m=8)
  for s in [-1,1]:ell(p+'_eyes',(s*.013,-.755,1.903),(.009,.005,.01),a_ink,n=8,m=6)
 elif style=='bonejaw':
  mouth_oval(p+'_opening',.19,.09,1.81,a_ink)
  mouth_line(p+'_jaw',[(-.21,1.89),(-.23,1.79),(-.16,1.71),(0,1.69),(.16,1.71),(.23,1.79),(.21,1.89)],a_cream,.033,.045)
  for s in [-1,1]:sp_cone(p+'_fang',muzzle_point(s*.16,1.83,.06),muzzle_point(s*.13,1.94,.06),.036,a_porcelain)
 elif style=='missingtooth':
  mouth_oval(p+'_open',.23,.11,1.81,a_ink)
  for j in range(8):
   if j==5:continue
   x=(j-3.5)*.049;tooth(p+'_tooth',x,1.884-abs(x)*.12,.043,.045,a_cream)
  mouth_panel(p+'_tongue',[(-.10,1.73),(-.07,1.76),(.06,1.76),(.11,1.73)],a_rose,.04)
 elif style=='sawgrin':
  mouth_oval(p+'_dark',.26,.112,1.82,dm_burgundy)
  for j in range(9):
   x=(j-4)*.052;top=1.90-abs(x)*.14;bot=1.73+abs(x)*.14
   mouth_panel(p+'_upper',[(x-.025,top),(x+.025,top),(x+.008,1.79)],a_porcelain,.038)
   mouth_panel(p+'_lower',[(x-.025,bot),(x+.025,bot),(x-.008,1.84)],a_gold,.041)
 elif style=='bitinglip':
  mouth_panel(p+'_lip',[(-.17,1.83),(-.07,1.84),(0,1.82),(.08,1.87),(.17,1.89),(.14,1.78),(.05,1.75),(-.07,1.77)],a_rose,.023)
  mouth_line(p+'_split',[(-.15,1.83),(-.04,1.82),(.05,1.81),(.15,1.87)],a_ink,.008,.04)
  tooth(p+'_tooth',.08,1.868,.055,.058,a_porcelain)
 elif style=='partyhorn':
  mouth_oval(p+'_mouth',.065,.055,1.82,a_ink)
  at_tube(p+'_horn',[(0,-.67,1.82,.035),(.09,-.77,1.79,.045),(.20,-.84,1.81,.052),(.25,-.86,1.88,.061)],a_orange,depth=.8)
  for j in range(4):line(p+'_stripe',[(.055+j*.048,-.81-j*.013,1.77+j*.012),(.085+j*.048,-.83-j*.013,1.84+j*.012)],.009,a_cream,'Head')
  dm_loop(p+'_roll',(.25,-.885,1.88),(.045,.054),.014,a_cyan,steps=20)
 elif style=='sleepbubble':
  mouth_line(p+'_sleep',[(-.11,1.81),(0,1.79),(.09,1.80)],a_ink,.009)
  ell(p+'_bubble',(.15,-.73,1.86),(.112,.105,.13),a_glass,n=28,m=18)
  line(p+'_shine',[(.095,-.815,1.89),(.11,-.824,1.93),(.145,-.82,1.95)],.009,a_porcelain,'Head')
 else:
  mouth_line(p+'_smirk',[(-.13,1.82),(-.03,1.79),(.12,1.82)],a_ink,.012)
  line(p+'_stem',[(.09,-.68,1.81),(.21,-.70,1.73),(.23,-.69,1.65)],.008,a_mint,'Head')
  for x in [.20,.28]:ell(p+'_cherry',(x,-.70,1.62),(.045,.036,.046),a_rose,n=16,m=12)

# The four added expressions remain independent from brows and nose selections.
for style in ['prismeyes','visorslit','sakurapupils','closedjoy']:
 p='Drif_Eyes_'+style
 for s in [-1,1]:
  x=s*.302
  if style=='prismeyes':
   outline=[(x+.16*math.cos(j*math.tau/6),2.23+.18*math.sin(j*math.tau/6)) for j in range(6)]
   plaque(p+'_rim',outline,-.55,.04,a_silver)
   for j in range(6):
    a=j*math.tau/6;b=(j+1)*math.tau/6
    mesh(p+'_facet',[(x,-.62,2.23),(x+.14*math.cos(a),-.566,2.23+.16*math.sin(a)),(x+.14*math.cos(b),-.566,2.23+.16*math.sin(b))],[(0,1,2)],[a_cyan,a_purple,a_rose][j%3],'Head',False)
  elif style=='visorslit':
   at_flat(p+'_shell',[(x-.17,2.15),(x+.17,2.15),(x+.16,2.32),(x-.16,2.32)],a_ink,-.55)
   line(p+'_light',[(x-.125,-.574,2.23),(x+.125,-.574,2.23)],.018,sp_glowcyan,'Head')
   for k in range(3):dm_box(p+'_vent',(x+(k-1)*.08,-.58,2.18),(.042,.015,.012),a_silver,'Head')
  elif style=='sakurapupils':
   at_eye(p,x,2.23,a_purple)
   for j in range(5):
    a=j*math.tau/5;ell(p+'_petal',(x+.055*math.cos(a),-.59,2.23+.065*math.sin(a)),(.036,.008,.037),dm_rose,n=12,m=8)
   ell(p+'_center',(x,-.604,2.23),(.025,.008,.028),a_cream,n=12,m=8)
  else:
   line(p+'_closed',[(x-.14,-.55,2.17),(x-.07,-.567,2.26),(x,-.57,2.28),(x+.08,-.567,2.25),(x+.14,-.55,2.17)],.017,a_ink,'Head')
   for j in range(3):line(p+'_blush',[(x-.08+j*.065,-.54,2.09),(x-.055+j*.065,-.54,2.14)],.009,a_rose,'Head')
for style in ['bandana','tusks','pixelsmile','fortunepaper']:
 p='Drif_Mouth_'+style
 if style=='bandana':
  mouth_panel(p+'_cloth',[(-.32,1.94),(-.27,1.76),(0,1.62),(.27,1.76),(.32,1.94),(0,1.98)],a_blue,.045)
  for s in [-1,1]:
   mouth_line(p+'_edge',[(s*.29,1.92),(s*.23,1.76),(0,1.65)],a_cream,.007,.06)
   for j in range(3):mouth_line(p+'_stitch',[(s*(.11+j*.05),1.88),(s*(.12+j*.05),1.84)],a_porcelain,.006,.065)
 elif style=='tusks':
  mouth_oval(p+'_mouth',.20,.055,1.79,a_ink)
  for s in [-1,1]:at_tube(p+'_tusk',[(s*.16,-.68,1.77,.043),(s*.23,-.74,1.83,.032),(s*.25,-.77,1.96,.004)],a_cream)
 elif style=='pixelsmile':
  for j in range(9):
   x=(j-4)*.043;z=1.78+.015*abs(j-4)
   dm_box(p+'_pixel',muzzle_point(x,z,.026),(.043,.018,.033),a_ink,'Head')
  for x in [-.15,.15]:dm_box(p+'_tooth',muzzle_point(x,1.82,.039),(.038,.012,.028),a_cream,'Head')
 else:
  mouth_line(p+'_mouth',[(-.13,1.82),(0,1.79),(.13,1.82)],a_ink,.01)
  plaque(p+'_slip',[(.035,1.82),(.125,1.82),(.17,1.61),(.08,1.59)],-.705,.009,a_cream)
  for j in range(4):line(p+'_ink',[(.075+j*.008,-.718,1.77-j*.035),(.125+j*.008,-.718,1.77-j*.035)],.004,a_rose,'Head',5)

# TOPS: eight surface-rich outfits, six with true short sleeves. Skin-colored
# uncovered forearms are part of each option and follow the original arm rig.
def at_sleeve(p,s,label,mat,short=False):
 sections=[(.33,.145),(.44,.20),(.57,.203),(.69,.186)] if short else [(.33,.15),(.44,.20),(.62,.20),(.75,.18),(.91,.17),(1.11,.15)]
 verts=[(s*x,math.cos(j*math.tau/24)*r,1.465+math.sin(j*math.tau/24)*r) for x,r in sections for j in range(24)]
 faces=[(i*24+j,i*24+(j+1)%24,(i+1)*24+(j+1)%24,(i+1)*24+j) for i in range(len(sections)-1) for j in range(24)]
 faces += [tuple(reversed(range(24))),tuple((len(sections)-1)*24+j for j in range(24))]
 at_uv(mesh(p+'_sleeve',verts,faces,mat,lambda co:dm_arm_weights(co,label)),2,'arm')
 length=sections[-1][0];r=sections[-1][1]
 dm_loop(p+'_cuff',(s*length,0,1.465),(r+.005,r+.005),.014,a_cream,'UpperArm.'+label if short else 'Forearm.'+label,'yz',24)
 if short:
  line(p+'_forearm',[(s*.68,0,1.465),(s*.82,0,1.465),(s*1.10,0,1.465)],.139,blue,lambda co:dm_arm_weights(co,label),20)

def at_top(style,mat,short=False):
 p='Drif_Shirt_'+style
 body=rings(p+'_cloth',[(.75,.38,.24,0,0),(.84,.414,.26,0,0),(1.05,.418,.275,0,0),(1.28,.405,.25,0,0),(1.48,.36,.215,0,0),(1.56,.237,.17,0,0)],mat,torso_weights,36)
 at_uv(body)
 for s,label in [(-1,'R'),(1,'L')]:at_sleeve(p,s,label,mat,short)
 for z,rx,ry in [(.765,.389,.248),(1.55,.24,.172)]:dm_loop(p+'_binding',(0,0,z),(rx,ry),.012,a_cream,torso_weights,'xy',36)
 for s in [-1,1]:line(p+'_side_seam',[(s*.385,0,.79),(s*.42,0,1.06),(s*.40,0,1.30)],.005,a_cream,torso_weights,6)
 return p

def at_buttonfront(p,mat=a_cream):
 line(p+'_placket',[(0,-.272,.82),(0,-.292,1.06),(0,-.271,1.32),(0,-.205,1.53)],.017,mat,torso_weights,8)
 for z in [.90,1.06,1.22,1.38]:dm_disc(p+'_button',(0,-.299 if z<1.2 else -.279,z),.012,a_gold,torso_weights,sides=12)
 for s in [-1,1]:plaque(p+'_collar',[(s*.02,1.50),(s*.14,1.55),(s*.26,1.44),(s*.10,1.34)],-.251,.02,mat,'Chest')

fabric_specs={
'mothtee':('plain',(.055,.045,.075),(.15,.12,.20)),
'duckcamo':('camo',(.08,.13,.07),(.56,.57,.31)),
'flamebowling':('flames',(.025,.03,.05),(.9,.12,.025)),
'checkerwork':('checker',(.055,.17,.20),(.80,.75,.58)),
'cosmicpajama':('stars',(.12,.055,.23),(.91,.68,.26)),
'porcelainbaseball':('porcelain',(.86,.91,.90),(.018,.11,.46)),
'acidknit':('knit',(.34,.43,.055),(.74,.88,.18)),
'patchanorak':('patch',(.07,.18,.20),(.67,.30,.20))}
for style,(kind,base,accent) in fabric_specs.items():
 mat=at_textile(style,kind,base,accent);p=at_top(style,mat,style not in ['cosmicpajama','patchanorak'])
 if style=='mothtee':
  for s in [-1,1]:
   plaque(p+'_printwing',[(0,1.24),(s*.27,1.42),(s*.25,1.23),(s*.18,1.12),(s*.04,1.14)],-.293,.004,a_cream,torso_weights)
   for j in range(3):line(p+'_printvein',[(s*.04,-.302,1.24),(s*(.10+j*.06),-.302,1.35-j*.06)],.008,a_brown,torso_weights,6)
  ell(p+'_mothbody',(0,-.308,1.25),(.023,.009,.13),a_gold,torso_weights,n=12,m=8)
 elif style in ['duckcamo','checkerwork']:
  at_buttonfront(p,a_mint if style=='duckcamo' else a_cream)
  for s in [-1,1]:
   o=plaque(p+'_pocket',[(s*.10,1.31),(s*.29,1.31),(s*.28,1.14),(s*.19,1.10),(s*.10,1.14)],-.283,.019,mat,torso_weights);at_uv(o)
   line(p+'_pocketseam',[(s*.11,-.309,1.28),(s*.27,-.309,1.28)],.005,a_cream,torso_weights)
 elif style=='flamebowling':at_buttonfront(p,a_cream)
 elif style=='cosmicpajama':
  at_buttonfront(p,a_rose)
  plaque(p+'_pocket',[(-.26,1.33),(-.10,1.33),(-.10,1.17),(-.23,1.17)],-.283,.016,mat,torso_weights)
 elif style=='porcelainbaseball':
  at_buttonfront(p,a_blue)
  for s in [-1,1]:line(p+'_raglan',[(s*.17,-.18,1.54),(s*.30,-.23,1.40),(s*.39,-.18,1.25)],.012,a_blue,'Chest')
 elif style=='acidknit':
  for s in [-1,1]:line(p+'_vneck',[(0,-.288,1.24),(s*.16,-.23,1.52)],.023,a_cream,'Chest')
  for j in range(8):line(p+'_hemrib',[(-.31+j*.088,-.257,.78),(-.31+j*.088,-.28,.85)],.008,a_mint,'Pelvis')
 else:
  plaque(p+'_kangaroo',[(-.27,.90),(.27,.90),(.27,1.10),(.17,1.15),(-.17,1.15),(-.27,1.10)],-.293,.022,a_brown,torso_weights)
  line(p+'_zip',[(0,-.28,1.20),(0,-.245,1.49)],.012,a_silver,'Chest')
  for s in [-1,1]:line(p+'_drawstring',[(s*.12,-.23,1.5),(s*.14,-.30,1.27)],.008,a_cream,'Chest')

# Full-body garments own their animated feet. They override legs without
# erasing the user's saved leg choice, exactly as the existing star robe does.
ATELIER_FULLBODY=['raincape','monasticrobe','flightcoverall','dinosaursuit']
for style in ATELIER_FULLBODY:
 p='Drif_Shirt_'+style
 mat={'raincape':a_orange,'monasticrobe':dm_burgundy,'flightcoverall':a_mint,'dinosaursuit':a_lime}[style]
 if style in ['raincape','monasticrobe']:
  sections=[(.18,.52,.33,0,0),(.32,.50,.32,0,0),(.60,.46,.30,0,0),(.85,.43,.28,0,0),(1.16,.42,.27,0,0),(1.42,.37,.23,0,0),(1.56,.24,.175,0,0)]
  at_uv(rings(p+'_drape',sections,mat,robe_weights,48))
  for s,label in [(-1,'R'),(1,'L')]:at_sleeve(p,s,label,mat)
  for z,rx,ry in [(.20,.525,.336),(.24,.517,.333)]:dm_loop(p+'_hem',(0,0,z),(rx,ry),.012,a_gold if style=='monasticrobe' else a_cream,robe_weights,'xy',48)
  if style=='raincape':
   line(p+'_zip',[(0,-.337,.26),(0,-.315,.62),(0,-.29,1.0),(0,-.21,1.53)],.012,a_cream,robe_weights)
   for s in [-1,1]:plaque(p+'_pocket',[(s*.14,.75),(s*.34,.75),(s*.32,.52),(s*.13,.52)],-.32,.02,a_orange,robe_weights)
   dm_loop(p+'_collar',(0,0,1.54),(.26,.19),.045,a_orange,'Chest','xy',28)
  else:
   for s in [-1,1]:line(p+'_stole',[(s*.14,-.20,1.52),(s*.10,-.30,1.14),(s*.13,-.33,.62),(s*.17,-.35,.25)],.04,a_gold,robe_weights)
   for z in [.45,.70,.96,1.22]:star(p+'_embroider',(0,-.345 if z<.8 else -.30,z),.045,.018,a_gold,robe_weights,points=4)
 else:
  at_top(style,mat)
  rings(p+'_hips',[(.58,.36,.23,0,0),(.84,.40,.25,0,0)],mat,'Pelvis',32)
  for s,label in [(-1,'R'),(1,'L')]:
   x=s*.215;w=lower_weights(label)
   rings(p+'_legs',[leg_section(x,.21,.16),leg_section(x,.34,.18),leg_section(x,.50,.192),leg_section(x,.67,.18)],mat,w,24)
   if style=='flightcoverall':
    plaque(p+'_knee',[(x-.10,.34),(x+.10,.34),(x+.10,.48),(x-.10,.48)],-.205,.024,a_brown,w)
    line(p+'_legzip',[(x+s*.15,-.10,.27),(x+s*.17,-.10,.59)],.008,a_silver,w)
  if style=='flightcoverall':
   at_buttonfront(p,a_mint)
   for s in [-1,1]:plaque(p+'_chestpocket',[(s*.08,1.15),(s*.27,1.15),(s*.26,1.37),(s*.09,1.37)],-.292,.018,a_mint,'Chest')
   dm_box(p+'_belt',(0,-.28,.82),(.72,.045,.065),a_brown,'Pelvis')
  else:
   ell(p+'_belly',(0,-.249,1.10),(.29,.055,.35),a_cream,torso_weights,n=24,m=18)
   for j in range(6):sp_cone(p+'_spine',(0,.24,1.48-j*.15),(0,.41,1.43-j*.15),.07,a_orange,torso_weights)
   at_tube(p+'_tail',[(0,.20,.75,.15),(0,.49,.60,.12),(.08,.75,.46,.07),(.24,.91,.54,.004)],a_lime,'Pelvis')
 subset(p+'_feet',foot_polygons)

# LEGS: distinct cuts with fully embedded fabric and seams.
leg_specs={
'quilted':('quilt',(.12,.16,.23),(.37,.45,.53)),
'paintshorts':('paint',(.82,.76,.61),(.10,.38,.60)),
'carpenter':('ripstop',(.31,.24,.13),(.55,.47,.29)),
'zipoffs':('ripstop',(.08,.13,.15),(.27,.47,.44)),
'koipants':('porcelain',(.08,.17,.28),(.80,.31,.10)),
'corduroy':('cord',(.24,.08,.045),(.53,.26,.12)),
'petalshorts':('petals',(.82,.56,.65),(.34,.16,.45)),
'rallypants':('rally',(.04,.04,.055),(.85,.78,.59)),
'stitchedleather':('plain',(.035,.028,.03),(.14,.10,.09)),
'footballshorts':('stars',(.025,.09,.35),(.84,.69,.21)),
'cloudbloomers':('porcelain',(.36,.65,.76),(.83,.92,.90)),
'mosaicleggings':('patch',(.10,.22,.41),(.82,.38,.26))}
for style,(kind,base,accent) in leg_specs.items():
 p='Drif_Legs_'+style;mat=at_textile(style,kind,base,accent)
 at_uv(rings(p+'_waist',[(.61,.355,.22,0,0),(.79,.355,.22,0,0)],mat,'Pelvis',28),2)
 subset(p+'_feet',foot_polygons)
 for s,label in [(-1,'R'),(1,'L')]:
  x=s*.215;w=lower_weights(label);short=style in ['paintshorts','petalshorts','footballshorts']
  if short:
   rings(p+'_calf',[leg_section(x,.22,.14),leg_section(x,.46,.15)],blue,w,20)
   sections=[leg_section(x,.42,.195),leg_section(x,.49,.207),leg_section(x,.64,.19)]
  elif style=='corduroy':sections=[leg_section(x,.21,.22),leg_section(x,.31,.205),leg_section(x,.46,.17),leg_section(x,.64,.18)]
  elif style=='cloudbloomers':sections=[leg_section(x,.23,.15),leg_section(x,.34,.225),leg_section(x,.49,.23),leg_section(x,.65,.18)]
  else:sections=[leg_section(x,.22,.15),leg_section(x,.33,.18),leg_section(x,.47,.189),leg_section(x,.64,.18)]
  at_uv(rings(p+'_fabric',sections,mat,w,28),2.2)
  for z,r in [(sections[0][0]+.018,sections[0][1]+.003),(.64,.184)]:dm_loop(p+'_stitch',(x,0,z),(r,r*1.08),.005,a_cream,w,'xy',28)
  line(p+'_outseam',[(x+s*.16,0,.25 if not short else .43),(x+s*.19,0,.46),(x+s*.18,0,.64)],.006,a_cream,w,6)
  if style in ['carpenter','paintshorts']:
   o=plaque(p+'_pocket',[(x-.07,.61),(x+.07,.61),(x+.07,.50),(x,.47),(x-.07,.50)],-.213,.018,mat,'Thigh.'+label);at_uv(o,2)
   dm_loop(p+'_hammerloop',(x+s*.19,-.02,.51),(.026,.07),.012,a_brown,'Thigh.'+label,'yz',16)
  elif style=='zipoffs':
   dm_loop(p+'_zip',(x,0,.43),(.195,.21),.009,a_silver,w,'xy',28)
   dm_loop(p+'_pull',(x+s*.14,-.16,.40),(.014,.028),.005,a_silver,w,steps=12)
  elif style=='koipants':
   for z in [.38,.56]:
    ell(p+'_koi',(x,-.216,z),(.04,.008,.065),a_orange,w,n=16,m=10)
    plaque(p+'_tail',[(x,z-.05),(x-.04,z-.10),(x+.04,z-.10)],-.225,.006,a_cream,w)
  elif style=='rallypants':
   plaque(p+'_kneepad',[(x-.09,.34),(x+.09,.34),(x+.10,.46),(x-.10,.46)],-.222,.022,a_rose,w)
  elif style=='stitchedleather':
   for j in range(8):line(p+'_crossstitch',[(x-.025,-.212,.28+j*.045),(x+.025,-.212,.30+j*.045)],.005,a_cream,w,6)
  elif style=='footballshorts':
   for z in [.31,.35]:dm_loop(p+'_sockstripe',(x,0,z),(.148,.16),.014,a_cream,'Shin.'+label,'xy',24)
 for x in [-.025,.025]:line(p+'_drawstring',[(x,-.23,.76),(x*1.8,-.247,.68)],.007,a_cream,'Pelvis',6)

# HATS / HAIR: controlled silhouette, physical folds, hair strand highlights.
p='Drif_Hat_mikutails'
# Scalp cap stays above the eyes, with separate tapered bangs.
rings(p+'_scalp',[(2.51,.56,.40,0,.07),(2.72,.50,.38,0,.08),(2.85,.33,.27,0,.08),(2.91,.01,.01,0,.08)],a_cyan,'Head',40)
for x,z in [(-.36,2.43),(-.20,2.48),(-.04,2.52),(.12,2.46),(.29,2.51),(.43,2.47)]:
 at_tube(p+'_bang',[(x*.70,-.31,2.80,.105),(x,-.46,2.63,.085),(x+.035,-.51,z,.003)],a_cyan,depth=.38)
for s in [-1,1]:
 # Roots sit behind the fins. Tails curve outward before returning at chest.
 controls=[(s*.48,.20,2.73,.10),(s*.74,.27,2.60,.15),(s*.98,.29,2.18,.17),(s*1.04,.24,1.62,.145),(s*.93,.10,1.12,.095),(s*.79,.02,.92,.003)]
 at_tube(p+'_tail',controls,a_cyan,steps=9,depth=.72)
 for j in [-1,0,1]:
  pts=[(x+s*j*r*.4,y-r*.65,z,r*.08) for x,y,z,r in controls]
  at_tube(p+'_strand',pts,a_cyanlight if j==0 else a_cyanshade,steps=9,sides=6)
 dm_loop(p+'_tie',(s*.59,.16,2.68),(.10,.14),.021,a_ink,'Head','xz',20)
 line(p+'_pinkclip',[(s*.52,-.01,2.71),(s*.65,-.01,2.71),(s*.66,-.01,2.61)],.016,a_rose,'Head')

for style in ATELIER_VARIANTS['Hat'][1:]:
 p='Drif_Hat_'+style
 if style=='frogbucket':
  rings(p+'_crown',[(2.66,.44,.36,0,.02),(2.88,.35,.30,0,.03),(2.93,.18,.16,0,.03)],a_lime,'Head',32)
  rings(p+'_brim',[(2.63,.55,.45,0,.02),(2.71,.44,.36,0,.02)],a_lime,'Head',40,caps=False)
  for s in [-1,1]:
   ell(p+'_eye',(s*.21,-.24,2.91),(.11,.10,.10),a_lime,n=20,m=12)
   ell(p+'_white',(s*.21,-.325,2.92),(.065,.025,.066),a_cream,n=16,m=10)
   ell(p+'_pupil',(s*.21,-.35,2.92),(.029,.012,.036),a_ink,n=12,m=8)
  line(p+'_smile',[(-.13,-.36,2.75),(0,-.385,2.72),(.13,-.36,2.75)],.008,a_ink,'Head')
 elif style=='ramknit':
  mat=at_textile('ramknit','knit',(.12,.10,.17),(.25,.22,.31))
  at_uv(rings(p+'_cap',[(2.65,.44,.37,0,0),(2.84,.36,.31,0,.02),(2.94,.17,.17,0,.02),(2.96,.01,.01,0,.02)],mat,'Head',32),3)
  dm_loop(p+'_cuff',(0,0,2.68),(.45,.38),.05,mat,'Head','xy',32)
  for s in [-1,1]:
   path=[]
   for j in range(30):
    t=j/29;a=t*math.tau*1.1;r=.17*(1-.70*t)
    path.append((s*(.40+r*math.cos(a)),.0,2.76+r*math.sin(a),.047*(1-.83*t)))
   at_tube(p+'_horn',path,a_cream,steps=2)
 elif style=='aviator':
  rings(p+'_leather',[(2.60,.48,.38,0,0),(2.80,.40,.33,0,.02),(2.92,.19,.18,0,.02),(2.94,.01,.01,0,.02)],a_brown,'Head',36)
  for s in [-1,1]:
   ell(p+'_flap',(s*.50,.05,2.55),(.10,.22,.26),a_brown,n=20,m=14)
   line(p+'_flaptrim',[(s*.55,-.12,2.73),(s*.57,-.14,2.53),(s*.52,-.13,2.35)],.022,a_cream,'Head')
   dm_loop(p+'_goggles',(s*.18,-.355,2.79),(.13,.08),.021,a_gold,steps=24)
   ell(p+'_glass',(s*.18,-.37,2.79),(.108,.024,.062),a_blue,n=20,m=12)
 elif style=='paperboat':
  verts=[(-.50,-.30,2.66),(.50,-.30,2.66),(.50,.30,2.66),(-.50,.30,2.66),(0,-.04,3.00),(0,.04,3.00)]
  mesh(p+'_folds',verts,[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)],a_cream,'Head',False)
  for y in [-.30,.30]:line(p+'_foldline',[(-.50,y,2.66),(0,y,2.72),(.50,y,2.66)],.01,a_paper,'Head')
  for j in range(6):line(p+'_newsprint',[(-.30+j*.08,-.307,2.68),(-.25+j*.08,-.307,2.68)],.003,a_brown,'Head')
 elif style=='donut':
  dm_loop(p+'_dough',(0,0,2.79),(.34,.29),.14,dm_tan,'Head','xy',48)
  dm_loop(p+'_icing',(0,-.01,2.86),(.34,.29),.088,dm_rose,'Head','xy',48)
  for j in range(30):
   a=j*2.399;x=.36*math.cos(a);y=.30*math.sin(a);z=2.915+.013*math.sin(j*3)
   line(p+'_sprinkle',[(x-.018,y,z),(x+.018,y+.01,z+.007)],.006,[a_cream,a_cyan,a_lime][j%3],'Head',5)
 elif style=='candlecrown':
  dm_loop(p+'_band',(0,0,2.69),(.44,.36),.022,a_gold,'Head','xy',36)
  for j in range(7):
   a=j*math.tau/7;x=.38*math.cos(a);y=.30*math.sin(a);h=.12+.08*(j%3)/2
   rings(p+'_wax',[(2.68,.038,.038,x,y),(2.68+h,.035,.035,x,y)],a_cream,'Head',16)
   at_tube(p+'_flame',[(x,y,2.68+h,.018),(x+.008,y,2.73+h,.025),(x-.009,y,2.78+h,.002)],sp_glowgold)
 elif style=='trafficcone':
  dm_box(p+'_base',(0,0,2.69),(.72,.58,.045),a_orange,'Head')
  rings(p+'_cone',[(2.71,.245,.225,0,0),(2.84,.18,.165,0,0),(2.94,.125,.12,0,0),(3.10,.055,.05,0,0)],a_orange,'Head',32)
  rings(p+'_reflective',[(2.84,.182,.167,0,0),(2.91,.145,.14,0,0)],a_porcelain,'Head',32,caps=False)
 elif style=='silverhair':
  rings(p+'_scalp',[(2.59,.50,.39,0,.03),(2.79,.40,.33,0,.04),(2.87,.12,.12,0,.04)],a_silver,'Head',32)
  for j in range(11):
   a=j*2.399;x=.37*math.cos(a);y=.29*math.sin(a)
   at_tube(p+'_lock',[(x*.7,y*.7,2.73,.12),(x,y,2.91,.09),(x*1.20,y*1.35,3.04+.04*math.sin(j),.002)],a_silver)
 elif style=='croissant':
  at_tube(p+'_pastry',[(-.49,-.03,2.70,.025),(-.35,-.07,2.83,.13),(0,-.10,2.90,.18),(.35,-.07,2.83,.13),(.49,-.03,2.70,.025)],dm_tan,steps=10)
  for x in [-.28,-.14,0,.14,.28]:line(p+'_ridge',[(x,-.24,2.78),(x-.025,-.26,2.89),(x-.04,-.18,3.00)],.012,a_paper,'Head')
 elif style=='daisybonnet':
  rings(p+'_cap',[(2.55,.51,.41,0,.05),(2.77,.44,.35,0,.04),(2.88,.17,.16,0,.04)],a_cream,'Head',36)
  for j in range(20):
   a=j*math.tau/20
   ell(p+'_ruffle',(.52*math.cos(a),-.05+.40*math.sin(a),2.60),(.065,.067,.055),a_porcelain,n=12,m=8)
  for s in [-1,1]:
   for j in range(6):
    a=j*math.tau/6;ell(p+'_petal',(s*.27+.055*math.cos(a),-.34,2.77+.055*math.sin(a)),(.039,.012,.04),a_porcelain,n=12,m=8)
   dm_disc(p+'_heart',(s*.27,-.36,2.77),.032,dm_yellow)
 else:
  ell(p+'_crown',(0,.04,2.77),(.44,.34,.20),a_purple,n=28,m=18)
  for j in range(8):
   a=j*math.tau/8;s=math.cos(a)
   at_tube(p+'_curl',[(s*.30,math.sin(a)*.23,2.75,.09),(s*.48,math.sin(a)*.38,2.60,.07),(s*.55,math.sin(a)*.43,2.48,.04),(s*.63,math.sin(a)*.42,2.56,.002)],a_purple,depth=.8)

# ACCESSORIES: compact straps, practical objects, and mixed attachment bones.
def at_strap(p,mat=a_brown):
 line(p+'_strap',[(-.26,.15,1.50),(-.30,-.17,1.44),(0,-.32,1.18),(.32,-.24,.94),(.38,.10,.92)],.019,mat,torso_weights,8)
for style in ATELIER_VARIANTS['Accessory']:
 p='Drif_Accessory_'+style
 if style=='dueldisk':
  bone='Forearm.L';x=.94
  dm_loop(p+'_brace',(x,0,1.465),(.19,.19),.028,a_silver,bone,'yz',24)
  plaque(p+'_disk',[(.66,1.43),(.79,1.65),(1.30,1.64),(1.44,1.50),(1.22,1.39)],-.26,.09,a_silver,bone)
  for j in range(5):dm_box(p+'_slot',(.78+j*.11,-.32,1.535),(.08,.014,.10),a_blue,bone)
  ell(p+'_core',(.75,-.335,1.54),(.055,.015,.055),sp_glowcyan,bone,n=16,m=10)
 elif style=='heartbag':
  at_strap(p,a_rose);dm_heart(p+'_bag',(.30,-.37,.98),.22,a_rose,'Pelvis')
  dm_heart(p+'_pocket',(.30,-.405,.98),.14,dm_burgundy,'Pelvis')
  dm_loop(p+'_zip',(.36,-.43,1.11),(.018,.025),.006,a_gold,'Pelvis',steps=14)
 elif style=='padlockharness':
  for s in [-1,1]:line(p+'_harness',[(s*.22,.16,1.52),(s*.23,-.23,1.47),(s*.17,-.30,1.07),(s*.23,.20,.88)],.032,a_ink,torso_weights)
  line(p+'_crossbar',[(-.18,-.32,1.18),(.18,-.32,1.18)],.025,a_ink,'Chest')
  dm_box(p+'_lock',(0,-.365,1.17),(.115,.045,.12),a_silver,'Chest');dm_loop(p+'_shackle',(0,-.35,1.25),(.045,.05),.012,a_silver,'Chest',steps=20)
  dm_disc(p+'_keyhole',(0,-.392,1.17),.013,a_ink,'Chest',sides=12)
 elif style=='pearlcollar':
  for j in range(22):
   a=j*math.tau/22;ell(p+'_pearl',(.29*math.cos(a),.205*math.sin(a),1.49),(.027,.027,.027),a_porcelain,'Chest',n=12,m=8)
  for s in [-1,1]:plaque(p+'_ribbon',[(0,1.46),(s*.12,1.51),(s*.13,1.39),(0,1.44)],-.245,.024,a_rose,'Chest')
  dm_heart(p+'_pendant',(0,-.27,1.35),.052,a_gold,'Chest')
 elif style=='umbrellasling':
  at_strap(p)
  at_tube(p+'_folded',[(-.29,.32,.85,.07),(-.43,.33,1.45,.10),(-.62,.32,2.18,.12),(-.68,.31,2.40,.004)],a_blue,'Chest')
  for j in [-1,1]:line(p+'_rib',[(-.29+j*.025,.235,.85),(-.43+j*.065,.24,1.45),(-.62+j*.07,.25,2.16),(-.68,.31,2.4)],.006,a_silver,'Chest')
  at_tube(p+'_handle',[(-.29,.32,.85,.016),(-.24,.32,.68,.016),(-.15,.32,.65,.016),(-.11,.32,.72,.016)],a_gold,'Chest')
 elif style=='keytar':
  at_strap(p,a_ink)
  plaque(p+'_keyboard',[(-.39,.97),(.29,.97),(.52,1.28),(.42,1.32),(.20,1.16),(-.39,1.16)],-.40,.07,a_rose,torso_weights)
  for j in range(10):
   dm_box(p+'_key',(-.33+j*.056,-.447,1.06),(.051,.016,.13),a_porcelain,torso_weights)
   if j%7 not in [2,6]:dm_box(p+'_blackkey',(-.30+j*.056,-.46,1.09),(.024,.019,.068),a_ink,torso_weights)
  dm_loop(p+'_dial',(.38,-.45,1.23),(.025,.025),.008,a_silver,torso_weights,steps=16)
 elif style=='toolbelt':
  dm_loop(p+'_belt',(0,0,.84),(.43,.29),.031,a_brown,'Pelvis','xy',32)
  for x in [-.29,.29]:
   plaque(p+'_pouch',[(x-.08,.85),(x+.08,.85),(x+.07,.67),(x-.07,.67)],-.27,.08,a_paper,'Pelvis')
  line(p+'_hammer',[(-.29,-.37,.75),(-.29,-.37,1.04)],.019,a_brown,'Pelvis');dm_box(p+'_hammerhead',(-.29,-.37,1.05),(.12,.045,.045),a_silver,'Pelvis')
  for x in [.24,.29,.34]:line(p+'_tool',[(x,-.36,.74),(x,-.36,1.00)],.009,a_silver,'Pelvis')
 elif style=='ribboncape':
  dm_loop(p+'_neck',(0,0,1.50),(.28,.21),.024,a_gold,'Chest','xy',28)
  for j in range(7):
   x=(j-3)*.10
   at_tube(p+'_ribbon',[(x,.21,1.48,.065),(x*1.7,.35,1.21,.06),(x*2.3,.46,.85,.05),(x*2.4,.56,.62+.1*math.sin(j),.006)],[a_rose,a_blue,a_gold][j%3],torso_weights,depth=.16)
 elif style=='bedroll':
  at_strap(p)
  line(p+'_roll',[(-.47,.40,1.48),(.47,.40,1.48)],.17,a_mint,'Chest',24)
  for x in [-.30,.30]:dm_loop(p+'_ties',(x,.40,1.48),(.176,.176),.022,a_brown,'Chest','yz',28)
  for s in [-1,1]:
   pts=[]
   for j in range(40):
    t=j/39;a=t*math.tau*2.3;r=.02+.13*t;pts.append((s*.48,.40+r*math.cos(a),1.48+r*math.sin(a)))
   line(p+'_spiral',pts,.008,a_cream,'Chest',5)
 elif style=='bubblepack':
  for s in [-1,1]:line(p+'_strap',[(s*.23,.27,1.49),(s*.29,-.22,1.42),(s*.30,-.24,.98),(s*.23,.27,.88)],.023,a_blue,torso_weights)
  ell(p+'_tank',(.35,.34,1.45),(.30,.25,.40),a_glass,'Chest',n=28,m=20)
  dm_loop(p+'_rim',(.35,.34,1.10),(.22,.20),.035,a_silver,'Chest','xy',28)
  for j in range(8):ell(p+'_bubble',(.35+.14*math.sin(j*2.3),.24,1.19+j*.061),(.024,.023,.024),a_porcelain,'Chest',n=10,m=8)
 elif style=='windupkey':
  line(p+'_stem',[(0,.22,1.35),(0,.68,1.35)],.045,a_gold,'Chest',12)
  for s in [-1,1]:dm_loop(p+'_loop',(s*.17,.70,1.45),(.16,.15),.039,a_gold,'Chest','xz',28)
 else:
  dm_loop(p+'_belt',(0,0,.91),(.43,.29),.059,a_ink,'Pelvis','xy',40)
  plaque(p+'_plate',[(-.19,.82),(.19,.82),(.23,.92),(.17,1.02),(-.17,1.02),(-.23,.92)],-.34,.04,a_gold,'Pelvis')
  star(p+'_emblem',(0,-.39,.92),.08,.035,a_porcelain,'Pelvis',points=5)
  for s in [-1,1]:dm_disc(p+'_sideplate',(s*.31,-.25,.91),.06,a_gold,'Pelvis',sides=12)

# REPLACEMENT HEADS: complete facial designs, centered at the original skull,
# with lower silhouettes reaching the collar. Facial selections remain stored.
def at_headeyes(p,x=.25,z=2.30,white_mat=a_porcelain,pupil=a_ink):
 for s in [-1,1]:
  ell(p+'_eye',(s*x,-.54,z),(.115,.042,.145),white_mat,n=20,m=14)
  ell(p+'_pupil',(s*x,-.58,z),(.049,.012,.085),pupil,n=16,m=10)
  ell(p+'_shine',(s*x-.02,-.595,z+.04),(.016,.006,.022),glint,n=10,m=8)
for style in ATELIER_VARIANTS['Head']:
 p='Drif_Head_'+style
 if style=='porcelainfox':
  ell(p+'_skull',(0,0,2.16),(.66,.49,.70),a_porcelain,n=36,m=24)
  ell(p+'_muzzle',(0,-.47,1.99),(.29,.16,.22),a_porcelain,n=24,m=18)
  for s in [-1,1]:
   sp_cone(p+'_ear',(s*.42,.03,2.57),(s*.61,.02,3.01),.21,a_porcelain,sides=16)
   plaque(p+'_earinner',[(s*.36,2.62),(s*.57,2.92),(s*.58,2.63)],-.13,.01,a_rose)
   line(p+'_eye',[(s*.12,-.505,2.32),(s*.27,-.55,2.28),(s*.43,-.43,2.37)],.023,a_ink,'Head')
   line(p+'_mark',[(s*.40,-.44,2.16),(s*.49,-.36,2.08),(s*.36,-.49,2.02)],.018,a_rose,'Head')
  ell(p+'_nose',(0,-.642,2.04),(.062,.035,.043),a_ink,n=16,m=10)
  line(p+'_mouth',[(-.11,-.61,1.91),(0,-.635,1.88),(.11,-.61,1.91)],.012,a_rose,'Head')
 elif style=='plushbunny':
  ell(p+'_plush',(0,0,2.15),(.67,.50,.69),a_cream,n=32,m=24)
  for s in [-1,1]:
   ell(p+'_ear',(s*.34,.06,2.79),(.16,.14,.35),a_cream,n=24,m=18)
   ell(p+'_pinkear',(s*.34,-.067,2.85),(.088,.025,.23),dm_rose,n=20,m=14)
   ell(p+'_cheek',(s*.20,-.465,1.96),(.23,.13,.20),a_porcelain,n=24,m=16)
  at_headeyes(p,.25,2.30,a_ink,a_ink)
  dm_heart(p+'_nose',(0,-.62,2.06),.054,dm_rose)
  for j in range(8):line(p+'_seam',[(-.03,-.50,2.53+j*.032),(.03,-.50,2.53+j*.032)],.004,a_brown,'Head',5)
 elif style=='cobaltmecha':
  ell(p+'_dark',(0,0,2.15),(.65,.47,.70),a_ink,n=24,m=18)
  plaque(p+'_brow',[(-.60,2.27),(-.53,2.67),(-.20,2.84),(.20,2.84),(.53,2.67),(.60,2.27),(0,2.43)],-.40,.39,a_blue)
  plaque(p+'_jaw',[(-.52,1.98),(-.43,1.62),(0,1.46),(.43,1.62),(.52,1.98),(0,1.84)],-.43,.36,a_silver)
  for s in [-1,1]:
   plaque(p+'_visor',[(s*.06,2.25),(s*.47,2.31),(s*.41,2.16),(s*.08,2.14)],-.54,.02,sp_glowcyan)
   dm_box(p+'_temple',(s*.62,.02,2.25),(.12,.47,.42),a_blue,'Head')
   for j in range(3):line(p+'_jawvent',[(s*.13,-.49,1.69+j*.055),(s*.28,-.49,1.73+j*.055)],.009,a_ink,'Head')
 elif style=='bonsaipot':
  rings(p+'_pot',[(1.46,.38,.30,0,0),(1.60,.53,.40,0,0),(2.08,.65,.46,0,0),(2.16,.67,.48,0,0)],a_blue,'Head',40)
  dm_loop(p+'_lip',(0,0,2.14),(.67,.48),.035,a_gold,'Head','xy',40)
  ell(p+'_soil',(0,0,2.15),(.62,.43,.045),a_brown,n=28,m=12)
  at_tube(p+'_trunk',[(0,0,2.15,.12),(-.12,.02,2.40,.10),(.09,.02,2.62,.075),(.03,.03,2.78,.035)],a_brown)
  for x,y,z,rx in [(-.31,0,2.56,.28),(.24,.02,2.67,.32),(-.06,.07,2.85,.32)]:
   ell(p+'_foliage',(x,y,z),(rx,.23,.12),a_mint,n=20,m=12)
   for j in range(6):ell(p+'_leaf',(x+rx*.6*math.cos(j*2.4),y-.10,z+.035),(.085,.10,.064),a_lime,n=12,m=8)
  for s in [-1,1]:dm_disc(p+'_eye',(s*.23,-.459,1.94),.045,a_porcelain)
  line(p+'_smile',[(-.14,-.42,1.76),(0,-.46,1.71),(.14,-.42,1.76)],.012,a_gold,'Head')
 elif style=='discoball':
  ell(p+'_core',(0,0,2.15),(.66,.53,.70),a_ink,n=28,m=20)
  for row in range(14):
   lat=.12+(math.pi-.24)*row/13
   for j in range(24):
    lon=j*math.tau/24;verts=[]
    for da,db in [(-.058,-.094),(.058,-.094),(.058,.094),(-.058,.094)]:
     a=lat+da;b=lon+db;verts.append((.671*math.sin(a)*math.cos(b),.541*math.sin(a)*math.sin(b),2.15+.712*math.cos(a)))
    mesh(p+'_mirror',verts,[(0,1,2,3)],a_silver if (j+row)%4 else a_cyan,'Head',False)
  for s in [-1,1]:ell(p+'_eye',(s*.23,-.547,2.27),(.055,.02,.082),a_ink,n=16,m=10)
  line(p+'_smile',[(-.14,-.526,2.02),(0,-.548,1.98),(.14,-.526,2.02)],.014,a_ink,'Head')
 elif style=='paperbag':
  verts=[(-.52,-.40,1.47),(.52,-.40,1.47),(.56,.38,1.47),(-.56,.38,1.47),(-.62,-.41,2.70),(.62,-.41,2.70),(.60,.38,2.75),(-.60,.38,2.75)]
  mesh(p+'_bag',verts,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(0,3,2,1)],a_paper,'Head',False)
  for s in [-1,1]:
   ell(p+'_cutout',(s*.23,-.425,2.28),(.10,.012,.13),a_ink,n=24,m=14)
   line(p+'_fold',[(s*.48,-.42,1.51),(s*.39,-.43,1.80),(s*.57,-.43,2.61)],.006,a_brown,'Head')
  line(p+'_mouth',[(-.16,-.425,1.94),(0,-.427,1.91),(.16,-.425,1.96)],.014,a_ink,'Head')
  for j in range(10):line(p+'_topfold',[(-.53+j*.118,-.43,2.68),(-.48+j*.118,-.43,2.72)],.006,a_cream,'Head')
 elif style=='moonface':
  ell(p+'_moon',(0,0,2.15),(.67,.52,.70),a_cream,n=36,m=24)
  for x,z,r in [(-.44,2.45,.08),(.38,2.58,.10),(.48,2.08,.06),(-.32,1.77,.07),(.10,2.74,.05)]:
   y=-.52*math.sqrt(max(.05,1-(x/.67)**2-((z-2.15)/.70)**2))
   ell(p+'_crater',(x,y-.002,z),(r,.012,r),a_paper,n=20,m=10)
   dm_loop(p+'_craterrim',(x,y-.013,z),(r,r),.01,a_cream,steps=24)
  for s in [-1,1]:line(p+'_sleep',[(s*.12,-.52,2.26),(s*.25,-.54,2.20),(s*.38,-.46,2.26)],.013,a_brown,'Head')
  ell(p+'_nose',(0,-.52,2.08),(.06,.09,.10),a_cream,n=20,m=12)
  line(p+'_smile',[(-.12,-.50,1.94),(0,-.53,1.90),(.12,-.50,1.94)],.012,a_brown,'Head')
 elif style=='divingbell':
  ell(p+'_helmet',(0,0,2.18),(.67,.53,.69),a_gold,n=32,m=24)
  rings(p+'_collar',[(1.45,.40,.32,0,0),(1.60,.48,.37,0,0)],a_gold,'Head',32)
  dm_loop(p+'_porthole',(0,-.49,2.24),(.40,.43),.055,a_silver,steps=48)
  ell(p+'_window',(0,-.51,2.24),(.35,.06,.38),a_blue,n=32,m=24)
  for j in range(10):
   a=j*math.tau/10;ell(p+'_bolt',(.40*math.cos(a),-.548,2.24+.43*math.sin(a)),(.019,.012,.019),a_ink,n=10,m=8)
  for s in [-1,1]:ell(p+'_gloweye',(s*.14,-.575,2.27),(.043,.01,.066),sp_glowgold,n=14,m=10)
  for s in [-1,1]:dm_loop(p+'_sideport',(s*.62,0,2.19),(.16,.18),.025,a_silver,'Head','yz',28)
 elif style=='embroidereddoll':
  mat=at_textile('doll','knit',(.43,.22,.34),(.73,.49,.58));at_uv(ell(p+'_cloth',(0,0,2.15),(.67,.50,.70),mat,n=36,m=24),2)
  for s in [-1,1]:
   dm_disc(p+'_button',(s*.26,-.49,2.29),.115,a_cream,depth=.025)
   for dx in [-.025,.025]:
    for dz in [-.025,.025]:dm_disc(p+'_hole',(s*.26+dx,-.521,2.29+dz),.011,a_brown,sides=8)
   line(p+'_thread',[(s*.26-.03,-.53,2.26),(s*.26+.03,-.53,2.32)],.007,a_rose,'Head')
  for j in range(8):line(p+'_stitch',[(-.17+j*.05,-.48,1.94),(-.14+j*.05,-.48,1.88)],.008,a_brown,'Head')
 elif style=='copperoni':
  ell(p+'_mask',(0,0,2.15),(.67,.49,.70),a_gold,n=28,m=20)
  for s in [-1,1]:
   at_tube(p+'_horn',[(s*.40,.02,2.64,.14),(s*.52,.02,2.90,.09),(s*.48,-.01,3.07,.002)],a_cream)
   plaque(p+'_eye',[(s*.09,2.29),(s*.42,2.39),(s*.39,2.22),(s*.11,2.20)],-.51,.025,a_ink)
   ell(p+'_iris',(s*.25,-.542,2.28),(.038,.012,.035),a_rose,n=12,m=8)
   at_tube(p+'_tusk',[(s*.26,-.46,1.86,.055),(s*.31,-.57,2.02,.035),(s*.28,-.59,2.12,.002)],a_cream)
  ell(p+'_nose',(0,-.47,2.12),(.12,.12,.12),a_gold,n=20,m=14)
  line(p+'_snarl',[(-.23,-.45,1.90),(0,-.52,1.85),(.23,-.45,1.90)],.032,a_ink,'Head')
 elif style=='cloudhead':
  ell(p+'_core',(0,0,2.14),(.65,.48,.68),a_porcelain,n=28,m=20)
  for x,y,z,rx,rz in [(-.46,0,2.28,.23,.25),(.46,0,2.28,.23,.25),(-.26,.02,2.61,.28,.27),(.18,.02,2.67,.31,.27),(0,.05,1.65,.40,.19)]:ell(p+'_puff',(x,y,z),(rx,.36,rz),a_porcelain,n=24,m=16)
  for s in [-1,1]:ell(p+'_eye',(s*.23,-.49,2.23),(.055,.018,.082),a_blue,n=16,m=10)
  line(p+'_mouth',[(-.10,-.48,2.02),(0,-.51,1.99),(.10,-.48,2.02)],.014,a_blue,'Head')
 else:
  dm_box(p+'_die',(0,0,2.13),(1.28,.98,1.28),a_porcelain,'Head')
  for x,z in [(-.28,2.42),(.28,2.42),(0,2.13),(-.28,1.84),(.28,1.84)]:ell(p+'_pip',(x,-.50,z),(.078,.012,.078),a_ink,n=20,m=12)
  for s in [-1,1]:
   for z in [1.92,2.35]:ell(p+'_sidepip',(s*.65,-.12,z),(.009,.07,.07),a_rose,n=16,m=10)

# EXTRAS: objects and effects only. Centers are offset around the skull with
# varied depth and rotation; no object sits across the face or chest center.
def at_rotate_group(objects,pivot,angles):
 from mathutils import Euler
 matrix=Euler(angles).to_matrix();pivot=Vector(pivot)
 for obj in objects:
  for v in obj.data.vertices:v.co=pivot+matrix@(v.co-pivot)

def at_satellites():return [(-.86,-.30,2.55),(.90,.20,2.72),(-.91,.26,1.68),(.86,-.23,1.51),(-.48,.25,3.01),(.52,.09,1.04)]
for style in ATELIER_VARIANTS['Extra']:
 p='Drif_Extra_'+style
 if style=='shatteredmirror':
  for j,(x,y,z) in enumerate(at_satellites()):
   before=set(collection.objects);r=.14 if j%2 else .20
   plaque(p+'_shard',[(x-r,z-.07),(x-.05,z+r),(x+r*.8,z+.04),(x+r*.45,z-r)],y,.015,a_silver,'Chest')
   line(p+'_glint',[(x-r*.5,y-.02,z-.04),(x+.04,y-.02,z+r*.6)],.006,glint,'Chest')
   at_rotate_group(set(collection.objects)-before,(x,y,z),(.18*j,.32*(-1)**j,.20*j))
 elif style in ['firehoop','waterhoop']:
  mat=sp_glowgold if style=='firehoop' else a_glass
  pts=[(1.03*math.cos(j*math.tau/80),.42+.16*math.sin(j*math.tau/80),2.18+.91*math.sin(j*math.tau/80)) for j in range(81)]
  line(p+'_hoop',pts,.028 if style=='firehoop' else .045,mat,'Chest',12)
  for j in range(18):
   a=j*math.tau/18;x=1.04*math.cos(a);z=2.18+.92*math.sin(a);y=.44+.17*math.sin(a)
   if style=='firehoop':at_tube(p+'_flame',[(x,y,z,.034),(x+.07*math.cos(a),y-.025,z+.10,.045),(x+.11*math.cos(a),y,z+.19,.002)],sp_glowpink if j%3==0 else sp_glowgold,'Chest')
   else:ell(p+'_drop',(x,y-.03,z),(.045,.035,.07),a_glass,'Chest',n=16,m=10)
 elif style=='talismans':
  for j,(x,y,z) in enumerate(at_satellites()):
   before=set(collection.objects)
   plaque(p+'_paper',[(x-.07,z-.14),(x+.075,z-.12),(x+.06,z+.16),(x-.065,z+.14)],y,.006,a_cream,'Chest')
   for k in range(4):line(p+'_script',[(x-.035,y-.013,z+.09-k*.055),(x+.03,y-.013,z+.07-k*.055),(x-.01,y-.013,z+.04-k*.055)],.006,a_rose,'Chest',5)
   at_rotate_group(set(collection.objects)-before,(x,y,z),(.18*j,.40*(-1)**j,.30*(-1)**j))
 elif style=='coinshower':
  for j in range(15):
   s=-1 if j%2 else 1;x=s*(.78+.18*math.sin(j*2.4));z=1.31+(j%6)*.30;y=-.22+.14*(j%4);before=set(collection.objects)
   dm_disc(p+'_coin',(x,y,z),.075,a_gold,'Chest',sides=24,depth=.025)
   dm_loop(p+'_rim',(x,y-.01,z),(.059,.059),.005,a_cream,'Chest',steps=24)
   star(p+'_stamp',(x,y-.016,z),.034,.014,a_cream,'Chest')
   at_rotate_group(set(collection.objects)-before,(x,y,z),(j*.19,j*.33,j*.1))
 elif style=='floppydisks':
  for j,(x,y,z) in enumerate(at_satellites()[:5]):
   before=set(collection.objects);dm_box(p+'_disk',(x,y,z),(.22,.026,.24),[a_rose,a_blue,a_purple][j%3],'Chest')
   dm_box(p+'_metal',(x,y-.02,z+.055),(.13,.014,.08),a_silver,'Chest');dm_box(p+'_label',(x,y-.02,z-.055),(.16,.012,.075),a_cream,'Chest')
   for k in range(2):line(p+'_ink',[(x-.06,y-.03,z-.04-k*.025),(x+.04,y-.03,z-.04-k*.025)],.003,a_blue,'Chest',5)
   at_rotate_group(set(collection.objects)-before,(x,y,z),(.24*j,.28*(-1)**j,.2*j))
 elif style=='neondoor':
  for w,mat in [(1.00,sp_glowcyan),(.95,sp_glowpink)]:
   line(p+'_door',[(-w,.48,.90),(-w,.48,2.95),(w,.48,2.95),(w,.48,.90)],.018,mat,'Chest',8)
  for s in [-1,1]:line(p+'_perspective',[(s*1.0,.48,2.95),(s*.84,.82,2.80),(s*.84,.82,1.00)],.009,a_blue,'Chest',6)
 elif style=='vinylorbit':
  for j,(x,y,z) in enumerate(at_satellites()[:5]):
   before=set(collection.objects);dm_disc(p+'_vinyl',(x,y,z),.17,a_ink,'Chest',sides=40,depth=.012)
   for r in [.10,.13,.15]:dm_loop(p+'_groove',(x,y-.009,z),(r,r),.002,a_silver,'Chest',steps=40)
   dm_disc(p+'_label',(x,y-.017,z),.061,[a_rose,a_lime,a_cyan][j%3],'Chest',sides=24)
   dm_disc(p+'_hole',(x,y-.024,z),.012,a_ink,'Chest',sides=12)
   at_rotate_group(set(collection.objects)-before,(x,y,z),(.2*j,.3*(-1)**j,.1*j))
 elif style=='confettiburst':
  rng=random.Random(320)
  for j in range(70):
   a=rng.random()*math.tau;x=(.85+rng.random()*.23)*math.cos(a);z=2.15+(.80+rng.random()*.24)*math.sin(a);y=rng.uniform(-.30,.40)
   obj=dm_box(p+'_paper',(x,y,z),(.018,.009,.05),[a_rose,a_cyan,a_gold,a_lime,a_purple][j%5],'Chest')
   at_rotate_group([obj],(x,y,z),(rng.random(),rng.random(),rng.random()*3))
 elif style=='chessfloat':
  for j,(x,y,z) in enumerate(at_satellites()[:4]):
   mat=a_porcelain if j%2 else a_ink;before=set(collection.objects)
   rings(p+'_base',[(z-.17,.09,.09,x,y),(z-.13,.09,.09,x,y),(z-.09,.055,.055,x,y),(z+.08,.038,.038,x,y)],mat,'Chest',24)
   if j%2:ell(p+'_pawn',(x,y,z+.10),(.065,.065,.067),mat,'Chest',n=20,m=12)
   else:
    dm_box(p+'_cross',(x,y,z+.14),(.028,.035,.13),mat,'Chest');dm_box(p+'_crossarm',(x,y,z+.16),(.10,.035,.025),mat,'Chest')
   at_rotate_group(set(collection.objects)-before,(x,y,z),(.15*j,.20*j,.18*(-1)**j))
 elif style=='solareclipse':
  dm_disc(p+'_moon',(0,.63,2.29),.91,a_ink,'Chest',sides=72,depth=.015)
  dm_loop(p+'_corona',(0,.61,2.29),(.93,.93),.023,sp_glowgold,'Chest',steps=80)
  for j in range(48):
   a=j*math.tau/48;r=1+.035*math.sin(j*2.7)
   line(p+'_ray',[(.95*math.cos(a),.62,2.29+.95*math.sin(a)),(r*math.cos(a),.64,2.29+r*math.sin(a))],.006,sp_glowgold,'Chest',5)
 else:
  for j in range(3):
   controls=[]
   for k in range(34):
    a=k/33*math.tau*.85+j*math.tau/3
    controls.append(((.88+j*.065)*math.cos(a),.35+(.20+j*.09)*math.sin(a+j*.7),2.1+(.68+j*.12)*math.sin(a),.026))
   at_tube(p+'_ribbon',controls,[a_rose,a_cyan,a_gold][j],'Chest',sides=8,steps=2,depth=.12)

# FIN EARS: all twelve retain the original attachment, facets and silhouette.
# Shape edits use a root-preserving falloff rather than scaling the whole head.
for style in ATELIER_VARIANTS['Ears']:
 p='Drif_Ears_'+style;obj=subset(p+'_fin',groups['Drif_Ears_original'])
 for v in obj.data.vertices:
  s=1 if v.co.x>=0 else -1;x=abs(v.co.x);z=v.co.z;t=max(0,min(1,(x-.50)/.53));dz=z-2.29
  if style=='notchedfins':
   notch=math.exp(-((z-2.57)/.07)**2)*t*.16;v.co.x=s*(x-notch)
  elif style=='foldedfins':
   fold=max(0,z-2.55);v.co.z-=fold*.67;v.co.y-=fold*.80;v.co.x+=s*fold*.13
  elif style=='sweptfins':v.co.y+=t*.24;v.co.z+=t*.14;v.co.x=s*(x-.05*t)
  elif style=='ribbonfins':v.co.x=s*(x+.07*t*math.sin(dz*9));v.co.y+=t*.13*math.sin(dz*7);v.co.z=2.29+dz*(1+.17*t)
 if style in ['charredfins','opalfins','glassfins','gildedfins','patchworkfins']:
  mats={'charredfins':[a_ink,a_brown,a_orange],'opalfins':[a_porcelain,a_cyanlight,dm_lilac],'glassfins':[a_glass,a_porcelain],'gildedfins':[a_gold,a_cream],'patchworkfins':[a_cream,dm_lilac,a_cyan,a_paper]}[style]
  obj.data.materials.clear()
  for mat in mats:obj.data.materials.append(mat)
  for f in obj.data.polygons:f.material_index=(f.index*7//9)%len(mats)
 for s in [-1,1]:
  if style=='piercedfins':
   for j in range(3):dm_loop(p+'_ring',(s*(.80+j*.055),-.055,2.34+j*.14),(.042,.059),.011,a_silver,steps=24)
  elif style=='ribbedfins':
   for j in range(5):
    z=1.99+j*.15
    line(p+'_rib',[(s*.57,-.04,2.22),(s*.78,-.12,z),(s*.94,-.04,z+.05)],.009,a_gold,'Head',6)
  elif style=='patchworkfins':
   for j in range(5):line(p+'_stitch',[(s*.79,-.155,2.02+j*.14),(s*.85,-.155,2.07+j*.14)],.007,a_brown,'Head',5)
  elif style=='lacefins':
   for row in range(4):
    for col in range(2):
     x=s*(.72+col*.12);z=2.08+row*.15
     dm_loop(p+'_lace',(x,-.14,z),(.043,.060),.005,a_cream,steps=18)
  elif style=='gildedfins':
   line(p+'_filigree',[(s*.68,-.12,2.04),(s*.86,-.14,2.22),(s*.78,-.14,2.47),(s*.91,-.08,2.69)],.009,a_silver,'Head')
  elif style=='opalfins':
   for j in range(4):star(p+'_glint',(s*(.75+.06*(j%2)),-.14,2.10+j*.16),.025,.008,a_porcelain,points=4)
  elif style=='glassfins':
   line(p+'_caustic',[(s*.70,-.14,2.08),(s*.82,-.16,2.23),(s*.76,-.15,2.45),(s*.87,-.11,2.64)],.008,a_porcelain,'Head')

# NOSES retain the original muzzle attachment; ornamentation is very compact.
for style in ATELIER_VARIANTS['Nose']:
 p='Drif_Nose_'+style
 if style=='bandage':
  obj=plaque(p+'_cloth',[(-.135,1.935),(.13,1.97),(.12,2.055),(-.145,2.02)],-.66,.02,a_paper)
  for s in [-1,1]:
   for j in range(3):dm_disc(p+'_holes',(s*.09,-.684,1.973+j*.019),.004,a_brown,sides=6)
  dm_box(p+'_pad',(0,-.686,1.995),(.065,.009,.07),a_cream,'Head')
 elif style=='fuzzynose':
  ell(p+'_core',(0,-.66,1.99),(.10,.06,.07),a_ink,n=20,m=14)
  rng=random.Random(63)
  for j in range(55):
   a=rng.random()*math.tau;r=rng.random();x=.09*r*math.cos(a);z=1.99+.06*r*math.sin(a)
   line(p+'_fiber',[(x,-.69,z),(x*1.16,-.72-r*.01,1.99+(z-1.99)*1.16)],.0025,a_brown,'Head',4)
 elif style=='septum':
  subset(p+'_nose',groups['Drif_Nose_original']);dm_loop(p+'_ring',(0,-.701,1.94),(.043,.043),.008,a_silver,steps=28)
  for s in [-1,1]:ell(p+'_ball',(s*.031,-.702,1.912),(.012,.011,.012),a_silver,n=10,m=8)
 elif style=='starnose':star(p+'_star',(0,-.70,1.99),.084,.035,a_gold,points=5)
 elif style=='skullnose':
  for s in [-1,1]:plaque(p+'_hole',[(s*.012,2.04),(s*.075,1.955),(s*.018,1.95)],-.684,.01,a_ink)
 elif style=='slitnose':
  for s in [-1,1]:line(p+'_nostril',[(s*.035,-.675,1.97),(s*.05,-.668,2.02)],.009,a_ink,'Head')
 elif style=='foxnose':
  ell(p+'_nose',(0,-.68,1.99),(.085,.055,.057),a_ink,n=20,m=12)
  ell(p+'_glint',(-.024,-.729,2.014),(.024,.004,.009),a_porcelain,n=12,m=6)
 elif style=='cherrynose':
  for s in [-1,1]:ell(p+'_cherry',(s*.041,-.69,1.98),(.046,.043,.048),a_rose,n=18,m=12)
  line(p+'_stem',[(-.04,-.69,2.02),(0,-.67,2.09),(.04,-.69,2.02)],.006,a_mint,'Head')
 elif style=='frostnose':
  sp_cone(p+'_crystal',(0,-.65,2.00),(0,-.79,1.96),.075,a_cyanlight,sides=6)
  star(p+'_flake',(-.028,-.759,2.005),.018,.006,a_porcelain,points=6)
 elif style=='brasssnout':
  ell(p+'_plate',(0,-.66,2.00),(.09,.05,.064),a_gold,n=20,m=12)
  for s in [-1,1]:ell(p+'_nostril',(s*.038,-.706,1.985),(.018,.008,.015),a_ink,n=12,m=8)
 elif style=='leafnose':
  plaque(p+'_leaf',[(-.08,1.98),(-.03,2.04),(.09,2.06),(.04,1.96),(-.01,1.945)],-.69,.018,a_mint)
  line(p+'_vein',[(-.07,-.714,1.97),(.07,-.714,2.045)],.004,a_lime,'Head',5)
 else:
  subset(p+'_nose',groups['Drif_Nose_original'])
  line(p+'_pin',[(-.085,-.712,2.00),(.075,-.712,2.00),(.09,-.712,2.025),(.07,-.712,2.047),(-.085,-.712,2.00)],.005,a_silver,'Head',6)
  dm_box(p+'_clasp',(-.08,-.713,2.00),(.026,.013,.025),a_silver,'Head')

# TATTOOS: thin surface-following geometry avoids floating stickers.
for style in ATELIER_VARIANTS['Tattoo']:
 p='Drif_Tattoo_'+style
 for s in [-1,1]:
  x=s*.48;z=2.03
  if style=='cardsuits':
   if s<0:sg_mark(p,[(x,z-.07),(x-.055,z),(x-.04,z+.045),(x,z+.02),(x+.04,z+.045),(x+.055,z)])
   else:sg_mark(p,[(x,z+.07),(x-.045,z),(x,z-.07),(x+.045,z)])
  elif style=='spiderseal':
   sg_mark(p,[(x+.024*math.cos(j*math.tau/16),z+.045*math.sin(j*math.tau/16)) for j in range(16)])
   for side in [-1,1]:
    for j in range(4):sg_inkline(p,[(x+side*.015,z+.02-j*.014),(x+side*.06,z+.055-j*.03),(x+side*.075,z+.08-j*.045)],.004)
  elif style=='barcode':
   for j in range(10):sg_inkline(p,[(x-.05+j*.011,z-.05),(x-.05+j*.011,z+.035-(j%3)*.01)],.002 if j%2 else .004)
  elif style=='koiwave':
   for k in range(3):sg_inkline(p,[(x-.055+j*.014,z-.06*k+.018*math.sin(j*.8+k)) for j in range(9)],.005)
  elif style=='stitchedscar':
   sg_inkline(p,[(x-.015,z+.10),(x+.01,z),(x-.01,z-.13)],.005)
   for j in range(6):sg_inkline(p,[(x-.036,z+.08-j*.039),(x+.035,z+.06-j*.039)],.004)
  elif style=='honeycomb':
   for k in range(3):
    xx=x+(k%2)*.035;zz=z-k*.052
    sg_inkline(p,[(xx+.032*math.cos(j*math.tau/6),zz+.032*math.sin(j*math.tau/6)) for j in range(7)],.003)
  elif style=='blossomink':
   for j in range(5):
    a=j*math.tau/5;xx=x+.035*math.cos(a);zz=z+.035*math.sin(a)
    sg_inkline(p,[(xx+.023*math.cos(k*math.tau/12),zz+.026*math.sin(k*math.tau/12)) for k in range(13)],.003)
   sg_inkline(p,[(x,z-.05),(x+.015,z-.16)],.004)
  elif style=='sunsigil':
   sg_inkline(p,[(x+.03*math.cos(j*math.tau/24),z+.03*math.sin(j*math.tau/24)) for j in range(25)],.004)
   for j in range(8):
    a=j*math.tau/8;sg_inkline(p,[(x+.047*math.cos(a),z+.047*math.sin(a)),(x+.067*math.cos(a),z+.067*math.sin(a))],.004)
  elif style=='constellation':
   pts=[(x-.04,z+.06),(x+.02,z+.02),(x-.02,z-.04),(x+.04,z-.10)];sg_inkline(p,pts,.0025)
   for xx,zz in pts:sg_mark(p,[(xx+.008*math.cos(j*math.tau/8),zz+.008*math.sin(j*math.tau/8)) for j in range(8)])
  elif style=='warpaint':
   for k in range(3):sg_mark(p,[(x-.055,z+.03-k*.045),(x+.06,z+.045-k*.045),(x+.045,z+.026-k*.045),(x-.05,z+.01-k*.045)])
  elif style=='crackedink':
   sg_inkline(p,[(x,z+.11),(x-.02,z+.05),(x+.015,z),(x-.005,z-.09),(x+.03,z-.15)],.003)
   sg_inkline(p,[(x-.02,z+.05),(x-.06,z+.02),(x-.07,z-.03)],.0025)
  else:
   sg_mark(p,[(x+.02*math.cos(j*math.tau/16),z+.014*math.sin(j*math.tau/16)) for j in range(16)])
   sg_inkline(p,[(x+.02,z),(x+.02,z+.09),(x+.06,z+.07)],.005)

# BROWS: sculpted strips and lightweight details, all fitted to the actual head.
for style in ATELIER_VARIANTS['Brows']:
 p='Drif_Brows_'+style
 for s in [-1,1]:
  arch=[(.13,2.46),(.23,2.52),(.34,2.52),(.46,2.46)]
  if style=='threadbrows':
   br_strip(p,s,arch,[.009,.025,.025,.004],a_ink)
   for j in range(6):sg_inkline(p,[(s*(.16+j*.05),2.48+.02*math.sin(j)),(s*(.18+j*.05),2.54+.02*math.sin(j))],.006)
  elif style=='beadbrows':
   for j in range(8):
    x=s*(.14+j*.042);z=2.47+.048*math.sin(j*math.pi/7);pos=br_point(x,z,.035)
    ell(p+'_bead',pos,(.016,.011,.018),a_gold,n=10,m=8)
  elif style=='doublebrows':
   for z in [0,.055]:br_strip(p,s,[(x,zz+z) for x,zz in arch],[.005,.017,.017,.003],a_ink)
  elif style=='hookbrows':br_strip(p,s,[(.13,2.49),(.24,2.54),(.39,2.53),(.46,2.48),(.41,2.44)],[.008,.045,.04,.024,.003],a_ink)
  elif style=='featherbrows':
   br_strip(p,s,arch,[.007,.025,.023,.002],a_brown)
   for j in range(7):br_strip(p,s,[(.16+j*.04,2.49),(.18+j*.04,2.56+.02*math.sin(j))],[.013,.001],a_brown)
  elif style=='bladebrows':br_shape(p,[(s*x,z) for x,z in [(.12,2.46),(.38,2.57),(.48,2.53),(.29,2.48)]],a_silver)
  elif style=='fuzzybrows':
   br_strip(p,s,arch,[.012,.05,.045,.008],a_blackknit)
   for j in range(25):
    x=.14+j*.012;z=2.47+.05*math.sin(j*math.pi/24)
    line(p+'_fiber',[br_point(s*x,z,.039),br_point(s*(x+.012),z+.028,.044)],.003,a_blackknit,'Head',4)
  elif style=='shavedbrows':
   br_strip(p,s,[(.13,2.47),(.23,2.51),(.28,2.52)],[.015,.055,.052],a_ink)
   br_strip(p,s,[(.32,2.52),(.38,2.51),(.45,2.47+.04*(s>0))],[.049,.035,.003],a_ink)
  elif style=='wavebrows':br_strip(p,s,[(.13+j*.04,2.50+.025*math.sin(j*1.1)) for j in range(9)],[.015]*9,a_blue)
  elif style=='leafbrows':
   br_strip(p,s,arch,[.008,.018,.018,.003],a_mint)
   for j in range(4):br_shape(p,[(s*(.17+j*.07),2.51),(s*(.19+j*.07),2.58),(s*(.23+j*.07),2.55),(s*(.21+j*.07),2.51)],a_mint)
  elif style=='arrowbrows':br_shape(p,[(s*x,z) for x,z in [(.12,2.46),(.32,2.50),(.31,2.54),(.47,2.53),(.36,2.44),(.35,2.48),(.14,2.43)]],a_ink)
  else:
   for j in range(5):
    x=s*(.15+j*.07);z=2.48+.04*math.sin(j*math.pi/4)
    ell(p+'_dot',br_point(x,z,.025),(.014,.009,.014),a_ink,n=10,m=8)

# Fail early if a category accidentally grows through a copy/paste omission.
for category,ids in ATELIER_VARIANTS.items():
 assert len(ids)==12 and len(set(ids))==12,category
 for variant in ids:
  prefix='Drif_'+category+'_'+variant
  assert any(o.type=='MESH' and (o.name==prefix or o.name.startswith(prefix+'_') or o.name.startswith(prefix+'.')) for o in collection.objects),prefix
