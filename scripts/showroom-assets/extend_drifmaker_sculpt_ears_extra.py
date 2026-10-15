"""Sculpted fins and objects: closed surfaces, relief, negative space and thick
hardware. Rebuild the previous atelier ears/extras in place, preserving IDs.
No decorative wire/curve strokes are used as surface detailing.
"""
from mathutils import Euler
SCULPT_EAR_EXTRA_CATALOG=json.loads((ROOT/'scripts/showroom-assets/sculpt-ear-extra-catalog.json').read_text())
SCULPT_EAR_EXTRA_VARIANTS={k.title():[v[0] for v in rows] for k,rows in SCULPT_EAR_EXTRA_CATALOG.items()}
sc_ivory=material('Drif_Sculpt_Ivory',(.89,.84,.70),.58)
sc_silk=material('Drif_Sculpt_Silk',(.64,.72,.79),.44)
sc_steel=material('Drif_Sculpt_Steel',(.30,.40,.48),.27,.82)
sc_darksteel=material('Drif_Sculpt_DarkSteel',(.045,.055,.071),.35,.76)
sc_obsidian=material('Drif_Sculpt_Obsidian',(.022,.024,.032),.19,.26)
sc_moss=material('Drif_Sculpt_Moss',(.14,.22,.025),.98)
sc_mosslight=material('Drif_Sculpt_MossLight',(.28,.36,.06),.96)
sc_rock=material('Drif_Sculpt_Stone',(.36,.33,.23),.94)
sc_ruby=material('Drif_Sculpt_Ruby',(.52,.018,.035),.32,.3)
sc_glass=sp_glow('SculptGlass',(.30,.68,.83),0,.24)
sc_aqua=material('Drif_Sculpt_Liquid',(.015,.36,.80),.17,.28)
sc_orange=material('Drif_Sculpt_FireOrange',(1,.13,.008),.48)
sc_ember=sp_glow('SculptEmber',(1,.33,.015),.55)

def sc_remove(prefix):
 for obj in list(collection.objects):
  if obj.name==prefix or obj.name.startswith(prefix+'_') or obj.name.startswith(prefix+'.'):
   if obj in pieces:pieces.remove(obj)
   bpy.data.objects.remove(obj,do_unlink=True)

def sc_reweight(obj,bone='Head'):
 obj.vertex_groups.clear();g=obj.vertex_groups.new(name=bone);g.add(list(range(len(obj.data.vertices))),1,'REPLACE')

def sc_apply(obj,modifier):
 bpy.context.view_layer.objects.active=obj;obj.hide_set(False);obj.select_set(True)
 bpy.ops.object.modifier_apply(modifier=modifier.name);obj.select_set(False)
 return obj

def sc_bevel(obj,width=.018,segments=3):
 mod=obj.modifiers.new('Sculpted edge transitions','BEVEL');mod.width=width;mod.segments=segments
 mod.limit_method='ANGLE';sc_apply(obj,mod)
 return obj

def sc_box(p,loc,size,mat,bone='Chest',bevel=.015):
 x,y,z=loc;a,b,c=[v/2 for v in size]
 o=mesh(p,[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,bone,False)
 return sc_bevel(o,min(bevel,min(size)*.3),3) if bevel else o

def sc_lathe(p,center,profile,mat,bone='Chest',sides=40,axis='z'):
 x,y,z=center;verts=[]
 for h,r in profile:
  for j in range(sides):
   a=j*math.tau/sides
   verts.append((x+r*math.cos(a),y+r*math.sin(a),z+h) if axis=='z' else (x+r*math.cos(a),y+h,z+r*math.sin(a)))
 faces=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(profile)-1) for j in range(sides)]
 faces += [tuple(reversed(range(sides))),tuple((len(profile)-1)*sides+j for j in range(sides))]
 return mesh(p,verts,faces,mat,bone)

def sc_ring(p,center,rx,rz,tube,mat,bone='Chest',axis='xz',n=48,m=10,wave=0):
 x,y,z=center;verts=[]
 for i in range(n):
  a=i*math.tau/n
  for j in range(m):
   b=j*math.tau/m;th=tube*(1+wave*math.sin(7*a+2*b));u=(rx+th*math.cos(b))*math.cos(a);v=(rz+th*math.cos(b))*math.sin(a);w=th*math.sin(b)
   verts.append((x+u,y+w,z+v) if axis=='xz' else (x+u,y+v,z+w) if axis=='xy' else (x+w,y+u,z+v))
 return mesh(p,verts,[(i*m+j,i*m+(j+1)%m,((i+1)%n)*m+(j+1)%m,((i+1)%n)*m+j) for i in range(n) for j in range(m)],mat,bone)

def sc_profile(p,outline,y,thickness,mat,bone='Chest',bevel=.01):
 n=len(outline);verts=[(x,y+dy,z) for dy in [-thickness/2,thickness/2] for x,z in outline]
 o=mesh(p,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],mat,bone,False)
 return sc_bevel(o,bevel,3) if bevel else o

def sc_transform(objs,pivot,rotation):
 matrix=Euler(rotation).to_matrix();pivot=Vector(pivot)
 for obj in objs:
  for v in obj.data.vertices:v.co=pivot+matrix@(v.co-pivot)

def sc_newgroup():return set(collection.objects)
def sc_group(before):return [o for o in collection.objects if o not in before and o.type=='MESH']

