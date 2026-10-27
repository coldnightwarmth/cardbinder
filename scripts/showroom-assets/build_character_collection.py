"""Separate, animation-compatible 240-part packs; never rebuild accepted bases.
Blender --background --factory-startup --python this.py -- drifella|drilady
Volumes and fitted quad surfaces are used for silhouettes and garment structure.
"""
import bpy,math,json,sys,importlib.util,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SPECIES=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'drilady'
LADY=SPECIES=='drilady'
CAT=json.loads((ROOT/'scripts/showroom-assets/character-collection-catalog.json').read_text())[SPECIES]
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('build_drilady.py'));b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
b.collection=bpy.data.collections.new('CharacterCollectionParts');bpy.context.scene.collection.children.link(b.collection)
source=ROOT/'assets/models'/('drilady/drilady-base.blend' if LADY else 'drifmaker/drifella-customizable.blend')
rigName='DriladyRig' if LADY else 'DrifellaRig'
with bpy.data.libraries.load(str(source),link=False) as (src,dst):dst.objects=[rigName,'Drif_Head_original']
b.rig,head=dst.objects;b.collection.objects.link(b.rig);b.rig.animation_data_clear();b.rig.data.pose_position='REST'
for bone in b.rig.pose.bones:bone.matrix_basis.identity()
bvh=BVHTree.FromPolygons([v.co[:] for v in head.data.vertices],[tuple(f.vertices) for f in head.data.polygons])
bpy.data.objects.remove(head,do_unlink=True)
b.parts=[];pieces=[];current=''
M={}
for name,c,rough,metal in [('ink',(.012,.017,.026),.5,0),('ivory',(.91,.85,.72),.7,0),('white',(.95,.96,.96),.38,0),('navy',(.025,.045,.105),.75,0),('denim',(.09,.19,.35),.85,0),('rose',(.72,.14,.28),.4,0),('pink',(.9,.37,.58),.34,0),('red',(.64,.025,.045),.48,0),('green',(.08,.24,.15),.8,0),('lime',(.48,.78,.06),.4,0),('gold',(.72,.43,.10),.24,.8),('silver',(.68,.75,.8),.21,.85),('purple',(.31,.07,.47),.48,0),('cyan',(.04,.48,.64),.28,.2),('brown',(.16,.045,.022),.65,0),('blonde',(.76,.51,.18),.62,0),('tan',(.42,.26,.12),.82,0),('glass',(.10,.22,.30),.11,.52),('pearl',(.9,.78,.73),.23,.2)]:M[name]=b.material('Collection '+name,c,rough,metal)
M['fur']=b.material('Drilady_Fur_Collection' if LADY else 'Drif_Body_Main_Collection',(.69,.33,.21) if LADY else (.022,.14,.68),.7)
P=['navy','rose','ink','ivory','green','white','purple','tan','red','cyan','pink','ink','ivory','green','ivory','purple','red','navy','denim','rose']
def mat(m):return M[m] if isinstance(m,str) else m
def ell(c,r,m='ink',bone='Head',n=24,k=14):return b.ell(current,c,r,mat(m),bone,n,k)
def box(c,size,m='ink',bone='Head',bevel=.012):return b.box(current,c,size,mat(m),bone,bevel)
def mesh(v,f,m='ink',bone='Head',smooth=True):return b.mesh(current,v,f,mat(m),bone,smooth)
def loft(rows,m='ink',bone='Head',n=32,folds=0,depth=0):return b.loft(current,rows,mat(m),bone,n,folds,depth)
def sweep(path,w,m='ink',bone='Head',n=12):
 if isinstance(w,(int,float)):w=[(w,w)]*len(path)
 return b.sweep(current,path,w,mat(m),bone,n)
def patch(poly,y,m='ink',bone='Head',thick=.025,bulge=.02,soft=False):return b.patch(current,b.rounded(poly,4) if soft else poly,y,thick,mat(m),bone,bulge)
def face_y(x,z):
 hit,*_=bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
 return hit.y if hit else (-.29 if LADY else -.45)
def face(poly,m='ink',offset=.012,bulge=.008,soft=False):
 o=patch(poly,0,m,thick=.018,bulge=bulge,soft=soft)
 for v in o.data.vertices:v.co.y+=face_y(v.co.x,v.co.z)-offset
 return o
def oval(x,z,rx,rz,n=24):return [(x+rx*math.cos(j*math.tau/n),z+rz*math.sin(j*math.tau/n)) for j in range(n)]
def ring(c,rx,rz,t=.018,m='gold',bone='Head',n=32):return b.ring(current,c,rx,rz,t,mat(m),bone,n)
def tube(c,r,d,m='silver',bone='Head',n=32):
 x,y,z=c;v=[(x+r*math.cos(j*math.tau/n),yy,z+r*math.sin(j*math.tau/n)) for yy in [y-d/2,y+d/2] for j in range(n)]
 return mesh(v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],m,bone)
def band(z,rx,ry,height,m='ink',bone='Head',center=(0,0)):
 return loft([(z-height/2,rx,ry,*center),(z+height/2,rx,ry,*center)],m,bone)
def buckle(c,w=.10,h=.08,m='gold',bone='Chest'):
 x,y,z=c
 for s in [-1,1]:box((x+s*w/2,y,z),(.014,.025,h),m,bone,.004);box((x,y,z+s*h/2),(w,.025,.014),m,bone,.004)
 box((x,y-.01,z),(.01,.023,h*.85),m,bone,.002)
def badge(c,size=.09,m='gold',shape=0,bone='Chest'):
 x,y,z=c
 if shape==0:pts=[(x+size*(1 if j%2==0 else .43)*math.sin(j*math.pi/5),z+size*(1 if j%2==0 else .43)*math.cos(j*math.pi/5)) for j in range(10)]
 elif shape==1:pts=[(x+size*math.sin(a)**3,z+size*(13*math.cos(a)-5*math.cos(2*a)-2*math.cos(3*a)-math.cos(4*a))/16) for a in [j*math.tau/32 for j in range(32)]]
 elif shape==2:pts=[(x-size,z),(x,z+size),(x+size,z),(x,z-size)]
 else:pts=[(x-size*.7,z-size),(x-size*.7,z+size),(x+size*.7,z+size),(x+size*.7,z-size)]
 return patch(pts,y,m,bone,.025,.012)
def lock(points,width,m='brown',bone='Head'):
 # Catmull-Rom broad tapered locks, not surface line decoration.
 arr=[];ws=[]
 for i in range(len(points)-1):
  p0,p1,p2,p3=[Vector(points[max(0,min(len(points)-1,k))]) for k in [i-1,i,i+1,i+2]]
  for j in range(6):
   t=j/6;arr.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));u=(i+t)/(len(points)-1);ws.append((width*(1-.88*u*u),width*.55*(1-.85*u*u)))
 arr.append(Vector(points[-1]));ws.append((.004,.004));return sweep(arr,ws,m,bone,12)
def begin(cat,row):
 global current
 current='Drif_'+('Hair' if cat=='head' else cat.title())+'_'+row['id'];b.parts.clear()
def join():
 bpy.ops.object.select_all(action='DESELECT')
 for o in b.parts:o.select_set(True)
 bpy.context.view_layer.objects.active=b.parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=current;o.data.name=current
 # Joining retains vertex groups/material assignments. Only one armature modifier.
 for mod in list(o.modifiers):
  if mod.type!='ARMATURE':o.modifiers.remove(mod)
 o['traitPack']='collection-wave';o['character']=SPECIES;pieces.append(o);return o

# Hair shells wrap the entire skull, leaving face and ears independent.
def scalp(m):
 v=[];f=[];N=48;R=14;rx=.515 if LADY else .648;ry=.41 if LADY else .675;z0=2.31 if LADY else 2.10;rz=.535 if LADY else .68
 for side in [0,1]:
  for k in range(R+1):
   for j in range(N):
    a=j*math.tau/N;front=max(0,-math.sin(a));theta=k/R*(2.20-front*1.28);q=.014*side
    v.append(((rx-q)*math.sin(theta)*math.cos(a),.055+(ry-q)*math.sin(theta)*math.sin(a),z0+(rz-q)*math.cos(theta)))
 S=(R+1)*N
 for k in range(R):
  for j in range(N):
   a=k*N+j;bb=k*N+(j+1)%N;c=(k+1)*N+(j+1)%N;d=(k+1)*N+j;f.extend([(a,bb,c,d),(a+S,d+S,c+S,bb+S)])
 for j in range(N):a=R*N+j;bb=R*N+(j+1)%N;f.append((a,bb,bb+S,a+S))
 return mesh(v,f,m)
