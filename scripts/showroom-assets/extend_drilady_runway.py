"""Second 144-piece Drilady collection: bunny heads/ears and fitted runway clothes.
Preserves the independent base sculpt, first collection and shared action library.
"""
import runpy,math,bpy
from pathlib import Path
from mathutils import Vector
lib=runpy.run_path(str(Path(__file__).with_name('extend_drilady_collection.py')))
for key,value in lib.items():
 if not key.startswith('__'):globals()[key]=value
base_eyes=eyes;base_mouth=mouth;base_nose=nose;base_ears=ears
M['peach']=mat('Peach satin',(.9,.31,.25),.35)
M['wine']=mat('Wine velvet',(.15,.008,.034),.82)
M['lilac']=mat('Lilac satin',(.44,.23,.64),.32)
M['platinum']=mat('Platinum hair',(.8,.77,.64),.6)
M['patent']=mat('Black patent',(.008,.01,.019),.19)

def heart(c,r,material='pink',bone='Head',depth=.025):
 x,y,z=c;return patch([(x,z-r),(x-r,z),(x-r*.80,z+r*.68),(x-r*.28,z+r*.78),(x,z+r*.40),(x+r*.28,z+r*.78),(x+r*.80,z+r*.68),(x+r,z)],y,depth,material,bone,r*.35)

def gem(c,r=.04,material='blue',bone='Head'):
 x,y,z=c;v=[(x,y-r*.5,z)]+[(x+r*math.cos(a),y,z+r*math.sin(a)) for a in [j*math.tau/8 for j in range(8)]]+[(x,y+r*.35,z)]
 return mesh(v,[(0,1+j,1+(j+1)%8) for j in range(8)]+[(9,1+(j+1)%8,1+j) for j in range(8)],material,bone,False)

def densify(rows,steps=5):
 out=[]
 for k in range(len(rows)-1):
  q=[Vector(rows[max(0,min(len(rows)-1,j))]) for j in [k-1,k,k+1,k+2]]
  for j in range(steps):
   t=j/steps;r=.5*(2*q[1]+(-q[0]+q[2])*t+(2*q[0]-5*q[1]+4*q[2]-q[3])*t*t+(-q[0]+3*q[1]-3*q[2]+q[3])*t*t*t);out.append((r[0],max(.002,r[1]),max(.002,r[2]),r[3],r[4]))
 return out+[rows[-1]]

def fringe(color='brown',side=1,height=2.68):
 for j in range(4):
  pathcurve([(side*(.23-j*.035),-.18,2.80-j*.02),(-side*.04,-.34,2.76-j*.035),(-side*(.31+j*.035),-.30,height-j*.025)],[(.08,.047),(.11,.052),(.003,.003)],color,seg=16)

def newheads(i):
 color=['platinum','pink','brown','blue','plum','blonde','ink','blonde','brown','platinum','pink','brown'][i];scalp(color)
 if i==0:
  fringe(color,1,2.58)
  for s in [-1,1]:
   for j in range(4):pathcurve([(s*.39,.04+j*.07,2.67),(s*.50,.10+j*.08,2.34),(s*.47,.13+j*.07,2.04),(s*.36,.17+j*.05,1.90)],[(.08,.05),(.10,.06),(.09,.06),(.003,.003)],color)
 elif i in [1,9]:
  for j in range(19):
   a=-.13+j*(math.pi+.26)/18;x=.50*math.cos(a);y=.05+.38*math.sin(a)
   pathcurve([(x*.82,y*.8,2.67),(x,y,2.36),(x,y,2.10),(x*.83,y*.85,2.04)],[(.08,.06),(.11,.075),(.10,.065),(.04,.035)],color)
  if i==1:
   for s in [-1,1]:pathcurve([(0,-.30,2.80),(s*.17,-.37,2.72),(s*.33,-.32,2.57),(s*.44,-.21,2.48)],[(.075,.035),(.12,.05),(.08,.04),(.003,.003)],color)
  else:
   for j in range(9):x=(j-4)*.087;pathcurve([(x,-.27,2.75),(x,-.35,2.65),(x,-.36,2.57)],[(.055,.04)]*3,color)
 elif i==2:
  fringe(color)
  for s in [-1,1]:
   ell((s*.39,.18,2.86),(.20,.18,.19),color)
   for j in range(3):ring((s*.39,.015-j*.005,2.86),.15-j*.034,.15-j*.034,.024,color)
   bow((s*.48,-.02,2.74),.09,'peach')
 elif i in [3,10]:
  fringe(color,-1)
  for s in [-1,1]:
   if i==3:
    for j in range(3):pathcurve([(s*.36,.27,2.68),(s*.55,.36+j*.06,2.53),(s*.60,.40+j*.07,2.17),(s*.62,.37+j*.06,1.78),(s*.52,.29+j*.05,1.39)],[(.08,.06),(.12,.075),(.12,.075),(.10,.06),(.005,.004)],color,seg=16)
   else:
    for j in range(4):
     pts=[]
     for k in range(45):
      t=k/44;a=t*math.tau*2.4+j*.75;pts.append((s*(.49+.07*math.cos(a)),.28+j*.035+.07*math.sin(a),2.63-t*.93))
     sw(pts,[(.045,.04)]*44+[(.003,.003)],color,seg=12)
   bow((s*.43,.14,2.66),.13,'pale' if i==3 else 'plum')
 elif i in [4,11]:
  fringe(color)
  if i==4:
   for j in range(4):pathcurve([(.08,.33,2.74),(.24,.49+j*.035,2.68),(.31,.54+j*.04,2.29),(.30,.49+j*.05,1.91),(.18,.38+j*.06,1.65)],[(.09,.05),(.13,.07),(.13,.07),(.09,.05),(.003,.003)],color)
   bow((.08,.34,2.78),.23,'peach')
  else:
   ell((.10,.41,2.17),(.28,.18,.24),color)
   for j in range(5):pathcurve([(-.26,.28,2.46),(-.13,.49,2.30),(.16,.54,2.11+j*.05),(.34,.37,2.17+j*.06)],[(.055,.035),(.065,.045),(.07,.045),(.006,.005)],color)
   for s in [-1,1]:pathcurve([(s*.37,-.12,2.62),(s*.48,-.02,2.43),(s*.45,-.03,2.20)],[(.06,.04),(.055,.032),(.003,.003)],color)
 elif i==5:
  fringe(color,-1)
  for s in [-1,1]:
   for j in range(4):pathcurve([(s*.28,.08+j*.07,2.75),(s*.50,.04+j*.08,2.53),(s*.45,.10+j*.08,2.34),(s*.57,.12+j*.08,2.12),(s*.44,.20+j*.08,1.91)],[(.08,.055),(.12,.075),(.11,.065),(.10,.06),(.003,.003)],color)
 elif i==6:
  fringe(color,-1,2.48)
  for j in range(12):
   a=j*math.pi/11;pathcurve([(.42*math.cos(a),.09+.28*math.sin(a),2.70),(.51*math.cos(a),.1+.35*math.sin(a),2.43),(.40*math.cos(a),.08+.30*math.sin(a),2.29)],[(.065,.05),(.09,.055),(.006,.004)],color)
 elif i==7:
  fringe(color)
  for strand in range(3):
   pts=[]
   for k in range(70):
    a=k/69*math.tau;w=k/69*math.tau*11+strand*math.tau/3;r=.40+.027*math.cos(w);pts.append((r*math.cos(a),.06+(.29+.028*math.cos(w))*math.sin(a),2.75+.03*math.sin(w)))
   sw(pts,[(.035,.035)]*70,color,seg=10)
  bow((-.34,.22,2.75),.13,'plum')
 elif i==8:
  for s in [-1,1]:
   for j in range(5):pathcurve([(s*.43,.1+j*.04,2.50),(s*.32,-.18+j*.04,2.74),(s*.19,-.22+j*.035,2.86),(s*.10,-.16+j*.035,2.74),(s*.25,-.08+j*.035,2.68)],[(.07,.05)]*4+[(.025,.02)],color)
  for s in [-1,1]:pathcurve([(s*.45,.16,2.56),(s*.50,.23,2.27),(s*.35,.34,2.16)],[(.10,.06),(.12,.07),(.01,.01)],color)