def sc_cut(obj,cutter,bone='Head'):
 mod=obj.modifiers.new('Open negative space','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
 sc_apply(obj,mod)
 if cutter in pieces:pieces.remove(cutter)
 bpy.data.objects.remove(cutter,do_unlink=True);sc_reweight(obj,bone)

# A dense closed membrane, with ridges/folds in the surface topology itself.
# Its root, diagonal pleat and asymmetric lobes follow the original Dratini fin.
SC_FIN_OUTLINE=[(.54,1.92),(.83,1.75),(.86,2.08),(1.035,2.26),(.89,2.46),(.86,2.86),(.65,2.56),(.53,2.50)]
def sc_iceblade(p,s):
 # A thick mineral blade: a raised front ridge, beveled perimeter and a
 # separate rear shoulder form actual prism planes, rather than painted facets.
 outline=[(.52,1.94),(.79,1.72),(.88,2.10),(1.13,2.29),(.91,2.44),(.97,3.10),(.68,2.64),(.52,2.48)]
 cx,cz=.735,2.36;n=len(outline);verts=[(s*cx,-.17,cz)]
 for scale,y in [(.83,-.075),(1,.035),(1,.155),(.84,.225)]:
  for x,z in outline:verts.append((s*(cx+(x-cx)*scale),y+.055*(x-.52),cz+(z-cz)*scale))
 verts.append((s*cx,.265,cz));faces=[]
 for j in range(n):faces.append((0,1+j,1+(j+1)%n))
 for ring in range(3):
  a=1+ring*n;b=a+n
  for j in range(n):faces.append((a+j,b+j,b+(j+1)%n,a+(j+1)%n))
 for j in range(n):faces.append((len(verts)-1,1+3*n+(j+1)%n,1+3*n+j))
 o=mesh(p+'_mineralblade',verts,faces,a_porcelain,'Head',False)
 for mat in [a_cyanlight,a_cyanshade,a_silver]:o.data.materials.append(mat)
 for f in o.data.polygons:
  co=f.center
  f.material_index=(1 if f.index%3==0 else 0) if co.y<0 else (2 if co.y<.17 else 3)
 # A shorter grown crystal interlocks with the lower blade, sharing its root.
 sc_profile(p+'_crystalspur',[(s*.56,1.99),(s*.79,1.87),(s*1.04,2.10),(s*.82,2.22),(s*.60,2.18)],-.005,.20,a_cyanlight,'Head',.035)
 return o

def sc_fin(p,s,style,mat=sc_ivory):
 if style=='icebladefins':return sc_iceblade(p,s)
 outline=list(SC_FIN_OUTLINE)
 if style in ['notchedfins','charredfins']:
  outline=[(.54,1.92),(.83,1.75),(.84,2.03),(.78,2.10),(.89,2.14),(1.035,2.26),(.88,2.40),(.81,2.43),(.88,2.53),(.86,2.86),(.65,2.56),(.53,2.50)]
 if style in ['dragonscallop','batmembranes']:
  outline=[(.54,1.95),(.82,1.73),(.76,2.00),(.86,2.10),(1.10,2.24),(.91,2.26),(.82,2.42),(.90,2.85),(.67,2.59),(.53,2.48)]
 if style=='dratinicrest':outline=[(.54,1.94),(.79,1.75),(.84,2.08),(1.02,2.26),(.86,2.44),(.87,3.00),(.64,2.58),(.52,2.49)]
 if style=='quiltfins':
  # Three softly scalloped lobes, with a broad upholstered membrane.
  outline=[(.53,1.96),(.68,1.87),(.85,1.83),(.94,1.95),(.89,2.09),(1.04,2.22),(1.06,2.35),(.92,2.45),(.95,2.67),(.87,2.83),(.72,2.77),(.66,2.58),(.52,2.48)]
 # Subdivide each silhouette edge, preserving its purposeful corners.
 boundary=[]
 if style=='quiltfins':
  # Periodic cubic interpolation rounds the cloth silhouette itself.
  for i in range(len(outline)):
   a,b,c,d=[Vector(outline[j%len(outline)]) for j in [i-1,i,i+1,i+2]]
   for k in range(7):
    t=k/7;point=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
    boundary.append(tuple(point))
 else:
  for a,b in zip(outline,outline[1:]+outline[:1]):
   for k in range(5):boundary.append((a[0]+(b[0]-a[0])*k/5,a[1]+(b[1]-a[1])*k/5))
 n=len(boundary);steps=24 if style=='quiltfins' else 9;cx,cz=.73,2.30;verts=[];faces=[]
 def point(x,z,r,k,back):
  t=max(0,min(1,(x-.52)/.50));dz=z-2.30
  y=.08+.10*t
  bulge=.115*(1-r*r)
  if style in ['ribbedfins','dratinicrest','dragonscallop']:bulge+=.035*math.sin(k/n*math.tau*6)*math.sin(r*math.pi)
  if style=='patchworkfins':bulge+=.067*abs(math.sin(k/n*math.tau*4))*(math.sin(r*math.pi)**.6)
  if style=='quiltfins':
   u=(x-.52)/.34;v=(z-1.85)/.36
   cell=abs(math.sin(math.pi*(u+v))*math.sin(math.pi*(u-v)))**.72
   bulge=.10*(1-r*r)+.105*cell*max(0,math.sin(r*math.pi))**.35
  if style=='foldedfins':f=max(0,z-2.48);z-=f*.60;y-=f*.95
  if style=='sweptfins':y+=t*.32;z+=t*.12;x-=t*.04
  if style=='ribbonfins':y+=t*.21*math.sin(dz*6);x+=t*.09*math.sin(dz*7);z=2.30+dz*(1+.15*t)
  if style in ['mossfins','charredfins']:y+=.017*math.sin(x*65)*math.cos(z*42);x+=.012*math.cos(z*47)*t
  if style=='carnagefins':bulge+=.04*math.cos(k/n*math.tau*3)*math.sin(r*math.pi);y-=t*.035
  return (s*x,y+(.035+bulge*.4 if back else -.045-bulge),z)
 for back in [False,True]:
  verts.append(point(cx,cz,0,0,back))
  for ri in range(1,steps+1):
   r=ri/steps
   for k,(x,z) in enumerate(boundary):verts.append(point(cx+(x-cx)*r,cz+(z-cz)*r,r,k,back))
 stride=1+n*steps
 for off in [0,stride]:
  for k in range(n):faces.append((off,off+1+k,off+1+(k+1)%n))
  for ri in range(steps-1):
   for k in range(n):a=off+1+ri*n+k;b=off+1+ri*n+(k+1)%n;faces.append((a,b,b+n,a+n))
 for k in range(n):a=1+(steps-1)*n+k;b=1+(steps-1)*n+(k+1)%n;faces.append((a,b,b+stride,a+stride))
 o=mesh(p+'_membrane',verts,faces,mat,'Head')
 if style in ['patchworkfins','opalfins','carnagefins']:
  mats=[mat,dm_lilac,a_cyan,a_cream] if style=='patchworkfins' else [mat,a_cyanlight,dm_lilac,a_porcelain] if style=='opalfins' else [mat,a_ink]
  for m in mats[1:]:o.data.materials.append(m)
  for f in o.data.polygons:
   co=f.center;angle=math.atan2(co.z-cz,abs(co.x)-cx);f.material_index=int((angle+math.pi)/math.tau*8)%len(mats)
  if style=='opalfins':
   for f in o.data.polygons:f.use_smooth=False
 if style in ['lacefins','piercedfins']:
  holes=[(.75,2.08,.038),(.76,2.28,.048),(.76,2.48,.04),(.80,2.66,.026)] if style=='lacefins' else [(.88,2.25,.033),(.80,2.46,.028)]
  for x,z,r in holes:sc_cut(o,sc_lathe(p+'_cut',(s*x,-.3,z),[(0,r),(.7,r)],a_ink,'Head',24,'y'))
  if style=='piercedfins':
   for x,z,r in holes:sc_ring(p+'_piercing',(s*x,.03,z-.025),r*1.18,r*1.65,.014,a_silver,'Head','yz',32,10)
 return o

# Replace every previous fin design, not just its material.
for style in ATELIER_VARIANTS['Ears']:
 p='Drif_Ears_'+style;sc_remove(p)
 mat={'charredfins':sc_obsidian,'opalfins':a_porcelain,'glassfins':sc_glass,'gildedfins':a_gold,'patchworkfins':a_cream}.get(style,sc_ivory)
 for s in [-1,1]:
  fin=sc_fin(p,s,style,mat)
  if style=='gildedfins':
   # Inset faceted gemstone seats are substantial milled pieces.
   for x,z,r in [(.78,2.29,.075),(.79,2.56,.047)]:
    sc_lathe(p+'_bezel',(s*x,-.11,z),[(-.055,r),(-.045,r*1.15),(-.02,r*1.1),(.01,r*.78)],sc_darksteel,'Head',8,'y')
    sc_lathe(p+'_gem',(s*x,-.12,z),[(-.055,r*.30),(-.035,r*.80),(0,r*.70)],a_cyan,'Head',8,'y')
  if style=='charredfins':
   for j in range(4):
    x=.74+j*.028;z=2.06+j*.16
    sc_profile(p+'_ember',[(s*(x-.02),z-.05),(s*(x+.025),z-.025),(s*(x+.018),z+.035),(s*(x-.025),z+.02)],-.10,.018,sc_ember,'Head',.005)

for style in SCULPT_EAR_EXTRA_VARIANTS['Ears']:
 p='Drif_Ears_'+style
 for s in [-1,1]:
  if style=='ramhorns':
   controls=[]
   for i in range(28):
    a=i/27*math.tau*1.05;r=.32*(1-i/34)
    controls.append((s*(.70+r*math.cos(a)),.08+.08*i/27,2.43+r*math.sin(a),.105*(1-i/29)))
   at_tube(p+'_horn',controls,a_paper,'Head',sides=16,steps=2)
  elif style=='armoredfins':
   sc_fin(p,s,'sweptfins',sc_darksteel)
   # Three discrete overlapping plates, each thick, beveled and contoured.
   for j in range(3):
    z=1.90+j*.28;outline=[(s*.58,z+.10),(s*.81,z-.03),(s*1.015,z+.24),(s*.84,z+.36),(s*.61,z+.30)]
    sc_profile(p+'_plate',outline,-.055-j*.018,.09,sc_steel,'Head',.028)
  elif style=='wrappedfins':
   sc_fin(p,s,'dratinicrest',a_blue)
   # Wide cloth shells wrap front-to-back rather than drawing seam strokes.
   for j in range(5):
    z=1.92+j*.17;x=.72+.015*j
    sc_profile(p+'_band',[(s*(x-.15),z),(s*(x+.13),z+.07),(s*(x+.14),z+.20),(s*(x-.13),z+.13)],-.035,.19,sc_silk,'Head',.025)
  else:
   mat={'carnagefins':sc_ruby,'icebladefins':a_porcelain,'mossfins':sc_rock,'batmembranes':sc_obsidian}.get(style,sc_ivory)
   sc_fin(p,s,style,mat)
   if style=='mossfins':
    for j in range(10):
     x=.67+(j%3)*.075;z=1.99+(j//3)*.21
     tuft=ell(p+'_moss',(s*x,-.12,z),(.065,.035,.075),sc_moss if j%2 else sc_mosslight,'Head',n=10,m=8)
     for v in tuft.data.vertices:v.co.y+=.012*math.sin(v.co.z*95+v.co.x*57)

# Replacement extras: same saved IDs, substantially rebuilt objects.
def sc_satellites():return [(-1.03,.05,2.57),(1.01,.25,2.70),(-1.00,-.12,1.61),(1.04,-.31,1.49),(-.56,.34,3.07),(.60,.23,1.02)]
def sc_card(p,x,y,z,w,h,mat,bone='Chest'):
 return sc_box(p,(x,y,z),(w,.035,h),mat,bone,.018)

def sc_torus_effect(p,water=False):
 mat=sc_glass if water else sc_orange
 # Broad rolling crest geometry: irregular major radius and non-circular section.
 n,m=112,12;verts=[]
 for i in range(n):
  a=i*math.tau/n;radius=1.06+.035*math.sin(5*a);depth=.49+.12*math.sin(a)
  for j in range(m):
   b=j*math.tau/m;t=.062*(1+.28*math.sin(8*a+b));rad=radius+t*math.cos(b)
   verts.append((rad*math.cos(a),depth+t*.75*math.sin(b),2.18+rad*.89*math.sin(a)))
 mesh(p+'_crest',verts,[(i*m+j,i*m+(j+1)%m,((i+1)%n)*m+(j+1)%m,((i+1)%n)*m+j) for i in range(n) for j in range(m)],mat,'Chest')
 for j in range(15):
  a=j*math.tau/15;x=1.08*math.cos(a);z=2.18+.96*math.sin(a);y=.5+.12*math.sin(a)
  if water:ell(p+'_droplet',(x*1.06,y-.08,z+.05),(.045,.04,.085),sc_glass,'Chest',n=16,m=10)
  else:
   at_tube(p+'_flame',[(x,y,z,.058),(x+.08*math.cos(a),y-.045,z+.10,.07),(x+.14*math.cos(a),y-.015,z+.22,.002)],sc_ember if j%2 else sc_ruby,'Chest',sides=14,steps=5,depth=.55)

for style in ATELIER_VARIANTS['Extra']:
 p='Drif_Extra_'+style;sc_remove(p)
 if style=='shatteredmirror':
  for j,(x,y,z) in enumerate(sc_satellites()):
   before=sc_newgroup();r=.17 if j%2 else .22
   poly=[(x-r,z-.06),(x-.02,z+r),(x+r*.78,z+.07),(x+r*.4,z-r)]
   sc_profile(p+'_back',poly,y,.055,sc_darksteel,'Chest',.009)
   small=[(x+(xx-x)*.90,zz*.90+z*.10) for xx,zz in poly];sc_profile(p+'_mirror',small,y-.034,.012,a_silver,'Chest',.006)
   sc_transform(sc_group(before),(x,y,z),(.12*j,.29*(-1)**j,.17*j))
 elif style in ['firehoop','waterhoop']:sc_torus_effect(p,style=='waterhoop')
 elif style=='talismans':
  for j,(x,y,z) in enumerate(sc_satellites()):
   before=sc_newgroup();verts=[];n=12
   for side in [-1,1]:
    for k in range(n):
     t=k/(n-1);verts.append((x+side*.075,y+.045*math.sin(t*math.pi*1.4),z-.17+t*.34))
   ob=mesh(p+'_foldedpaper',verts,[(k,k+1,n+k+1,n+k) for k in range(n-1)],a_cream,'Chest')
   mod=ob.modifiers.new('Paper thickness','SOLIDIFY');mod.thickness=.009;sc_apply(ob,mod)
   for k in range(3):
    zz=z-.08+k*.08
    sc_profile(p+'_printedseal',[(x-.03,zz),(x+.02,zz+.025),(x+.032,zz+.006),(x-.015,zz-.02)],y+.036-.008,.002,sc_ruby,'Chest',0)
   sc_transform(sc_group(before),(x,y,z),(.16*j,.3*(-1)**j,.3*(-1)**j))
 elif style=='coinshower':
  for j in range(11):
   x=(-1 if j%2 else 1)*(1.00+.09*math.sin(j*2.4));y=-.15+.19*(j%3);z=1.30+(j%6)*.32;before=sc_newgroup()
   sc_lathe(p+'_coin',(x,y,z),[(-.024,.083),(-.019,.089),(.013,.089),(.021,.080)],a_gold,'Chest',40,'y')
   sc_lathe(p+'_inset',(x,y-.027,z),[(0,.060),(.004,.065),(.010,.060)],sc_ivory,'Chest',32,'y')
   star(p+'_stamp',(x,y-.033,z),.044,.019,a_gold,'Chest')
   for k in range(12):
    a=k*math.tau/12;sc_box(p+'_millededge',(x+.087*math.cos(a),y-.001,z+.087*math.sin(a)),(.008,.025,.008),sc_darksteel,'Chest',.002)
   sc_transform(sc_group(before),(x,y,z),(j*.23,j*.39,j*.11))
 elif style=='floppydisks':
  for j,(x,y,z) in enumerate(sc_satellites()[:5]):
   before=sc_newgroup();mat=[sc_ruby,a_blue,a_purple][j%3]
   sc_box(p+'_shell',(x,y,z),(.245,.055,.255),mat,'Chest',.014)
   sc_box(p+'_shutter',(x-.015,y-.035,z+.068),(.145,.018,.095),sc_steel,'Chest',.008)
   sc_box(p+'_window',(x+.02,y-.047,z+.069),(.044,.007,.064),sc_darksteel,'Chest',.004)
   sc_box(p+'_labelrecess',(x,y-.031,z-.053),(.186,.008,.082),sc_darksteel,'Chest',.006)
   sc_box(p+'_label',(x,y-.038,z-.053),(.170,.006,.070),sc_ivory,'Chest',.004)
   for s in [-1,1]:sc_box(p+'_notch',(x+s*.094,y-.033,z-.103),(.021,.008,.021),a_ink,'Chest',.003)
   sc_transform(sc_group(before),(x,y,z),(.3*j,.35*(-1)**j,.21*j))
 elif style=='neondoor':
  # Thick beveled portal, inset light panels, and an actual receding threshold.
  for s in [-1,1]:
   sc_box(p+'_jamb',(s*1.01,.60,1.93),(.17,.21,2.14),sc_darksteel,'Chest',.035)
   sc_box(p+'_light',(s*1.01,.485,1.99),(.048,.018,1.87),sp_glowcyan,'Chest',.014)
   sc_box(p+'_foot',(s*1.01,.56,.90),(.25,.33,.15),sc_steel,'Chest',.03)
  sc_box(p+'_arch',(0,.6,3.00),(2.17,.21,.19),sc_darksteel,'Chest',.03)
  sc_box(p+'_light',(0,.484,2.99),(1.92,.018,.048),sp_glowpink,'Chest',.012)
  sc_box(p+'_keystone',(0,.47,3.01),(.22,.10,.27),sc_steel,'Chest',.035)
 elif style=='vinylorbit':
  for j,(x,y,z) in enumerate(sc_satellites()[:5]):
   before=sc_newgroup()
   # Grooves are cuts in the revolved cross-section, not added rings.
   profile=[(-.008,.008),(-.009,.04),(-.01,.065)]
   for k in range(22):profile.append((-.008+(.0018 if k%2 else 0),.07+k*.0049))
   profile += [(-.004,.182),(.009,.182),(.012,.06),(.012,.008)]
   sc_lathe(p+'_record',(x,y,z),profile,a_ink,'Chest',64,'y')
   sc_lathe(p+'_label',(x,y-.013,z),[(0,.012),(.001,.055),(.004,.055),(.004,.012)],[a_rose,a_lime,a_cyan][j%3],'Chest',32,'y')
   sc_transform(sc_group(before),(x,y,z),(.3*j,.45*(-1)**j,.12*j))
 elif style=='confettiburst':
  rng=random.Random(891)
  for j in range(36):
   a=j*math.tau/36;x=(1.02+rng.random()*.08)*math.cos(a);z=2.18+(1.01+rng.random()*.08)*math.sin(a);y=rng.uniform(-.28,.50)
   verts=[]
   for k in range(9):
    t=k/8
    for side in [-1,1]:verts.append((x+side*.024,y+.04*math.sin(t*math.pi),z+(t-.5)*.14))
   o=mesh(p+'_curledpaper',verts,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(8)],[a_rose,a_cyan,a_gold,a_lime][j%4],'Chest')
   mod=o.modifiers.new('Paper body','SOLIDIFY');mod.thickness=.007;sc_apply(o,mod);sc_transform([o],(x,y,z),(j*.7,j*.4,j*.6))
 elif style=='chessfloat':
  for j,(x,y,z) in enumerate(sc_satellites()[:4]):
   before=sc_newgroup();mat=sc_ivory if j%2 else sc_obsidian
   sc_lathe(p+'_turnedbody',(x,y,z),[(-.20,.10),(-.18,.11),(-.15,.10),(-.13,.07),(-.11,.08),(-.09,.062),(.01,.035),(.06,.06),(.085,.064),(.10,.04)],mat,'Chest',40)
   if j==0:
    sc_box(p+'_kingcross',(x,y,z+.16),(.035,.05,.14),mat,'Chest',.01);sc_box(p+'_crossarm',(x,y,z+.18),(.11,.05,.032),mat,'Chest',.01)
   elif j==1:ell(p+'_pawn',(x,y,z+.14),(.068,.068,.074),mat,'Chest',n=24,m=16)
   elif j==2:
    sc_lathe(p+'_rook',(x,y,z),[(.08,.065),(.18,.08)],mat,'Chest',32)
    for k in range(5):a=k*math.tau/5;sc_box(p+'_battlement',(x+.06*math.cos(a),y+.06*math.sin(a),z+.20),(.045,.045,.06),mat,'Chest',.008)
   else:
    sc_lathe(p+'_bishop',(x,y,z),[(.08,.04),(.13,.07),(.19,.04),(.24,.004)],mat,'Chest',32)
   sc_transform(sc_group(before),(x,y,z),(.18*j,.22*j,.12*(-1)**j))
 elif style=='solareclipse':
  # Spherical dark moon, with a sculpted corona rather than a flat black disc.
  ell(p+'_moon',(0,.72,2.25),(.90,.21,.90),sc_obsidian,'Chest',n=56,m=24)
  sc_ring(p+'_corona',(0,.71,2.25),.92,.92,.065,sc_ember,'Chest',n=96,m=12,wave=.26)
  for j in range(14):
   a=j*math.tau/14;x=.98*math.cos(a);z=2.25+.98*math.sin(a)
   at_tube(p+'_prominence',[(x,.72,z,.037),(x*1.06,.70,z+.08,.046),(x*1.11,.72,z+.12,.002)],sc_orange,'Chest',sides=10,steps=4)
 else:
  # Three broad twisted ribbons with visible back faces and folded ends.
  for j in range(3):
   verts=[];steps=70
   for k in range(steps):
    a=k/(steps-1)*math.tau*.85+j*math.tau/3;r=1.04+j*.035;twist=a*1.3+j
    for side in [-1,1]:
     verts.append(((r+side*.07*math.cos(twist))*math.cos(a),.45+.20*math.sin(a+j)+side*.07*math.sin(twist),2.15+(r*.84+side*.07*math.cos(twist))*math.sin(a)))
   o=mesh(p+'_silkribbon',verts,[(2*k,2*k+1,2*k+3,2*k+2) for k in range(steps-1)],[a_rose,a_cyan,a_gold][j],'Chest')
   mod=o.modifiers.new('Silk thickness','SOLIDIFY');mod.thickness=.013;sc_apply(o,mod)

# New object extras. Their orbit centers stay outside the original fin surface.
def sc_device(p,center,kind='minidisc'):
 x,y,z=center
 sc_box(p+'_shell',center,(.31,.095,.40),sc_steel if kind=='minidisc' else a_paper,'Chest',.028)
 sc_box(p+'_bezel',(x,y-.055,z+.075),(.25,.024,.19),sc_darksteel,'Chest',.012)
 sc_box(p+'_screen',(x,y-.071,z+.075),(.20,.009,.14),a_lime if kind!='minidisc' else a_cyanlight,'Chest',.006)
 if kind=='minidisc':
  sc_lathe(p+'_discdoor',(x,y-.052,z-.071),[(-.007,.088),(.006,.091),(.013,.08)],sc_silk,'Chest',36,'y')
  sc_lathe(p+'_hub',(x,y-.065,z-.071),[(0,.022),(.012,.026)],sc_darksteel,'Chest',24,'y')
 else:
  sc_box(p+'_dpad',(x-.078,y-.064,z-.08),(.080,.018,.027),a_ink,'Chest',.006);sc_box(p+'_dpad',(x-.078,y-.065,z-.08),(.027,.018,.080),a_ink,'Chest',.006)
  for dx,dz in [(.065,-.06),(.108,-.10)]:sc_lathe(p+'_button',(x+dx,y-.065,z+dz),[(0,.024),(-.018,.024)],sc_ruby,'Chest',20,'y')
  for k in range(3):sc_box(p+'_vent',(x+.02+k*.022,y-.052,z-.156),(.01,.008,.032),a_ink,'Chest',.003)

def sc_sword(p,x,y,z,scale=1,mat=sc_steel):
 poly=[(x-.024*scale,z-.18*scale),(x+.024*scale,z-.18*scale),(x+.035*scale,z+.20*scale),(x,z+.40*scale),(x-.035*scale,z+.20*scale)]
 sc_profile(p+'_blade',poly,y,.045*scale,mat,'Chest',.008*scale)
 sc_box(p+'_guard',(x,y,z-.16*scale),(.19*scale,.07*scale,.055*scale),a_gold,'Chest',.014*scale)
 sc_box(p+'_grip',(x,y,z-.27*scale),(.047*scale,.055*scale,.17*scale),sc_obsidian,'Chest',.012*scale)
 sc_lathe(p+'_pommel',(x,y,z-.36*scale),[(0,.032*scale),(.035*scale,.04*scale)],a_gold,'Chest',16)

for style in SCULPT_EAR_EXTRA_VARIANTS['Extra']:
 p='Drif_Extra_'+style
 if style=='djstation':
  # Root-bound furniture stays level through all character emotes.
  sc_box(p+'_tabletop',(0,-.89,1.12),(1.80,.72,.10),sc_obsidian,'Root',.045)
  sc_box(p+'_tableedge',(0,-.89,1.065),(1.72,.65,.05),a_paper,'Root',.018)
  for x in [-.72,.72]:
   for y in [-.64,-1.14]:sc_box(p+'_leg',(x,y,.55),(.065,.065,1.04),sc_darksteel,'Root',.012)
  for x in [-.53,.53]:
   sc_box(p+'_turntable',(x,-.89,1.22),(.59,.56,.12),sc_steel,'Root',.028)
   sc_lathe(p+'_platter',(x,-.92,1.28),[(0,.218),(.018,.222),(.037,.208)],a_silver,'Root',64)
   profile=[(0,.009),(.003,.058)]
   for j in range(24):profile.append((.004+(j%2)*.0009,.064+j*.0057))
   profile += [(.005,.202),(.012,.202),(.012,.009)]
   sc_lathe(p+'_vinyl',(x,-.92,1.315),profile,a_ink,'Root',64)
   sc_lathe(p+'_label',(x,-.92,1.329),[(0,.01),(.002,.054),(.005,.054),(.005,.01)],sc_ruby if x<0 else a_cyan,'Root',32)
   sc_lathe(p+'_spindle',(x,-.92,1.337),[(0,.009),(.024,.009)],a_silver,'Root',16)
   sc_lathe(p+'_tonearmpivot',(x+.20,-.72,1.28),[(0,.035),(.065,.035),(.075,.025)],a_silver,'Root',24)
   at_tube(p+'_tonearm',[(x+.20,-.72,1.35,.014),(x+.20,-.83,1.37,.014),(x+.09,-1.03,1.355,.014),(x+.04,-1.04,1.35,.014)],sc_steel,'Root',sides=10,steps=3)
   sc_box(p+'_cartridge',(x+.035,-1.04,1.339),(.055,.04,.031),sc_darksteel,'Root',.007)
   sc_box(p+'_pitchslot',(x-.25,-.86,1.287),(.018,.23,.012),a_ink,'Root',.005)
   sc_box(p+'_pitchfader',(x-.25,-.91,1.30),(.036,.035,.017),a_cream,'Root',.004)
   sc_box(p+'_startstop',(x-.24,-1.105,1.292),(.06,.055,.02),sc_ruby,'Root',.008)
  sc_box(p+'_mixer',(0,-.89,1.235),(.34,.56,.15),sc_darksteel,'Root',.022)
  for col in range(3):
   for row in range(3):
    sc_lathe(p+'_knob',(-.095+col*.095,-.72-row*.08,1.32),[(0,.022),(.025,.023),(.033,.018)],a_silver if row==0 else sc_obsidian,'Root',16)
  for x in [-.075,.075]:
   sc_box(p+'_faderslot',(x,-.99,1.315),(.016,.11,.008),a_ink,'Root',.004)
   sc_box(p+'_fader',(x,-.99+(x>.0)*.025,1.33),(.047,.033,.024),sc_ivory,'Root',.006)
  sc_box(p+'_crossslot',(0,-1.10,1.316),(.20,.013,.008),a_ink,'Root',.003);sc_box(p+'_crossfader',(.025,-1.10,1.333),(.034,.052,.024),a_silver,'Root',.007)
  for s in [-1,1]:
   sc_box(p+'_speaker',(s*1.01,-.77,1.32),(.23,.28,.38),a_ink,'Root',.025)
   for z,r in [(1.27,.075),(1.43,.037)]:sc_lathe(p+'_driver',(s*1.01,-.917,z),[(0,r),(-.014,r*.87),(-.025,r*.45),(-.01,.005)],sc_darksteel,'Root',32,'y')
  # Keep both speakers and platters inside the fixed portrait crop. Lower the
  # equipment 18 cm and shorten the legs, keeping all four feet on the floor.
  for obj in pieces:
   if obj.name.startswith(p+'_'):
    for vertex in obj.data.vertices:
     vertex.co.x*=.80
     vertex.co.y=-.89+(vertex.co.y+.89)*.80
     if obj.name.startswith(p+'_leg'):
      vertex.co.z=.03+(vertex.co.z-.03)*(.86/1.04)
     else:
      vertex.co.z-=.18
 elif style=='gumballstand':
  x,y=.91,.08
  sc_lathe(p+'_pedestal',(x,y,1.00),[(0,.16),(.06,.18),(.12,.13),(.48,.11),(.53,.21)],sc_ruby,'Chest',40)
  ell(p+'_dome',(x,y,1.76),(.27,.24,.28),sc_glass,'Chest',n=36,m=24)
  sc_lathe(p+'_crown',(x,y,1.99),[(0,.18),(.04,.19),(.07,.13),(.09,.02)],sc_darksteel,'Chest',40)
  rng=random.Random(49)
  for j in range(30):
   a=j*2.4;r=.17*math.sqrt(rng.random());z=1.59+rng.random()*.28
   ell(p+'_candy',(x+r*math.cos(a),y+r*math.sin(a),z),(.044,.044,.044),[a_rose,a_lime,a_cyan,a_gold,a_purple][j%5],'Chest',n=10,m=8)
  sc_box(p+'_coinbox',(x,y-.133,1.35),(.16,.055,.21),a_silver,'Chest',.018)
  sc_box(p+'_coinslot',(x,y-.166,1.40),(.055,.007,.012),a_ink,'Chest',.003)
  sc_lathe(p+'_crank',(x,y-.174,1.33),[(0,.035),(-.012,.036)],sc_darksteel,'Chest',20,'y')
  sc_box(p+'_handle',(x+.02,y-.193,1.33),(.08,.025,.025),a_silver,'Chest',.008)
  sc_box(p+'_delivery',(x,y-.135,1.13),(.12,.055,.075),a_ink,'Chest',.014)
 elif style=='potionflasks':
  for j,(x,y,z) in enumerate([(-1.03,-.08,2.45),(1.03,.16,2.04),(-.90,.20,1.35)]):
   before=sc_newgroup();profile=[(-.20,.13),(-.18,.17),(-.12,.17),(.15,.055),(.21,.055),(.24,.065),(.26,.062)]
   sc_lathe(p+'_flask',(x,y,z),profile,sc_glass,'Chest',40)
   sc_lathe(p+'_potion',(x,y,z),[(-.19,.125),(-.16,.15),(-.11,.15),(.045,.095)],sc_aqua,'Chest',40)
   sc_lathe(p+'_cork',(x,y,z),[(.23,.047),(.30,.05),(.32,.045)],a_paper,'Chest',24)
   for k in range(3):ell(p+'_bubble',(x+.035*math.sin(k*2),y-.06,z-.12+k*.055),(.015,.015,.018),a_cyanlight,'Chest',n=10,m=8)
   sc_transform(sc_group(before),(x,y,z),(.12*j,.18*(-1)**j,.13*j))
 elif style=='greedvessel':
  x,y,z=-.95,.13,1.72
  sc_lathe(p+'_pot',(x,y,z),[(-.35,.18),(-.30,.22),(-.20,.25),(.04,.28),(.24,.22),(.31,.17),(.34,.19),(.39,.19)],a_mint,'Chest',48)
  for s in [-1,1]:sc_ring(p+'_handle',(x+s*.27,y,z+.08),.11,.19,.045,a_blue,'Chest')
  for s in [-1,1]:
   ell(p+'_cheek',(x+s*.12,y-.22,z-.015),(.13,.08,.14),sc_moss,'Chest',n=20,m=12)
   sc_profile(p+'_eye',[(x+s*.03,z+.11),(x+s*.19,z+.16),(x+s*.16,z+.055),(x+s*.06,z+.045)],y-.27,.04,a_ink,'Chest',.012)
  ell(p+'_mouth',(x,y-.268,z-.13),(.20,.042,.09),sc_ruby,'Chest',n=28,m=16)
  for j in range(7):sc_box(p+'_tooth',(x+(j-3)*.048,y-.309,z-.12+.01*abs(j-3)),(.042,.033,.073),a_gold,'Chest',.009)
 elif style in ['brokenhandhelds','minidiscorbit']:
  for j,(x,y,z) in enumerate(sc_satellites()[:4]):
   before=sc_newgroup();sc_device(p,(x,y,z),'broken' if style=='brokenhandhelds' else 'minidisc')
   if style=='brokenhandhelds':
    sc_profile(p+'_missingcorner',[(x+.07,z-.20),(x+.15,z-.12),(x+.13,z-.02),(x+.09,z-.06)],y-.059,.015,sc_obsidian,'Chest',.004)
    sc_box(p+'_board',(x+.12,y-.065,z-.04),(.07,.014,.09),a_mint,'Chest',.004)
    for k in range(3):sc_box(p+'_chip',(x+.12,y-.077,z-.07+k*.024),(.045,.014,.013),sc_darksteel,'Chest',.002)
   sc_transform(sc_group(before),(x,y,z),(.15*j,.3*(-1)**j,.25*(-1)**j))
 elif style=='sacredrelic':
  x,y,z=.99,.28,2.17
  # Full convex heart, a five-sided sculpted lower point, and a crown.
  for s in [-1,1]:ell(p+'_heartlobe',(x+s*.095,y,z+.045),(.15,.10,.15),sc_steel,'Chest',n=24,m=16)
  sc_profile(p+'_heartpoint',[(x-.20,z+.02),(x+.20,z+.02),(x+.14,z-.12),(x,z-.28),(x-.14,z-.12)],y,.16,sc_steel,'Chest',.035)
  sc_lathe(p+'_crownbase',(x,y,z+.23),[(0,.13),(.04,.14)],a_gold,'Chest',32)
  for k in range(5):a=k*math.tau/5;sp_cone(p+'_crownpoint',(x+.12*math.cos(a),y+.10*math.sin(a),z+.26),(x+.13*math.cos(a),y+.11*math.sin(a),z+.39),.035,a_gold,'Chest',sides=12)
  for j in range(7):
   a=j*math.tau/7;before=sc_newgroup();sc_sword(p,x,y+.07,z+.43,.60);sc_transform(sc_group(before),(x,y,z),(0,a,0))
 elif style=='cardshrine':
  x,y,z=0,.63,2.18
  sc_box(p+'_relicslab',(x,y,z),(1.48,.14,1.93),a_gold,'Chest',.06)
  sc_box(p+'_recess',(x,y-.078,z),(1.29,.025,1.71),sc_darksteel,'Chest',.025)
  sc_box(p+'_innerstone',(x,y-.096,z),(1.12,.018,1.50),a_purple,'Chest',.025)
  for s in [-1,1]:
   for zz in [z-.82,z+.82]:sc_lathe(p+'_cornermedallion',(s*.64,y-.11,zz),[(0,.082),(-.02,.076),(-.04,.04)],a_gold,'Chest',12,'y')
  # Molded central tablet relief; offset upper/lower portions remain in portraits.
  sc_profile(p+'_seal',[(-.29,z+.52),(0,z+.74),(.29,z+.52),(.22,z+.20),(0,z+.12),(-.22,z+.20)],y-.125,.035,sc_ivory,'Chest',.018)
  for k in range(5):sc_box(p+'_glyph',(-.42+k*.21,y-.126,z-.62),(.10,.025,.12),a_gold,'Chest',.012)
 elif style=='notkinteapot':
  x,y,z=-.98,.20,1.86
  # Stacked faceted ceramic skull: eyes recessed by thick lids and cheek planes.
  sc_lathe(p+'_pot',(x,y,z),[(-.27,.21),(-.20,.25),(-.08,.23),(.05,.26),(.15,.20),(.24,.18),(.32,.10)],a_paper,'Chest',12)
  for s in [-1,1]:
   ell(p+'_socket',(x+s*.095,y-.218,z+.06),(.078,.034,.075),sc_obsidian,'Chest',n=16,m=12)
   sc_profile(p+'_brow',[(x+s*.015,z+.12),(x+s*.18,z+.16),(x+s*.16,z+.20),(x+s*.035,z+.18)],y-.22,.065,sc_rock,'Chest',.018)
  sc_profile(p+'_nose',[(x,z+.02),(x-.043,z-.07),(x+.043,z-.07)],y-.25,.03,sc_obsidian,'Chest',.01)
  for k in range(5):sc_box(p+'_tooth',(x+(k-2)*.06,y-.21,z-.15),(.05,.07,.08),a_cream,'Chest',.012)
  at_tube(p+'_spout',[(x+.17,y,z-.04,.10),(x+.31,y,z+.05,.075),(x+.39,y,z+.22,.052)],a_paper,'Chest',sides=16,steps=5)
  sc_ring(p+'_handle',(x-.27,y,z+.02),.16,.21,.056,sc_rock,'Chest')
  sc_lathe(p+'_lid',(x,y,z),[(.29,.11),(.32,.14),(.35,.09),(.40,.025)],a_paper,'Chest',24)
 elif style=='obsidianblades':
  for j,(x,y,z) in enumerate(sc_satellites()[:4]):
   before=sc_newgroup()
   poly=[(x-.075,z-.14),(x+.072,z-.13),(x+.10,z+.18),(x+.03,z+.40),(x-.04,z+.46),(x-.11,z+.12),(x-.075,z+.04),(x-.11,z-.03)]
   sc_profile(p+'_blade',poly,y,.055,sc_obsidian,'Chest',.014)
   sc_profile(p+'_facet',[(x-.065,z-.10),(x+.012,z+.32),(x+.03,z+.40),(x+.06,z+.18),(x+.044,z-.1)],y-.033,.007,sc_darksteel,'Chest',.004)
   sc_box(p+'_guard',(x,y,z-.17),(.22,.095,.065),sc_steel,'Chest',.023)
   sc_box(p+'_handle',(x,y,z-.28),(.075,.08,.19),a_brown,'Chest',.02)
   sc_transform(sc_group(before),(x,y,z),(.18*j,.28*(-1)**j,.33*(-1)**j))

for category,ids in SCULPT_EAR_EXTRA_VARIANTS.items():
 assert len(ids)==10 and len(set(ids))==10
 for id in ids:assert any(o.type=='MESH' and o.name.startswith('Drif_'+category+'_'+id+'_') for o in collection.objects),(category,id)