def hair(i):
 colors=['brown','ink','rose','blonde','brown','ink','blonde','brown','brown','brown','rose','ivory','ink','blonde','red','pink','brown','purple','brown','cyan'];m=colors[i];scalp(m)
 crown=2.79;w=.47 if LADY else .55;front=-.29 if LADY else -.47
 if LADY and i==15:
  # Center-parted curtain layers sweep outward, then turn inward at the jaw.
  # Broad overlapping locks make a complete side/back silhouette.
  for s in [-1,1]:
   for k in range(7):
    t=k/6;yy=-.22+t*.43
    path=[(s*(.035+t*.13),yy,2.82-t*.025),
          (s*(.34+t*.10),yy-.07,2.74),
          (s*(.48+t*.025),yy-.045,2.48),
          (s*(.45+t*.045),yy+.01,2.24),
          (s*(.35+t*.055),yy+.055,2.14)]
    lock(path,.092,m)
  return
 elif LADY and i==4:
  # Stacked, tapered volume forms a beehive rather than a swept front roll.
  loft([(2.68,.34,.28,.035,.14),(2.80,.33,.28,.045,.14),
        (2.95,.29,.245,.055,.13),(3.10,.23,.195,.065,.12),
        (3.19,.12,.11,.07,.10),(3.22,.012,.012,.07,.10)],m,n=40)
  for k in range(6):
   a=k*math.tau/6
   lock([(.05+.31*math.cos(a),.14+.26*math.sin(a),2.78),
         (.06+.27*math.cos(a+.3),.13+.23*math.sin(a+.3),2.96),
         (.07+.18*math.cos(a+.6),.12+.16*math.sin(a+.6),3.12),
         (.075,.10,3.21)],.068,m)
  lock([(-.32,-.13,2.76),(-.12,front-.025,2.78),(.25,front-.035,2.64),(.42,-.20,2.51)],.105,m)
  return
 elif LADY and i==9:
  for s in [-1,1]:
   ell((s*.31,.18,2.89),(.18,.16,.17),m)
   for strand in range(3):
    path=[]
    for k in range(30):
     t=k/29;a=t*math.tau+strand*math.tau/3
     path.append((s*(.31+.165*math.cos(a)),.18+.145*math.sin(a),2.85+.08*math.sin(t*math.pi)))
    sweep(path,.036,m,n=10)
   lock([(s*.06,-.08,2.79),(s*.22,front*.72,2.77),(s*.40,front*.87,2.58)],.095,m)
  return
 elif i in [0,3,9,16,17]:
  count={0:2,3:2,9:2,16:2,17:2}[i]
  for s in [-1,1]:
   if i==17:
    ell((s*.20,.01,2.89),(.23,.16,.13),m);ell((0,-.04,2.88),(.09,.13,.12),m)
   elif i==16:
    ell((s*w*.8,.25,2.30),(.18,.18,.20),m)
    for k in range(4):lock([(s*w*.55,.32,2.47),(s*(w*.8+.10*math.cos(k*1.5)),.32-.1*math.sin(k*1.5),2.3),(s*w*.9,.28,2.16)],.065,m)
   else:
    for k in range(3):
     z=crown+.015*k;path=[(s*.06,front+.15,z),(s*.24,front-.09,z+.10),(s*.36,front-.12,z-.02),(s*.25,front-.08,z-.12),(s*.21,front-.10,z-.04)]
     if i==3:path=[(s*w,.16,2.65),(s*(w+.13),.02,2.4),(s*w,.0,2.14),(s*(w-.05),-.06,2.25)]
     lock(path,.095 if i!=9 else .07,m)
 elif i in [1,4,12,14,18]:
  for k in range(7):
   u=k/6;startx=-w*.8+u*w*1.4
   if i==4:path=[(startx,.18,2.75),(startx*.7,-.09,3.02),(w*.65,front-.10,2.88),(w*.90,front,2.64)]
   elif i==12:path=[(-w*.7+u*.4,.08,2.75),(w*.4,front*.55,2.73),(w*.70,front,2.57),(w*.85,front+.1,2.44)]
   elif i==14:path=[(startx,.12,2.80),(startx*.8,front*.6,2.73),(startx*.6,front,2.51-.07*math.sin(u*math.pi))]
   elif i==18:path=[(startx,front*.2,2.75),(.1,.40,2.70),(.15,.56,2.20),(.3,.48,1.95)]
   else:path=[(startx,.18,2.77),(startx+.12,front*.6,2.78),(w*.9,front,2.56),(w*.9+.03,front+.08,2.35)]
   lock(path,.095,m)
 elif i in [2,15]:
  for k in range(7):
   y=-.30+k*.105;z=2.72+.10*math.sin(k/6*math.pi);height=(.32+.12*math.sin(k*.8)) if i==2 else .47
   lock([(0,y,z),(.015,y-.025,z+height*.62),((-.06 if k%2 else .06),y+.015,z+height)],.10,m)
 elif i in [5,6,13,19]:
  for s in [-1,1]:
   for k in range(6):
    yy=-.1+k*.07;x=s*(w+.01*math.cos(k));z=2.72-.06*k
    end=1.92 if i in [5,19] else 2.18
    path=[(s*.12,yy+.04,2.80),(x,yy,2.62),(x+s*.03,yy-.06,2.30),(x+s*(.10 if i==6 else -.03),yy+.02,end)]
    if i==13:path=[(s*.05,yy,2.8),(x*.75,yy-.05,2.73),(x,yy,2.52),(x*.88,yy-.05,2.43)]
    if i==19:path=[(s*.3,yy,2.75),(s*(w+.10),yy,2.65),(s*(w-.05),yy,2.38),(s*(w+.10),yy,2.15),(s*w,yy,1.90)]
    lock(path,.07,m)
 elif i in [7,8,11]:
  for s in [-1,1]:
   for strand in range(3):
    path=[];widths=[]
    for k in range(40):
     t=k/39;a=t*math.tau*5+strand*math.tau/3
     if i==8:x=(w+.025)*math.cos(t*math.pi);z=2.59+.25*math.sin(t*math.pi);y=-.12-.22*math.sin(t*math.pi)
     else:x=s*(w+.03+.04*math.cos(a));z=2.69-t*(.55 if i==7 else .93);y=.11+.045*math.sin(a)
     path.append((x+.045*math.cos(a),y+.025*math.sin(a),z));widths.append((.043,.04))
    sweep(path,widths,m,n=10)
 else: # segmented high ponytail
  lock([(0,.08,2.83),(0,.35,3.02),(.07,.47,2.88),(.12,.48,2.28)],.17,m)
  for j in range(5):ell((.10,.47,2.86-j*.13),(.11-j*.012,.10-j*.01,.10),m)
 # A compact curved front lock gives an intentional hairline at all angles.
 if i not in [0,1,4,12,14,18]:lock([(-w*.6,-.08,2.76),(0,front*.8,2.76),(w*.45,front,2.61)],.085,m)

# Eyes use fitted broad almond surfaces, not inherited black orbs.
# Analytic curved eye layers share one continuous surface, avoiding ray jumps
# between the eyelid and cheek. Makeup is a broad volume, not floating strokes.
def eye_surface(poly,m,offset=.02,bulge=.012,soft=True):
 o=patch(b.rounded(poly,5) if soft else poly,0,m,thick=.045,bulge=bulge)
 for v in o.data.vertices:
  x,z=v.co.x,v.co.z
  yy=(-.355+.10*(x/.49)**2+.045*((z-2.34)/.34)**2) if LADY else face_y(x,z)
  v.co.y+=yy-offset
 return o