def neweyes(i):
 makeup=['brown','purple','pink','ink','gray','orange','blue','green','plum','brown','gold','pink'][i]
 iris=['brown','purple','pink','green','silver','gold','blue','green','red','brown','gold','blue'][i]
 for s in [-1,1]:
  mir=lambda ps:[(s*x,z) for x,z in ps];wink=i==11 and s<0
  high=2.38 if i in [0,1,2,8,9] else 2.27
  outline=[(.065,2.13),(.15,high-.04),(.29,high),(.445,2.31),(.40,2.15),(.28,2.08),(.15,2.09)]
  eyepatch(mir(outline),makeup if wink else 'white',.026,.01)
  eyepatch(mir([(.065,2.14),(.11,2.42),(.24,2.55),(.35,2.46),(.45,2.31),(.29,high),(.15,high-.04)]),makeup,.04,.024)
  if not wink:
   disc(s*.26,2.205,.083 if i in [0,9] else .065,.102,iris,.055)
   if i==2:heart((s*.26,eyey(s*.26,2.21)-.075,2.21),.045,'ink',depth=.006)
   elif i==1:star((s*.26,eyey(s*.26,2.21)-.075,2.21),.047,'ink')
   else:disc(s*.26,2.21,.021 if i==3 else .033,.060,'ink',.061)
   for dx,dz,r in [(-.024,.045,.018),(.026,-.036,.009)]:disc(s*(.26+dx),2.21+dz,r,r*1.1,'white',.081)
  eyepatch(mir([(.064,2.13),(.15,high-.04),(.29,high),(.45,2.31),(.49,2.37 if i!=3 else 2.40),(.46,2.28),(.29,high-.025),(.15,high-.065)]),'white' if i==6 else 'ink',.079,.002)
  for j in range(4 if i in [0,1,8] else 3):
   x=s*(.35+j*.033);z=2.30+j*.012;pathcurve([(x,eyey(x,z)-.073,z),(x+s*.035,eyey(x,z)-.085,z+.032),(x+s*.055,eyey(x,z)-.08,z+.067)],[(.013,.006),(.008,.004),(.0005,.0005)],'white' if i==6 else 'ink',seg=8,steps=3)
  if i in [1,6,10]:
   for j in range(4):x=s*(.15+j*.06);z=2.45+.02*math.sin(j);gem((x,eyey(x,z)-.065,z),.012,'silver' if i!=10 else 'gold')


def newbrows(i):
 colors=['brown','ink','brown','blonde','pink','purple','ink','bronze','brown','platinum','brown','plum']
 for s in [-1,1]:
  pts=[]
  for j in range(20):
   t=j/19;x=.09+.31*t;z=2.545+(.075 if i==0 else .028 if i==1 else .055)*math.sin(t*math.pi)+(.035*t if i in [6,8,11] else 0)
   width=(.016 if i in [2,9] else .035 if i in [1,6] else .025)*math.sin((t*.9+.05)*math.pi)
   pts.append((s*x,z,width))
  outline=[(x,z+w) for x,z,w in pts]+[(x,z) for x,z,w in reversed(pts)]
  eyepatch(outline,colors[i],.10,.004)
  if i in [3,7]:
   for j in range(4):x=s*(.14+j*.055);eyepatch([(x,2.58),(x+s*.04,2.63),(x+s*.05,2.58)],colors[i],.10,.003)
  if i==4:heart((s*.38,eyey(s*.38,2.57)-.105,2.57),.022,'pink')
  if i==5:gem((s*.37,eyey(s*.37,2.57)-.11,2.57),.03,'purple')
  if i==10:
   for x in [.23,.28]:ring((s*x,eyey(s*x,2.60)-.11,2.60),.01,.027,.006,'gold',seg=20)
  if i==11:eyepatch([(s*.31,2.59),(s*.44,2.62),(s*.38,2.56)],'plum',.105,.003)

