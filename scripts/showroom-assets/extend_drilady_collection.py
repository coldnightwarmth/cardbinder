"""144 collection-derived Drilady parts. Run stages through Blender MCP.
Preserves the accepted base sculpt and the complete shared animation contract.
All new surfaces are authored meshes; no whole-art textures are used.
"""
import bpy, math, json, importlib.util, random
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'assets/models/drilady'
CAT=json.loads((OUT/'collection-traits.json').read_text())['catalog']
spec=importlib.util.spec_from_file_location('drilady_builder',Path(__file__).with_name('build_drilady.py'));b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
rig=bpy.data.objects['DriladyRig'];scene=bpy.context.scene
collection=bpy.data.collections.get('DriladyTraits')
if collection is None:collection=bpy.data.collections.new('DriladyTraits');scene.collection.children.link(collection)
b.collection=collection;b.rig=rig
P=''; counter=0

def setup():
 assert Path(bpy.data.filepath).parent==OUT,'Only extend the independent Drilady file'
 rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 for o in list(collection.objects):bpy.data.objects.remove(o,do_unlink=True)

def mat(key,color,rough=.6,metal=0):
 return bpy.data.materials.get('Lady_'+key) or b.material('Lady_'+key,color,rough,metal)
M={
 'cream':mat('Ivory',(.9,.80,.65)), 'white':mat('Cotton',(.9,.9,.86),.94), 'ink':mat('Ink',(.008,.009,.018),.43),
 'navy':mat('Navy',(.025,.035,.09),.86), 'pink':mat('Rose',(.72,.15,.29),.4), 'pale':mat('Petal',(.95,.49,.60),.65),
 'red':mat('Cherry',(.54,.012,.026),.23), 'plum':mat('Plum',(.18,.012,.12),.58), 'purple':mat('Violet',(.29,.065,.56),.4),
 'blue':mat('Ice',(.18,.52,.84),.43), 'green':mat('Emerald',(.025,.32,.11),.3), 'gold':mat('Gold',(.64,.36,.08),.27,.85),
 'silver':mat('Chrome',(.65,.72,.81),.23,.92), 'bronze':mat('Bronze',(.27,.11,.035),.4,.7),
 'blonde':mat('Honey',(.60,.34,.10),.55), 'brown':mat('Chestnut',(.16,.035,.018),.65),
 'denim':mat('Denim',(.08,.13,.26),.96), 'teal':mat('Teal',(.018,.19,.23),.62), 'wood':mat('Walnut',(.22,.10,.045),.8),
 'gray':mat('Pewter',(.22,.25,.3),.56,.4), 'lime':mat('Lime',(.35,.65,.025),.45), 'orange':mat('Tangerine',(.9,.18,.018),.54),
}
M['fur']=bpy.data.materials['Drilady_Fur'];M['ear']=bpy.data.materials['Drilady_InnerEar']
skull=bpy.data.objects['Drif_Head_original'];TREE=BVHTree.FromPolygons([v.co[:] for v in skull.data.vertices],[tuple(f.vertices) for f in skull.data.polygons])
def n(label):return P+'_'+label

def ell(c,r,material='cream',bone='Head',seg=24,rings=14):return b.ell(n('volume'),c,r,M.get(material,material),bone,seg,rings)
def box(c,size,material='silver',bone='Head',bevel=.012):return b.box(n('panel'),c,size,M.get(material,material),bone,bevel)
def mesh(v,f,material='cream',bone='Head',smooth=True):return b.mesh(n('surface'),v,f,M.get(material,material),bone,smooth)
def loft(rows,material='cream',bone='Head',folds=0,depth=0,seg=40):return b.loft(n('tailored'),rows,M.get(material,material),bone,seg,folds,depth)
def sw(path,widths,material='cream',bone='Head',seg=12):return b.sweep(n('sculpt'),path,widths,M.get(material,material),bone,seg)
def pathcurve(path,ws,material='cream',bone='Head',seg=12,steps=5):
 dense=[];sizes=[]
 for i in range(len(path)-1):
  points=[Vector(path[max(0,min(len(path)-1,k))]) for k in [i-1,i,i+1,i+2]]
  widths=[Vector(ws[max(0,min(len(ws)-1,k))]) for k in [i-1,i,i+1,i+2]]
  for j in range(steps):
   t=j/steps
   def curve(p):return .5*(2*p[1]+(-p[0]+p[2])*t+(2*p[0]-5*p[1]+4*p[2]-p[3])*t*t+(-p[0]+3*p[1]-3*p[2]+p[3])*t*t*t)
   dense.append(tuple(curve(points)));sizes.append(tuple(max(.0004,x) for x in curve(widths)))
 dense.append(path[-1]);sizes.append(ws[-1]);return sw(dense,sizes,material,bone,seg)
def ring(c,rx,rz,r,material='silver',bone='Head',seg=36):return b.ring(n('ring'),c,rx,rz,r,M.get(material,material),bone,seg)
def patch(points,y,depth,material='cream',bone='Head',bulge=.01,rounded=True):return b.patch(n('shaped'),b.rounded(points,4) if rounded else points,y,depth,M.get(material,material),bone,bulge)
def surface(x,z):
 hit,_,_,_=TREE.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4);return hit.y if hit else -.22

def facepatch(points,material='ink',offset=.008,bulge=.003):
 o=patch(points,0,.005,material,bulge=bulge)
 for v in o.data.vertices:v.co.y+=surface(v.co.x,v.co.z)-offset
 return o

def eyey(x,z):return -.355+.10*(x/.49)**2+.045*((z-2.34)/.34)**2

def eyepatch(points,material='white',offset=.025,bulge=.008):
 points=b.rounded(points,5);cx=sum(x for x,z in points)/len(points);cz=sum(z for x,z in points)/len(points);v=[];nr=9;nn=len(points)
 for i in range(nr):
  t=1-i/(nr-.5)
  for x,z in points:
   x=cx+(x-cx)*t;z=cz+(z-cz)*t;v.append((x,eyey(x,z)-offset-bulge*(1-t*t),z))
 f=[(i*nn+j,i*nn+(j+1)%nn,(i+1)*nn+(j+1)%nn,(i+1)*nn+j) for i in range(nr-1) for j in range(nn)]
 f.append(tuple((nr-1)*nn+j for j in range(nn)));v.extend((x,eyey(x,z)+.035,z) for x,z in points)
 f.extend((j,nr*nn+j,nr*nn+(j+1)%nn,(j+1)%nn) for j in range(nn));return mesh(v,f,material)

def disc(x,z,rx,rz,material='ink',offset=.05):return eyepatch([(x+rx*math.cos(j*math.tau/20),z+rz*math.sin(j*math.tau/20)) for j in range(20)],material,offset,.003)
def transform(o,center,rot):
 R=Matrix.Rotation(rot[0],4,'X')@Matrix.Rotation(rot[1],4,'Y')@Matrix.Rotation(rot[2],4,'Z');c=Vector(center)
 for v in o.data.vertices:v.co=c+R.to_3x3()@(v.co-c)
 return o

def clone(source,material=None,ratio=None):
 o=bpy.data.objects[source].copy();o.data=o.data.copy();o.name=n('reference');collection.objects.link(o)
 if material:
  for i in range(len(o.data.materials)):o.data.materials[i]=M[material]
 if ratio:
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Silhouette preserving reduction','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def flower(c,r=.09,material='pink',bone='Head',layers=2):
 x,y,z=c
 for layer in range(layers):
  count=7-layer*2
  for j in range(count):
   a=j*math.tau/count+layer*.45; rr=r*(.55-.20*layer)
   o=ell((x+rr*math.cos(a),y-layer*r*.20,z+rr*math.sin(a)),(r*.55,r*.19,r*.34),material,bone,16,10)
   transform(o,(x+rr*math.cos(a),y-layer*r*.20,z+rr*math.sin(a)),(0,-a,0))
 ell((x,y-r*.36,z),(r*.26,r*.23,r*.25),'pale' if material=='pink' else material,bone,16,10)

def star(c,r,material='gold',bone='Head',points=5):
 x,y,z=c;return patch([(x+math.sin(j*math.pi/points)*r*(1 if j%2==0 else .43),z+math.cos(j*math.pi/points)*r*(1 if j%2==0 else .43)) for j in range(points*2)],y,.026,material,bone,.008,False)

def bow(c,size=.18,material='pink',bone='Head'):
 x,y,z=c
 for s in [-1,1]:
  patch([(x+s*.02,z),(x+s*size,z+size*.55),(x+s*size*1.12,z-size*.52),(x+s*.035,z-size*.12)],y,.065,material,bone,.055)
  patch([(x+s*.02,z-.02),(x+s*.11,z-.03),(x+s*size*.85,z-size*1.4),(x+s*size*.35,z-size*1.15)],y+.03,.028,material,bone,.025)
 ell(c,(.055,.058,.065),material,bone,20,12)

