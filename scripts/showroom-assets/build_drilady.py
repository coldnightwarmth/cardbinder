"""Standalone Drilady. All surfaces are authored here; only the 19-bone rig and
49 actions are shared with Drifella. Run in a new Blender file (or via MCP stages).
"""
import bpy,bmesh,math,json,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/models/drilady'
OUT.mkdir(parents=True,exist_ok=True)
parts=[]

def material(name,color,rough=.68,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m

def setup():
 global scene,collection,rig,fur,cream,rose,ink,hair,hairlight,navy,denim,denimlight,white,purple,iris,gold,shadow
 # Never overwrite or clear the user's Drifella source file.
 assert not bpy.data.filepath or Path(bpy.data.filepath).parent==OUT,'Open a new Blender file before building Drilady.'
 for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
 for c in list(bpy.data.collections):
  if c.name.startswith('DriladyLibrary'):bpy.data.collections.remove(c)
 for m in list(bpy.data.materials):bpy.data.materials.remove(m)
 for data in list(bpy.data.meshes):
  if data.users==0:bpy.data.meshes.remove(data)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 scene=bpy.context.scene;scene.name='Drilady Studio';scene.render.fps=30
 collection=bpy.data.collections.new('DriladyLibrary');scene.collection.children.link(collection)
 source=os.environ.get('DRILADY_RIG_SOURCE',str(ROOT/'assets/models/drifmaker/drifella-customizable.blend'))
 with bpy.data.libraries.load(source,link=False) as (src,dst):dst.objects=['DrifellaRig'];dst.actions=src.actions
 rig=dst.objects[0];rig.name='DriladyRig';rig.data.name='DriladySharedSkeleton';collection.objects.link(rig)
 rig.animation_data_clear();rig.animation_data_create();rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 for action in bpy.data.actions:action.use_fake_user=True
 fur=material('Drilady_Fur',(.69,.33,.21));cream=material('Drilady_Cream',(.91,.78,.61));rose=material('Drilady_InnerEar',(.65,.24,.28));ink=material('Drilady_Ink',(.012,.014,.025),.5)
 hair=material('Drilady_Chestnut',(.13,.029,.017));hairlight=material('Drilady_ChestnutLight',(.18,.043,.023));navy=material('Drilady_Navy',(.047,.055,.12));denim=material('Drilady_Indigo',(.093,.105,.18),.95);denimlight=material('Drilady_DenimFold',(.125,.14,.23),.95)
 white=material('Drilady_Cotton',(.92,.89,.82),.94);purple=material('Drilady_Purple',(.39,.09,.52));iris=material('Drilady_Iris',(.18,.20,.62),.28);gold=material('Drilady_Silver',(.68,.70,.73),.24,.85)
 shadow=material('Drilady_Makeup',(1,1,1),.63)
 vc=shadow.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Makeup';bs=next(n for n in shadow.node_tree.nodes if n.type=='BSDF_PRINCIPLED');shadow.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 parts.clear()

def mesh(name,verts,faces,mat,bone='Head',smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);collection.objects.link(o);o.data.materials.append(mat)
 for f in data.polygons:f.use_smooth=smooth
 for v in data.vertices:
  w=bone(v.co) if callable(bone) else {bone:1};total=sum(w.values())
  for key,value in w.items():
   if value>0:(o.vertex_groups.get(key) or o.vertex_groups.new(name=key)).add([v.index],value/total,'REPLACE')
 o.parent=rig;mod=o.modifiers.new('Shared character skin','ARMATURE');mod.object=rig;parts.append(o);return o

def ell(name,c,r,mat,bone='Head',n=32,m=20):
 v=[(c[0]+r[0]*math.sin(i*math.pi/m)*math.cos(j*math.tau/n),c[1]+r[1]*math.sin(i*math.pi/m)*math.sin(j*math.tau/n),c[2]+r[2]*math.cos(i*math.pi/m)) for i in range(m+1) for j in range(n)]
 return mesh(name,v,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(m) for j in range(n)],mat,bone)