def newmouth(i):
 z=1.91;color=['peach','plum','red','pink','pink','gold','peach','pale','wine','white','pink','red'][i]
 if i==7:heart((0,-.60,z),.15,'pale',depth=.13);ell((-.045,-.655,z+.03),(.02,.009,.027),'white');return
 width=[.13,.12,.075,.10,.15,.15,.13,.15,.12,.16,.14,.07][i];shift=.025 if i in [3,10] else 0
 shape=[(-width+shift,z),(-width*.5+shift,z+.033),(shift,z+.016),(width*.5+shift,z+.033),(width+shift,z),(width*.4+shift,z-.040),(-width*.4+shift,z-.040)]
 facepatch(shape,color,.018,.028)
 if i==11:
  ell((0,surface(0,z)-.055,z),(.025,.006,.034),'ink');return
 facepatch([(-width*.78+shift,z),(shift,z-.002),(width*.78+shift,z+.004),(width*.42+shift,z-.026),(-width*.42+shift,z-.026)],'ink',.048,.003)
 if i in [1,4,5,6,9]:
  count=2 if i==6 else 7
  for j in range(count):
   x=shift+(j-(count-1)/2)*(.044 if count==2 else .028);box((x,surface(x,z)-.061,z-.007),(.039 if count==2 else .024,.016,.035 if count==2 else .022),'gold' if i==5 else 'white',bevel=.004)
  if i==4:
   for x in [-.092,.092]:patch([(x-.015,z),(x+.015,z),(x,z-.045)],surface(x,z)-.065,.016,'white',rounded=False)
 if i==8:ring((.07,surface(.07,z)-.075,z-.028),.018,.026,.005,'silver',seg=24)
 if i in [0,2,3,10]:facepatch([(-.06+shift,z+.013),(-.02+shift,z+.020),(.015+shift,z+.012),(-.015+shift,z+.010)],'pale',.050,.001)

def newnose(i):
 z=2.043;y=surface(0,z)-.03
 if i==0:facepatch([(-.05,z+.02),(.05,z+.02),(0,z-.037)],'peach',.025,.026)
 elif i==1:ell((0,y,z),(.035,.033,.045),'cream');gem((0,y-.03,z+.01),.015,'silver')
 elif i==2:facepatch([(-.048,z+.018),(.048,z+.018),(0,z-.030)],'ear',.022,.02);gem((.031,y-.022,z+.018),.020,'pink')
 elif i==3:ell((0,y,z),(.046,.038,.028),'peach');ell((0,y-.026,z+.016),(.027,.015,.018),'pale')
 elif i==4:facepatch([(-.037,z+.018),(0,z+.11),(.037,z+.018),(0,z-.025)],'ear',.025,.03)
 elif i==5:
  for x,zz in [(-.025,z+.012),(.025,z+.012),(0,z-.018)]:ell((x,y,zz),(.026,.025,.024),'pink')
 elif i==6:
  base_nose(0)
  for s in [-1,1]:ring((s*.018,y-.018,z-.026),.018,.023,.005,'gold',seg=24)
 elif i==7:gem((0,y,z),.046,'silver')
 elif i==8:ell((0,y,z),(.04,.03,.030),'plum');gem((-.012,y-.028,z+.008),.016,'cream')
 elif i==9:
  for s in [-1,1]:ell((s*.027,y,z),(.028,.023,.023),'peach')
  ell((0,y-.013,z),(.016,.024,.025),'pink')
 elif i==10:heart((0,y,z+.006),.048,'ear');ring((.034,y-.015,z-.01),.014,.022,.005,'silver',seg=24)
 else:gem((0,y,z),.047,'pink')

def newears(i):
 for s in [-1,1]:
  up=i in [0,2,5,7,11] or (i==6 and s>0)
  if up:
   top=3.09 if i!=2 else 3.01;tip=.47 if i==2 else .55
   rows=[(2.62+(top-2.62)*t,.002+(.145 if i==0 else .115)*math.sin(math.pi*t)**.65+.06*(1-t)**8,.003+.066*math.sin(math.pi*t)**.65,s*(.33+(tip-.33)*t),.11+.04*t) for t in [j/10 for j in range(11)]]
  else:
   end=1.46 if i==1 else 1.66 if i==4 else 1.53
   rows=[(2.72,.08,.065,s*.33,.12),(2.65,.13,.075,s*.49,.18),(2.39,.17 if i==1 else .14,.075,s*.65,.22),(2.08,.18 if i==1 else .14,.07,s*.76,.24),(end+.10,.13,.065,s*.77,.21),(end,.045 if i==4 else .005,.02,s*.72,.16)]
   if i==3:rows[-2:]=[(1.91,.13,.06,s*.84,.16),(1.95,.004,.01,s*.97,.10)]
   if i==6:rows[-2:]=[(1.94,.13,.07,s*.77,.04),(2.10,.004,.012,s*.69,-.09)]
  rows=densify(rows);loft(rows,'fur',seg=32)
  v=[];cols=14
  for z,w,d,x,y in rows:
   for j in range(cols+1):
    a=-1+j*2/cols;v.append((x+a*w*.69,y-d*math.sqrt(max(.01,1-(a*.69)**2))-.004,z))
  mesh(v,[(r*15+j,r*15+j+1,(r+1)*15+j+1,(r+1)*15+j) for r in range(len(rows)-1) for j in range(14)],'wine' if i==1 else 'ear')
  if i==5:heart((s*.45,.035,2.88),.06,'pink')
  if i==7:
   for j in range(8):
    a=j*math.pi/7;x=s*(.41+.10*math.cos(a));z=2.82+.19*math.sin(a);ell((x,.065,z),(.035,.025,.046),'cream',seg=14,rings=8)
  if i==8:
   for j in range(3):gem((s*(.78-j*.013),.12,1.71+j*.12),.035,'silver');ring((s*(.78-j*.013),.14,1.72+j*.12),.025,.028,.007,'gold',seg=20)
  if i==9:
   for j in range(4):
    z=1.72+j*.18;x=s*(.77-j*.022);loft([(z-.016,.135,.079,x,.21),(z+.018,.135,.079,x,.21)],'plum',seg=32)
   bow((s*.72,.08,1.65),.11,'plum')
  if i==10:star((s*.77,.12,1.79),.065,'gold');ring((s*.77,.13,1.78),.05,.065,.008,'gold')
  if i==11:
   # A real shell at the tip, fitted to the same ear contour.
   tiprows=[(z,w+.003,d+.003,x,y) for z,w,d,x,y in rows if z>2.96];loft(tiprows,'cream',seg=32)

