"""15 fitted bunny-reference sculpts in a separate editable Blender source.

Run with Blender 5.2, or load with runpy through the Blender bridge and call
setup(), build_ears(), build_hair(), finish() in order. The accepted base and
all animations remain untouched. No whole-art texture or decorative hairlines.
"""
import bpy, bmesh, math, json, importlib.util
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/models/drilady'
spec=importlib.util.spec_from_file_location('bunny_base',Path(__file__).with_name('build_drilady.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
EAR_IDS=['alert','vsplay','tulip','perkfold','backswept','tipcurl','classiclop','winglop','asymmetric','forward']
HAIR_IDS=['caramel','honeybraids','sidebraid','curtains','plumpony']
parts=[];prefix='';M={}

def setup():
 global rig
 assert not bpy.data.filepath or Path(bpy.data.filepath).name=='drilady-bunny-study.blend', 'Use a new Blender file for this pack'
 for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 # Stable datablock names matter: glTF multi-material child mesh names are
 # parsed by the wardrobe runtime too. Rebuilds must not acquire .001 suffixes.
 for data in [bpy.data.meshes,bpy.data.materials,bpy.data.armatures,bpy.data.collections]:
  for item in list(data):
   if item.users==0:data.remove(item)
 b.collection=bpy.data.collections.new('Bunny reference sculpts');bpy.context.scene.collection.children.link(b.collection)
 with bpy.data.libraries.load(str(OUT/'drilady-base.blend'),link=False) as (src,dst):dst.objects=['DriladyRig']
 rig=dst.objects[0];b.collection.objects.link(rig);b.rig=rig;rig.animation_data_clear();rig.data.pose_position='REST'
 for bone in rig.pose.bones:bone.matrix_basis.identity()
 for name,color,rough in [('fur',(.69,.33,.21),.57),('inner',(.70,.28,.32),.66),('honey',(.48,.245,.060),.42),('caramel',(.28,.105,.024),.43),('plum',(.28,.035,.42),.34)]:
  M[name]=b.material('Drilady_Fur_BunnyStudy' if name=='fur' else 'BunnyStudy_'+name,color,rough)
 parts.clear()

def begin(category,id):
 global prefix
 prefix='Drif_'+category+'_ladyref'+id;b.parts.clear()

def join():
 bpy.ops.object.select_all(action='DESELECT')
 for o in b.parts:o.select_set(True)
 bpy.context.view_layer.objects.active=b.parts[0]
 if len(b.parts)>1:bpy.ops.object.join()
 o=bpy.context.object
 o.name=prefix;o.data.name=prefix;o['character']='drilady';o['traitPack']='bunny-study';parts.append(o);return o

def samples(rows,steps=9):
 result=[]
 for i in range(len(rows)-1):
  p=[Vector(rows[max(0,min(len(rows)-1,k))]) for k in [i-1,i,i+1,i+2]]
  for j in range(steps):
   t=j/steps;result.append(.5*(2*p[1]+(-p[0]+p[2])*t+(2*p[0]-5*p[1]+4*p[2]-p[3])*t*t+(-p[0]+3*p[1]-3*p[2]+p[3])*t*t*t))
 result.append(Vector(rows[-1]));return result

def ear(rows,side):
 # A single watertight lenticular shell. The front is cupped; its broad rose
 # inset and rolled outer rim share vertices, avoiding stickers and z-fighting.
 dense=samples(rows);v=[];N=48
 for i,row in enumerate(dense):
  x,y,z,w,d=row;c=Vector((side*x,y,z))
  tangent=Vector((side*dense[min(i+1,len(dense)-1)][0],dense[min(i+1,len(dense)-1)][1],dense[min(i+1,len(dense)-1)][2]))-Vector((side*dense[max(0,i-1)][0],dense[max(0,i-1)][1],dense[max(0,i-1)][2]))
  tangent.normalize();across=tangent.cross(Vector((0,1,0))).normalized();front=tangent.cross(across).normalized()
  if front.y>0:front=-front
  for j in range(N):
   a=j*math.tau/N;u=math.cos(a);q=math.sin(a)
   # The central cup sits behind a substantial rolled edge.
   depth=q*(.36+.83*abs(u)**.9) if q>0 else q
   v.append(tuple(c+across*max(.001,w)*u+front*max(.001,d)*depth))
 f=[(i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j) for i in range(len(dense)-1) for j in range(N)]
 f.extend([tuple(reversed(range(N))),tuple((len(dense)-1)*N+j for j in range(N))])
 o=b.mesh(prefix,v,f,M['fur']);o.data.materials.append(M['inner'])
 for i in range(len(dense)-1):
  t=(i+.5)/(len(dense)-1)
  # A softly pointed inset follows the narrowing of the entire ear.
  inset=.76*min(1,(t/.15)**.5,((1-t)/.10)**.5)
  for j in range(N):
   a=(j+.5)*math.tau/N
   if math.sin(a)>0 and abs(math.cos(a))<inset:o.data.polygons[i*N+j].material_index=1
 return o

def build_ears():
 # x,y,z,width,depth. Six raised silhouettes stay within the portrait's upper
 # margin; length also travels sideways/backward instead of simply clipping.
 profiles=[
  [(.31,.10,2.62,.075,.065),(.40,.10,2.80,.12,.066),(.47,.12,3.00,.13,.062),(.49,.15,3.105,.065,.042),(.49,.16,3.13,.001,.003)],
  [(.30,.09,2.61,.075,.06),(.45,.08,2.80,.14,.075),(.65,.09,2.99,.15,.068),(.76,.12,3.08,.07,.042),(.78,.14,3.10,.001,.003)],
  [(.34,.11,2.62,.08,.07),(.48,.13,2.80,.145,.08),(.48,.17,3.00,.135,.075),(.39,.21,3.10,.07,.045),(.35,.23,3.11,.001,.003)],
  [(.33,.10,2.63,.08,.07),(.43,.12,2.86,.14,.08),(.53,.14,3.055,.12,.065),(.55,.15,3.12,.001,.003)],
  [(.32,.10,2.63,.08,.075),(.46,.22,2.82,.13,.08),(.56,.43,3.00,.13,.07),(.62,.59,3.09,.065,.04),(.65,.67,3.10,.001,.003)],
  [(.32,.10,2.63,.08,.065),(.43,.10,2.84,.12,.07),(.54,.12,3.06,.135,.07),(.70,.08,3.075,.09,.056),(.78,.01,2.98,.015,.019)],
  [(.30,.13,2.70,.075,.065),(.46,.16,2.63,.13,.075),(.64,.19,2.37,.175,.083),(.73,.19,1.98,.18,.08),(.74,.16,1.65,.11,.055),(.67,.12,1.52,.002,.004)],
  [(.31,.12,2.68,.07,.06),(.53,.16,2.60,.14,.08),(.76,.20,2.34,.19,.082),(.89,.23,2.05,.15,.068),(.99,.23,1.87,.002,.004)],
  [(.31,.14,2.69,.08,.064),(.50,.19,2.58,.15,.08),(.69,.24,2.30,.17,.08),(.78,.22,1.96,.14,.07),(.78,.16,1.74,.002,.004)],
  [(.31,.13,2.68,.08,.07),(.48,.14,2.84,.13,.085),(.66,.01,2.80,.16,.085),(.73,-.09,2.59,.14,.07),(.68,-.14,2.43,.003,.005)],
 ]
 for i,id in enumerate(EAR_IDS):
  begin('Ears',id)
  for s in [-1,1]:
   rows=profiles[i]
   if i==3 and s<0:rows=[(.33,.10,2.63,.08,.065),(.45,.13,2.89,.135,.08),(.65,.05,3.015,.135,.078),(.79,-.06,2.89,.10,.06),(.80,-.09,2.79,.002,.004)]
   if i==8 and s>0:rows=[(.31,.14,2.69,.08,.07),(.51,.16,2.80,.14,.08),(.73,.13,2.68,.17,.085),(.88,.07,2.49,.12,.06),(.92,.01,2.40,.002,.004)]
   # Seat the raised ears farther out and lower on the crown: their full
   # silhouettes remain readable beside the hair, with the tips in the crop.
   if i<6:rows=[(x+.10,y,2.51+(z-2.64)*1.04,w,d) for x,y,z,w,d in rows]
   ear(rows,s)
  join()
 print('Built 10 sculpted ear pairs')

def lock(rows,color):
 dense=samples(rows,8);return b.sweep(prefix,[tuple(r[:3]) for r in dense],[(max(.001,r[3]),max(.001,r[4])) for r in dense],M[color],n=16)

def scalp(color):
 # Closed, continuous front-to-back shell fitted around the accepted skull.
 v=[];f=[];N=64;R=26
 for layer in [0,1]:
  for k in range(R+1):
   for j in range(N):
    a=j*math.tau/N;front=max(0,-math.sin(a));theta=k/R*(2.31-front*1.34);q=layer*.030
    v.append(((.520-q)*math.sin(theta)*math.cos(a),.058+(.420-q)*math.sin(theta)*math.sin(a),2.31+(.535-q)*math.cos(theta)))
 span=(R+1)*N
 for k in range(R):
  for j in range(N):
   a=k*N+j;c=k*N+(j+1)%N;d=(k+1)*N+(j+1)%N;e=(k+1)*N+j
   f.extend([(a,c,d,e),(a+span,e+span,d+span,c+span)])
 for j in range(N):a=R*N+j;c=R*N+(j+1)%N;f.append((a,c,c+span,a+span))
 b.mesh(prefix,v,f,M[color])

def fringe(color,center=False):
 if center:
  for s in [-1,1]:
   for k in range(3):
    lock([(s*.025,.005+k*.052,2.845-k*.007,.045,.029),(s*.20,-.24+k*.032,2.79,.10,.045),(s*.40,-.29+k*.025,2.61,.085,.047),(s*.49,-.17+k*.04,2.40,.001,.002)],color)
 else:
  for k in range(3):
   lock([(.23,.005+k*.042,2.80,.06,.039),(.08,-.24+k*.03,2.83-k*.022,.13,.058),(-.17,-.35+k*.022,2.71-k*.045,.14,.059),(-.37,-.29+k*.018,2.59-k*.035,.075,.037),(-.46,-.15+k*.02,2.53-k*.025,.001,.001)],color)
  lock([(.22,-.05,2.79,.07,.045),(.36,-.22,2.71,.09,.054),(.45,-.22,2.54,.075,.043),(.49,-.09,2.34,.002,.002)],color)

def nape(color):
 for k in range(9):
  a=.10+k*(math.pi-.20)/8
  x=.48*math.cos(a);y=.058+.38*math.sin(a)
  lock([(x*.70,y*.80,2.69,.11,.06),(x,y,2.40,.12,.055),(x*.97,y,2.17,.095,.046),(x*.80,y*.84,2.01,.002,.002)],color)

def fuse_hair():
 # Union broad locks into a coherent scalp, with soft transitions on all sides.
 o=join();parts.remove(o);bpy.context.view_layer.objects.active=o
 o.modifiers.clear();mod=o.modifiers.new('Joined sculpt volumes','REMESH');mod.mode='VOXEL';mod.voxel_size=.010;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Sculpt transition smoothing','SMOOTH');mod.factor=.65;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Preserve silhouette budget','DECIMATE');mod.ratio=.25;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.validate(clean_customdata=True);o.data.update()
 o.vertex_groups.clear();o.vertex_groups.new(name='Head').add(list(range(len(o.data.vertices))),1,'REPLACE')
 mod=o.modifiers.new('Shared character skin','ARMATURE');mod.object=rig
 b.parts[:]=[o]

def braid(points,width,color,turns=4.5):
 # Three interlaced broad, flattened strands form actual plait volume.
 dense=samples([(*p,1) for p in points],22)
 for strand in range(3):
  path=[];ws=[]
  for i,p in enumerate(dense):
   t=i/(len(dense)-1);a=t*math.tau*turns+strand*math.tau/3
   taper=1-.43*t;w=width*taper
   path.append((p[0]+w*.54*math.cos(a),p[1]+w*.32*math.sin(2*a),p[2]))
   ws.append((w*.49,w*.39))
  b.sweep(prefix,path,ws,M[color],n=14)

def scrunchie(c,r=.105):
 # Gathered fabric torus, not a stack of decorative line curves.
 v=[];f=[];N=64;K=16
 for j in range(N):
  a=j*math.tau/N;wrinkle=1+.11*math.cos(a*10)
  for k in range(K):
   q=k*math.tau/K;rho=r+.035*math.cos(q)*wrinkle
   v.append((c[0]+rho*math.cos(a),c[1]+rho*math.sin(a),c[2]+.041*math.sin(q)*wrinkle))
 for j in range(N):
  for k in range(K):f.append((j*K+k,((j+1)%N)*K+k,((j+1)%N)*K+(k+1)%K,j*K+(k+1)%K))
 b.mesh(prefix,v,f,M['plum'])

def build_hair():
 for i,id in enumerate(HAIR_IDS):
  begin('Hair',id);color='caramel' if i in [0,4] else 'honey';scalp(color);fringe(color,i in [1,3])
  if i==0:nape(color)
  if i==3:
   for s in [-1,1]:
    for k in range(7):
     y=-.14+k*.078
     lock([(s*.17,y*.65,2.77,.095,.065),(s*.46,y,2.58,.115,.065),(s*.53,y+.01,2.30,.105,.07),(s*.45,y+.025,2.10,.07,.045),(s*.33,y+.04,2.14,.002,.002)],color)
   nape(color)
  if i in [1,2]:
   for s in ([-1,1] if i==1 else [1]):lock([(s*.21,.19,2.76,.12,.07),(s*.43,.30,2.50,.14,.09),(s*.51,.23,2.26,.13,.075),(s*.55,-.03,2.08,.12,.07)],color)
  if i==4:
   for k in range(7):
    a=k*math.tau/7
    lock([(.27,.27,2.66,.09,.06),(.38+.08*math.cos(a),.43+.07*math.sin(a),2.73,.11,.065),(.57+.11*math.cos(a),.47+.08*math.sin(a),2.37,.12,.07),(.65+.085*math.cos(a),.43+.06*math.sin(a),1.98,.075,.05),(.57+.07*math.cos(a),.31+.06*math.sin(a),1.77,.002,.002)],color)
  fuse_hair()
  if i in [1,2]:
   sides=[-1,1] if i==1 else [1]
   for s in sides:
    points=[(s*.52,.17,2.28),(s*.60,-.08,2.04),(s*.59,-.22,1.77),(s*.55,-.25,1.44)]
    braid(points,.15 if i==1 else .185,color,4.5 if i==1 else 4)
    scrunchie((s*.55,-.25,1.45),.069 if i==1 else .08)
    lock([(s*.55,-.25,1.43,.07,.045),(s*.58,-.25,1.30,.055,.035),(s*.63,-.22,1.23,.002,.002)],color)
  if i==4:scrunchie((.34,.37,2.69),.117)
  join()
 print('Built 5 continuous hairstyles')

def finish():
 for o in parts:
  o.data.validate(clean_customdata=True);o.data.update()
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(OUT/'drilady-bunny-study.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_def_bones=False,export_yup=True,export_apply=False,export_normals=True,export_materials='EXPORT',export_extras=True)
 report={'parts':len(parts),'bones':len(rig.data.bones),'ears':10,'uprightEars':6,'hair':5,'meshes':[]}
 for o in parts:
  report['meshes'].append({'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)})
 (OUT/'drilady-bunny-study-report.json').write_text(json.dumps(report,indent=2)+'\n')
 # Reference body is linked only into the editable source, excluded from GLB.
 preview=bpy.data.collections.new('Accepted base · fitting reference');bpy.context.scene.collection.children.link(preview)
 names=['Drif_Body','Drif_Head_original','Drif_Eyes_classic','Drif_Brows_original','Drif_Nose_original','Drif_Mouth_original','Drif_Shirt_original','Drif_Legs_original']
 with bpy.data.libraries.load(str(OUT/'drilady-base.blend'),link=False) as (src,dst):dst.objects=names
 for o in dst.objects:
  preview.objects.link(o);o.parent=rig
  for mod in o.modifiers:
   if mod.type=='ARMATURE':mod.object=rig
 for o in parts:o.hide_set(o.name not in ['Drif_Ears_ladyrefalert','Drif_Hair_ladyrefhoneybraids']);o.hide_render=o.hide_get()
 bpy.context.scene.world.color=(.18,.18,.18)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drilady-bunny-study.blend'))
 print(json.dumps(report))

if __name__=='__main__':setup();build_ears();build_hair();finish()