def loft(name,sections,mat,bone,n=32,folds=0,depth=0):
 v=[]
 for i,(z,xr,yr,x,y) in enumerate(sections):
  for j in range(n):
   a=j*math.tau/n;d=depth*math.cos(a*folds+i*.7);v.append((x+(xr+d)*math.cos(a),y+(yr+d)*math.sin(a),z))
 f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sections)-1) for j in range(n)]
 f.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+j for j in range(n))]);return mesh(name,v,f,mat,bone)

def patch(name,outline,y,depth,mat,bone='Head',bulge=.02):
 # Concentric quad rings form a broad, convex surface rather than a flat sticker.
 x=sum(p[0] for p in outline)/len(outline);z=sum(p[1] for p in outline)/len(outline);n=len(outline);v=[]
 for t in [1,.78,.40,.025]:
  v.extend((x+(px-x)*t,y-bulge*(1-t*t),z+(pz-z)*t) for px,pz in outline)
 f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(3) for j in range(n)];f.append(tuple(3*n+j for j in range(n)))
 v.extend((px,y+depth,pz) for px,pz in outline);f.extend((j,4*n+j,4*n+(j+1)%n,(j+1)%n) for j in range(n));f.append(tuple(reversed([4*n+j for j in range(n)])))
 return mesh(name,v,f,mat,bone)

def box(name,c,size,mat,bone,bevel=.02):
 x,y,z=c;a,b,d=[s/2 for s in size];v=[(x+i*a,y+j*b,z+k*d) for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
 o=mesh(name,v,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat,bone)
 if bevel:
  mod=o.modifiers.new('Soft tailored edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o
  bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def sweep(name,path,widths,mat,bone='Head',n=12):
 v=[]
 for i,c in enumerate(path):
  tangent=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)]);tangent.normalize();side=tangent.cross(Vector((0,1,0))).normalized();normal=tangent.cross(side).normalized();w,h=widths[i]
  v.extend(Vector(c)+side*w*math.cos(j*math.tau/n)+normal*h*math.sin(j*math.tau/n) for j in range(n))
 f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(path)-1) for j in range(n)];f.extend([tuple(reversed(range(n))),tuple((len(path)-1)*n+j for j in range(n))]);return mesh(name,v,f,mat,bone)

def ring(name,c,rx,rz,r,mat,bone='Pelvis',n=32):
 return sweep(name,[(c[0]+rx*math.cos(a),c[1],c[2]+rz*math.sin(a)) for a in [j*math.tau/n for j in range(n+1)]],[(r,r)]*(n+1),mat,bone,8)

def torso(co):
 t=max(0,min(1,(co.z-.80)/.58));neck=max(0,min(1,(co.z-1.57)/.22));return {'Pelvis':1-t,'Chest':t*(1-neck),'Head':neck}
def arm(label):
 def weights(co):
  t=max(0,min(1,(abs(co.x)-.72)/.20));shoulder=max(0,min(1,(abs(co.x)-.28)/.17));return {'Chest':1-shoulder,'UpperArm.'+label:(1-t)*shoulder,'Forearm.'+label:t}
 return weights
def leg(label):
 def weights(co):
  t=max(0,min(1,(co.z-.32)/.22));return {'Thigh.'+label:t,'Shin.'+label:1-t}
 return weights