def newtattoo(i):
 def ink(pts,color='plum'):facepatch(pts,color,.004,0)
 for s in [-1,1]:
  x=s*.36;z=2.025
  if i==0:
   if s<0:continue
   for sign in [-1,1]:ink([(x,z),(x+sign*.05,z+.035),(x+sign*.06,z+.005),(x+sign*.025,z-.022)],'purple')
  elif i==1:
   ink([(x-.02,z-.013),(x,z+.012),(x+.02,z-.013),(x,z-.026)],'brown')
   for dx in [-.026,0,.026]:ink([(x+dx-.006,z+.023),(x+dx,z+.033),(x+dx+.006,z+.023)],'brown')
  elif i==2:ink([(x,z-.026),(x-.032,z+.008),(x-.02,z+.025),(x,z+.01),(x+.02,z+.025),(x+.032,z+.008)],'pink')
  elif i==3:
   for j in range(3):xx=x+j*s*.04;ink([(xx-.01,z),(xx,z+.02),(xx+.01,z),(xx,z-.015)],'gold')
   if s==1:
    pts=[(.01+.035*math.cos(a),2.43+.035*math.sin(a)) for a in [j*math.pi/12 for j in range(18)]]+[(.024+.026*math.cos(a),2.43+.026*math.sin(a)) for a in [j*math.pi/12 for j in reversed(range(18))]];ink(pts,'gold')
  elif i==4:
   for j in range(3):xx=x+j*s*.02;zz=z-j*.025;ink([(xx-.009,zz),(xx,zz+.022),(xx+.009,zz),(xx,zz-.008)],'silver')
  elif i==5:
   for j in range(5):a=j*math.tau/5;xx=x+.025*math.cos(a);zz=z+.025*math.sin(a);ink([(xx-.013,zz),(xx,zz+.017),(xx+.013,zz),(xx,zz-.012)],'pink')
  elif i==6:ink([(x-.025,z),(x,z+.04),(x+.025,z),(x,z-.04)],'blue')
  elif i==7:
   for j in range(7):xx=s*(.09+j*.035);zz=2.045+.016*((j*3)%3);ink([(xx-.006,zz),(xx,zz+.008),(xx+.006,zz),(xx,zz-.006)],'bronze')
  elif i==8:
   if s>0:continue
   ink([(x,z+.033),(x-.027,z),(x-.017,z-.018),(x,z-.008),(x+.017,z-.018),(x+.027,z)],'ink');ink([(x-.009,z-.008),(x+.009,z-.008),(x+.015,z-.032),(x-.015,z-.032)],'ink')
  elif i==9:
   for j in range(4):xx=x+s*j*.027;ink([(xx,z+.018),(xx+s*.02,z+.035),(xx+s*.026,z+.01),(xx+s*.012,z)],'ink')
  elif i==10:ink([(x-.026,z-.025),(x-.03,z+.018),(x-.004,z+.048),(x+.005,z+.008),(x+.028,z+.035),(x+.035,z-.02),(x,z-.035)],'red')
  else:
   for j in range(8):
    xx=s*(.28+j*.023);zz=z+(j%2)*.017;ink([(xx,zz),(xx+s*.017,zz),(xx+s*.017,zz+.014),(xx,zz+.014)],'ink')

def fittedtop(color='plum',bottom=1.02,top=1.41,sweet=False):
 rows=[(bottom,.27 if bottom>1 else .31,.195,0,0),(max(bottom+.035,1.10),.278,.202,0,0),(1.24,.335,.252,0,-.005),(1.34,.35,.26,0,-.005),(top,.33,.235,0,0)]
 o=loft(rows,color,b.torso,seg=64)
 if sweet:
  for v in o.data.vertices:
   if abs(v.co.z-top)<.001 and v.co.y<0:v.co.z+=.035*math.sin(min(1,abs(v.co.x)/.33)*math.pi)-.033*max(0,1-abs(v.co.x)/.09)
 return o

def straps(color='plum',halter=False):
 for s in [-1,1]:
  path=[(s*.22,-.235,1.39),(s*(.095 if halter else .22),-.105,1.59),(s*(.09 if halter else .22),.10,1.57),(s*.24,.19,1.38)]
  pathcurve(path,[(.025,.016)]*4,color,'Chest',seg=10)

def barelegs(stock='fur',boot=.18):
 for s,l in [(-1,'R'),(1,'L')]:
  x=s*.215;loft([(.16,.12,.14,x,0),(.34,.12,.135,x,0),(.54,.155,.16,x,0),(.72,.175,.175,x,0),(.81,.13,.14,x,0)],stock,b.leg(l),seg=36)
 if boot>.19:bootlegs('patent',boot)
 shoes(2,'patent')

def dressskirt(color='plum',low=.36,wide=.44,slit=False):
 rows=[(low,wide,.29,0,0),(low+.06,wide,.30,0,0),(.70,.39,.27,0,0),(.94,.35,.245,0,0)]
 o=loft(rows,color,skirtweights,folds=9,depth=.012,seg=72)
 if slit:
  # Remove one front-side panel; real opening with a turned hem.
  import bmesh
  bm=bmesh.new();bm.from_mesh(o.data)
  cut=[f for f in bm.faces if f.calc_center_median().y<-.08 and f.calc_center_median().x>.10 and f.calc_center_median().z<.64]
  bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(o.data);bm.free()
 return o