def eyes(i):
 z=2.19 if LADY else 2.26;x0=.263 if LADY else .295;rx=.194 if LADY else .171
 eyeheight=[.095,.09,.082,.095,.09,.085,.08,.09,.085,.10,.073,.065,.08,.085,.09,.09,.09,.095,.09,.14][i] if LADY else ([.14]*19+[.18])[i]
 glasses=i in [0,1,2,3,4,5,6,7,8,18]
 for s in [-1,1]:
  x=s*x0;rz=eyeheight
  def pt(dx,dz):return (x+s*dx,z+dz)
  if i==16 and s==1:
   eye_surface([pt(-rx,0),pt(0,-.025),pt(rx,.035),pt(rx,-.005),pt(0,-.065),pt(-rx,-.025)],'ink',.06,.004)
   continue
  out=[pt(-rx,-.015),pt(-rx*.5,rz*.75),pt(rx*.52,rz),pt(rx,rz*.50),pt(rx*.45,-rz*.78),pt(-rx*.5,-rz)]
  if i in [10,11]:out=[pt(-rx,-.005),pt(rx,.035),pt(rx*.55,-rz*.7),pt(-rx*.50,-rz)]
  eye_surface(out,'white',.015,.013)
  color={9:'cyan',10:'purple',11:'gold',12:'red',13:'glass',14:'lime',15:'cyan',16:'purple',17:'gold',19:'brown'}.get(i,'brown')
  px=x-s*(.032 if i==11 else .01);pz=z-.013
  eye_surface(oval(px,pz,.055 if LADY else .068,min(.075,rz*.80)),color,.036,.005)
  eye_surface(oval(px,pz,.013 if i==14 else .024,min(.043,rz*.57)),'ink',.047,.003)
  eye_surface(oval(px-.016,pz+.022,.012,.015),'white',.056,.002)
  if i in [9,15]:eye_surface([(px-.035,pz),(px,pz+.043),(px+.035,pz),(px,pz-.043)],'white' if i==9 else 'cyan',.062,.004,False)
  if LADY and not glasses:
   # Full sculpted lids maintain the collection's tall, expressive makeup.
   rise={9:.25,10:.29,11:.22,12:.26,13:.24,14:.25,15:.27,16:.25,17:.23,19:.22}[i]
   lid=[pt(-rx,-.012),pt(-rx*.78,rise*.70),pt(-rx*.25,rise),pt(rx*.45,rise*.84),pt(rx,rz*.5),pt(rx*.52,rz),pt(-rx*.5,rz*.75)]
   eye_surface(lid,{'cyan':'navy','gold':'tan','brown':'rose'}.get(color,color),.034,.019)
   # Contrasting upper satin panel gives each expression an intentional contour.
   eye_surface([pt(-rx*.68,rise*.63),pt(-rx*.25,rise*.94),pt(rx*.40,rise*.81),pt(rx*.64,rise*.52),pt(rx*.05,rise*.65)],'pink' if i in [9,10,13,16] else 'gold' if i in [11,14,19] else 'silver',.038,.012)
   lash=[pt(-rx,-.012),pt(-rx*.5,rz*.75),pt(rx*.52,rz),pt(rx,rz*.50),pt(rx+.03,rz+.06),pt(rx+.018,rz*.28),pt(rx*.45,rz-.024),pt(-rx*.48,rz*.75-.019)]
   eye_surface(lash,'ink',.065,.003,False)
   if i in [12,15,19]:
    for k in range(2):eye_surface([pt(rx-.04+k*.024,rz*.62),pt(rx+.025+k*.024,rz+.06+k*.012),pt(rx-.008+k*.024,rz*.45)],'ink',.065,.003,False)
  if i==13:
   for j in range(2):eye_surface(oval(x+s*(.075+j*.04),z-rz-.055-j*.012,.011,.055),'ink',.02,.002)
  if i==17:
   # Recessed chrome socket with a clearly separate rectangular outer rim.
   rim=[pt(-rx-.025,-rz-.02),pt(-rx-.025,rz+.025),pt(rx+.025,rz+.025),pt(rx+.025,-rz-.02)]
   for k in range(4):a=rim[k];bb=rim[(k+1)%4];cc=(x+(bb[0]-x)*.89,z+(bb[1]-z)*.82);dd=(x+(a[0]-x)*.89,z+(a[1]-z)*.82);eye_surface([a,bb,cc,dd],'silver',.07,.008,False)
  if glasses:
   ww=rx*(.78 if i==4 else 1.1 if i in [0,5,7] else 1.0);hh=rz*(1.2 if i in [0,3,7] else .92 if i==4 else 1.05)
   y=(-.355+.10*(x/.49)**2)-.085 if LADY else face_y(x,z)-.085
   if i in [1,5,18]:shape=[(x-ww,z-hh),(x-ww,z+hh),(x+ww,z+hh),(x+ww,z-hh)]
   elif i in [2,8]:shape=[pt(-ww,-hh*.65),pt(-ww*.9,hh*.65),pt(ww*1.2,hh*1.5),pt(ww,-hh*.65)]
   elif i==3:shape=[pt(-ww,hh*.65),pt(-ww*.7,-hh*.8),pt(ww*.15,-hh*1.25),pt(ww,hh*.45),pt(ww*.45,hh*.85)]
   elif i==6:shape=[(x-ww,z+hh*.10),(x+ww,z+hh*.10),(x+ww*.72,z-hh),(x-ww*.7,z-hh)]
   else:shape=oval(x,z,ww,hh)
   frame='gold' if i in [3,4,6] else 'silver' if i==0 else 'ink'
   patch(shape,y,frame,thick=.06,bulge=.025,soft=i in [1,5,3,6])
   cx=sum(xx for xx,zz in shape)/len(shape);cz=sum(zz for xx,zz in shape)/len(shape)
   lens='gold' if i==2 else ('cyan' if s<0 else 'rose') if i==5 else 'glass'
   patch([(cx+(xx-cx)*.82,cz+(zz-cz)*.77) for xx,zz in shape],y-.04,lens,thick=.014,bulge=.012)
   if i==0:
    for a in range(6):ell((x+ww*.96*math.cos(a*math.tau/6),y-.026,z+hh*.96*math.sin(a*math.tau/6)),(.010,.012,.010),'silver',n=10,k=6)
   if i==1:box((x,y-.01,z+hh),(ww*2,.045,.025),'pearl')
   if i==5:
    for j in range(5):box((x-ww*.8+j*ww*.4,y-.035,z+hh),(ww*.20,.015,.026),'ivory',bevel=.003)
   if i==7:
    box((x,y+.02,z+hh+.04),(ww*2,.08,.04),'silver');patch([(x-ww,z+hh+.05),(x+ww,z+hh+.05),(x+ww*.9,z+hh+.22),(x-ww*.9,z+hh+.22)],y+.025,'ink',thick=.04,bulge=.015)
   if i==18:
    for j in range(4):box((x,y-.062,z-hh*.7+j*hh*.45),(ww*1.8,.015,.020),'silver',bevel=.004)
 if glasses:
  y=(-.355 if LADY else face_y(0,z))-.07;box((0,y,z+.025),(.20,.055,.025),'gold' if i in [3,4,6] else 'ink',bevel=.009)
  if i==3:badge((0,y-.03,z+.035),.037,'gold',1,'Head')
  if i==8:patch([(-.13,z-.06),(0,z+.12),(.13,z-.06),(.075,z+.15),(-.075,z+.15)],y,'ink',thick=.04,bulge=.02)
  for s in [-1,1]:sweep([(s*.43,(-.27 if LADY else face_y(s*.43,z))-.08,z+.03),(s*.51,-.16,z+.05),(s*.52,.12,z+.025)],.018,'ink')

def brows(i):
 shapes=[ [(-1,0),(-.7,.45),(.8,.3),(1,-.15),(.5,0),(-.8,-.15)], [(-1,0),(-.6,.4),(.9,.25),(1,0),(-.7,.15)], [(-1,.1),(-.4,.6),(-.1,.25),(.65,.55),(1,-.15),(.1,.15)], [(-1,0),(-.6,.6),(.3,.65),(1,-.1),(.2,.35),(-.6,.3)], [(-1,-.1),(-.8,.6),(-.3,.4),(1,.05),(.3,-.1)], [(-1,.4),(-.4,.45),(1,-.3),(.85,-.5),(-.6,.2)], [(-1,0),(-.7,.8),(0,.8),(1,.1),(.2,.35),(-.55,.4)], [(-1,0),(-.4,.2),(.6,.15),(1,-.05),(.4,-.15),(-.6,-.15)], [(-1,0),(-.4,.4),(.6,.3),(1,.6),(.9,.15),(1,-.1),(.4,.1)], [(-1,0),(-.7,.5),(-.35,.3),(0,.6),(.35,.3),(.7,.4),(1,0),(.4,-.1)], [(-1,0),(-1,.3),(-.5,.3),(-.5,.6),(0,.6),(0,.3),(.7,.3),(1,0)], [(-1,.5),(-.5,.65),(.3,.15),(1,-.3),(.1,-.05),(-.55,.35)], [(-1,0),(-.5,.4),(.3,.4),(.9,.75),(.7,.15),(1,.4),(.85,-.05)], [(-1,.1),(-.4,.45),(.5,.5),(1,.1),(.4,.25),(-.5,.2)], [(-1,0),(-.5,.35),(1,.1),(.6,-.1),(-.5,.12)], [(-1,0),(-.4,.55),(0,.2),(.3,.5),(1,0),(.25,.2),(0,0),(-.4,.3)], [(-1,.45),(-.5,.3),(1,-.25),(.6,-.4),(-.4,.1)], [(-1,0),(-.7,.4),(0,.05),(.7,.4),(1,.15),(.6,.15),(0,-.1),(-.7,.2)], [(-1,0),(-.7,.45),(.1,.3),(.5,.6),(1,.05),(.35,.25),(-.7,.2)], [(-.5,.15),(.5,.15),(.55,-.03),(-.4,-.1)]]
 for s in [-1,1]:
  x=s*.28;z=2.59 if LADY else 2.49;lift=.05 if i==13 and s>0 else 0
  pts=[(x+s*u*.16,z+v*.13+lift) for u,v in shapes[i]]
  if i==1:
   # Three genuine separated sections create the shaved notches.
   for k in range(3):face([(x+s*(-.16+k*.11),z+.02),(x+s*(-.16+k*.11),z+.052),(x+s*(-.085+k*.11),z+.055),(x+s*(-.085+k*.11),z+.025)],'brown' if LADY else 'ink',.016)
  else:face(pts,'brown' if LADY else 'ink',.012,.012,soft=i not in [2,10,14,18])

def mouth(i):
 z=1.91 if LADY else 1.82;scale=.60 if LADY else 1.;w=.24*scale;h=(.060 if i in [3,10,11,15,16,17] else .10)*scale;y=face_y(0,z)-.025
 if not LADY:ell((0,y+.01,z+.045),(.30,.08,.16),'ivory')
 if i in [6,7]:
  poly=[(-w*1.5,z+.13),(-w*.65,z+.16),(w*.65,z+.16),(w*1.5,z+.13),(w*1.15,z-.10),(0,z-.16),(-w*1.15,z-.10)]
  patch(poly,y-.055,'ink' if i==6 else 'white',thick=.08,bulge=.065,soft=i==7)
  if i==6:
   for side in [-1,1]:tube((side*w*.70,y-.13,z),.055*scale,.025,'silver');tube((side*w*.70,y-.15,z),.035*scale,.015,'ink')
  for j in range(3):patch([(-w*1.2,z+.07-j*.06),(w*1.2,z+.07-j*.06),(w,z+.035-j*.06),(-w,z+.035-j*.06)],y-.095,'navy' if i==6 else 'ivory',thick=.035,bulge=.018)
  for s in [-1,1]:sweep([(s*w*1.35,y-.03,z+.07),(s*.43,y+.13,z+.08),(s*.44,y+.14,z-.02),(s*w*1.1,y-.03,z-.09)],.013,'ink' if i==6 else 'white')
  return
 poly=oval(0,z,w,h)
 if i in [11,17,19]:poly=[(-w,z+.03),(0,z+(-.045 if i==17 else -.005)),(w,z+(.08 if i!=17 else .03)),(w*.7,z-.04),(0,z-h),(-w*.8,z-.04)]
 patch(poly,y-.06,'rose' if i in [3,10,11,16] else 'ink',thick=.035,bulge=.025,soft=True)
 if i in [3,11,16]:
  for s in [-1,1]:ell((s*w*.3,y-.10,z+.03),(w*.50,.034,.028),'rose' if i!=3 else 'purple')
  ell((0,y-.10,z-.026),(w*.76,.032,.031),'pink' if i==16 else 'rose')
 elif i==10:ring((0,y-.10,z),w*.45,h*.7,.024,'rose')
 elif i==15:
  for s in [-1,1]:patch([(s*.015,z+.025),(s*w*.65,z+.065),(s*w*1.2,z+.03),(s*w,z-.02),(s*.02,z+.002)],y-.10,'brown',bulge=.03,soft=True)
 elif i!=17:
  count=2 if i==0 else 6 if LADY else 8
  for j in range(count):
   xx=(j-(count-1)/2)*(w*1.65/count);zz=z+h*.42+(xx/w)**2*.018
   tw=w*1.6/count;th=h*(1.5 if i==0 else .60)
   if i==4 and j==2:th*=.5
   if i==9:th*=.57;zz-=h*.22
   toothmat='silver' if i==1 else 'gold' if i==5 and j in [1,2,3] else 'white'
   box((xx,y-.102,zz),(tw*.9,.035,th),toothmat,bevel=.008)
   if i==12:box((xx,y-.13,zz),(.008,.012,.02),'silver',bevel=.002)
  if i==9:patch([(-w*.9,z+h*.55),(w*.9,z+h*.55),(w*.7,z+h*.12),(-w*.7,z+h*.12)],y-.115,'rose',thick=.02,bulge=.01,soft=True)
  if i in [13,18]:
   for s in [-1,1]:patch([(s*w*.65-.025,z+.05),(s*w*.65+.025,z+.05),(s*w*.65,z-(.065 if i==18 else .035))],y-.13,'pearl' if i==13 else 'white',thick=.03,bulge=.012)
  if i==14:ell((w*.25,y-.115,z-h*.65),(w*.36,.027,h*.40),'rose')
  if i==8:
   for s in [-1,1]:patch([(s*w*.4,z+.05),(s*w*.25,z+.035),(s*w*.55,z+.018)],y-.13,'ink',thick=.01,bulge=0)
 if i==2:
  sweep([(w*.7,y-.1,z),(w*.95,y-.22,z+.02),(w*1.1,y-.40,z+.04)],[(.025,.025),(.034,.034),(.036,.036)],'brown')
  ell((w*1.1,y-.407,z+.04),(.035,.01,.035),'red',n=14,k=8)