def body():
 loft('Drif_Body_torso',[(.70,.29,.18,0,0),(.83,.32,.19,0,0),(.98,.24,.16,0,0),(1.14,.26,.17,0,0),(1.33,.32,.20,0,0),(1.49,.30,.18,0,0),(1.55,.19,.15,0,0),(1.70,.12,.12,0,0),(1.85,.105,.11,0,0)],fur,torso,40)
 # Abdomen is continuous; the top is a separate fitted garment.
 for s,l in [(-1,'R'),(1,'L')]:
  path=[(s*x,0,1.465) for x in [.29,.38,.52,.68,.79,.88,1.02,1.12]];r=[.12,.145,.14,.122,.115,.115,.09,.078]
  sweep('Drif_Body_arm',path,[(v,v) for v in r],fur,arm(l),20)
  ell('Drif_Body_palm',(s*1.23,-.012,1.46),(.145,.085,.105),cream,'Hand.'+l)
  ell('Drif_Body_thumb',(s*1.18,-.085,1.40),(.068,.055,.069),cream,'Hand.'+l,20,12)
  for k in range(3):ell('Drif_Body_knuckle',(s*1.31,-.026,1.41+k*.044),(.058,.068,.032),cream,'Hand.'+l,16,10)
 # A round cotton tail has its own replaceable part and stays on the pelvis.
 ell('Drif_Tail_original',(0,.29,.87),(.17,.15,.18),cream,'Pelvis',24,16)


def rounded(points,steps=5):
 out=[];n=len(points)
 for i in range(n):
  p0,p1,p2,p3=[Vector(points[j%n]) for j in [i-1,i,i+1,i+2]]
  for j in range(steps):
   t=j/steps;out.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
 return out