def newtops(i):
 colors=['wine','peach','patent','lilac','patent','pink','plum','gold','patent','navy','cream','wine'];color=colors[i]
 if i==0:
  fittedtop(color,.98,1.42,True)
  for s in [-1,1]:
   patch([(s*.025,1.35),(s*.15,1.42),(s*.29,1.34),(s*.24,1.08),(s*.07,1.00)],-.245,.018,'wine','Chest',.017)
  for z in [1.08,1.16,1.24,1.32]:ell((0,-.285,z),(.014,.012,.014),'gold','Chest',12,8)
 elif i==1:
  fittedtop(color,1.08,1.39,True);sleeves(color,.60,True)
  for s in [-1,1]:pathcurve([(s*.07,-.25,1.40),(s*.28,-.23,1.40),(s*.43,-.12,1.42),(s*.51,.03,1.45)],[(.045,.028),(.05,.035),(.06,.04),(.045,.03)],'pale',b.arm('L' if s>0 else 'R'))
 elif i==2:
  fittedtop(color,1.02,1.42,True);straps(color,True)
  gem((0,-.285,1.40),.05,'silver','Chest')
  for s in [-1,1]:patch([(s*.02,1.38),(s*.16,1.40),(s*.31,1.31),(s*.22,1.20),(s*.05,1.23)],-.26,.025,'ink','Chest',.027)
 elif i==3:
  fittedtop(color,1.13,1.40,True);straps(color)
  for s in [-1,1]:
   for j in range(5):gem((s*.052,-.279,1.18+j*.04),.008,'silver','Chest')
  for j in range(4):
   z=1.18+j*.04;sw([(-.05,-.286,z),(.05,-.286,z+.04)],[(.005,.004)]*2,'cream','Chest',8);sw([(.05,-.286,z),(-.05,-.286,z+.04)],[(.005,.004)]*2,'cream','Chest',8)
 elif i==4:
  fittedtop(color,.84,1.40,True);barelegs('fur',.55)
  pathcurve([(-.24,-.23,1.37),(-.24,-.11,1.60),(-.20,.12,1.56),(-.24,.18,1.37)],[(.085,.025)]*4,'patent','Chest')
  loft([(.65,.07,.13,0,0),(.72,.16,.17,0,0),(.84,.29,.21,0,0),(.90,.32,.22,0,0)],'patent','Pelvis',seg=48)
  gem((-.23,-.19,1.54),.05,'silver','Chest')
 elif i==5:
  fittedtop(color,.86,1.40,True);straps('pink');dressskirt(color,.46,.40);barelegs('fur')
  for s in [-1,1]:pathcurve([(s*.05,-.24,1.36),(s*.17,-.27,1.30),(s*.30,-.20,1.25)],[(.04,.02)]*3,'pale','Chest')
  bow((-.25,-.20,.94),.12,'pink','Pelvis')
 elif i==6:
  fittedtop(color,.86,1.39,True);straps('plum');dressskirt(color,.29,.40,True);barelegs('fur')
  for j in range(11):x=(j-5)*.052;ell((x,-.235,1.40+.028*math.sin(abs(x)*8)),(.028,.012,.018),'cream','Chest',14,8)
  flower((-.22,-.23,1.36),.055,'pink','Chest')
 elif i==7:
  fittedtop('ink',1.08,1.40,True);straps('gold',True)
  for row in range(3):chain([(.27*math.cos(a),-.275,1.40-(.10+row*.05)*math.sin(a)) for a in [j*math.pi/15 for j in range(16)]],.023,.030,.007,'gold','Chest')
  heart((0,-.30,1.15),.04,'gold','Chest')
 elif i==8:
  fittedtop('wine',1.04,1.40,True);straps('wine');sleeves('patent',.78)
  for s in [-1,1]:
   patch([(s*.10,1.55),(s*.30,1.52),(s*.35,1.34),(s*.28,1.06),(s*.13,1.08),(s*.23,1.31)],-.21,.09,'patent','Chest',.025)
   patch([(s*.12,1.55),(s*.26,1.50),(s*.19,1.30),(s*.07,1.37)],-.29,.025,'gray','Chest',.012)
   gem((s*.18,-.32,1.46),.018,'silver','Chest')
 elif i==9:
  fittedtop(color,1.12,1.40,True);straps(color,True);dressskirt(color,.31,.42,True);barelegs('fur',.30)
  # Wide side panels leave a deliberate midriff cutout at the front.
  for s in [-1,1]:loft([(.87,.075,.18,s*.24,0),(1.16,.08,.21,s*.25,0)],'navy',b.torso,seg=24)
  ring((0,-.225,1.00),.052,.069,.012,'silver','Pelvis')
 elif i==10:
  fittedtop('cream',1.08,1.38)
  for s in [-1,1]:
   for j in range(4):patch([(s*(.04+j*.065),1.36),(s*(.07+j*.065),1.36),(s*(.065+j*.055),1.10),(s*(.04+j*.055),1.10)],-.25,.012,'white','Chest',.01)
  bow((.24,-.21,1.29),.09,'cream','Chest')
 else:
  fittedtop('wine',.86,1.40,True);straps('wine');pants('wine',.16,short=True);barelegs('fur',.36)
  # The shorts remain outside the exposed leg shells.
  for s,l in [(-1,'R'),(1,'L')]:loft([(.55,.19,.21,s*.215,0),(.66,.19,.21,s*.215,0),(.76,.14,.16,s*.215,0)],'wine',b.leg(l),seg=32)
  bow((0,-.23,.93),.10,'peach','Pelvis')

def newlegs(i):
 if i in [2,3,8]:
  barelegs('fur' if i!=8 else 'ink',.47 if i==2 else .19)
  dressskirt('wine' if i==2 else 'navy' if i==3 else 'pink',.45 if i!=3 else .20,.38 if i==2 else .43,slit=i==3)
  if i==8:
   for z,r in [(.47,.45),(.57,.42),(.67,.39)]:loft([(z,r,.29,0,0),(z+.04,r+.018,.30,0,0),(z+.13,r-.04,.27,0,0)],'pale',skirtweights,folds=14,depth=.018,seg=70)
 elif i in [1,4]:
  barelegs('fur',.68 if i==1 else .56);pants('patent' if i==1 else 'wine',.15,short=True)
  for s,l in [(-1,'R'),(1,'L')]:
   if i==1:
    loft([(.62,.18,.18,s*.215,0),(.70,.18,.18,s*.215,0)],'patent',b.leg(l));gem((s*.215,-.19,.66),.04,'silver',b.leg(l))
   else:bow((s*.215,-.19,.55),.09,'pink',b.leg(l));box((s*.215,-.19,.64),(.035,.02,.16),'wine',b.leg(l),.007)
 elif i in [0,7,10]:
  barelegs('fur',.25);pants('denim' if i==10 else 'peach' if i==7 else 'patent',.17,short=True)
  if i==0:loft([(.87,.33,.225,0,0),(1.00,.28,.19,0,0)],'patent','Pelvis');box((0,-.224,.93),(.075,.025,.06),'silver','Pelvis')
  for s,l in [(-1,'R'),(1,'L')]:
   if i==7:
    for j in range(4):patch([(s*.215-.12+j*.06,.75),(s*.215-.08+j*.06,.75),(s*.215-.07+j*.06,.56),(s*.215-.13+j*.06,.56)],-.215,.012,'pale',b.leg(l),.007)
   if i==10:box((s*.36,-.03,.64),(.13,.25,.15),'teal',b.leg(l),.022);box((s*.36,-.05,.72),(.15,.27,.035),'navy',b.leg(l),.006)
 elif i==5:
  pants('ink',.15);shoes(2,'patent')
  for s,l in [(-1,'R'),(1,'L')]:loft([(.13,.25,.22,s*.215,0),(.35,.19,.18,s*.215,0),(.58,.17,.19,s*.215,0)],'brown',b.leg(l),folds=6,depth=.008)
  loft([(.85,.33,.22,0,0),(.92,.32,.21,0,0)],'brown','Pelvis');box((0,-.23,.89),(.09,.025,.05),'gold','Pelvis')
 elif i==6:
  pants('patent',.135);shoes(2,'patent')
  for s,l in [(-1,'R'),(1,'L')]:patch([(s*.215-.045,.71),(s*.215+.045,.71),(s*.215+.035,.25),(s*.215-.025,.25)],-.20,.012,'silver',b.leg(l),.006)
 elif i==9:
  pants('plum',.17,.035);shoes(2,'patent')
  for s,l in [(-1,'R'),(1,'L')]:loft([(.18,.215,.22,s*.215,0),(.24,.21,.22,s*.215,0)],'wine',b.leg(l))
 else:
  pants('cream',.18,.055);shoes(2,'patent')
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(4):patch([(s*.215-.11+j*.07,.74),(s*.215-.08+j*.07,.74),(s*.215-.07+j*.07,.22),(s*.215-.12+j*.07,.22)],-.22,.012,'white',b.leg(l),.01)