def label(text,c,size,material='navy',bone='Chest'):
 curve=bpy.data.curves.new(n('lettering'),'FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.extrude=.001;curve.bevel_depth=.0004
 o=bpy.data.objects.new(n('lettering'),curve);collection.objects.link(o);o.location=c;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(M[material]);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE');o.parent=rig;mod=o.modifiers.new('Shared skin','ARMATURE');mod.object=rig

def chain(path,rx=.035,rz=.052,thick=.011,material='gold',bone='Chest'):
 for i,c in enumerate(path):
  o=ring(c,rx,rz,thick,material,bone,24)
  if i%2:transform(o,c,(0,0,math.pi*.5))

def begin(cat,id):
 global P;P='Drif_'+cat.capitalize()+'_'+id
 for o in list(collection.objects):
  if o.name==P or o.name.startswith(P+'_'):bpy.data.objects.remove(o,do_unlink=True)

def join():
 objects=[o for o in collection.objects if o.type=='MESH' and (o.name==P or o.name.startswith(P+'_'))]
 assert objects,P
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.hide_viewport=False;o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 o=objects[0];o.name=P;o['character']='drilady';o['slot']=P.split('_')[1].lower();o['collectionBatch']=1
 o.hide_render=True;return o

# Eyes are broad surfaces fitted to the same analytic contour as the base face.
def eyes(i):
 for s in [-1,1]:
  mirror=lambda p:[(s*x,z) for x,z in p]
  closed=i==3 or (i==5 and s<0)
  outline=[(.067,2.13),(.14,2.30),(.26,2.38),(.44,2.31),(.40,2.15),(.28,2.08),(.15,2.09)]
  if i==4:outline=[(.067,2.13),(.19,2.22),(.44,2.30),(.40,2.16),(.28,2.09),(.15,2.09)]
  eyepatch(mirror(outline),'green' if closed else 'white',.025,.008)
  lid=[(.065,2.14),(.10,2.39),(.23,2.56),(.34,2.47),(.455,2.31),(.26,2.38),(.14,2.30)]
  if i==4:lid[-2:]=[(.19,2.22),(.067,2.13)]
  eyepatch(mirror(lid),['purple','purple','pink','green','navy','blue','gray','gray','plum','ink','cream','white'][i],.04,.024)
  if not closed:
   if i==0:
    pts=[]
    for k in range(110):
     a=k/109*math.pi*5;r=.006+.078*k/109;x=s*(.265+math.cos(a)*r);z=2.215+math.sin(a)*r*1.25;pts.append((x,eyey(x,z)-.06,z))
    sw(pts,[(.009,.004)]*len(pts),'ink',seg=8)
   elif i==1:
    for sign in [-1,1]:
     pts=[(s*(.265+dx),2.225+sign*dx*1.4) for dx in [-.065,.065]]
     sw([(x,eyey(x,z)-.055,z) for x,z in pts],[(.021,.006)]*2,'ink',seg=8)
   elif i!=10:
    color={2:'red',4:'blue',5:'gold',7:'gold',11:'purple'}.get(i,'purple')
    disc(s*.26,2.205,.068,.098,color,.054);disc(s*.25,2.211,.025,.053,'ink',.060);disc(s*.234,2.247,.017,.020,'white',.066)
   else:disc(s*.26,2.22,.09,.11,'cream',.055)
  # Clean winged lash silhouette; no floating round eyeball behind alternate eyes.
  eyepatch(mirror([(.065,2.13),(.17,2.28 if not closed else 2.22),(.32,2.33 if not closed else 2.27),(.46,2.32),(.48,2.37),(.46,2.28),(.31,2.30 if not closed else 2.245),(.15,2.25 if not closed else 2.19)]),'ink',.070,.002)
  for j in range(3):
   x=s*(.37+j*.035);z=2.30+j*.012;pathcurve([(x,eyey(x,z)-.067,z),(x+s*.035,eyey(x,z)-.07,z+.035),(x+s*.055,eyey(x,z)-.06,z+.065)],[(.015,.005),(.009,.004),(.0005,.0005)],'ink',seg=8,steps=3)
  if i==11:
   for j in range(5):ell((s*(.13+j*.055),eyey(s*(.13+j*.055),2.45)-.065,2.45+math.sin(j*.7)*.07),(.014,.013,.014),'cream',seg=12,rings=8)
 if i==6:
  for s in [-1,1]:
   x=s*.27;patch([(x-.19,2.38),(x+.19,2.40),(x+.15,2.12),(x-.14,2.10)],-.41,.05,'green' if s>0 else 'ink',bulge=.035)
   for j in range(3):box((x,-.462,2.17+j*.065),(.22,.012,.018),'lime' if s>0 else 'gray',bevel=.003)
  box((0,-.42,2.30),(.12,.045,.045),'silver')
 if i==7:
  x=.27;loft([(2.20,.15,.12,x,-.35),(2.30,.14,.13,x,-.36),(2.53,.015,.025,x,-.28)],'silver',seg=24)
  ell((x,-.5,2.24),(.084,.035,.068),'red');ring((x,-.49,2.24),.102,.082,.014,'blue')
 if i in [8,9]:
  for s in [-1,1]:
   x=s*.27;pts=[(x-.18,2.34),(x+.18,2.35),(x+.15,2.14),(x-.14,2.14)]
   patch(pts,-.43,.045,'silver' if i==8 else 'ink',bulge=.02)
   patch([(x+(xx-x)*.81,2.245+(zz-2.245)*.77) for xx,zz in pts],-.46,.012,('red' if s<0 else 'blue') if i==8 else 'gray',bulge=.014)
   if i==9:
    for j in range(3):patch([(x-.14+j*.11,2.34),(x-.085+j*.11,2.45),(x-.035+j*.11,2.34)],-.43,.04,'silver',rounded=False)
   pathcurve([(s*.43,-.39,2.31),(s*.51,-.17,2.32),(s*.49,.12,2.29)],[(.02,.02)]*3,'silver' if i==8 else 'ink')
  box((0,-.44,2.27),(.12,.035,.035),'silver' if i==8 else 'ink')

def brows(i):
 for s in [-1,1]:
  offset=[0,.006,.026,-.012,-.005,-.025,.01,.008,.05,-.02,0,.01][i]
  thick=[.012,.046,.024,.033,.023,.027,.031,.025,.018,.04,.018,.025][i]
  curve=[]
  for j in range(16):
   t=j/15;x=.09+.29*t;z=2.58+.055*math.sin(t*math.pi)+offset*(1-t)
   if i==5:z=2.55+.065*t
   if i==8:z=2.66-.10*t
   curve.append((s*x,z))
  pts=[(x,z+thick*math.sin((j+.6)/16*math.pi)) for j,(x,z) in enumerate(curve)]+[(x,z) for x,z in reversed(curve)]
  eyepatch(pts,['brown','brown','brown','blonde','brown','red','pink','brown','brown','ink','navy','purple'][i],.045,.003)
  if i==1:
   for j in range(6):eyepatch([(s*(.12+j*.04),2.61),(s*(.13+j*.04),2.67-j*.004),(s*(.153+j*.04),2.615)],'brown',.047,.004)
  if i==4:
   for x in [.25,.30]:ring((s*x,eyey(s*x,2.62)-.06,2.62),.012,.035,.006,'silver',seg=20)
  if i==7:eyepatch([(s*.27,2.60),(s*.40,2.64),(s*.36,2.59)],'brown',.048,.004)
  if i==10:eyepatch([(x,z+.055) for x,z in pts],'navy',.04,.003)
  if i==11:
   for j in range(5):x=s*(.13+j*.045);z=2.62+.03*math.sin(j*.7);ell((x,eyey(x,z)-.06,z),(.011,.01,.011),'cream',seg=12,rings=8)

def mouth(i):
 z=1.91
 if i in [0,1,5,9]:
  width={0:.133,1:.09,5:.13,9:.11}[i];color={0:'red',1:'pink',5:'green',9:'red'}[i]
  facepatch([(-width,z),(-width*.45,z+.035),(0,z+.018),(width*.45,z+.035),(width,z),(width*.4,z-.037),(-width*.4,z-.037)],color,.016,.025)
  facepatch([(-width*.8,z),(0,z+.002),(width*.8,z),(width*.35,z-.011),(-width*.35,z-.011)],'ink',.045,.001)
  if i==5:
   for j in range(6):x=(j-2.5)*.03;box((x,surface(x,z)-.052,z-.002),(.026,.012,.016),'white',bevel=.003)
 elif i==2:
  ell((0,-.61,z),(.16,.16,.16),'pale',seg=32,rings=20);ell((-.045,-.75,z+.055),(.032,.008,.044),'white',seg=20,rings=12)
 elif i==4:
  facepatch([(-.12,z+.025),(0,z-.005),(.12,z+.025),(.07,z-.06),(-.06,z-.055)],'ink',.012)
  pathcurve([(0,-.49,z-.03),(.035,-.59,z-.045),(.12,-.69,z-.02),(.19,-.72,z+.025)],[(.052,.023),(.057,.024),(.051,.021),(.014,.012)],'pink',seg=16)
 elif i==6:
  facepatch([(-.145,z+.023),(.145,z+.023),(.145,z-.022),(-.145,z-.022)],'ink',.01)
  for j in range(12):x=(j-5.5)*.023;box((x,surface(x,z)-.023,z+(.008 if j%2 else -.008)),(.018,.017,.024),'silver',bevel=.003)
  ring((.145,surface(.145,z)-.047,z-.035),.022,.032,.005,'silver',seg=20)
 elif i==11:
  facepatch([(-.14,z+.02),(-.07,z-.007),(0,z-.015),(.07,z-.007),(.14,z+.02),(.08,z-.025),(0,z-.035),(-.08,z-.025)],'pink',.008)
 else:
  width=.13 if i!=10 else .095
  facepatch([(-width,z+.015),(0,z-.005),(width,z+.04),(width*.7,z-.045),(0,z-.057),(-width*.7,z-.035)],'ink',.01)
  count=2 if i==7 else 7
  for j in range(count):
   x=(j-(count-1)/2)*(.046 if i==7 else .031);zz=z-.009+(.01 if i==10 else 0)*(x/width)
   box((x,surface(x,zz)-.025,zz),(.041 if i==7 else .027,.025,.055 if i==7 else .028),'silver' if i==8 else 'white',bevel=.006)
  if i==3:
   for x in [-.085,-.035,.035,.085]:patch([(x-.016,z+.005),(x+.016,z+.005),(x,z-.059)],surface(x,z)-.03,.026,'white',rounded=False)

def nose(i):
 z=2.042;y=surface(0,z)-.02
 if i in [0,5]:ell((0,y,z),(.046,.033,.031),'ink' if i==0 else 'red')
 elif i in [1,8]:
  facepatch([(-.054,z+.013),(-.03,z+.037),(0,z+.023),(.03,z+.037),(.054,z+.013),(0,z-.035)],'pink' if i==1 else 'ink',.024,.02)
 elif i in [2,3,4,9,10]:
  h=.085 if i in [3,10] else .04
  facepatch([(-.044,z+.018),(0,z+h),(.044,z+.018),(0,z-.03)],{2:'cream',3:'purple',4:'gold',9:'blue',10:'cream'}[i],.02,.025)
  if i==10:ell((0,y-.025,z-.012),(.034,.022,.022),'ink')
 elif i in [6,7]:
  facepatch([(-.045,z+.02),(.045,z+.02),(0,z-.03)],'ear',.02,.015)
  if i==6:ring((0,y-.03,z-.027),.028,.026,.006,'silver',seg=24)
  else:
   for s in [-1,1]:ell((s*.038,y-.01,z+.006),(.009,.009,.009),'silver',seg=12,rings=8)
 else:flower((0,y,z),.042,'pink',layers=1)

def tattoos(i):
 def poly(pts,mat='ink'):return facepatch(pts,mat,.003,0)
 if i==0:poly([(-.04,2.53),(0,2.58),(.04,2.53),(.022,2.38),(0,2.32),(-.02,2.38)],'cream')
 elif i in [1,7]:
  for s in [-1,1]:
   for j in range(10 if i==1 else 15):
    x=s*(.34+(j%5)*.022);z=2.025+(j//5)*.025
    if i==7 or j%2:poly([(x,z),(x+s*.016,z),(x+s*.016,z+.017),(x,z+.017)],'pink' if i==1 else 'navy')
 elif i==2:poly([(-.37,2.09),(-.39,2.04),(-.37,2.015),(-.345,2.04)])
 elif i in [3,11]:
  for j in range(8):
   s=-1 if j<4 else 1;x=s*(.28+(j%4)*.055);z=1.99+.018*((j*3)%4);r=.012+j%2*.008
   poly([(x-r,z),(x,z+r*1.6),(x+r,z),(x,z-r*1.6)],'gold' if i==3 else 'blue')
 elif i==4:
  for j in range(6):
   a=j*math.tau/6;x=.37+.02*math.cos(a);z=2.015+.02*math.sin(a);poly([(x-.018,z),(x,z+.025),(x+.018,z),(x,z-.025)],'red')
 elif i==5:
  for s in [-1,1]:
   x=s*.38;z=2.04;poly([(x-.01,z+.04),(x+.01,z+.04),(x+.01,z+.01),(x+.03,z+.01),(x+.03,z-.01),(x+.01,z-.01),(x+.01,z-.035),(x-.01,z-.035),(x-.01,z-.01),(x-.03,z-.01),(x-.03,z+.01),(x-.01,z+.01)],'navy')
 elif i==6:poly([(.31,2.025),(.30,2.05),(.32,2.065),(.34,2.052),(.36,2.065),(.38,2.045),(.34,2.01)],'pink')
 elif i==8:
  for s in [-1,1]:
   for j in range(3):x=s*(.28+j*.07);poly([(x,2.06),(x+s*.025,2.05),(x+s*.045,1.99),(x+s*.02,2.0)],'plum')
 elif i==9:
  pts=[(.02+.045*math.cos(a),2.43+.045*math.sin(a)) for a in [j*math.pi/12 for j in range(18)]]+[(.036+.033*math.cos(a),2.43+.033*math.sin(a)) for a in [j*math.pi/12 for j in reversed(range(18))]];poly(pts,'gold')
 elif i==10:
  pts=[(.37+.036*math.cos(a),2.035+.038*math.sin(a)) for a in [math.pi*.15+j*math.pi*1.7/24 for j in range(25)]]+[(.37+.021*math.cos(a),2.035+.025*math.sin(a)) for a in [math.pi*.15+j*math.pi*1.7/24 for j in reversed(range(25))]];poly(pts,'bronze')

def ears(i):
 for s in [-1,1]:
  upright=i in [0,3,5,7,9,10,11] or (i==1 and s>0)
  if upright:
   top={0:3.08,3:2.99,5:3.07,7:3.08,9:3.08,10:3.08,11:3.08}.get(i,3.08)
   xx=.38 if i==3 else .51
   rows=[(2.62,.075,.060,s*.33,.10),(2.62+(top-2.62)*.30,.13 if i==5 else .105,.07,s*.38,.10),(2.62+(top-2.62)*.64,.15 if i==5 else .11,.065,s*(.42 if i==3 else .46),.12),(top-.055,.055,.04,s*(.45 if i==3 else .51),.14),(top,.002,.003,s*(.46 if i==3 else .52),.15)]
  else:
   length=1.31 if i==2 else 1.49
   rows=[(2.73,.08,.07,s*.32,.10),(2.66,.13,.08,s*.48,.16),(2.40,.16,.08,s*.64,.20),(2.10,.16,.075,s*.74,.22),(1.79,.14,.07,s*.78,.23),(length,.045,.035,s*.72,.16)]
   if i==4:rows=[(2.73,.08,.07,s*.32,.10),(2.67,.13,.08,s*.48,.20),(2.55,.16,.08,s*.62,.36),(2.38,.15,.07,s*.73,.55),(2.21,.10,.05,s*.77,.70),(2.11,.008,.015,s*.75,.78)]
   if i==6:rows[-2:]=[(1.95,.13,.07,s*.77,.02),(2.08,.015,.025,s*.71,-.09)]
  if i==7:
   # A true edge indentation, not a line drawn on the ear.
   rows.insert(-2,(2.94,.052,.05,s*.51,.15))
  dense=[]
  for k in range(len(rows)-1):
   q=[Vector(rows[max(0,min(len(rows)-1,j))]) for j in [k-1,k,k+1,k+2]]
   for step in range(5):
    t=step/5;r=.5*(2*q[1]+(-q[0]+q[2])*t+(2*q[0]-5*q[1]+4*q[2]-q[3])*t*t+(-q[0]+3*q[1]-3*q[2]+q[3])*t*t*t)
    dense.append((r[0],max(.003,r[1]),max(.003,r[2]),r[3],r[4]))
  rows=dense+[rows[-1]]
  loft(rows,'silver' if i==10 else 'fur',seg=32)
  v=[];cols=14
  for z,w,d,x,y in rows:
   for j in range(cols+1):
    a=-1+2*j/cols;v.append((x+a*w*.67,y-d*math.sqrt(max(0,1-(a*.67)**2))-.004,z))
  mesh(v,[(r*(cols+1)+j,r*(cols+1)+j+1,(r+1)*(cols+1)+j+1,(r+1)*(cols+1)+j) for r in range(len(rows)-1) for j in range(cols)],'gray' if i==10 else 'ear')
  if i==8:
   for j in range(3):ring((s*(.80-j*.016),.12,1.69+j*.13),.048,.061,.010,'gold',seg=24)
  if i==9:
   for j in range(3):pathcurve([(s*.45,.11,2.78+j*.06),(s*.60,.10,2.84+j*.06),(s*.64,.12,2.90+j*.06)],[(.065,.04),(.035,.025),(.001,.001)],'cream')
  if i==10:
   for j in range(4):
    z=2.70+j*.075;x=s*(.38+j*.04);patch([(x-s*.105,z),(x+s*.10,z+.02),(x+s*.085,z+.12),(x-s*.06,z+.14)],.015,.055,'silver',bulge=.02)
  if i==11:bow((s*.40,-.006,2.78),.12,'pink')

def scalp(material='brown',bob=False):
 nseg=48;nr=16;v=[]
 for k in range(nr+1):
  t=k/nr
  for j in range(nseg):
   a=j*math.tau/nseg;front=max(0,-math.sin(a));theta=t*(2.28-front*1.22)
   v.append((.515*math.sin(theta)*math.cos(a),.06+.40*math.sin(theta)*math.sin(a),2.31+.52*math.cos(theta)))
 f=[(i*nseg+j,i*nseg+(j+1)%nseg,(i+1)*nseg+(j+1)%nseg,(i+1)*nseg+j) for i in range(nr) for j in range(nseg)];f.append(tuple(nr*nseg+j for j in reversed(range(nseg))))
 mesh(v,f,material)

def hair(i):
 colors=['ink','pink','blonde','blonde','brown','blue','ink','brown'];color=colors[i];scalp(color)
 if i==0:
  # Broad curled-under panels make a continuous bob silhouette.
  for j in range(15):
   a=-.10+j*(math.pi+.20)/14;x=.49*math.cos(a);y=.06+.37*math.sin(a)
   pathcurve([(x*.84,y*.8,2.69),(x*1.05,y,2.39),(x*1.06,y,2.10),(x*.95,y*.85,2.03)],[(.10,.065),(.12,.08),(.12,.08),(.065,.04)],color)
  for j in range(7):x=(j-3)*.115;pathcurve([(x,-.27,2.73),(x,-.35,2.63),(x,-.35,2.55+.025*abs(j-3))],[(.078,.04),(.073,.045),(.065,.035)],color)
 elif i in [1,7]:
  # Interwoven three-strand braids have overlapping broad lobes, not drawn seams.
  for s in [-1,1] if i==1 else [1]:
   for strand in range(3):
    pts=[];ws=[]
    for k in range(45):
     t=k/44;a=t*math.tau*3.5+strand*math.tau/3;pts.append((s*(.45+.08*math.sin(t*math.pi))+.055*math.cos(a),.11+.055*math.sin(a),2.60-t*1.05));ws.append((.047*(1-t*.40),.041*(1-t*.4)))
    sw(pts,ws,color,seg=10)
   bow((s*.49,.02,1.62),.095,'pale')
  for s in [-1,1]:pathcurve([(s*.15,-.28,2.79),(s*.29,-.34,2.66),(s*.46,-.17,2.48)],[(.10,.055),(.12,.05),(.01,.01)],color)
  if i==7:
   for c in [(.43,-.03,2.67),(.53,-.01,2.43),(.54,0,2.13)]:flower(c,.075,'pink')
 elif i==2:
  for j in range(8):
   a=j*math.tau/8;pathcurve([(.39*math.cos(a),.06+.31*math.sin(a),2.57),(.28*math.cos(a),.11+.28*math.sin(a),2.79),(.06+.15*math.cos(a),.17+.15*math.sin(a),2.91)],[(.09,.045),(.12,.055),(.07,.04)],color)
  ell((.05,.23,2.96),(.23,.19,.16),color)
  for k in range(3):ring((.05,.07-k*.005,2.96),.18-k*.045,.12-k*.028,.022,'blonde')
 elif i in [3,5]:
  for s in [-1,1]:
   for j in range(3):
    pathcurve([(s*(.08+j*.10),-.21+j*.08,2.80),(s*(.35+j*.06),-.25+j*.09,2.63),(s*(.48+j*.025),-.08+j*.09,2.38),(s*(.44+j*.03),.07+j*.08,2.18),(s*(.48+j*.03),.13+j*.07,1.98)],[(.09,.055),(.12,.065),(.095,.055),(.08,.05),(.015,.012)],color)
  pathcurve([(.20,-.20,2.80),(-.02,-.34,2.76),(-.26,-.36,2.62),(-.46,-.25,2.54)],[(.10,.06),(.14,.06),(.10,.045),(.002,.002)],color)
 elif i==4:
  pathcurve([(.10,.30,2.71),(.17,.48,2.82),(.28,.54,2.56),(.33,.56,2.22),(.26,.54,1.94),(.12,.45,1.80)],[(.14,.10),(.18,.13),(.17,.13),(.14,.10),(.09,.06),(.004,.004)],color,seg=20)
  ell((.10,.34,2.76),(.15,.10,.085),'purple')
  for j in range(3):pathcurve([(.24,-.16,2.78),(-.04-j*.07,-.32,2.73-j*.07),(-.38-j*.02,-.28,2.57-j*.03)],[(.08,.05),(.11,.05),(.002,.002)],color)
 elif i==6:
  for layer in range(4):
   for j in range(13):
    a=j*math.tau/13;front=math.sin(a)<-.3
    if front and layer>1:continue
    c=(.45*math.cos(a),.08+.35*math.sin(a),2.76-layer*.18)
    ell(c,(.105,.10,.115),'ink',seg=18,rings=12)
    ring((c[0],c[1]-.08,c[2]),.055,.065,.019,'ink',seg=24)

def heads(i):
 if i<8:hair(i);return
 if i==8:
  clone('Drif_Head_original','gray',.13)
  for s in [-1,1]:
   disc(s*.255,2.22,.12,.10,'ink',.055);disc(s*.255,2.22,.065,.065,'blue',.065)
   loft([(2.58,.15,.13,s*.37,.10),(2.90,.15,.13,s*.37,.10)],'gray',seg=16)
   for j in range(5):a=j*math.tau/5;box((s*.37+math.cos(a)*.11,.10+math.sin(a)*.10,2.94),(.075,.075,.10),'cream',bevel=.006)
  loft([(2.65,.25,.19,0,.08),(2.91,.25,.19,0,.08)],'gray',seg=24)
  for j in range(5):box(((j-2)*.10,-.09,2.94),(.06,.06,.08),'cream',bevel=.005)
  facepatch([(-.12,1.94),(.12,1.94),(.12,1.88),(-.12,1.88)],'ink',.018)
 elif i==9:
  # Long mare nose stays inside Drilady's head/neck envelope, with solid jaw and cheek transitions.
  loft([(1.80,.18,.16,0,-.14),(1.92,.31,.23,0,-.22),(2.08,.32,.28,0,-.24),(2.28,.26,.22,0,-.09),(2.49,.37,.27,0,.025),(2.67,.34,.25,0,.04),(2.77,.10,.10,0,.08)],'wood',seg=36)
  for s in [-1,1]:
   ell((s*.245,-.226,2.40),(.12,.08,.12),'cream');ell((s*.245,-.294,2.40),(.052,.02,.07),'ink')
   ell((s*.20,-.50,2.065),(.052,.025,.03),'ink')
  for j in range(8):box((0,.25,2.64-j*.08),(.12,.19,.10),'brown',bevel=.025)
  patch([(-.20,1.98),(.20,1.98),(.18,1.96),(-.18,1.96)],-.49,.015,'ink')
 elif i==10:
  clone('Drif_Head_original','silver',.17)
  for s in [-1,1]:
   eyepatch([(s*.07,2.14),(s*.14,2.35),(s*.36,2.37),(s*.46,2.29),(s*.35,2.12)],'ink',.045,.025)
   disc(s*.26,2.24,.065,.08,'blue',.085)
   patch([(s*.11,2.05),(s*.49,2.16),(s*.49,2.03),(s*.22,1.88)],-.34,.10,'gray',bulge=.025)
  for j in range(5):box(((j-2)*.04,-.455,1.92),(.032,.025,.035),'silver',bevel=.005)
  facepatch([(-.07,2.10),(0,2.18),(.07,2.10),(0,2.02)],'silver',.035,.025)
 else:
  clone('Drif_Head_original','plum',.15)
  for s in [-1,1]:
   disc(s*.25,2.22,.12,.12,'ink',.048);disc(s*.24,2.24,.04,.06,'cream',.06)
   for j in range(7):
    a=-1.2+j*.36;c=(s*(.40+.06*math.cos(a)),.01+.16*math.sin(a),2.36+.39*math.sin(a));flower(c,.075,'pink')
  for j in range(9):flower((.40*math.cos(j*math.pi/8),-.12,2.40+.37*math.sin(j*math.pi/8)),.067,'pale')
  facepatch([(-.10,1.93),(0,1.91),(.10,1.93),(.06,1.89),(-.06,1.89)],'red',.02,.008)

def sleeves(material='white',length=.68,puff=False):
 for s,l in [(-1,'R'),(1,'L')]:
  pts=[(s*x,0,1.465) for x in [.23,.36,.53,length]]
  rad=[.18,.19 if puff else .18,.19 if puff else .15,.13 if puff else .145]
  sw(pts,[(r,r) for r in rad],material,b.arm(l),20)
  sw([(s*(length-.03),0,1.465),(s*(length+.015),0,1.465)],[(rad[-1]+.006,rad[-1]+.006)]*2,material,b.arm(l),24)

def bodice(material='white',hem=.91,neck=1.53,short=False,folds=0):
 rows=[(hem,.33,.22,0,0),(max(hem+.035,1.0),.28,.19,0,0),(1.16,.30,.22,0,0),(1.32,.35,.265,0,-.005),(1.43,.34,.24,0,0),(1.51,.27,.18,0,0),(neck,.135,.14,0,0)]
 return loft(rows,material,b.torso,folds=folds,depth=.009 if folds else 0)

def collar(material='white',open=False):
 for s in [-1,1]:
  pts=[(s*.02,1.56),(s*.16,1.57),(s*.29,1.45),(s*.19,1.29),(s*.07,1.44)]
  patch(pts,-.19,.03,material,'Chest',.03)

def skirtweights(co):
 t=max(0,min(.80,(.83-co.z)/.6));s='L' if co.x>=0 else 'R';return {'Pelvis':1-t,'Thigh.'+s:t}

def shoes(style=0,material='ink'):
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215
  ell((x,-.12,.10),(.18,.285,.092),material,'Foot.'+l,28,12)
  loft([(.018,.18,.28,x,-.12),(.062 if style!=1 else .09,.19,.29,x,-.12)],'cream' if style==0 else 'ink','Foot.'+l,seg=28)
  if style==2:
   sw([(x-.16,-.18,.14),(x,-.20,.20),(x+.16,-.18,.14)],[(.028,.015)]*3,material,'Foot.'+l)
   ell((x+.13,-.21,.17),(.025,.014,.025),'gold','Foot.'+l,12,8)

def bootlegs(material='ink',height=.55):
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215;loft([(.1,.16,.18,x,0),(.25,.15,.16,x,0),(height-.04,.17,.17,x,0),(height,.18,.18,x,0)],material,b.leg(l),seg=32)
  loft([(height-.035,.182,.182,x,0),(height,.185,.185,x,0)],'gray' if material=='silver' else material,b.leg(l),seg=32)

def pants(material='denim',wide=.20,flare=0,short=False):
 before=set(collection.objects)
 loft([(.63,.40,.235,0,0),(.77,.38,.235,0,0),(.90,.32,.205,0,0)],material,'Pelvis',folds=6,depth=.008)
 loft([(.86,.32,.204,0,0),(.915,.315,.20,0,0)],material,'Pelvis')
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215;low=.51 if short else .13
  loft([(low,wide+flare,.22+flare*.3,x,0),(low+.06,wide+flare*.7,.22,x,0),(.43 if not short else .62,wide,.205,x,0),(.67,wide+.015,.22,x,0),(.78,.12,.15,x,0)],material,b.leg(l),folds=6,depth=.009)

 # Unite the seat and both legs so the hip joint is a continuous cloth volume.
 objects=[o for o in collection.objects if o not in before]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True);o.modifiers.clear()
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0]
 mod=o.modifiers.new('Continuous trouser seat','REMESH');mod.mode='VOXEL';mod.voxel_size=.011;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Cloth transitions','SMOOTH');mod.factor=.6;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Export cloth topology','DECIMATE');mod.ratio=.34;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.vertex_groups.clear()
 for v in o.data.vertices:
  side='L' if v.co.x>=0 else 'R';pelvis=max(0,min(1,(v.co.z-.60)/.20));weights={k:w*(1-pelvis) for k,w in b.leg(side)(v.co).items()};weights['Pelvis']=pelvis
  for key,w in weights.items():
   if w>0:(o.vertex_groups.get(key) or o.vertex_groups.new(name=key)).add([v.index],w,'REPLACE')
 mod=o.modifiers.new('Shared skin','ARMATURE');mod.object=rig