def nose(i):
 z=2.045 if LADY else 2.015;y=face_y(0,z)-(.018 if LADY else .07);sz=.7 if LADY else 1.;c='rose' if LADY else 'ink';w=[.07,.11,.07,.075,.065,.063,.07,.08,.085,.10,.08,.08,.11,.075,.105,.055,.09,.065,.075,.048][i]*sz;h=[.045,.04,.065,.045,.04,.045,.07,.065,.085,.045,.05,.06,.05,.07,.025,.075,.055,.04,.05,.032][i]*sz
 if i in [0,2,6,7,13,15,18,19]:
  poly=[(-w,z+h*.7),(w,z+h*.7),(w*.75,z),(0,z-h),(-w*.75,z)]
  if i==7:poly=[(-w,z+h*.2),(-w*.7,z+h),(0,z+h*.55),(w*.7,z+h),(w,z+h*.2),(0,z-h)]
  if i in [6,13]:poly=[(-w,z),(0,z+h),(w,z),(0,z-h)]
  patch(poly,y,'silver' if i==6 else 'gold' if i==13 else c,thick=.035,bulge=.025,soft=i in [0,2,7,19])
 elif i in [3,9]:
  box((0,y-.012,z),(w*2,.065,h*2),'rose' if i==3 else 'ivory',bevel=.024 if i==3 else .014)
  if i==9:
   for s in [-1,1]:
    for zz in [-.012,.012]:ell((s*w*.67,y-.05,z+zz),(.004,.006,.004),'tan',n=8,k=4)
 else:
  ell((0,y-.015,z),(w,.09*sz if i==11 else .045*sz,h),'red' if i==8 else c)
  if i in [10,12,14]:
   for s in [-1,1]:ell((s*w*.43,y-.057,z-h*.2),(.014*sz,.012,.012*sz),'ink',n=14,k=8)
 if i in [4,16]:
  for s in [-1,1]:ell((s*w*.6,y-.05,z+.012),(.012,.012,.012),'gold' if i==4 else 'ink',n=12,k=8)
 if i in [5,17]:
  for x in ([0] if i==5 else [-.022,.022]):ring((x,y-.055,z-h-.02),.025,.029,.007,'gold',n=24)

def fin_ears(i):
 for s in [-1,1]:
  poly=[(.50,2.48),(.70,2.66),(.88,2.88),(.99,2.48),(.89,2.36),(1.01,2.22),(.94,1.91),(.74,2.07),(.51,2.14)]
  if i in [0,7,12]:poly=[(.50,2.48),(.70,2.66),(.88,2.88),(.93,2.63),(1.01,2.49),(.94,2.37),(1.03,2.24),(.97,2.11),(1.01,1.98),(.91,1.91),(.74,2.07),(.51,2.14)]
  if i in [1,9]:poly=[(.50,2.48),(.67,2.69),(.75,2.83),(.79,2.61),(.93,2.91),(.98,2.50),(.89,2.37),(1.02,2.21),(.93,1.98),(.75,2.07),(.51,2.14)]
  if i in [3,14]:poly=[(.50,2.48),(.70,2.66),(.88,2.88),(.99,2.48),(.84,2.42),(.98,2.34),(.87,2.25),(1.01,2.22),(.94,1.91),(.74,2.07),(.51,2.14)]
  if i in [5,16]:poly=[(.50,2.48),(.72,2.65),(.88,2.80),(.96,2.74),(.99,2.57),(.88,2.47),(.90,2.59),(.84,2.63),(.83,2.40),(1.01,2.22),(.94,1.91),(.74,2.07),(.51,2.14)]
  if i==15:poly=[(.5,2.48),(.85,2.79),(1.0,2.48),(.87,2.34),(1.02,2.16),(.87,2.11),(.90,1.95),(.71,2.06),(.5,2.14)]
  wx=[1.,1.,1.16,.98,.90,.98,1.1,.80,.94,1.,1.03,.97,1.04,1.08,.94,.93,1.,1.14,.75,1.][i]
  hz=[1.05,1.02,1.,.98,.84,.98,1.04,.80,1.18,1.03,.94,1.,.96,1.09,1.02,.89,.98,.94,1.24,1.][i]
  pts=[]
  for x,z in poly:
   x=.51+(x-.51)*wx;z=2.30+(z-2.30)*hz
   if i in [4,10] or i==11 and s>0:z=2.24-(z-2.30)*.76;x+=.08
   if i==8:x+=.07*max(0,(2.3-z));z-=.12*max(0,(2.3-z))
   pts.append((s*x,z))
  patch(pts,.035,'fur',thick=.10,bulge=.055,soft=i in [2,5,6,10,16,19])
  cx=sum(x for x,z in pts)/len(pts);cz=sum(z for x,z in pts)/len(pts)
  inner=[(cx+(x-cx)*.88,cz+(z-cz)*.90) for x,z in pts]
  patch(inner,-.017,'ivory',thick=.035,bulge=.045,soft=i in [2,5,6,10,16,19])
  if i in [2,6,12,13,17]:
   for k in range(3):
    # Broad convex membrane wedges, aligned radially with the attachment.
    zz=2.05+k*.22;patch([(s*.56,2.30),(s*.85,zz+.09),(s*.94,zz+.03),(s*.83,zz-.035)],-.043,'white',thick=.025,bulge=.025,soft=True)
  if i==19:
   for j in range(3):ring((s*.95,-.07,2.34-j*.11),.030,.039,.009,'gold',n=20)

def ears(i):
 if not LADY:return fin_ears(i)
 # Cross-section, fold direction, scalloping and lobes vary independently.
 lengths=[1.17,1.06,1.13,.96,1.02,.98,1.1,.75,1.40,1.13,1.25,1.15,1.01,1.16,1.07,.92,1.14,1.08,1.28,1.10]
 widths=[.16,.15,.235,.175,.19,.16,.20,.15,.14,.16,.19,.17,.21,.18,.17,.22,.19,.18,.12,.18]
 for s in [-1,1]:
  rows=[];insets=[]
  for k in range(15):
   t=k/14
   if LADY:
    z=2.82-lengths[i]*t;x=s*(.32+.50*math.sin(t*1.55));y=.12+.07*t
    if i in [1,4,11] and (i!=11 or s>0):z+=.18*math.sin(t*math.tau);y-=.22*t*t
    if i in [5,16]:x-=s*.18*t**5;z+=.13*t**6;y-=.10*t*t
    if i==9:z=2.75+.38*math.sin(t*math.pi)-.20*t;x=s*(.36+.44*t)
   else:
    z=2.22+.58*t*lengths[i]/1.1;x=s*(.55+.38*t);y=.05+.09*math.sin(t*math.pi)
    if i in [4,10,11]:z=2.35-.65*t;x=s*(.54+.40*math.sin(t*1.7));y-=.06*t
    if i in [5,16]:x-=s*.17*t**3;z-=.04*t**3
   width=widths[i]*(math.sin(math.pi*(.08+.92*t))**.65 if LADY else math.sin(math.pi*(.07+.93*t))**.8)
   if i in [0,7,12]:width*=1+.18*math.sin(t*math.pi*8)
   if i in [3,14] and .42<t<.60:width*=.56
   if i==15:width*=1+.22*math.sin(t*math.pi*3)
   depth=.045+.025*math.sin(t*math.pi)
   rows.append((z,max(.006,width),depth,x,y));insets.append((z,x,width,y,depth))
  loft(rows,'fur','Head',24)
  v=[];cols=10
  for k,(z,x,w,y,d) in enumerate(insets):
   for j in range(cols+1):
    u=-.72+1.44*j/cols;v.append((x+u*w,y-d*math.sqrt(1-u*u)-.005,z+.002))
  mesh(v,[(k*(cols+1)+j,k*(cols+1)+j+1,(k+1)*(cols+1)+j+1,(k+1)*(cols+1)+j) for k in range(14) for j in range(cols)],'pink' if LADY else 'ivory')
  if i in [2,6,8,13,17]:
   # Substantial inset pleats are integral to the broad ear membrane.
   for k in range(3):
    q=4+k*3;z,x,w,y,d=insets[q];patch([(x-w*.65,z-.08),(x,z-.13),(x+w*.65,z-.08),(x+w*.55,z-.02),(x,z-.05),(x-w*.55,z-.02)],y-d-.005,'rose' if LADY else 'white',thick=.015,bulge=.012,soft=True)
  if i==19:
   z,x,w,y,d=insets[8]
   for k in range(3):ring((x+s*w*.70,y-d-.02,z-k*.08),.028,.035,.008,'gold',n=20)