# Small headwear leaves the bunny ear roots and both ears readable.
def newhats(i):
 if i==0:
  loft([(2.73,.26,.22,.18,.03),(2.87,.27,.23,.18,.03),(2.89,.25,.21,.18,.03)],'wine',seg=40)
  for j in range(7):
   x=-.05+j*.075;pathcurve([(x,-.19,2.76),(x,-.38,2.55),(x,-.39,2.40)],[(.007,.006)]*3,'ink',seg=6)
  flower((.34,-.12,2.84),.07,'pink')
 elif i==1:
  ell((-.27,-.02,2.80),(.24,.19,.06),'navy')
  for j in range(3):pathcurve([(-.28,0,2.80),(-.38+j*.06,.03,2.95),(-.24+j*.06,.05,3.06)],[(.045,.014),(.055,.018),(.002,.002)],'peach')
  bow((-.27,-.15,2.80),.12,'navy')
 elif i==2:
  loft([(2.70,.56,.40,0,.04),(2.75,.56,.40,0,.04)],'cream',seg=56);loft([(2.74,.39,.30,0,.05),(2.91,.39,.30,0,.05),(2.94,.36,.28,0,.05)],'cream',seg=48)
  loft([(2.76,.40,.31,0,.05),(2.81,.40,.31,0,.05)],'plum',seg=48);bow((.36,-.09,2.81),.11,'plum')
 elif i==3:
  bow((-.18,-.12,2.85),.26,'cream')
  for s in [-1,1]:
   for j in range(4):gem((-.18+s*(.08+j*.04),-.20,2.88+j*.018),.012,'silver')
 elif i==4:
  for j in range(11):
   x=(j-5)*.07;y=.03-.34*math.sqrt(max(.01,1-(x/.46)**2));z=2.72+.18*(1-abs(j-5)/5);ell((x,y,z),(.027,.023,.031),'cream');gem((x,y-.018,z+.04),.022,'silver')
  pathcurve([(-.4,-.13,2.70),(0,-.32,2.76),(.4,-.13,2.70)],[(.017,.012)]*3,'silver')
 elif i==5:
  ell((-.04,.02,2.79),(.53,.40,.13),'plum',seg=40,rings=20);ell((-.16,.03,2.92),(.035,.035,.035),'plum');flower((-.39,-.16,2.78),.11,'pink')
 elif i==6:
  pathcurve([(-.47,.04,2.52),(-.40,.02,2.76),(0,.04,2.88),(.40,.02,2.76),(.47,.04,2.52)],[(.025,.02)]*5,'pink')
  for s in [-1,1]:heart((s*.27,-.02,2.91),.095,'red',depth=.05)
 elif i==7:
  scalp('white')
  # Scalloped bonnet rim hugs the scalp, with broad draped side panels.
  for j in range(17):
   a=j*math.pi/16;c=(.48*math.cos(a),-.10,2.47+.36*math.sin(a));ell(c,(.056,.034,.061),'cream',seg=16,rings=10)
  for s in [-1,1]:pathcurve([(s*.43,.03,2.73),(s*.51,.08,2.44),(s*.52,.13,2.21)],[(.10,.05)]*3,'white');bow((s*.48,-.08,2.29),.10,'cream')
 elif i==8:
  for j in range(11):
   x=(j-5)*.073;top=2.77+.06*(1-abs(j-5)/5)
   for k in range(3+(j%3)):ell((x,-.43,top-k*.045),(.013,.012,.016),'silver',seg=12,rings=8)
  for s in [-1,1]:flower((s*.40,-.15,2.76),.08,'pale')
 elif i==9:
  scalp('peach')
  for j in range(3):
   pts=[(.48*math.cos(a),.06+.37*math.sin(a),2.69+j*.037) for a in [k*math.tau/48 for k in range(49)]];sw(pts,[(.035,.029)]*49,'peach')
  bow((-.45,.16,2.72),.20,'peach')
 elif i==10:
  loft([(2.76,.27,.23,.17,.04),(2.80,.27,.23,.17,.04)],'ink',seg=40);loft([(2.79,.17,.16,.17,.04),(3.02,.19,.17,.17,.04),(3.04,.17,.15,.17,.04)],'ink',seg=36)
  loft([(2.83,.178,.168,.17,.04),(2.89,.184,.17,.17,.04)],'wine',seg=36);gem((.17,-.14,2.86),.04,'gold')
 else:
  pathcurve([(-.51,.10,2.46),(-.40,.15,2.76),(0,.20,2.87),(.40,.15,2.76),(.51,.10,2.46)],[(.033,.03)]*5,'wine')
  for s in [-1,1]:ell((s*.51,.10,2.45),(.10,.15,.18),'wine');heart((s*.52,-.04,2.45),.07,'pink')