def head():
 from mathutils.bvhtree import BVHTree
 # Unite skull, broad cheek pads, muzzle and jaw into one continuous sculpt.
 blocks=[ell('Head clay',(0,.035,2.245),(.49,.36,.515),fur,n=48,m=32)]
 for side in [-1,1]:
  o=ell('Cheek clay',(side*.285,-.16,2.015),(.30,.255,.17),fur,n=40,m=24)
  for v in o.data.vertices:v.co.z+=(abs(v.co.x)-.32)*.22
  blocks.append(o)
 blocks.extend([ell('Muzzle clay',(0,-.29,1.96),(.27,.18,.135),fur),ell('Jaw clay',(0,-.235,1.85),(.18,.15,.105),fur)])
 bpy.ops.object.select_all(action='DESELECT')
 for o in blocks:o.select_set(True)
 bpy.context.view_layer.objects.active=blocks[0];bpy.ops.object.join();skull=blocks[0]
 skull.name='Drif_Head_original';skull.modifiers.clear()
 remesh=skull.modifiers.new('Unified face sculpt','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.012;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
 smooth=skull.modifiers.new('Blend cheek and jaw transitions','SMOOTH');smooth.factor=1.2;smooth.iterations=6;bpy.ops.object.modifier_apply(modifier=smooth.name)
 # Split polygons at the painted muzzle contour so its edge is a clean
 # continuous curve, independent of the voxel tessellation underneath.
 verts=[];faces=[];indices=[];lookup={}
 def boundary(p):return max(p.z-(2.045+.20*(min(.62,abs(p.x))/.62)**1.5),p.y+.10)
 def vertex(p):
  key=tuple(round(float(x),6) for x in p)
  if key not in lookup:lookup[key]=len(verts);verts.append(tuple(p))
  return lookup[key]
 for poly in skull.data.polygons:
  points=[skull.data.vertices[i].co.copy() for i in poly.vertices]
  for region in [0,1]:
   clipped=[]
   for i,p in enumerate(points):
    q=points[(i+1)%len(points)];dp,dq=boundary(p),boundary(q)
    inside=lambda d:d<=0 if region else d>=0
    if inside(dp):clipped.append(p)
    if inside(dp)!=inside(dq):clipped.append(p.lerp(q,dp/(dp-dq)))
   if len(clipped)>=3:faces.append([vertex(p) for p in clipped]);indices.append(region)
 old=skull.data;data=bpy.data.meshes.new('Drilady continuous face');data.from_pydata(verts,[],faces);data.update();skull.data=data;bpy.data.meshes.remove(old)
 skull.data.materials.append(fur);skull.data.materials.append(cream)
 for f,index in zip(skull.data.polygons,indices):f.material_index=index;f.use_smooth=True
 skull.vertex_groups.clear();vg=skull.vertex_groups.new(name='Head');vg.add(list(range(len(skull.data.vertices))),1,'REPLACE');mod=skull.modifiers.new('Shared character skin','ARMATURE');mod.object=rig
 parts[:]=[o for o in collection.objects if o.type=='MESH']
 tree=BVHTree.FromPolygons([v.co[:] for v in skull.data.vertices],[tuple(f.vertices) for f in skull.data.polygons])
 def surface(x,z):
  hit,normal,_,_=tree.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
  return hit.y if hit else -.20
 def fitted(name,outline,mat,offset=.009,bulge=.015,soft=True):
  o=patch(name,rounded(outline) if soft else outline,0,.008,mat,bulge=bulge)
  for v in o.data.vertices:v.co.y+=surface(v.co.x,v.co.z)-offset
  return o
 # A shared analytic contour keeps all eye layers aligned; it never jumps
 # between different ray hits at the edge of a cheek or brow.
 def eye_y(x,z):return -.355+.10*(x/.49)**2+.045*((z-2.34)/.34)**2
 def eye_patch(name,outline,mat,offset=0,bulge=0):
  boundary=rounded(outline,7);cx=sum(x for x,z in boundary)/len(boundary);cz=sum(z for x,z in boundary)/len(boundary);n=len(boundary);v=[];rings=20
  for i in range(rings):
   t=1-i/(rings-.5)
   for x,z in boundary:
    xx=cx+(x-cx)*t;zz=cz+(z-cz)*t
    v.append((xx,eye_y(xx,zz)-offset-bulge*(1-t*t),zz))
  f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(rings-1) for j in range(n)]
  f.append(tuple((rings-1)*n+j for j in range(n)))
  # Buried edges give the lids thickness in profile without raised panel rims.
  v.extend((x,eye_y(x,z)+.07,z) for x,z in boundary)
  f.extend((j,rings*n+j,rings*n+(j+1)%n,(j+1)%n) for j in range(n))
  return mesh(name,v,f,mat)
 for side in [-1,1]:
  mirror=lambda pts:[(side*x,z) for x,z in pts]
  white_outline=[(.066,2.13),(.16,2.19),(.30,2.25),(.458,2.315),(.408,2.19),(.29,2.105),(.17,2.095)]
  eye_patch('Drif_Eyes_classic_white',mirror(white_outline),white,.010,.012)
  def disc(name,x,z,rx,rz,mat,offset):
   return eye_patch(name,[(side*(x+rx*math.cos(j*math.tau/16)),z+rz*math.sin(j*math.tau/16)) for j in range(16)],mat,offset,.002)
  disc('Drif_Eyes_classic_iris',.257,2.166,.065,.073,iris,.027)
  disc('Drif_Eyes_classic_pupil',.246,2.17,.026,.040,ink,.031)
  disc('Drif_Eyes_classic_glint',.23,2.19,.012,.014,white,.035)
  lid_outline=[(.067,2.132),(.087,2.32),(.13,2.49),(.215,2.555),(.305,2.51),(.365,2.405),(.46,2.316),(.31,2.255),(.17,2.197)]
  lid=eye_patch('Drif_Eyes_classic_makeup',mirror(lid_outline),shadow,.043,.027)
  attr=lid.data.color_attributes.new(name='Makeup',type='FLOAT_COLOR',domain='POINT')
  stops=[(2.13,(.10,.008,.17)),(2.27,(.30,.025,.43)),(2.41,(.72,.17,.50)),(2.52,(.98,.69,.13)),(2.56,(.92,.65,.15))]
  for v in lid.data.vertices:
   zz=v.co.z;c=stops[-1][1]
   for (z0,c0),(z1,c1) in zip(stops,stops[1:]):
    if zz<=z1:
     t=max(0,min(1,(zz-z0)/(z1-z0)));c=tuple(a+(b-a)*t for a,b in zip(c0,c1));break
   attr.data[v.index].color=(*c,1)
  # One clean curved upper lash band, with three outward tapered tips.
  eye_patch('Drif_Eyes_classic_lashline',mirror([(.066,2.132),(.17,2.20),(.31,2.26),(.46,2.32),(.443,2.291),(.30,2.232),(.17,2.175)]),ink,.049,.003)
  for j in range(3):
   x=.355+j*.039;z=2.263+j*.021
   path=[(side*x,eye_y(side*x,z)-.054,z),(side*(x+.038),eye_y(side*(x+.038),z+.031)-.055,z+.031),(side*(x+.074),eye_y(side*(x+.074),z+.083)-.066,z+.083)]
   sweep('Drif_Eyes_classic_lash',path,[(.018,.006),(.014,.005),(.0008,.001)],ink,n=10)
  eye_patch('Drif_Brows_original',mirror([(.09,2.588),(.17,2.635),(.247,2.631),(.34,2.585),(.37,2.558),(.33,2.565),(.243,2.612),(.168,2.615)]),hair,.001,.003)
 fitted('Drif_Nose_original',[(-.048,2.045),(-.028,2.065),(.028,2.065),(.048,2.045),(0,2.015)],rose,.013,.014)
 # Small upturned grin sits inside the muzzle, not on a separate chin sphere.
 fitted('Drif_Mouth_original_smile',[(-.105,1.915),(-.047,1.903),(.025,1.908),(.113,1.938),(.076,1.888),(0,1.877),(-.075,1.89)],ink,.006,.004)
 for j in range(7):
  x=(j-3)*.026;z=1.901+.011*(x/.1)**2
  y=surface(x,z)-.015
  box('Drif_Mouth_original_tooth',(x,y,z),(.023,.018,.023),white,'Head',.004)
  box('Drif_Mouth_original_brace',(x,y-.012,z),(.009,.004,.010),gold,'Head',.0015)
 # Tiny braces wire hugs the smile's curvature.
 path=[(x,surface(x,1.90)-.028,1.902+.011*(x/.1)**2) for x in [-.09,-.06,-.03,0,.03,.06,.09]]
 sweep('Drif_Mouth_original_wire',path,[(.0018,.0018)]*len(path),gold,'Head',6)