def tattoo(i):
 # Only tattoos intentionally use surface marks, conformed to the real skull.
 for s in [-1,1]:
  x=s*(.42 if LADY else .47);z=2.03 if LADY else 2.12;r=.055
  if i==8:
   for a in range(3):
    for bb in range(3):
     if (a+bb)%2==0:
      xx=x+(a-1)*.037;zz=z+(bb-1)*.037;face([(xx-.018,zz-.018),(xx+.018,zz-.018),(xx+.018,zz+.018),(xx-.018,zz+.018)],'ink',.006,.001)
   continue
  if i==15:
   for j in range(6):
    a=j*math.tau/6;face(oval(x+.026*math.cos(a),z+.026*math.sin(a),.026,.028),'rose',.006,.002)
   face(oval(x,z,.017,.018),'gold',.009,.002);continue
  if i==18:
   face(oval(x,z,.046,.059),'lime',.006,.001)
   for side in [-1,1]:face(oval(x+side*.018,z+.005,.010,.024),'ink',.008,.001)
   continue
  if i==6:
   face(oval(x,z,.055,.065),'gold',.005,.001);face(oval(x+.022,z+.015,.047,.054),'fur',.007,.001);continue
  if i==12:
   face([(x-.06,z-.025),(x-.06,z+.055),(x-.025,z+.01),(x,z+.07),(x+.025,z+.01),(x+.06,z+.055),(x+.06,z-.025)],'gold',.006,.001);continue
  if i==13:
   face([(x-.008,z+.055),(x+.008,z+.055),(x+.008,z-.025),(x+.045,z-.005),(x+.035,z-.05),(x,z-.065),(x-.035,z-.05),(x-.045,z-.005),(x-.008,z-.025)],'ink',.006,.001);continue
  if i in [0,8,14,16]:
   for j in range(4 if i!=16 else 3):
    xx=x+(j%2-.5)*.055;zz=z+(j//2-.5)*.055
    face(oval(xx,zz,.012,.012,12) if i in [14,16] else [(xx-.02,zz-.02),(xx+.02,zz-.02),(xx+.02,zz+.02),(xx-.02,zz+.02)],'rose' if LADY else 'ink',.005,.001)
  elif i in [1,2,9,15]:
   poly=[(x+r*math.sin(a)**3,z+r*(13*math.cos(a)-5*math.cos(2*a)-2*math.cos(3*a)-math.cos(4*a))/16) for a in [j*math.tau/24 for j in range(24)]]
   face(poly,'rose' if i in [1,15] else 'ink',.005,.001)
   if i==2:face([(x-.01,z+r),(x+.014,z+.006),(x-.009,z-.01),(x+.012,z-r)],'ivory',.007,.001)
   if i==9:face([(x-.018,z-r),(x+.018,z-r),(x,z-.025)],'ink',.007,.001)
  elif i in [4,5,6,11,12,18]:
   points=5 if i==4 else 4 if i in [5,18] else 8
   poly=[(x+r*(1 if j%2==0 else .40)*math.sin(j*math.pi/points),z+r*(1 if j%2==0 else .40)*math.cos(j*math.pi/points)) for j in range(points*2)]
   face(poly,'gold' if i in [6,11,12] else 'ink',.005,.001)
  elif i in [3,19]:
   for a in [-.65,.65] if i==3 else [0]:
    pts=[]
    for u,v in [(-.065,-.017),(.065,-.017),(.065,.017),(-.065,.017)]:pts.append((x+u*math.cos(a)-v*math.sin(a),z+u*math.sin(a)+v*math.cos(a)))
    face(pts,'ivory' if i==3 else 'ink',.006,.001)
  elif i==10:
   face(oval(x,z,.043,.047),'ivory',.006,.001)
   for side in [-1,1]:face(oval(x+side*.016,z+.008,.010,.014,12),'ink',.008,.001)
   face([(x-.025,z-.035),(x+.025,z-.035),(x+.021,z-.060),(x-.021,z-.060)],'ivory',.006,.001)
  elif i==17:
   for j in range(3):face(oval(x+(j-1)*.025,z-.02*j,.009,.043),'ink',.006,.001)
  else:face([(x-r,z+r),(x+.01,z+.015),(x-r*.25,z+.005),(x+r,z-r),(x-.005,z-.014),(x+r*.25,z+.003)],'cyan' if i==7 else 'ink',.006,.001)

def clothing_weight(co):
 if co.z>.90:return b.torso(co)
 side='L' if co.x>0 else 'R';t=max(0,min(.28,(.85-co.z)*.35));return {'Pelvis':1-t,'Thigh.'+side:t}
def sleeve(side,length,m,puff=False):
 s=side;l='L' if s>0 else 'R';xs=[.29,.38,.49,.63,.76,.89,1.05];xs=[x for x in xs if x<length]+[length]
 radii=[(.17 if not puff else .215)*(1-.20*(x-.35)) for x in xs]
 sweep([(s*x,0,1.465) for x in xs],[(r,r*.95) for r in radii],m,b.arm(l),20)
 sweep([(s*(length-.03),0,1.465),(s*(length+.012),0,1.465)],[(radii[-1]+.009,radii[-1]*.95+.009)]*2,'ivory' if m!='ivory' else 'navy',b.arm(l),20)
def bodice(m,bottom=.85,top=1.49,fit=False,fold=0):
 rows=[]
 for z,xr,yr in [(.82,.335,.22),(.96,.29 if LADY else .34,.21),(1.10,.28 if LADY else .35,.22),(1.25,.33 if LADY else .36,.26),(1.39,.345 if LADY else .37,.26),(1.49,.32,.20),(1.54,.24,.17)]:
  if bottom-.01<=z<=top+.01:rows.append((z,xr+.012,yr+.015,0,-.012))
 if not rows or rows[0][0]>bottom+.02:rows.insert(0,(bottom,.30 if LADY else .36,.235,0,-.01))
 if rows[-1][0]<top:rows.append((top,.31 if top<1.48 else .27,.245 if top<1.48 else .18,0,-.01))
 return loft(rows,m,b.torso,40,fold,.007 if fold else 0)
def lapels(m='ivory',short=False):
 for s in [-1,1]:
  patch([(s*.08,1.49),(s*.23,1.46),(s*.25,1.37),(s*.11,1.20 if not short else 1.28),(s*.14,1.38)],-.275,m,b.torso,.035,.025)
def straps(m='navy',width=.055):
 for s in [-1,1]:sweep([(s*.22,-.25,1.30),(s*.23,-.18,1.51),(s*.22,.01,1.57),(s*.22,.18,1.45),(s*.21,.22,1.27)],[(width,.02)]*5,m,b.torso,12)
def pockets(z,m='navy',wide=.13):
 for s in [-1,1]:
  box((s*.21,-.255,z),(wide,.045,.14),m,b.torso,.018);patch([(s*.21-wide*.55,z+.075),(s*.21+wide*.55,z+.075),(s*.21+wide*.45,z+.025),(s*.21-wide*.45,z+.025)],-.285,m,b.torso,.02,.01)
  ell((s*.21,-.308,z+.045),(.012,.008,.012),'gold','Chest',12,8)
def skirt(m,bottom=.18,style=0):
 width=.48 if style!=2 else .39
 loft([(bottom,width,.29,0,0),(bottom+.10,width-.015,.28,0,0),(.60,.40,.255,0,0),(.84,.35,.23,0,0),(.94,.32,.21,0,0)],m,clothing_weight,48,12 if style==1 else 6,.018 if style==1 else .009)
def shoes(m='ink',boots=False):
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215
  ell((x,-.09,.11),(.19,.28,.11),m,'Foot.'+l)
  ell((x,-.095,.043),(.20,.29,.045),'ivory','Foot.'+l)
  if boots:loft([(.10,.16,.16,x,0),(.20,.16,.15,x,0),(.36,.15,.14,x,0),(.48,.17,.15,x,0)],m,b.leg(l),24)
def trousers(m='navy',bottom=.15,width=.18,folds=0):
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215
  loft([(bottom,width,.16,x,0),(.38,width*.92,.18,x,0),(.59,width*1.08,.20,x,0),(.79,.20,.22,x,0),(.92,.16,.20,x*.76,0)],m,b.leg(l),28,folds,.009 if folds else 0)
 band(.89,.34,.23,.065,'navy','Pelvis');buckle((0,-.25,.89),.085,.055,'gold','Pelvis')

def shirt(i):
 m=P[i];full=CAT['shirt'][i].get('overridesLegs',False)
 if LADY:
  if i in [6,10,15,16,17,18,19]:
   bodice(m,.84,1.38)
   if i==16:trousers(m,width=.17);shoes('ink',True)
   else:
    skirt(m,.10 if i in [6,10,17] else .42 if i in [15,18,19] else .18,1 if i in [6,15] else 0)
    if i in [15,18,19]:
     for s,l in [(-1,'R'),(1,'L')]:
      loft([(.11,.10,.11,s*.215,0),(.26,.105,.12,s*.215,0),
            (.40,.12,.13,s*.215,0),(.59,.15,.16,s*.215,0)],'fur',b.leg(l),24)
    shoes('ivory' if i==6 else 'ink')
   if i==6:
    sweep([(-.25,-.24,1.21),(.02,-.23,1.34),(.24,-.14,1.57),(.25,.14,1.46),(-.24,.22,1.17)],[(.10,.028)]*5,'ivory',b.torso,16)
   elif i in [10,15,17,19]:sleeve(-1,.76,m,i==17);sleeve(1,.76,m,i==17);lapels('ivory')
   else:straps('navy' if i==18 else 'silver',.055);pockets(1.19,m)
  elif i in [1,2,3,7,11,13,14]:
   bodice(m,1.02 if i!=14 else 1.10,1.35,True,6 if i in [7,14] else 0)
   if i in [1,2,11,13]:
    # Padded structured cups are integrated into the bodice silhouette.
    for s in [-1,1]:patch([(s*.02,1.23),(s*.12,1.40),(s*.28,1.38),(s*.33,1.28),(s*.25,1.18),(s*.06,1.16)],-.265,m,b.torso,.04,.025,True)
   if i in [2,11,13]:straps('ink',.043);buckle((0,-.29,1.12),.11,.07)
   if i==1:lapels('ivory',True)
   if i==3:
    straps('navy',.065);patch([(-.28,1.46),(0,1.30),(.28,1.46),(.30,1.38),(0,1.20),(-.30,1.38)],-.28,'navy',b.torso,.02,.014)
   if i==7:
    straps(m,.06);ring((0,-.27,1.41),.048,.05,.014,'gold','Chest')
   if i==13:pockets(1.14,'green',.10)
   if i==11:
    band(1.05,.31,.25,.055,'tan','Chest');buckle((-.12,-.28,1.06),.08,.05);buckle((.12,-.28,1.24),.08,.05)
    sweep([(-.23,-.24,1.36),(.12,-.29,1.24),(.23,-.21,1.03)],[(.035,.014)]*3,'tan',b.torso)
   if i==14:patch([(-.17,1.40),(0,1.20),(.17,1.40),(.18,1.34),(0,1.12),(-.18,1.34)],-.27,'navy',b.torso,.02,.01)
  else:
   bodice(m,1.09 if i in [0,5,8,12] else .92,1.49)
   for s in [-1,1]:
    if i!=4:sleeve(s,.55 if i==0 else .97,m,i==12)
   if i==4:straps(m,.07)
   if i in [0,5,8]:lapels('ivory' if i!=5 else 'navy',True)
   if i==0:ell((0,-.25,1.09),(.08,.06,.045),'ivory','Chest');sweep([(0,-.24,1.11),(-.09,-.26,1.02),(-.14,-.25,.94)],[(.055,.022),(.045,.018),(.006,.003)],m,b.torso)
   if i==12:
    for j in range(10):a=j*math.pi/9;ell((.30*math.cos(a),-.22,1.35+.11*math.sin(a)),(.065,.065,.075),'ivory','Chest',16,10)
   if i in [4,9]:pockets(1.18,m)
 else:
  bodice(m,.79,1.50,False,8 if i in [7,14] else 0)
  sleeveless=i in [2,6,7,11,14,18]
  if not sleeveless:
   for s in [-1,1]:sleeve(s,.58 if i in [0,3,4] else 1.02,m,i in [8,12])
  if i in [0,1,2,4,5,8,10,13,15,17,19]:lapels('ivory' if i not in [2,5,13] else 'ink')
  if i in [4,5,13,18]:pockets(1.18,m,.16)
  if i==13:pockets(.98,m,.13);band(.85,.37,.25,.065,'ink','Pelvis');buckle((0,-.28,.85),.12,.08,'silver','Pelvis')
  if i==5:
   for side in [-1,1]:patch([(side*.02,1.27),(side*.31,1.25),(side*.35,.65),(side*.04,.68)],-.27,'white',b.torso,.035,.03)
  if i==14:patch([(-.19,1.50),(0,1.27),(.19,1.50),(.21,1.44),(0,1.18),(-.21,1.44)],-.28,'navy',b.torso,.02,.01)
  if i==10:
   band(.96,.38,.26,.075,'ivory','Pelvis');buckle((0,-.29,.96),.14,.085,'gold','Pelvis')
  if i==3:
   patch([(-.28,1.50),(0,1.25),(.28,1.50),(.30,1.39),(0,1.11),(-.30,1.39)],-.295,'navy',b.torso,.035,.015)
  if i==6:sweep([(-.29,-.25,1.02),(.1,-.28,1.30),(.27,-.15,1.55),(.25,.19,1.39),(-.30,.24,1.05)],[(.13,.03)]*5,'ivory',b.torso,16)
  if i==11:straps('ink',.075);buckle((0,-.28,1.21),.17,.12);buckle((0,-.25,.99),.12,.08)
  if i==12:
   for j in range(12):a=j*math.tau/12;ell((.25*math.cos(a),.18*math.sin(a),1.52),(.07,.065,.09),'ivory','Chest',16,10)
  if full:
   if i in [16,18]:trousers(m,width=.20,folds=5);shoes('ink',True)
   else:skirt(m,.11,1 if i in [6,15] else 0);shoes('ink')
 # Functional closures, pockets, raised fabric panels—not decorative linework.
 if i in [1,4,5,8,9,13,16,19]:
  for z in [1.10,1.21,1.32]:ell((0,-.28,z),(.018,.012,.018),'silver' if i in [8,9,16] else 'gold','Chest',12,8)
 if i in [8,16]:badge((-.20,-.285,1.31),.075,'ivory',0)
 if i==0:
  for j in range(5):badge(((-1 if j%2 else 1)*.20,-.274,1.06+j*.07),.045,'ivory',1)
 if i==19:
  for x in [-.23,.0,.23]:box((x,-.26,.95),(.042,.018,.24),'navy',b.torso,.004)

def legs(i):
 m=P[i];skirtLady=LADY and i in [0,1,3,4,6,8,11,13,14,19]
 if skirtLady:
  skirt(m,.58 if i in [0,4,8,13,14] else .42,1 if i in [0,3,14] else 0)
  # Bare leg columns remain under skirts, with the same skin finish behavior.
  for s,l in [(-1,'R'),(1,'L')]:loft([(.12,.11,.11,s*.215,0),(.38,.12,.13,s*.215,0),(.65,.16,.17,s*.215,0)],'fur',b.leg(l),24)
 else:
  short=i in [0,4,10] or LADY and i in [5,12,18]
  trousers(m,.48 if short else .12,.20 if i in [1,3,7,15,17] else .16,8 if i in [0,6,14,15] else 0)
  if short:
   for s,l in [(-1,'R'),(1,'L')]:loft([(.10,.115,.12,s*.215,0),(.34,.12,.13,s*.215,0),(.53,.145,.16,s*.215,0)],'fur',b.leg(l),24)
 shoes('ivory' if i in [0,3,7,14] else 'ink',i in [2,12,16])
 if i==5:
  for side in [-1,1]:lock([(side*.025,-.25,.89),(side*.06,-.28,.83),(side*.085,-.25,.74)],.015,'ivory','Pelvis')
 if i==8:
  for side,label in [(-1,'R'),(1,'L')]:
   sweep([(side*.36,.00,.78),(side*.38,.00,.52),(side*.35,.0,.22)],[(.035,.19)]*3,'ivory',b.leg(label),12)
 if i==10:
  for side,label in [(-1,'R'),(1,'L')]:box((side*.34,-.13,.65),(.05,.07,.25),'ivory','Thigh.'+label,.012)
 if i in [4,13,18]:
  for s,l in [(-1,'R'),(1,'L')]:
   if i==4 and s>0:continue
   box((s*.34,-.14,.65),(.18,.14,.19),m,'Thigh.'+l,.025);box((s*.34,-.215,.70),(.19,.025,.08),m,'Thigh.'+l,.009)
  if i==13:buckle((0,-.26,.86),.15,.075,'silver','Pelvis')
 if i in [2,9,16]:
  for s,l in [(-1,'R'),(1,'L')]:patch([(s*.215-.115,.40),(s*.215+.115,.40),(s*.215+.09,.54),(s*.215-.09,.54)],-.185,'silver' if i==16 else 'ink','Shin.'+l,.035,.02,True)
 if i in [1,3,11,19]:
  band(.88,.355,.245,.055,'ink','Pelvis');buckle((0,-.27,.88),.10,.06,'gold','Pelvis')
  for s,l in [(-1,'R'),(1,'L')]:ell((s*.22,-.235,.77),(.018,.012,.018),'gold','Thigh.'+l,12,8)
 if i==18:
  for s in [-1,1]:sweep([(s*.18,-.22,.88),(s*.20,-.24,1.18),(s*.22,.13,1.40),(s*.19,.21,.90)],[(.045,.016)]*4,'navy',b.torso)
 if i==19:
  for s,l in [(-1,'R'),(1,'L')]:sweep([(s*.10,-.25,.85),(s*.30,-.25,.61),(s*.38,-.18,.49)],[(.035,.014)]*3,'ink','Thigh.'+l)

# Hats have an open under-surface fitted around the crown, not a floating ball.
def brim(rx,ry,z,m='ink',width=.10,frontOnly=False):
 N=48;angles=[(-math.pi+math.pi*j/N) if frontOnly else j*math.tau/N for j in range(N+1)];v=[]
 for r in [0,1]:
  for a in angles:v.append(((rx+width*r)*math.cos(a),.04+(ry+width*(1.2 if frontOnly else 1)*r)*math.sin(a),z-.035*r*max(0,-math.sin(a))))
 return mesh(v,[(j,j+1,N+2+j,N+1+j) for j in range(N)],m)
def hat(i):
 rx=.48 if LADY else .56;ry=.39 if LADY else .55;z=2.70;h=[.25,.22,.20,.06,.38,.18,.16,.23,.20,.25,.24,.055,.19,.18,.19,.22,.18,.28,.25,.40][i];m=P[i]
 if i in [3,11]:
  band(z+.035,rx+.01,ry+.01,.07,'gold' if i==3 else 'ivory')
  if i==11:brim(rx,ry,z,'ivory',.17,True)
  else:
   for j in range(14):
    a=j*math.tau/14;cx=rx*math.cos(a);cy=.04+ry*math.sin(a);ell((cx,cy,z+.07),(.07,.04,.10),'gold',n=16,k=10)
  return
 rows=[(z,rx,ry,0,.04),(z+.05,rx,ry,0,.04),(z+h*.70,rx*.90,ry*.88,0,.07),(z+h,rx*.68,ry*.68,0,.07)]
 if i in [4,6,13]:rows=[(z,rx*.89,ry*.89,0,.04),(z+h,rx*.73,ry*.76,0,.04)]
 if i==5:rows=[(z,rx,ry,0,.04),(z+.13,rx*.90,ry*.7,0,.04),(z+.21,.12,ry*.60,-.15,.04)]
 if i==16:rows=[(z,rx,ry,0,.04),(z+.12,rx*1.09,ry*1.04,0,.04),(z+.21,.12,.10,0,.04)]
 if i==19:rows=[(z,rx*.87,ry*.86,0,.04),(z+.08,rx*.87,ry*.86,0,.04),(z+.32,rx*1.12,ry*1.08,0,.04),(z+.44,.25,.22,0,.04)]
 loft(rows,m,'Head',40,10 if i in [10,12,17,19] else 0,.015 if i in [10,12,17,19] else 0)
 band(z+.025,rx+.012,ry+.012,.055,'ink' if m!='ink' else 'silver')
 if i in [0,2,5,8,11,12,16]:brim(rx,ry,z,'ink',.14,True)
 elif i in [1,6,14,15]:brim(rx,ry,z,m,.17 if i in [1,14] else .08)
 if i in [7,9,18]:
  for s in [-1,1]:
   patch([(s*rx*.75,z+.05),(s*(rx+.07),z-.08),(s*(rx+.06),z-.34),(s*rx*.72,z-.28),(s*rx*.60,z-.05)],-.03,'ivory' if i==7 else m,thick=.16,bulge=.04,soft=True)
   if i==18:ell((s*rx,-.10,z-.12),(.085,.12,.10),'silver')
 if i in [0,4,12,13]:badge((0,.03-ry-.035,z+.14),.075,'gold',1 if LADY else 0,'Head')
 if i==17:ell((0,.07,z+h+.07),(.105,.105,.10),'ivory')
 if i==4:lock([(.04,.02,z+h),(.18,-.11,z+h-.05),(.20,-.13,z+.11)],.03,'gold')
 if i==8:
  for s in [-1,1]:patch([(s*rx,z),(s*(rx+.14),z-.04),(s*(rx+.19),z+.08),(s*rx,z+.06)],.06,'tan',thick=.03,bulge=.015)

def necklace(m='gold',beads=False,depth=-.23,height=1.37):
 for j in range(23):
  a=j*math.pi/22;x=.29*math.cos(a);z=height-.20*math.sin(a);y=depth-.045*math.sin(a)
  if beads:ell((x,y,z),(.032,.03,.032),m,'Chest',12,8)
  else:ring((x,y,z),.033,.022,.010,m,'Chest',16)
def accessory(i):
 m='rose' if LADY else 'navy'
 if i in [0,1,2,3,4,10,11,15,19]:
  necklace('pearl' if i in [1,11,15] else 'gold' if i in [0,4,19] else 'silver',i in [1,11,15],height=1.47 if i==2 else 1.37)
  if i==1:necklace('pearl',True,-.25,1.26)
  if i==2:
   box((0,-.29,1.20),(.12,.065,.14),'silver','Chest',.025);ring((0,-.28,1.30),.04,.045,.012,'silver','Chest')
  if i==3:badge((0,-.30,1.09),.105,'gold',0)
  if i==4:
   for s in [-1,1]:box((s*.047,-.29,1.08),(.075,.028,.13),'silver','Chest',.025)
  if i==10:
   for s in [-1,1]:ring((s*.19,-.27,1.25),.025,.08,.009,'silver','Chest');box((s*.19,-.29,1.18),(.035,.02,.04),'silver','Chest',.008)
  if i==11:
   for j in range(9):badge(((j-4)*.06,-.29,1.25+.013*abs(j-4)),.024,'silver',2)
  if i==15:
   for s in [-1,1]:
    for j in range(9):ell((s*(.23+.035*j),-.13,1.43-.02*math.sin(j*math.pi/8)),(.024,.024,.025),'pearl','UpperArm.'+('L' if s>0 else 'R'),12,8)
  if i==19:
   for s in [-1,1]:badge((s*.11,-.29,1.12),.08,'gold',1 if LADY else 0)
 elif i in [5,8]:
  straps('ink',.045)
  if i==5:
   box((-.31,-.22,1.35),(.15,.09,.20),'ink','Chest',.018);box((-.31,-.274,1.38),(.10,.015,.055),'cyan','Chest',.004)
   sweep([(-.35,-.20,1.45),(-.38,-.18,1.66)],.012,'ink','Chest')
  else:
   band(1.03,.34,.245,.065,'ink','Chest');buckle((0,-.28,1.25),.14,.10)
 elif i in [6,7,18]:
  for s,l in [(-1,'R'),(1,'L')]:
   if i==6:
    for j in range(7):lock([(s*.20,.10,1.55),(s*(.36+j*.04),-.04,1.42),(s*(.43+j*.05),-.08,1.23-j*.025)],.060,'ivory','UpperArm.'+l)
   elif i==7:
    for j in range(8):ell((s*(.12+j*.05),-.12,1.46-.04*math.sin(j*.4)),(.08,.095,.10),'ivory','Chest' if j<3 else 'UpperArm.'+l,18,10)
   else:
    patch([(s*.15,1.54),(s*.43,1.53),(s*.50,1.33),(s*.36,1.22),(s*.22,1.35)],-.19,'ink',b.arm(l),.16,.035)
    for j in range(3):badge((s*(.26+j*.065),-.23,1.48),.021,'silver',2,'UpperArm.'+l)
 elif i==9:
  box((.40,-.23,.94),(.23,.14,.22),m,'Pelvis',.025);box((.40,-.31,1.00),(.24,.025,.09),'tan','Pelvis',.012);buckle((.40,-.335,.97),.055,.05,'gold','Pelvis')
  sweep([(-.22,.10,1.50),(-.22,-.18,1.48),(.12,-.29,1.16),(.40,-.23,.97)],[(.027,.014)]*4,'tan',b.torso)
 elif i in [12,13]:
  box((0,.33,1.18),(.48,.22,.53),m,'Chest',.04)
  for s in [-1,1]:
   if i==12:
    loft([(.92,.11,.11,s*.23,.40),(1.0,.13,.13,s*.23,.40),(1.40,.13,.13,s*.23,.40),(1.48,.09,.09,s*.23,.40)],'silver','Chest',24)
    box((s*.23,.40,1.49),(.08,.07,.08),'gold','Chest',.01)
   else:
    box((s*.34,.30,1.30),(.20,.23,.44),'ink','Chest',.02)
    for zz in [1.20,1.40]:tube((s*.34,.17,zz),.078,.03,'silver','Chest');tube((s*.34,.145,zz),.053,.012,'ink','Chest')
 elif i==14:
  sweep([(.28,.30,.80),(.36,.32,1.65),(.42,.35,2.38)],.025,'gold','Chest')
  loft([(1.42,.04,.05,.36,.34),(1.65,.14,.13,.38,.34),(2.23,.16,.14,.41,.34),(2.46,.02,.02,.43,.34)],'ivory' if LADY else 'navy','Chest',32,8,.018)
 elif i==16:
  for s,l in [(-1,'R'),(1,'L')]:
   ell((s*.40,.01,1.52),(.19,.20,.12),'silver','UpperArm.'+l)
   for j in range(3):box((s*(.35+j*.06),-.16,1.49),(.045,.055,.065),'red','UpperArm.'+l,.012)
 else:
  # Life ring collar lies around the shoulders, not over the face.
  N=40;path=[(.38*math.cos(j*math.tau/N),.26*math.sin(j*math.tau/N),1.44) for j in range(N+1)];sweep(path,[(.075,.075)]*(N+1),'pink' if LADY else 'red','Chest',12)
  for s in [-1,1]:box((s*.30,-.15,1.46),(.12,.14,.14),'ivory','Chest',.035)

def case(c,size,m='ink'):
 x,y,z=c;w,d,h=size;box(c,size,m,'Root',.025)
 for s in [-1,1]:box((x+s*w*.40,y-d*.52,z),(.026,.025,h*.94),'silver','Root',.004)
 box((x,y-d*.54,z+h*.16),(w*.25,.03,.07),'silver','Root',.012)
 for sx in [-1,1]:
  for sz in [-1,1]:box((x+sx*w*.46,y-d*.50,z+sz*h*.42),(.055,.035,.055),'silver','Root',.006)
def speaker(c,w=.32,h=.66):
 x,y,z=c;box(c,(w,.24,h),'ink','Root',.025)
 for zz,r in [(z-h*.20,w*.36),(z+h*.24,w*.20)]:
  tube((x,y-.135,zz),r,.025,'silver','Root');tube((x,y-.155,zz),r*.77,.02,'ink','Root');ell((x,y-.18,zz),(r*.32,.025,r*.32),'glass','Root',16,10)
def arch(m='gold',top=2.87,width=.93):
 for s in [-1,1]:box((s*width,.37,1.90),(.11,.12,1.80),m,'Root',.035)
 box((0,.37,top),(width*2+.1,.12,.11),m,'Root',.035)
def extra(i):
 m='pink' if LADY else 'navy';random.seed(i+40)
 if i==0:
  ring((0,.48,2.12),.94,.94,.10,'gold','Root',64)
  for k in range(14):a=k*math.tau/14;ell((.94*math.cos(a),.35,2.12+.94*math.sin(a)),(.035,.03,.035),'silver','Root',12,8)
 elif i==1:
  for s in [-1,1]:
   for k in range(3):case((s*(.76+.04*k),.14-.09*k,1.12+.26*k),(.34,.29,.24),m if k%2 else 'ink')
 elif i==2:
  for s in [-1,1]:speaker((s*.81,.16,1.60),.33,.92)
 elif i==3:
  arch('ivory',2.87)
  for j in range(16):box((-.88+j*.117,.29,2.87),(.06,.015,.10),'ink' if j%2 else 'rose','Root',.002)
 elif i==4:
  for s in [-1,1]:
   v=[]
   for k in range(13):
    t=k/12
    for j in range(6):u=j/5;v.append((s*(.72+.36*u),.30+.10*math.sin(t*math.pi*3+u*2),2.81-1.15*t))
   obj=mesh(v,[(k*6+j,k*6+j+1,(k+1)*6+j+1,(k+1)*6+j) for k in range(12) for j in range(5)],'ivory','Root');obj.data.materials.append(M['ink'])
   for p in obj.data.polygons:p.material_index=(p.index//5+p.index%5)%2
 elif i==5:
  for s in [-1,1]:
   x=s*.82;box((x,.24,1.43),(.37,.32,.79),m,'Root',.025);box((x,.055,1.61),(.28,.035,.26),'ink','Root',.015);box((x,.031,1.61),(.22,.013,.18),'cyan','Root',.004)
   patch([(x-.16,1.29),(x+.16,1.29),(x+.16,1.37),(x-.16,1.37)],-.015,'silver','Root',.10,.01)
   for k in range(3):ell((x-.08+k*.08,-.028,1.33),(.02,.02,.02),'red','Root',12,8)
   sweep([(x-.08,-.09,1.34),(x-.08,-.09,1.42)],.012,'silver','Root');ell((x-.08,-.09,1.43),(.03,.03,.03),'ink','Root',16,10)
   patch([(x-.10,1.68),(x+.08,1.66),(x-.03,1.58)],.015,'glass','Root',.015,.005)
 elif i==6:
  arch('ink',2.94,1.02)
  for s in [-1,1]:
   box((s*.89,.30,2.17),(.27,.055,.83),'ivory','Root',.01)
   for j in range(3):badge((s*.89,.26,1.94+j*.22),.08,['rose','cyan','ink'][j],j,'Root')
 elif i==7:
  for s in [-1,1]:
   box((s*.84,.22,1.54),(.31,.25,.72),m,'Root',.06);ring((s*.84,.07,1.78),.14,.18,.035,'gold','Root');patch(oval(s*.84,1.78,.10,.14),.09,'glass','Root',.025,.015)
   for j in range(3):box((s*.84-.065+j*.065,.042,1.77),(.035,.02,.10),['rose','cyan','gold'][j],'Root',.007)
   for k in range(4):box((s*.84,.078,1.35+k*.07),(.23,.025,.022),'silver','Root',.005)
 elif i==8:
  for s in [-1,1]:
   speaker((s*.88,.40,1.34),.33,.48);speaker((s*.85,.37,1.88),.32,.46);box((s*.85,.37,2.19),(.35,.24,.10),'silver','Root',.01)
 elif i==9:
  for s in [-1,1]:
   for k in range(5):
    x=s*(.66+.09*k);z=1.22+k*.15;lock([(s*.60,.32,1.15),(x,.43,z+.34),(x+s*.05,.40,z+.54)],.095,'pearl','Root')
   ell((s*.75,-.02,1.10),(.12,.11,.12),'pearl','Root')
 elif i==10:
  for s in [-1,1]:
   for k in range(3):
    x=s*(.74+.045*k);z=1.35+k*.28
    loft([(z-.12,.025,.025,x,.13),(z,.025,.025,x,.13),(z+.02,.13,.11,x,.13),(z+.12,.115,.10,x,.13)],'glass','Root',24)
    ell((x,.13,z-.14),(.085,.07,.025),'gold','Root')
 elif i==11:
  for s in [-1,1]:
   for k in range(3):
    x=s*(.76+.09*k);z=1.48+k*.46;patch([(x-.11,z),(x,z+.30),(x+.11,z),(x,z-.30)],.20+k*.08,'silver','Root',.08,.06)
 elif i==12:
  for s in [-1,1]:
   x=s*.88;box((x,-.18,1.91),(.22,.16,.57),'ink','Root',.04)
   for k,col in enumerate(['red','gold','green']):
    tube((x,-.28,2.09-k*.18),.075,.035,col,'Root')
    patch([(x-.09,2.16-k*.18),(x+.09,2.16-k*.18),(x+.10,2.10-k*.18),(x-.10,2.10-k*.18)],-.30,'ink','Root',.08,.025)
   sweep([(x,-.18,2.25),(x,.10,2.84),(s*.5,.35,2.9)],.025,'silver','Root')
 elif i in [13,14,18]:
  count=22 if i==13 else 12
  if i==18:
   ring((0,.26,2.03),.99,.96,.043,'silver','Root',64);ring((0,.27,2.03),.80,.78,.028,'ink','Root',64)
  for k in range(count):
   a=k*math.tau/count;x=.87*math.cos(a);z=2.03+.86*math.sin(a);y=.10+.20*math.sin(a*2)
   if i==13:
    o=box((x,y,z),(.13,.012,.075),'ivory','Root',.008)
    # Angled folded tickets occupy different depths around an open center.
    center=Vector((x,y,z))
    for v in o.data.vertices:v.co.y+=.035*abs((v.co.x-x)/.065);v.co.z+=.035*math.sin(k*.8)*(v.co.x-x)/.065
   elif i==14:patch([(x-.10,z),(x,z+.13),(x+.10,z),(x,z-.13)],y,['rose','cyan','gold'][k%3],'Root',.05,.025)
   else:
    poly=[(x-.13,z-.05),(x+.03,z+.18),(x+.14,z+.06),(x-.02,z-.12)];patch(poly,y,'silver' if k%2 else 'ink','Root',.055,.02)
 elif i==15:
  for s in [-1,1]:
   pts=[(s*.68,2.82),(s*1.12,2.73),(s*.95,2.45),(s*1.05,2.21),(s*.85,2.10),(s*.99,1.75),(s*.78,1.38)]
   patch(pts,.43,'pink' if LADY else 'ivory','Root',.025,.08)
 elif i==16:
  for s in [-1,1]:
   for x in [.73,1.01]:box((s*x,.36,1.88),(.045,.06,1.55),'silver','Root',.018)
   for k in range(7):box((s*.87,.36,1.22+k*.22),(.29,.055,.045),'gold','Root',.012)
 elif i==17:
  for s in [-1,1]:
   x=s*.85;loft([(1.03,.20,.18,x,.18),(1.13,.20,.18,x,.18),(1.18,.14,.13,x,.18),(1.66,.12,.11,x,.18),(1.72,.19,.17,x,.18),(1.83,.19,.17,x,.18)],'pearl' if LADY else 'ink','Root',24)
   for j in range(5):a=j*math.tau/5;box((x+.15*math.cos(a),.18+.13*math.sin(a),1.88),(.10,.10,.13),'gold','Root',.01)
 else:
  arch('silver',2.90,.91)
  for s in [-1,1]:
   box((s*.91,.29,1.80),(.27,.16,.37),m,'Root',.04);tube((s*.91,.19,1.85),.043,.02,'ink','Root');box((s*.91,.17,1.79),(.025,.02,.08),'ink','Root',.002)

GENERATORS={'head':hair,'eyes':eyes,'brows':brows,'mouth':mouth,'nose':nose,'ears':ears,'tattoo':tattoo,'shirt':shirt,'legs':legs,'hat':hat,'accessory':accessory,'extra':extra}
for cat,rows in CAT.items():
 print('BUILD',SPECIES,cat,flush=True)
 for i,row in enumerate(rows):begin(cat,row);GENERATORS[cat](i);o=join();o['design']=row['label'];o['source']=row['source']
 print('COMPLETE',cat,len(pieces),flush=True)
# Each pack owns only new geometry and a rest rig; clips live in the base GLB.
assert len(pieces)==240
for o in pieces:
 assert all(math.isfinite(c) for v in o.data.vertices for c in v.co)
 assert all(v.groups and abs(sum(g.weight for g in v.groups)-1)<1e-5 for v in o.data.vertices),o.name
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
out=ROOT/'assets/models'/('drilady' if LADY else 'drifmaker');out.mkdir(exist_ok=True)
b.rig.data.pose_position='POSE';b.rig.animation_data_clear()
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/(SPECIES+'-collection-wave.blend')),check_existing=False)
bpy.ops.object.select_all(action='DESELECT');b.rig.select_set(True)
for o in pieces:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=b.rig
bpy.ops.export_scene.gltf(filepath=str(out/(SPECIES+'-collection-wave.glb')),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_def_bones=False,export_yup=True,export_apply=False,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_extras=True)
report={'species':SPECIES,'parts':len(pieces),'vertices':sum(len(o.data.vertices) for o in pieces),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in pieces),'categories':{k:len(v) for k,v in CAT.items()},'bytes':(out/(SPECIES+'-collection-wave.glb')).stat().st_size}
(out/(SPECIES+'-collection-wave-report.json')).write_text(json.dumps(report,indent=2)+'\n');print('REPORT',json.dumps(report),flush=True)