def newaccessories(i):
 if i==0:
  for s in [-1,1]:
   for row in range(3):
    for j in range(9):t=j/8;ell((s*(.24+.25*t),-.18,1.50-.08*math.sin(t*math.pi)-row*.045),(.018,.018,.019),'cream',b.arm('L' if s>0 else 'R'),12,8)
 elif i==1:
  for s in [-1,1]:
   patch([(s*.035,1.60),(s*.13,1.62),(s*.29,1.43),(s*.16,1.33),(s*.04,1.49)],-.18,.025,'cream','Chest',.025)
   for j in range(5):ell((s*(.09+j*.035),-.215,1.48-j*.027),(.025,.015,.020),'white','Chest',14,8)
 elif i==2:
  for j in range(8):a=j*math.tau/8;gem((-.22+.055*math.cos(a),-.28,1.39+.055*math.sin(a)),.028,'silver','Chest')
  gem((-.22,-.30,1.39),.045,'blue','Chest')
 elif i==3:
  for s in [-1,1]:pathcurve([(s*.24,.10,1.51),(s*.25,-.21,1.48),(s*.09,-.29,1.23),(s*.28,-.22,.93)],[(.025,.017)]*4,'wine',b.torso)
  heart((0,-.31,1.24),.08,'gold','Chest');box((0,-.348,1.25),(.015,.01,.04),'ink','Chest',.003)
 elif i==4:
  loft([(1.56,.18,.18,0,0),(1.63,.16,.16,0,0)],'wine','Chest');ell((0,-.20,1.52),(.065,.05,.06),'gold','Chest');box((0,-.252,1.51),(.065,.008,.009),'ink','Chest',.002)
 elif i==5:
  for row in range(3):chain([(.33*math.cos(a),-.225-.045*math.sin(a),.93-(.08+row*.045)*math.sin(a)) for a in [j*math.pi/17 for j in range(18)]],.018,.027,.006,'gold','Pelvis')
 elif i==6:
  for row in range(3):chain([(.36*math.cos(a),.24+.06*math.sin(a),1.50-(.20+row*.12)*math.sin(a)) for a in [j*math.pi/18 for j in range(19)]],.025,.033,.008,'gold','Chest')
  for s in [-1,1]:gem((s*.30,-.15,1.50),.055,'blue','Chest')
 elif i==7:
  box((.23,.31,1.30),(.48,.21,.49),'peach','Chest',.07);bow((.26,.45,1.43),.23,'pink','Chest')
  for s in [-1,1]:pathcurve([(s*.18,.32,1.47),(s*.27,.05,1.52),(s*.26,-.27,1.42),(s*.22,.14,1.10)],[(.025,.018)]*4,'peach','Chest')
 elif i==8:
  for s,l in [(-1,'R'),(1,'L')]:
   ell((s*.37,0,1.51),(.16,.18,.065),'gold',b.arm(l));gem((s*.38,-.10,1.56),.07,'blue',b.arm(l))
   for j in range(4):gem((s*(.29+j*.06),-.13,1.51),.025,'silver',b.arm(l))
 elif i==9:
  rows=8;cols=48;v=[]
  for k in range(rows):
   t=k/(rows-1)
   for j in range(cols+1):a=-.15+j*(math.pi+.3)/cols;r=.17+t*.34+.015*math.cos(j*.8)*t;v.append((r*math.cos(a),.04+r*.78*math.sin(a),1.62-.53*t))
  mesh(v,[(i*49+j,i*49+j+1,(i+1)*49+j+1,(i+1)*49+j) for i in range(rows-1) for j in range(cols)],'wine','Chest')
  for s in [-1,1]:pathcurve([(s*.12,-.10,1.60),(s*.30,-.11,1.43),(s*.46,-.06,1.16)],[(.035,.025)]*3,'cream','Chest')
  gem((0,-.17,1.60),.05,'gold','Chest')
 elif i==10:
  for row in range(3):
   for j in range(7):a=j*math.pi/6;x=.26*math.cos(a);z=1.46-(.15+row*.07)*math.sin(a);ell((x,-.28,z),(.032,.012,.036),'gold','Chest',20,10);gem((x,-.295,z),.015,'bronze','Chest')
 else:
  loft([(.86,.34,.23,0,0),(.93,.33,.22,0,0)],'wine','Pelvis')
  for j in range(7):a=math.pi+j*math.pi/6;star((.33*math.cos(a),.23*math.sin(a)-.01,.90),.035,'gold','Pelvis')