def ears_hair():
 for s in [-1,1]:
  # Lenticular cross sections taper into curled tips. Front panels are inset.
  rows=[(2.79,.095,.075,s*.32,.09),(2.69,.135,.085,s*.46,.12),(2.47,.17,.085,s*.62,.15),(2.16,.185,.08,s*.74,.17),(1.84,.17,.075,s*.81,.19),(1.56,.11,.06,s*.83,.18),(1.43,.015,.025,s*.77,.13)]
  loft('Drif_Ears_original_outer',rows,fur,'Head',28)
  verts=[];cols=12
  for z,w,d,x,y in rows[1:-1]:
   for j in range(cols+1):
    a=-1+2*j/cols;verts.append((x+a*w*.68,y-d*math.sqrt(max(0,1-(a*.68)**2))-.007,z))
  o=mesh('Drif_Ears_original_inset',verts,[(r*(cols+1)+j,r*(cols+1)+j+1,(r+1)*(cols+1)+j+1,(r+1)*(cols+1)+j) for r in range(4) for j in range(cols)],rose)
  ell('Drif_Ears_original_scrunchie',(s*.32,.10,2.79),(.135,.125,.095),purple,n=24,m=14)
 # Closed scalp shell follows the skull; swept locks fuse into it.
 hairparts=[];v=[];n=64;m=24
 for layer in [0,1]:
  for i in range(m+1):
   t=i/m
   for j in range(n):
    a=j*math.tau/n;front=max(0,-math.sin(a));theta=t*(2.28-front*1.20)
    inset=.036*layer
    v.append(((.505-inset)*math.sin(theta)*math.cos(a),.058+(.394-inset)*math.sin(theta)*math.sin(a),2.31+(.505-inset)*math.cos(theta)))
 span=(m+1)*n
 f=[(layer*span+i*n+j,layer*span+i*n+(j+1)%n,layer*span+(i+1)*n+(j+1)%n,layer*span+(i+1)*n+j) for layer in [0,1] for i in range(m) for j in range(n)]
 f.extend((m*n+j,m*n+(j+1)%n,span+m*n+(j+1)%n,span+m*n+j) for j in range(n))
 hairparts.append(mesh('Drif_Hair_original_cap',v,f,hair))
 def flowing_lock(path,widths):
  dense=[];sizes=[]
  for i in range(len(path)-1):
   pts=[Vector(path[max(0,min(len(path)-1,k))]) for k in [i-1,i,i+1,i+2]]
   ws=[Vector(widths[max(0,min(len(widths)-1,k))]) for k in [i-1,i,i+1,i+2]]
   for j in range(8):
    t=j/8
    interp=lambda p:.5*(2*p[1]+(-p[0]+p[2])*t+(2*p[0]-5*p[1]+4*p[2]-p[3])*t*t+(-p[0]+3*p[1]-3*p[2]+p[3])*t*t*t)
    dense.append(tuple(interp(pts)));sizes.append(tuple(interp(ws)))
  dense.append(path[-1]);sizes.append(widths[-1]);hairparts.append(sweep('Drif_Hair_original_lock',dense,sizes,hair,n=16))
 flowing_lock([(.22,-.13,2.76),(.08,-.27,2.78),(-.16,-.345,2.70),(-.34,-.32,2.59),(-.46,-.22,2.53)],[(.10,.06),(.12,.065),(.13,.066),(.08,.05),(.004,.004)])
 flowing_lock([(.25,-.15,2.77),(.07,-.29,2.72),(-.17,-.36,2.62),(-.36,-.31,2.55)],[(.08,.05),(.10,.05),(.08,.04),(.003,.003)])
 flowing_lock([(.23,-.12,2.78),(.35,-.22,2.69),(.42,-.20,2.56),(.48,-.11,2.38)],[(.07,.05),(.085,.05),(.06,.035),(.003,.003)])
 for side in [-1,1]:
  flowing_lock([(side*.30,.19,2.68),(side*.43,.24,2.42),(side*.42,.25,2.17),(side*.30,.25,1.98)],[(.11,.055),(.095,.05),(.06,.04),(.003,.003)])
 flowing_lock([(.05,.26,2.72),(.13,.405,2.39),(.12,.37,2.16),(.04,.28,1.98)],[(.015,.015),(.16,.035),(.10,.035),(.003,.003)])
 bpy.ops.object.select_all(action='DESELECT')
 for o in hairparts:o.select_set(True)
 bpy.context.view_layer.objects.active=hairparts[0];bpy.ops.object.join();o=hairparts[0];o.modifiers.clear()
 mod=o.modifiers.new('Continuous swept hair','REMESH');mod.mode='VOXEL';mod.voxel_size=.008;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Soften lock transitions','SMOOTH');mod.factor=.75;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.vertex_groups.clear();o.vertex_groups.new(name='Head').add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Shared character skin','ARMATURE');mod.object=rig