def tops(i):
 colors=['white','pale','white','plum','navy','plum','ink','teal','ink','navy','ink','navy'];color=colors[i]
 if i==0:
  bodice(color,1.07,1.55);sleeves(color,.62);label('WOMENSA',(0,-.278,1.255),.072,'navy')
 elif i==1:
  bodice(color,.91);sleeves(color,.99);collar('cream')
  for s in [-1,1]:
   box((s*.21,-.231,1.08),(.15,.04,.14),'pale','Chest',.018)
   box((s*.21,-.26,1.145),(.17,.022,.026),'cream','Chest',.006)
  for z in [1.03,1.17,1.30]:ell((0,-.274,z),(.022,.012,.022),'cream','Chest',16,10)
  # Recessed woven panels are modeled as broad checker patches, not curves.
  for s in [-1,1]:
   for j in range(8):box((s*(.10+.075*(j%3)),-.258,1.17+(j//3)*.08),(.045,.006,.045),'white','Chest',.003)
 elif i==2:
  bodice(color,.78);sleeves(color,.68);collar('white')
  for z in [1.05,1.18,1.30]:ell((0,-.274,z),(.015,.01,.015),'red','Chest',12,8)
  box((.21,-.263,1.30),(.12,.018,.13),'white','Chest')
  box((.21,-.278,1.31),(.022,.008,.085),'red','Chest',.002);box((.21,-.278,1.31),(.075,.008,.022),'red','Chest',.002)
 elif i==3:
  bodice('plum',.84,1.45)
  for s in [-1,1]:
   patch([(s*.015,1.40),(s*.16,1.47),(s*.31,1.37),(s*.24,1.04),(s*.10,.92),(s*.02,1.02)],-.235,.045,'red','Chest',.025)
  loft([(.16,.51,.37,0,0),(.30,.49,.35,0,0),(.52,.45,.32,0,0),(.70,.39,.27,0,0),(.94,.35,.245,0,0)],'plum',skirtweights,folds=12,depth=.028,seg=72)
  for z in [1.04,1.14,1.24]:ell((0,-.293,z),(.017,.016,.017),'gold','Chest',12,8)
  shoes(2,'ink')
 elif i==4:
  bodice('navy',.89)
  loft([(.90,.32,.22,0,0),(1.08,.30,.23,0,-.025),(1.28,.37,.29,0,-.018),(1.44,.35,.24,0,0),(1.52,.17,.16,0,0)],'silver',b.torso,seg=40)
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(3):ell((s*(.35+j*.08),0,1.50),(.15,.19,.08-j*.01),'silver',b.arm(l),24,12)
  for z in [.97,1.04,1.11]:loft([(z,.33,.24,0,0),(z+.045,.33,.24,0,0)],'gray',b.torso)
 elif i==5:
  bodice('plum',.83,1.64);sleeves('plum',.63)
  loft([(.17,.45,.30,0,0),(.40,.41,.28,0,0),(.62,.36,.25,0,0),(.94,.35,.245,0,0)],'plum',skirtweights,folds=5,depth=.015,seg=60)
  for j in range(5):
   x=.06+j*.035;z=1.48-j*.07;box((x,-.27,z),(.075,.02,.023),'gold','Chest',.006)
  for c in [(-.13,-.29,1.18),(.23,-.29,.68),(-.30,-.28,.35)]:flower(c,.07,'pink','Chest' if c[2]>1 else 'Pelvis')
  shoes(1,'plum')
 elif i==6:
  bodice('ink',1.03,1.47)
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(9):
    a=j*math.tau/9;pathcurve([(s*.34,.06*math.cos(a),1.48),(s*.46,.13*math.cos(a),1.47+.10*math.sin(a)),(s*.63,.10*math.cos(a),1.39+.09*math.sin(a))],[(.09,.055),(.09,.06),(.006,.004)],'cream',b.arm(l))
  collar('cream')
 elif i==7:
  bodice('teal',.86,1.65);sleeves('teal',.69)
  for s in [-1,1]:
   box((s*.18,-.258,1.27),(.18,.06,.16),'blue','Chest',.02);box((s*.18,-.292,1.34),(.19,.025,.055),'teal','Chest',.009)
  box((0,-.255,1.18),(.028,.022,.55),'orange','Chest',.004)
 elif i==8:
  bodice('ink',.85,1.62);sleeves('ink',1.11)
  loft([(.14,.43,.32,0,0),(.35,.43,.32,0,0),(.60,.39,.29,0,0),(.94,.35,.245,0,0)],'ink',skirtweights,folds=10,depth=.015,seg=60)
  patch([(-.16,1.61),(.16,1.61),(.30,1.37),(.22,1.18),(-.22,1.18),(-.30,1.37)],-.265,.025,'white','Chest',.016)
  shoes(0,'ink')
 elif i==9:
  bodice('navy',.91,1.62,folds=7);sleeves('navy',.68,True)
  for j in range(16):
   a=j*math.tau/16;x=.16*math.cos(a);y=.16*math.sin(a);z=1.56
   pathcurve([(x*.8,y*.8,z+.07),(x*1.5,y*1.5,z+.04),(x*1.8,y*1.8,z-.09)],[(.05,.035),(.065,.04),(.055,.025)],'navy','Chest')
  for z in [1.03,1.15,1.27,1.39]:ell((0,-.275,z),(.018,.014,.018),'gold','Chest',12,8)
 elif i==10:
  bodice('ink',.88,1.49)
  for s in [-1,1]:
   patch([(s*.018,1.42),(s*.16,1.52),(s*.34,1.42),(s*.28,1.12),(s*.09,.95),(s*.02,1.17)],-.23,.075,'silver','Chest',.065)
   patch([(s*.06,1.05),(s*.26,1.10),(s*.42,.88),(s*.31,.78),(s*.15,.88)],-.20,.045,'silver','Pelvis',.035)
  collar('silver')
 elif i==11:
  bodice('navy',.74,1.64);sleeves('navy',1.10);pants('navy',.14);bootlegs('ink',.31);shoes(0,'ink')
  for s in [-1,1]:patch([(s*.04,1.54),(s*.19,1.53),(s*.29,1.32),(s*.22,1.06),(s*.08,1.01)],-.25,.018,'teal','Chest',.02)
  box((0,-.276,1.29),(.025,.017,.48),'silver','Chest',.003)

def legs(i):
 color=['pale','plum','teal','cream','navy','gray','purple','teal','cream','silver','denim','pale'][i]
 if i in [0,4,6]:
  bootlegs('ink',.56);shoes(2 if i==0 else 0,'ink')
  if i in [0,4]:loft([(.48,.47,.31,0,0),(.60,.44,.30,0,0),(.93,.365,.25,0,0)],color,skirtweights,folds=14,depth=.025,seg=84)
  else:
   loft([(.42,.46,.30,0,0),(.62,.42,.28,0,0),(.93,.36,.245,0,0)],color,skirtweights,folds=12,depth=.012,seg=72)
   for low,high,r in [(.42,.59,.50),(.57,.74,.46),(.72,.93,.41)]:loft([(low,r,.26,0,0),(low+.035,r+.012,.27,0,0),(high,r-.045,.23,0,0)],color,skirtweights,folds=12,depth=.018,seg=72)
 elif i in [1,7,9,10]:
  pants(color,.17 if i!=10 else .22,.09 if i in [1,9] else 0);shoes(1,'ink' if i!=9 else 'silver')
  for s,l in [(-1,'R'),(1,'L')]:
   x=s*.215
   if i==7:
    box((x,-.21,.42),(.20,.055,.19),'navy',b.leg(l),.04);box((x+s*.15,0,.64),(.06,.25,.24),'blue',b.leg(l),.02)
   if i==10:
    for j,(z,c) in enumerate([(.27,'blue'),(.46,'navy'),(.65,'pale')]):box((x+(-.04 if j%2 else .025),-.23,z),(.18,.024,.15),c,b.leg(l),.012)
 elif i in [2,8,11]:
  pants(color,.20 if i==2 else .23,short=True);bootlegs('cream' if i==8 else 'ink',.50);shoes(2,'ink')
  for s,l in [(-1,'R'),(1,'L')]:
   x=s*.215
   if i==2:box((x+s*.17,0,.62),(.12,.27,.17),'teal',b.leg(l),.025);box((x+s*.18,-.02,.71),(.14,.28,.05),'navy',b.leg(l),.01)
   if i==8:bow((x,-.18,.47),.075,'pink',b.leg(l))
   if i==11:
    loft([(.51,.225,.235,x,0),(.55,.25,.25,x,0),(.69,.25,.25,x,0),(.77,.17,.20,x,0)],'pale',b.leg(l),folds=10,depth=.012,seg=50)
    for j in range(5):flower((x-.10+j*.05,-.18,.43),.03,'pink',b.leg(l),layers=1)
 elif i==3:
  pants('cream',.15);bootlegs('brown',.60);shoes(0,'brown')
  for s,l in [(-1,'R'),(1,'L')]:
   for z in [.22,.48]:box((s*.215,-.17,z),(.14,.035,.04),'gold',b.leg(l),.008)
 elif i==5:
  pants('ink',.14);shoes(1,'silver')
  for s,l in [(-1,'R'),(1,'L')]:
   x=s*.215
   for z,r in [(.22,.16),(.34,.17),(.47,.185),(.61,.17)]:loft([(z-.055,r,.18,x,0),(z,r+.018,.20,x,-.01),(z+.06,r,.18,x,0)],'silver',b.leg(l),seg=24)
   ell((x,-.205,.42),(.12,.05,.08),'gold',b.leg(l),20,12)
 # Every lower-body option includes a proper waistband; gear remains independent.
 box((0,-.217,.887),(.085,.025,.045),'gold','Pelvis',.007)

def cap(material='navy',visor=True):
 loft([(2.64,.51,.39,0,.045),(2.72,.54,.41,0,.045),(2.84,.44,.35,0,.06),(2.93,.25,.20,0,.07),(2.95,.015,.015,0,.07)],material,seg=48)
 if visor:
  v=[]
  for k in range(7):
   t=k/6
   for j in range(33):
    a=math.pi+j*math.pi/32;x=(.49+t*.12)*math.cos(a);y=.045+(.39+t*.28)*math.sin(a);z=2.665-.035*t-.04*math.sin(a)**2
    v.append((x,y,z))
  o=mesh(v,[(i*33+j,i*33+j+1,(i+1)*33+j+1,(i+1)*33+j) for i in range(6) for j in range(32)],material)
  mod=o.modifiers.new('Visor thickness','SOLIDIFY');mod.thickness=.025;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)

def hats(i):
 if i==0:
  cap('navy');patch([(-.26,2.72),(-.22,2.89),(.22,2.89),(.26,2.72)],-.35,.035,'white',bulge=.012);label('FBI',(0,-.39,2.75),.13,'blue','Head')
 elif i==1:
  loft([(2.64,.53,.46,0,.045),(2.75,.53,.46,0,.045)],'navy',seg=48)
  for j in range(5):star(((j-2)*.085,-.45,2.70),.028,'white')
  bow((.46,.22,2.69),.16,'red')
 elif i==2:
  pts=[(.57*math.cos(a),.04,2.43+.43*math.sin(a)) for a in [j*math.pi/32 for j in range(33)]]
  sw(pts,[(.06,.06)]*len(pts),'ink',seg=12)
  for s in [-1,1]:
   ell((s*.53,.04,2.46),(.11,.18,.20),'ink');ell((s*.60,.025,2.46),(.07,.15,.16),'silver')
  for j in range(7):
   a=.25+j*(math.pi-.5)/6;c=(.57*math.cos(a),.04,2.43+.43*math.sin(a));pathcurve([c,(c[0]+.04*math.cos(a),.04,c[2]+.07),(c[0]+.08*math.cos(a),.04,c[2]+.15)],[(.037,.032),(.025,.022),(.001,.001)],'silver',steps=3)
 elif i==3:
  cap('teal');loft([(2.66,.54,.41,0,.045),(2.72,.55,.42,0,.045)],'ink',seg=48);star((0,-.38,2.81),.073,'gold');box((0,-.44,2.70),(.29,.035,.035),'gold')
 elif i==4:
  cap('plum',False)
  for s in [-1,1]:
   pathcurve([(s*.22,.04,2.84),(s*.44,.07,3.04),(s*.63,.06,3.02),(s*.70,.02,2.85)],[(.18,.16),(.14,.12),(.10,.08),(.01,.01)],'red' if s<0 else 'ink',seg=20)
   ell((s*.70,.02,2.84),(.052,.05,.055),'gold')
 elif i==5:
  cap('cream',False)
  for j in range(4):
   pts=[(.52*math.cos(a),.05+.41*math.sin(a),2.71+j*.05+.06*math.cos(a+j*.7)) for a in [k*math.tau/48 for k in range(49)]]
   sw(pts,[(.045,.055)]*len(pts),'cream',seg=12)
  star((0,-.405,2.78),.07,'gold')
 elif i==6:
  for s in [-1,1]:ell((s*.50,.025,2.65),(.065,.085,.065),'bronze')
  o=patch([(-.43,2.64),(-.46,3.03),(.46,3.03),(.43,2.64)],-.22,.09,'gray',bulge=.06)
  patch([(-.30,2.77),(-.30,2.94),(.30,2.94),(.30,2.77)],-.294,.045,'ink',bulge=.01)
  box((0,-.33,2.85),(.48,.014,.095),'green',bevel=.015)
 elif i==7:
  patch([(-.43,2.72),(-.33,2.97),(.33,2.97),(.43,2.72)],-.40,.25,'white',bulge=.04)
  box((0,-.46,2.85),(.035,.018,.14),'red',bevel=.003);box((0,-.46,2.85),(.13,.018,.035),'red',bevel=.003)
 elif i==8:
  loft([(2.68,.49,.37,0,.05),(2.77,.50,.38,0,.05)],'gold',seg=48)
  for j in range(7):
   a=j*math.tau/7;x=.47*math.cos(a);y=.05+.36*math.sin(a)
   pathcurve([(x,y,2.74),(x*.9,y*.9,2.93),(x*.36,y*.36,3.01)],[(.032,.026),(.028,.023),(.020,.018)],'gold')
   ell((x,y-.023,2.78),(.035,.024,.052),'blue')
  ell((0,.02,3.035),(.055,.055,.055),'pink')
 elif i==9:
  scalp('ink')
  for s in [-1,1]:
   pathcurve([(s*.29,.10,2.76),(s*.52,.14,2.52),(s*.57,.25,2.17),(s*.61,.28,1.68)],[(.14,.07),(.14,.075),(.17,.07),(.22,.045)],'ink',seg=20)
   pathcurve([(s*.26,-.23,2.73),(s*.44,-.20,2.55),(s*.49,-.07,2.32)],[(.045,.025)]*3,'white')
 elif i==10:
  for j in range(11):
   a=j*math.tau/11;c=(.44*math.cos(a),.05+.32*math.sin(a),2.73+.04*math.sin(a));flower(c,.095,'pink' if j%2 else 'pale')
 elif i==11:bow((.18,-.10,2.89),.29,'pink')

def accessories(i):
 if i==0:
  for row in range(2):chain([(.31*math.cos(a),-.23-.045*math.sin(a),1.48-(.27+row*.13)*math.sin(a)) for a in [j*math.pi/14 for j in range(15)]],.035,.049,.011,'bronze')
 elif i==1:
  for row in range(3):
   for j in range(15):
    a=j*math.pi/14;ell((.29*math.cos(a),-.22-.07*math.sin(a),1.49-(.15+row*.052)*math.sin(a)),(.024,.021,.025),'cream','Chest',14,10)
  ell((0,-.32,1.23),(.07,.026,.085),'silver','Chest');ell((0,-.348,1.23),(.045,.015,.061),'blue','Chest')
 elif i==2:
  loft([(1.56,.18,.18,0,0),(1.64,.16,.16,0,0)],'ink','Chest',seg=32);flower((0,-.17,1.60),.095,'red','Chest')
 elif i==3:
  chain([(.22*math.cos(a),-.22,1.49-.27*math.sin(a)) for a in [j*math.pi/17 for j in range(18)]],.019,.031,.006,'gold')
  ell((0,-.27,1.15),(.11,.035,.14),'gold','Chest');ell((0,-.304,1.15),(.083,.012,.111),'cream','Chest')
  patch([(-.025,1.07),(-.04,1.15),(-.055,1.17),(-.025,1.23),(.018,1.25),(.045,1.20),(.029,1.17),(.018,1.08)],-.325,.015,'brown','Chest',.007)
 elif i==4:
  pathcurve([(-.25,.12,1.49),(-.27,-.20,1.48),(.02,-.30,1.13),(.33,-.25,.91)],[(.028,.02)]*4,'gold',b.torso)
  box((.37,-.20,.82),(.26,.15,.26),'plum','Pelvis',.045)
  for j in range(9):
   x=.28+(j%3)*.085;z=.74+(j//3)*.08;patch([(x-.036,z),(x,z+.035),(x+.036,z),(x,z-.035)],-.285,.02,'pink','Pelvis',.012,False)
  box((.37,-.30,.86),(.06,.02,.05),'gold','Pelvis')
 elif i==5:bow((-.36,-.13,1.48),.21,'pale','UpperArm.R')
 elif i==6:
  for j in range(3):loft([(1.49+j*.045,.22-j*.025,.20-j*.02,0,0),(1.53+j*.045,.22-j*.025,.20-j*.02,0,0)],'silver','Chest',seg=32)
  for s in [-1,1]:patch([(s*.06,1.50),(s*.25,1.52),(s*.31,1.37),(s*.12,1.35)],-.22,.04,'gray','Chest',.03)
 elif i==7:
  pathcurve([(-.27,.08,1.51),(-.28,-.21,1.46),(0,-.31,1.19),(.28,-.21,.93)],[(.07,.02)]*4,'blue',b.torso)
  star((.20,-.28,1.02),.09,'gold','Chest')
 elif i==8:
  loft([(.87,.34,.22,0,0),(.93,.34,.22,0,0)],'brown','Pelvis')
  for j in range(3):
   x=-.21+j*.09;ring((x,-.25,.80),.025,.028,.007,'gold','Pelvis',24);box((x,-.25,.71),(.015,.02,.14),'gold','Pelvis',.003);box((x+.019,-.25,.65),(.05,.025,.022),'gold','Pelvis',.003)
 elif i==9:
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(3):flower((s*(.32+j*.07),-.09,1.51-j*.035),.074,'pink','UpperArm.'+l)
 elif i==10:
  # Thick radial cloth skirt with an open front, folded shoulder volume.
  v=[];rows=6;cols=48
  for k in range(rows):
   t=k/(rows-1)
   for j in range(cols+1):
    a=-.1+j*(math.pi+.2)/cols;r=.15+t*.39+.016*math.sin(j*.9)*t;v.append((r*math.cos(a),.02+r*.73*math.sin(a),1.61-.41*t+.018*math.cos(j*.9)))
  mesh(v,[(i*(cols+1)+j,i*(cols+1)+j+1,(i+1)*(cols+1)+j+1,(i+1)*(cols+1)+j) for i in range(rows-1) for j in range(cols)],'plum','Chest')
  loft([(1.57,.15,.15,0,0),(1.66,.15,.15,0,0)],'plum','Chest');ell((0,-.17,1.61),(.04,.024,.045),'gold','Chest')
 elif i==11:
  for s in [-1,1]:
   for j in range(7):
    pathcurve([(s*.19,.24,1.43),(s*(.48+j*.04),.31+j*.025,1.65+j*.09),(s*(.84-j*.045),.34+j*.025,1.91+j*.09)],[(.10,.025),(.10,.028),(.002,.002)],'gold' if j%2 else 'silver','Chest',seg=12)
  box((0,.28,1.39),(.30,.10,.25),'bronze','Chest',.025)

def book(c,size=.26,open=False,material='green'):
 x,y,z=c
 if open:
  for s in [-1,1]:
   o=box((x+s*size*.48,y,z),(size,.065,size*1.3),material,'Root',.008);transform(o,(x,y,z),(0,0,s*.22))
   o=box((x+s*size*.48,y-.045,z),(size*.91,.025,size*1.18),'cream','Root',.004);transform(o,(x,y,z),(0,0,s*.22))
 else:
  box(c,(size,.08,size*1.35),material,'Root',.008);box((x,y-.045,z),(size*.86,.02,size*1.19),'cream','Root',.004)
  box((x-size*.47,y-.01,z),(.025,.09,size*1.35),'gold','Root',.003)

def extras(i):
 if i==0:
  for s in [-1,1]:chain([(s*(.92-.25*t),.50+.12*math.sin(t*math.pi),1.23+1.85*t) for t in [j/22 for j in range(23)]],.055,.075,.015,'bronze','Root')
  chain([(-.67+1.34*t,.58,3.08+.15*math.sin(t*math.pi)) for t in [j/19 for j in range(20)]],.055,.075,.015,'bronze','Root')
 elif i==1:
  for c,r in [((-.98,.40,2.52),.21),((.98,.57,2.79),.23),((.93,.20,1.61),.16)]:
   ell(c,(r*.84,r*.73,r),'silver','Root',32,20);sw([(c[0],c[1],c[2]-r),(c[0]-.04,c[1],c[2]-r-.40),(c[0]+.04,c[1]+.02,c[2]-r-.7)],[(.003,.003)]*3,'cream','Root',6)
 elif i==2:
  pts=[(.99*math.cos(a),.63,1.92+1.04*math.sin(a)) for a in [j*math.pi/40 for j in range(41)]];sw(pts,[(.036,.025)]*len(pts),'bronze','Root')
  for j in range(9):a=j*math.pi/8;flower((1.01*math.cos(a),.52,1.92+1.05*math.sin(a)),.14,'pink' if j%2 else 'pale','Root')
 elif i==3:
  for j in range(9):
   a=j*math.tau/9;c=(1.01*math.cos(a),.4+.22*math.sin(a*2),2.04+.91*math.sin(a));x,y,z=c
   o=patch([(x-.10,z-.13),(x-.06,z+.18),(x+.13,z+.08),(x+.055,z-.08)],y,.055,'blue' if j%2 else 'silver','Root',.015,False);transform(o,c,(.12*j,.1*j,.08*j))
 elif i==4:
  for j,(x,z) in enumerate([(-.99,2.52),(.99,2.24),(-.88,1.40)]):
   y=.38+j*.11;box((x,y,z),(.36,.065,.43),'bronze','Root',.022);box((x,y-.045,z),(.29,.025,.36),'cream','Root',.004)
   for sx,sz in [(-1,-1),(-1,1),(1,-1),(1,1)]:flower((x+sx*.16,y-.07,z+sz*.19),.04,'gold','Root',1)
   star((x,y-.075,z),.10,'pink' if j%2 else 'blue','Root')
 elif i==5:
  book((-.98,.32,2.43),.25,True,'green');book((1.0,.56,2.12),.25,False,'plum');book((-.83,.20,1.24),.22,False,'blue')
 elif i==6:
  for j,c in enumerate([(-.99,.37,2.51),(.99,.49,1.61),(-.86,.22,1.35)]):
   x,y,z=c;o=box(c,(.31,.29,.31),'cream','Root',.035)
   for dx,dz in [(-.075,-.075),(.075,.075),(0,0)]:ell((x+dx,y-.151,z+dz),(.021,.007,.021),'ink','Root',12,8)
   # Adjacent face has a modeled skull relief.
   ell((x+.16,y,z+.03),(.016,.08,.083),'gray','Root',16,10)
   for dz in [-.035,.035]:ell((x+.18,y-.02,z+dz),(.008,.025,.025),'ink','Root',12,8)
 elif i==7:
  chain([(0,.70,3.21-j*.07) for j in range(4)],.026,.039,.008,'gold','Root')
  for j in range(3):
   s=j-1;pathcurve([(0,.67,2.91),(s*.39,.67,2.76),(s*.79,.64,2.89),(s*.79,.64,3.02)],[(.025,.025)]*4,'gold','Root')
   loft([(3.00,.09,.09,s*.79,.64),(3.07,.12,.12,s*.79,.64),(3.09,.09,.09,s*.79,.64)],'gold','Root',seg=24)
   for k in range(3):ell((s*.79+(k-1)*.065,.62,2.72),(.026,.026,.069),'blue','Root',16,10)
 elif i==8:
  center=(-.95,.37,2.28)
  palette=['red','blue','green','orange','white','lime']
  for x in range(3):
   for y in range(3):
    for z in range(3):
     if x==y==z==1:continue
     c=(center[0]+(x-1)*.095,center[1]+(y-1)*.095,center[2]+(z-1)*.095);o=box(c,(.087,.087,.087),palette[(x+y*2+z*3)%6],'Root',.009);transform(o,center,(.28,-.35,.25))
 elif i==9:
  for j in range(10):
   a=j*math.tau/10;x=1.0*math.cos(a);z=2.1+.94*math.sin(a);y=.45+.24*math.cos(a*3);o=star((x,y,z),.10 if j%3 else .15,'gold' if j%2 else 'silver','Root');transform(o,(x,y,z),(.2*j,.17*j,.1*j))
 elif i==10:
  for s in [-1,1]:
   for j in range(3):
    x=s*(.88+j*.055);z=1.22+j*.35;y=.35+j*.09
    pathcurve([(s*.85,y,.84),(x,y,z-.12),(x,y,z)],[(.016,.016),(.012,.012),(.008,.008)],'green','Root')
    for k in range(5):
     a=k*math.tau/5;pathcurve([(x,y,z),(x+.12*math.cos(a),y-.05,z+.12*math.sin(a)),(x+.18*math.cos(a),y-.12,z+.18*math.sin(a))],[(.025,.02),(.065,.022),(.003,.003)],'cream','Root')
    ell((x,y-.09,z),(.028,.025,.028),'gold','Root',12,8)
 elif i==11:
  for s in [-1,1]:
   x=s*.94;y=.42;z=1.22
   loft([(z-.30,.11,.11,x,y),(z-.26,.16,.16,x,y),(z-.10,.20,.18,x,y),(z+.06,.16,.15,x,y),(z+.18,.09,.09,x,y),(z+.22,.13,.13,x,y)],'cream' if s<0 else 'blue','Root',seg=32)
   for side in [-1,1]:pathcurve([(x+side*.12,y,z+.12),(x+side*.26,y,z+.11),(x+side*.25,y,z-.07),(x+side*.16,y,z-.14)],[(.026,.026)]*4,'gold','Root')
   for k in range(5):a=k*math.tau/5;ell((x+.16*math.cos(a),y+.15*math.sin(a),z-.05),(.045,.022,.055),'gold','Root',12,8)

def build(categories=None):
 for cat in categories or CAT:
  fn={'head':heads,'eyes':eyes,'brows':brows,'mouth':mouth,'nose':nose,'ears':ears,'tattoo':tattoos,'shirt':tops,'legs':legs,'hat':hats,'accessory':accessories,'extra':extras}[cat]
  for i,item in enumerate(CAT[cat][:12]):
   begin('hair' if cat=='head' and item.get('baseHead') else cat,item['id']);fn(i);o=join()
   if cat=='brows':
    for v in o.data.vertices:v.co.z-=.045;v.co.y-=.045
   if cat=='extra':
    # Arrange the orbit around the portrait camera, retaining each object's depth.
    for v in o.data.vertices:
     x,y,z=v.co; x*=.89;v.co=(.932*x-.362*y,.362*x+.932*y,2.04+(z-2.04)*.85)
   o.hide_set(True)
 print('Drilady collection parts',len(collection.objects),flush=True)

def show(look=None):
 look=look or {};defaults={'head':'original','hair':'original','eyes':'classic','brows':'original','mouth':'original','nose':'original','ears':'original','shirt':'original','legs':'original','accessory':'original','hat':'none','extra':'none','tattoo':'none'};defaults.update(look)
 head=next((x for x in CAT['head'] if x['id']==defaults['head']),{})
 basehead=defaults['head']=='original' or head.get('baseHead')
 if basehead:defaults['hair']=defaults['head'];defaults['head']='original'
 else:
  defaults['hair']='none'
  for cat in ['eyes','brows','mouth','nose','tattoo']:defaults[cat]='none'
 if any(x['id']==defaults['shirt'] and x.get('overridesLegs') for x in CAT['shirt']):defaults['legs']='none'
 if any(x['id']==defaults['hat'] and x.get('coversHair') for x in CAT['hat']) or defaults['hat'] in ['ladyfbi','ladymilitary','ladyjester','ladywrap','ladyveil','ladyboater','ladyroseberet','ladybonnet','ladyscarf']:defaults['hair']='none'
 for o in bpy.data.objects:
  if not o.name.startswith('Drif_') or o.type!='MESH':continue
  tokens=o.name.split('_');cat=tokens[1].lower();id=tokens[2] if len(tokens)>2 else ''
  visible=cat in ['body','tail'] or id==defaults.get(cat,'none');o.hide_set(not visible);o.hide_render=not visible
 return defaults

def export():
 objects=[o for o in bpy.data.objects if o.name.startswith('Drif_') and o.type=='MESH']
 packs=[('drilady-base.glb',[o for o in objects if o.get('collectionBatch')!=3],True),('drilady-archive.glb',[o for o in objects if o.get('collectionBatch')==3],False)]
 for filename,parts,animations in packs:
  if not parts:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in parts+[rig]:o.hide_set(False);o.hide_viewport=False;o.select_set(True)
  bpy.context.view_layer.objects.active=rig
  bpy.ops.export_scene.gltf(filepath=str(OUT/filename),use_selection=True,export_animations=animations,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_force_sampling=True,export_def_bones=False)
 rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 manifest=json.loads((OUT/'manifest.json').read_text());manifest.update(version=4,collectionTraitCount=sum(len(v) for v in CAT.values()),categories={k:len(v) for k,v in CAT.items()},packs=[{'file':name,'parts':len(parts),'animations':animations} for name,parts,animations in packs if parts],parts=[{'name':o.name,'vertices':len(o.data.vertices)} for o in objects]);(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 show();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drilady-base.blend'));print('EXPORTED',len(objects),len(bpy.data.actions),flush=True)

if __name__=='__main__':setup();build();export()