def newextras(i):
 if i==0:
  # Gothic window: solid mullions and individual colored glass panes.
  for s in [-1,1]:box((s*.90,.68,2.03),(.075,.10,1.65),'bronze','Root',.015)
  pts=[(.90*math.cos(a),.68,2.75+.32*math.sin(a)) for a in [j*math.pi/40 for j in range(41)]];sw(pts,[(.045,.04)]*len(pts),'bronze','Root')
  for s in [-1,1]:
   for j in range(4):
    z=1.38+j*.36;patch([(s*.70,z-.14),(s*.88,z-.14),(s*.88,z+.14),(s*.70,z+.14)],.70,.035,['blue','pink','green','purple'][j],'Root',.005)
    box((s*.79,.67,z+.17),(.22,.075,.035),'gold','Root',.006)
  for j in range(7):a=.25+j*(math.pi-.5)/6;gem((.77*math.cos(a),.65,2.76+.24*math.sin(a)),.055,'blue' if j%2 else 'pink','Root')
 elif i==1:
  for ringid in range(2):
   for j in range(18):
    a=j*math.tau/18+.17*ringid;x=(.93+.045*ringid)*math.cos(a);z=2.1+.93*math.sin(a);y=.52+.18*math.cos(a*2+ringid)
    ell((x,y,z),(.044,.041,.045),'cream' if ringid==0 else 'pink','Root',16,10)
 elif i==2:
  rnd=random.Random(77)
  for j in range(26):
   a=j*2.399;x=(.78+rnd.random()*.23)*math.cos(a);z=2.05+(.68+rnd.random()*.38)*math.sin(a);y=.32+rnd.random()*.40
   o=patch([(x-.05,z),(x-.06,z+.06),(x+.01,z+.10),(x+.07,z+.04),(x+.03,z-.03)],y,.016,'pink' if j%3 else 'pale','Root',.035);transform(o,(x,y,z),(j*.25,j*.17,j*.1))
 elif i==3:
  # Radial silk fan pleats behind the head, each pleat has broad cloth depth.
  center=(0,.70,1.88)
  for j in range(17):
   a=.08+j*(math.pi-.16)/16;bend=a+.08;r=1.15;x=r*math.cos(a);z=1.88+r*.89*math.sin(a)
   patch([(0,1.88),(x,z),(1.14*math.cos(bend),1.88+1.14*.89*math.sin(bend))],.72+(.025 if j%2 else 0),.035,'wine' if j%2 else 'pink','Root',.012,False)
   sw([center,(x,.69,z)],[(.012,.01)]*2,'gold','Root',8)
  ell(center,(.07,.04,.07),'gold','Root')
 elif i==4:
  ring((0,.69,2.06),.91,1.04,.055,'bronze','Root',64)
  ell((0,.74,2.06),(.86,.018,.98),'gray','Root',48,28)
  for j in range(14):a=j*math.tau/14;flower((.92*math.cos(a),.63,2.06+1.045*math.sin(a)),.07,'gold','Root',1)
  bow((0,.59,3.05),.15,'gold','Root')
 elif i==5:
  for s in [-1,1]:
   for j in range(9):
    a=j*.43;z=1.15+j*.20;x=s*(.85+.10*math.sin(a));y=.55+.15*math.cos(a)
    box((x,y,z),(.29,.32,.055),'cream','Root',.008)
    box((x+s*.12,y,z+.12),(.028,.028,.24),'gold','Root',.004)
   pathcurve([(s*.98,.70,1.25),(s*1.05,.45,1.91),(s*.92,.40,2.83)],[(.018,.018)]*3,'gold','Root')
 elif i==6:
  for s in [-1,1]:
   x=s*.87;box((x,.60,2.08),(.31,.10,1.67),'cream','Root',.018)
   for j in range(9):o=box((x,.53,1.43+j*.16),(.28,.07,.07),'blue','Root',.005);transform(o,(x,.53,1.43+j*.16),(.28,0,0))
   for sign in [-1,1]:box((x+sign*.15,.52,2.08),(.035,.10,1.68),'cream','Root',.007)
  box((0,.69,2.95),(1.95,.12,.10),'cream','Root',.02);flower((0,.61,3.00),.13,'pink','Root')
 elif i==7:
  # Sculpted tent canopy and hanging carousel poles; no animal companions.
  nseg=48;v=[]
  for z,r in [(2.78,1.04),(2.87,.96),(3.03,.45),(3.09,.02)]:
   for j in range(nseg):a=j*math.tau/nseg;v.append((r*math.cos(a),.63+r*.28*math.sin(a),z))
  canopy=mesh(v,[(k*nseg+j,k*nseg+(j+1)%nseg,(k+1)*nseg+(j+1)%nseg,(k+1)*nseg+j) for k in range(3) for j in range(nseg)],'pink','Root')
  canopy.data.materials.append(M['cream'])
  for f in canopy.data.polygons:f.material_index=(f.index%48//4)%2
  for s in [-1,1]:
   sw([(s*.94,.64,1.16),(s*.94,.64,2.82)],[(.027,.027)]*2,'gold','Root');bow((s*.94,.58,2.66),.11,'pink','Root')
  ell((0,.63,3.12),(.05,.05,.05),'gold','Root')
 elif i==8:
  for j,(x,z) in enumerate([(-.95,2.37),(.92,1.68),(-.90,1.22)]):
   y=.38+j*.10
   loft([(z-.09,.12,.10,x,y),(z-.04,.16,.14,x,y),(z+.10,.15,.13,x,y),(z+.13,.17,.15,x,y)],'cream','Root',seg=32)
   ring((x+.19,y,z+.015),.08,.075,.018,'gold','Root',28)
   loft([(z-.12,.22,.18,x,y),(z-.10,.22,.18,x,y)],'cream','Root',seg=32)
   flower((x,y-.145,z+.02),.05,'pink','Root',1)
  x=.91;y=.55;z=2.58;ell((x,y,z),(.20,.16,.17),'blue','Root');loft([(z+.14,.13,.11,x,y),(z+.19,.10,.085,x,y)],'gold','Root');ell((x,y,z+.22),(.04,.035,.04),'gold','Root')
  pathcurve([(x-.16,y,z),(x-.28,y,z+.06),(x-.32,y,z+.17)],[(.06,.045),(.05,.035),(.026,.02)],'blue','Root');ring((x+.20,y,z+.02),.09,.12,.021,'gold','Root')
 elif i==9:
  for j,(x,z) in enumerate([(-.91,2.45),(.94,1.85),(-.89,1.24)]):
   y=.45+j*.1;color='cream' if j%2==0 else 'ink'
   loft([(z-.23,.16,.14,x,y),(z-.19,.17,.15,x,y),(z-.12,.11,.10,x,y),(z+.06,.075,.07,x,y),(z+.10,.12,.11,x,y)],color,'Root',seg=32)
   if j==0:
    ell((x,y,z+.17),(.12,.11,.12),color,'Root')
   elif j==1:
    box((x,y,z+.21),(.045,.07,.25),'gold','Root',.006);box((x,y,z+.24),(.17,.07,.045),'gold','Root',.006)
   else:
    for k in range(5):a=k*math.tau/5;box((x+.08*math.cos(a),y+.07*math.sin(a),z+.18),(.065,.065,.15),color,'Root',.005)
 elif i==10:
  for s in [-1,1]:
   # Pleated silk panels have sculpted folds and a narrowed tied waist.
   v=[];rows=18;cols=24
   for k in range(rows):
    t=k/(rows-1);z=3.02-t*1.85;center=s*(.86+.13*math.sin(t*math.pi));width=.17-.08*math.sin(t*math.pi)**4
    for j in range(cols+1):u=-1+2*j/cols;v.append((center+u*width,.68+.06*math.cos(j*.9),z))
   mesh(v,[(k*25+j,k*25+j+1,(k+1)*25+j+1,(k+1)*25+j) for k in range(rows-1) for j in range(cols)],'plum','Root')
   bow((s*.99,.56,2.06),.14,'gold','Root')
  pathcurve([(-.94,.65,3.02),(-.49,.64,2.94),(0,.65,3.02),(.49,.64,2.94),(.94,.65,3.02)],[(.10,.04)]*5,'plum','Root')
 else:
  pts=[]
  for j in range(97):
   t=j*math.tau/96;x=math.sin(t)**3;z=(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/17;pts.append((x*.98,.65,2.20+z*.97))
  sw(pts,[(.046,.04)]*len(pts),'gold','Root',12)
  for j in range(12):c=pts[j*8];flower((c[0],c[1]-.045,c[2]),.06,'pink','Root',1)

def build_runway(categories=None):
 functions={'head':newheads,'eyes':neweyes,'brows':newbrows,'mouth':newmouth,'nose':newnose,'ears':newears,'tattoo':newtattoo,'shirt':newtops,'legs':newlegs,'hat':newhats,'accessory':newaccessories,'extra':newextras}
 for cat in categories or functions:
  for i,item in enumerate(CAT[cat][12:24]):
   begin('hair' if cat=='head' else cat,item['id']);functions[cat](i);o=join();o['collectionBatch']=2
   if cat=='hat' and i==0:
    for v in o.data.vertices:v.co.y-=.13;v.co.z+=.06
   if cat=='extra':
    for v in o.data.vertices:
     x,y,z=v.co;x*=.89;v.co=(.932*x-.362*y,.362*x+.932*y,2.04+(z-2.04)*.85)
   o.hide_set(True)
 print('Drilady modeled additions',len(collection.objects))

if __name__=='__main__':build_runway();lib['export']()