def clothes():
 # Tailored tank shell: open armholes and scalloped neckline, with separate binding.
 n=64;v=[];profiles=[(1.12,.285,.205),(1.17,.295,.22),(1.29,.34,.27),(1.40,.34,.25),(1.48,.31,.21)]
 for k,(z,rx,ry) in enumerate(profiles):
  for j in range(n):
   a=j*math.tau/n;front=max(0,-math.sin(a));zz=z
   if k==4:zz=1.48-.13*front**5
   v.append((rx*math.cos(a),ry*math.sin(a)-.009,zz))
 mesh('Drif_Shirt_original_tank',v,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(4) for j in range(n)],white,torso)
 # Straps are broad cloth bands bridging shoulders, with navy inset edges.
 for s in [-1,1]:
  path=[(s*.235,-.18,1.42),(s*.245,-.12,1.49),(s*.255,0,1.525),(s*.255,.14,1.49),(s*.24,.19,1.42)]
  sweep('Drif_Shirt_original_strap_binding',path,[(.036,.017)]*5,navy,'Chest',10)
  path=[(x,y-.003,z+.008) for x,y,z in path];sweep('Drif_Shirt_original_strap',path,[(.021,.012)]*5,white,'Chest',10)
 # Tubular seams are restrained functional edging, never a substitute for folds.
 path=[v[4*n+j] for j in range(n)]+[v[4*n]];sweep('Drif_Shirt_original_neckbinding',path,[(.012,.012)]*(n+1),navy,'Chest',8)
 loft('Drif_Shirt_original_hem',[(1.105,.285,.205,0,-.009),(1.145,.29,.212,0,-.009)],white,torso,40)
 # Raised letterforms make the reference word readable without a full-art texture.
 curve=bpy.data.curves.new('MENSA lettering','FONT');curve.body='MENSA';curve.align_x='CENTER';curve.size=.105;curve.extrude=.001;curve.bevel_depth=.0007
 o=bpy.data.objects.new('Drif_Shirt_original_MENSA',curve);collection.objects.link(o);o.location=(0,-.281,1.245);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(navy)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 for ve in o.data.vertices:(o.vertex_groups.get('Chest') or o.vertex_groups.new(name='Chest')).add([ve.index],1,'REPLACE')
 o.parent=rig;mod=o.modifiers.new('Shared character skin','ARMATURE');mod.object=rig;parts.append(o)
 # Baggy trousers with asymmetric knee folds, structured cargo pockets and belt loops.
 loft('Drif_Legs_original_hips',[(.59,.33,.21,0,0),(.74,.37,.24,0,0),(.86,.34,.21,0,0),(.92,.31,.19,0,0)],denim,'Pelvis',40,6,.007)
 loft('Drif_Legs_original_belt',[(.87,.345,.215,0,0),(.925,.327,.203,0,0)],navy,'Pelvis',40)
 box('Drif_Legs_original_buckle',(0,-.22,.90),(.09,.025,.055),gold,'Pelvis',.009)
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215
  loft('Drif_Legs_original_pant',[(.13,.21,.23,x,-.02),(.20,.235,.23,x,0),(.30,.215,.215,x,0),(.39,.235,.225,x,0),(.48,.22,.23,x,0),(.58,.235,.23,x,0),(.69,.24,.235,x,0),(.78,.19,.21,x,0)],denim,leg(l),40,6,.012)
  for z,dx in [(.28,.012),(.47,-.01)]:
   patch('Drif_Legs_original_fold',[(x-.19,z+.07),(x+.18,z+.02),(x+.15,z-.03),(x-.18,z+.025)],-.213,.035,denimlight,leg(l),.01)
  box('Drif_Legs_original_cargopocket',(x+s*.17,-.08,.49),(.14,.29,.21),denimlight,leg(l),.035)
  box('Drif_Legs_original_pocketflap',(x+s*.18,-.087,.59),(.16,.30,.065),denim,leg(l),.016)
  box('Drif_Legs_original_rearpocket',(x,.231,.73),(.20,.026,.16),denimlight,'Pelvis',.018)
  for bx in [s*.12,s*.29]:box('Drif_Legs_original_beltloop',(bx,-.192,.90),(.032,.045,.085),denimlight,'Pelvis',.008)
  ell('Drif_Legs_original_shoe',(x,-.11,.105),(.20,.29,.09),cream,'Foot.'+l,n=32,m=12)
  loft('Drif_Legs_original_sole',[(.015,.20,.29,x,-.11),(.055,.207,.295,x,-.11)],white,'Foot.'+l,32)
  box('Drif_Legs_original_toecap',(x,-.32,.09),(.27,.08,.075),cream,'Foot.'+l,.025)
 # Pink optical disc charm, sculpted hub and radiating metallic facets.
 for k in range(4):ring('Drif_Accessory_original_chain',(.265,-.265-k*.012,.85-k*.043),.023,.029,.006,gold,n=16)
 ring('Drif_Accessory_original_disc',(.28,-.325,.61),.104,.104,.033,purple,n=48)
 ring('Drif_Accessory_original_rim',(.28,-.326,.61),.135,.135,.006,rose,n=48)
 for j in range(8):
  a=j*math.tau/8;c=(.28+math.cos(a)*.103,-.363,.61+math.sin(a)*.103)
  ell('Drif_Accessory_original_foil',c,(.015,.003,.012),rose if j%2 else gold,'Pelvis',12,8)


def finish():
 # Join by replaceable category, retaining material slots and skin weights.
 for prefix in ['Drif_Body','Drif_Tail_original','Drif_Head_original','Drif_Hair_original','Drif_Ears_original','Drif_Eyes_classic','Drif_Brows_original','Drif_Nose_original','Drif_Mouth_original','Drif_Shirt_original','Drif_Legs_original','Drif_Accessory_original']:
  # Cheek/chin/nose components use category matching during collection.
  category=prefix.split('_')[1]
  members=[o for o in collection.objects if o.type=='MESH' and o.name.split('_')[1]==category]
  bpy.ops.object.select_all(action='DESELECT')
  for o in members:o.select_set(True)
  bpy.context.view_layer.objects.active=members[0]
  if len(members)>1:bpy.ops.object.join()
  members[0].name=prefix
 parts[:]=[o for o in collection.objects if o.type=='MESH']
 for o in parts:o['character']='drilady';o['slot']=o.name.split('_')[1].lower()
 rig['animation_contract']='drifella-19-bone-v1';rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 scene.world=bpy.data.worlds.new('Drilady World');scene.world.use_nodes=True
 bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.17,.19,.22,1);bg.inputs[1].default_value=.4
 # A neutral studio is saved in the independent source file, excluded from GLB.
 for name,pos,power,size in [('Key',(-3,-4,6),450,5),('Fill',(4,-1,3.5),300,4),('Rim',(1,3,5),550,3)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
 cam=bpy.data.cameras.new('Drilady Camera');o=bpy.data.objects.new('Drilady Camera',cam);scene.collection.objects.link(o);o.location=(3,-7,3);o.rotation_euler=(Vector((0,0,1.45))-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=3.45;scene.camera=o
 scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
 for area in bpy.context.screen.areas if bpy.context.screen else []:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL';area.spaces.active.overlay.show_overlays=False;area.spaces.active.region_3d.view_camera_zoom=0
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts+[rig]:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(OUT/'drilady-base.glb'),use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_force_sampling=True,export_def_bones=False)
 (OUT/'manifest.json').write_text(json.dumps({'character':'drilady','version':1,'asset':'drilady-base.glb','source':'drilady-base.blend','animationContract':'drifella-19-bone-v1','bones':[b.name for b in rig.data.bones],'clips':[{'name':a.name,'frames':list(a.frame_range)} for a in bpy.data.actions],'parts':[{'name':o.name,'vertices':len(o.data.vertices)} for o in parts],'description':'New authored geometry with independent head, hair, ears, eyes, brows, nose, mouth, body, tail, top, legs and accessory. Reference: user-provided Drilady turnarounds.'},indent=2))
 rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 bpy.ops.object.select_all(action='DESELECT')
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drilady-base.blend'))
 print('DRILADY_EXPORTED',len(parts),len(bpy.data.actions),flush=True)

if __name__=='__main__':
 setup();body();head();ears_hair();clothes();finish()
