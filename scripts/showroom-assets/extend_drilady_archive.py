"""240 Drilady archive interpretations, tied to observed collection trait names.
Uses the accepted independent bunny base and its unchanged shared skeleton.
Run individual categories through Blender MCP; never rebuild the base sculpt.
"""
import runpy,math,random,bpy,json
from pathlib import Path
from mathutils import Vector
runway=runpy.run_path(str(Path(__file__).with_name('extend_drilady_runway.py')))
for key,value in runway.items():
 if not key.startswith('__'):globals()[key]=value
base=runway['lib']
M['cyan']=mat('Screen cyan',(.025,.55,.68),.25,.3)
M['olive']=mat('Military olive',(.12,.16,.045),.79)
M['glass']=mat('Bubble glass',(.42,.69,.83),.07,.45)
M['ivorymetal']=mat('Pearlescent ivory',(.84,.76,.62),.25,.25)

# Shape libraries use broad sculpted surfaces, with details expressed as volume.
def tube(c,r,depth,material='silver',bone='Head',seg=24):
 x,y,z=c;v=[]
 for yy,rr in [(y-depth/2,r),(y+depth/2,r)]:
  v.extend((x+rr*math.cos(j*math.tau/seg),yy,z+rr*math.sin(j*math.tau/seg)) for j in range(seg))
 return mesh(v,[tuple(reversed(range(seg))),tuple(range(seg,seg*2))]+[(j,(j+1)%seg,(j+1)%seg+seg,j+seg) for j in range(seg)],material,bone)

def annulus(c,outer,inner,depth,material='silver',bone='Head',seg=40):
 x,y,z=c;v=[]
 for yy,rr in [(y-depth/2,outer),(y-depth/2,inner),(y+depth/2,outer),(y+depth/2,inner)]:v.extend((x+rr*math.cos(j*math.tau/seg),yy,z+rr*math.sin(j*math.tau/seg)) for j in range(seg))
 f=[]
 for j in range(seg):
  k=(j+1)%seg
  f.extend([(j,k,seg+k,seg+j),(2*seg+k,2*seg+j,3*seg+j,3*seg+k),(k,j,2*seg+j,2*seg+k),(seg+j,seg+k,3*seg+k,3*seg+j)])
 return mesh(v,f,material,bone)

def arcpath(c,rx,rz,start,end,count=25):
 x,y,z=c;return [(x+rx*math.cos(a),y,z+rz*math.sin(a)) for a in [start+(end-start)*j/(count-1) for j in range(count)]]

def cross(c,r,material='gold',bone='Head'):
 x,y,z=c;box((x,y,z),(r*.35,r*.20,r*1.7),material,bone,r*.06);box((x,y,z+r*.20),(r*1.15,r*.22,r*.32),material,bone,r*.06)

def beadloop(path,size=.022,color='cream',bone='Chest'):
 for c in path:ell(c,(size,size,size),color,bone,12,8)

def buckle(c,w=.09,h=.07,color='gold',bone='Pelvis'):
 x,y,z=c
 for s in [-1,1]:box((x+s*w/2,y,z),(.012,.018,h),color,bone,.003);box((x,y,z+s*h/2),(w,.018,.012),color,bone,.003)
 box((x,y-.01,z),(.009,.017,h*.85),color,bone,.002)

def sculptlock(points,width=.09,color='brown',bone='Head'):
 return pathcurve(points,[(width,width*.55)]*(len(points)-1)+[(.003,.003)],color,bone,seg=12,steps=4)

def bangsheet(color,bottom=2.56,slope=0):
 # A single curved fringe with thickness and a gently scalloped cut edge.
 cols=32;rows=12;v=[];f=[]
 for back in [False,True]:
  for k in range(rows+1):
   t=k/rows
   for j in range(cols+1):
    u=j/cols*2-1;x=.405*u
    crown=math.sqrt(1-(x/.525)**2)
    end=bottom+slope*u+.008*math.cos(u*math.pi*5)
    theta=.16*(1-t)+math.acos(max(-1,min(1,(end-2.31)/(.535*crown))))*t
    z=2.31+.535*crown*math.cos(theta)
    y=.06-(.415+.025*t)*crown*math.sin(theta)+(.025 if back else 0)
    v.append((x,y,z))
 n=(cols+1)*(rows+1)
 for k in range(rows):
  for j in range(cols):
   a=k*(cols+1)+j;quad=(a,a+1,a+cols+2,a+cols+1)
   f.extend([quad,tuple(q+n for q in reversed(quad))])
 boundary=list(range(cols+1))+[k*(cols+1)+cols for k in range(1,rows+1)]+[rows*(cols+1)+j for j in range(cols-1,-1,-1)]+[k*(cols+1) for k in range(rows-1,0,-1)]
 for j,a in enumerate(boundary):b=boundary[(j+1)%len(boundary)];f.append((a,b,b+n,a+n))
 return mesh(v,f,color,'Head')

def braidpath(points,width=.10,color='brown',turns=4):
 # A plait made of broad intersecting lobes, each following a continuous strand.
 for strand in range(3):
  pts=[];ws=[]
  for k in range(49):
   t=k/48;u=t*(len(points)-1);i=min(len(points)-2,int(u));v=Vector(points[i]).lerp(Vector(points[i+1]),u-i);a=t*math.tau*turns+strand*math.tau/3
   v.x+=width*.50*math.cos(a);v.y+=width*.38*math.sin(a);pts.append(v);ws.append((width*.43*(1-.30*t),width*.35*(1-.30*t)))
  sw(pts,ws,color,seg=8)

def archiveheads(i):
 color=['brown','blonde','ink','brown','pink','orange','plum','brown','blonde','ink','purple','ink','brown','blonde','brown','pink','ink','purple','blonde','brown'][i];scalp(color)
 if i in [0,3,9,10,11,15,18]:
  length={0:1.88,3:1.48,9:1.66,10:2.02,11:1.40,15:1.90,18:1.48}[i]
  for j in range(13):
   a=j*math.pi/12;x=.49*math.cos(a);y=.10+.34*math.sin(a);tilt=.12 if i==18 else 0
   sculptlock([(x*.75,y*.8,2.73),(x,y,2.40),(x+tilt,y+.04,length+.30),(x*.85+tilt,y+.02,length)],.105,color)
  if i in [3,15]:
   bangsheet(color,2.58 if i==3 else 2.64)
  elif i in [0,9,10]:
   for s in [-1,1]:
    for k in range(3):sculptlock([(s*.025,-.28,2.82),(s*(.19+k*.04),-.35,2.71),(s*(.43+k*.01),-.22,2.46),(s*.49,-.06,2.20-k*.06)],.083,color)
  else:fringe(color,-1 if i==11 else 1,2.54)
 elif i in [2,13]:
  for j in range(15):
   a=j*math.pi/14;x=.5*math.cos(a);y=.07+.38*math.sin(a);z=2.03 if i==2 else 2.09
   sculptlock([(x*.83,y*.8,2.71),(x,y,2.40),(x,y,z+.10),(x*(.90 if i==2 else 1.16),y,z+.01)],.10,color)
  bangsheet(color,2.57,.035 if i==2 else 0)
 elif i in [1,8]:
  fringe(color)
  if i==1:
   for j in range(5):sculptlock([(.08,.28,2.79),(.20,.40+j*.025,2.91),(.35,.48+j*.035,2.56),(.32,.49+j*.04,2.07),(.21,.42+j*.05,1.52)],.10,color)
  else:braidpath([(0,.32,2.78),(.13,.47,2.70),(.18,.50,2.20),(.22,.45,1.55)],.17,color,6)
  ell((.08,.32,2.78),(.13,.10,.06),'patent')
 elif i in [4,14]:
  fringe(color,-1)
  for s in [-1,1] if i==4 else [1]:
   if i==4:braidpath([(s*.41,.18,2.65),(s*.55,.20,2.25),(s*.57,.24,1.49)],.13,color,5)
   else:
    for j in range(13):
     z=2.58-j*.073;side=(-1)**j;sculptlock([(.44,.12,z+.10),(.55+side*.08,.10,z+.04),(.54,.12,z-.10)],.065,color)
   bow((s*.56,.13,1.53),.08,'ink')
 elif i==5:
  fringe(color)
  for s in [-1,1]:
   for j in range(4):sculptlock([(s*.33,.08+j*.07,2.75),(s*.51,.09+j*.07,2.50),(s*.45,.12+j*.08,2.27),(s*.59,.15+j*.08,2.03),(s*.50,.20+j*.08,1.74)],.10,color)
 elif i in [6,12,19]:
  fringe(color,1,2.59)
  if i==12:
   ell((.03,.38,2.48),(.25,.18,.39),color)
   for j in range(5):sculptlock([(-.28,.23,2.32+j*.08),(-.09,.52,2.27+j*.10),(.20,.47,2.40+j*.09),(.23,.25,2.65+j*.025)],.07,color)
  elif i==19:
   braidpath([(.24*math.cos(a),.35+.15*math.sin(a),2.26+.23*math.sin(a)) for a in [j*math.tau/20 for j in range(21)]],.095,color,9)
  else:
   ell((.18,.42,2.16),(.25,.17,.23),color)
   for j in range(4):sculptlock([(-.20,.21,2.42),(-.10,.44,2.21),(.16,.52,2.05+j*.05),(.36,.35,2.21+j*.06)],.075,color)
  for s in [-1,1]:sculptlock([(s*.39,-.12,2.63),(s*.49,-.02,2.39),(s*.44,.02,2.20)],.067,color)
 elif i==7:
  fringe(color,-1)
  for s in [-1,1]:
   for z,r in [(2.76,.16),(2.91,.12)]:ell((s*.38,.22,z),(r,r*.8,r),color,seg=20,rings=12)
   sculptlock([(s*.42,.15,2.64),(s*.54,.19,2.45),(s*.45,.25,2.24)],.08,color)
 elif i==16:
  for j in range(30):
   a=j*2.399;z=2.43+(j%4)*.12;x=.43*math.cos(a);y=.10+.34*math.sin(a)
   if y<-.16 and z<2.65:continue
   pathcurve([(x,y,z),(x+.07,y-.03,z+.08),(x+.10,y,z),(x+.03,y+.02,z-.055)],[(.065,.055)]*3+[(.02,.02)],color,seg=10,steps=4)
 elif i==17:
  fringe(color)
  for s in [-1,1]:
   for j in range(5):
    z=2.57-j*.20;ell((s*(.50+j*.015),.30+j*.015,z),(.13-j*.012,.10-j*.009,.13-j*.008),color,seg=20,rings=12)
    ell((s*(.50+j*.015),.30+j*.015,z-.10),(.085-j*.01,.07-j*.007,.026),'pink',seg=16,rings=8)

def archiveeyes(i):
 makeup=['brown','purple','green','ink','blue','gray','ink','blue','plum','red','ink','brown','ink','plum','gold','purple','red','ink','cream','pink'][i]
 for s in [-1,1]:
  mir=lambda pts:[(s*x,z) for x,z in pts];high=2.26 if i==11 else 2.23 if i==16 else 2.34
  outline=[(.065,2.13),(.15,high),(.30,high+.035),(.45,2.31),(.39,2.14),(.27,2.08),(.14,2.09)]
  eyepatch(mir(outline),'ink' if i in [1,3,10,13,17] else 'white',.029,.012)
  eyepatch(mir([(.065,2.13),(.105,2.40),(.23,2.55),(.34,2.46),(.45,2.31),(.30,high+.035),(.15,high)]),makeup,.043,.02)
  if i==19:eyepatch(mir([(.11,2.39),(.23,2.55),(.34,2.46),(.30,2.40),(.22,2.45)]),'gold',.066,.009)
  x=s*.26;z=2.205;y=eyey(x,z)-.065
  if i==0:
   for r,c in [(.112,'bronze'),(.091,'gold'),(.058,'ink')]:disc(x,z,r,r*1.05,c,.061+(.112-r)*.2)
  elif i==1:eyepatch(mir([(.14,2.16),(.23,2.30),(.39,2.30),(.31,2.12)]),'ink',.075,.014);disc(x,z,.018,.027,'green',.097)
  elif i==2:disc(x,z,.08,.10,'green',.063);label('$',(x,y-.025,z-.05),.14,'gold','Head')
  elif i==4:
   for dx,dz in [(-1,1),(0,1),(1,1),(-1,0),(1,0),(-1,-1),(0,-1),(1,-1)]:box((x+dx*.033,y,z+dz*.034),(.030,.012,.031),'ink',bevel=.001)
  elif i==5:
   annulus((x,y,z),.105,.068,.035,'silver');tube((x,y-.024,z),.064,.021,'cyan');tube((x,y-.038,z),.032,.014,'ink')
   for j in range(6):a=j*math.tau/6;gem((x+.087*math.cos(a),y-.027,z+.087*math.sin(a)),.012,'gold')
  elif i==6:
   eyepatch(mir([(.06,2.28),(.43,2.33),(.42,2.16),(.16,2.12)]),'silver',.085,.007);eyepatch(mir([(.09,2.27),(.40,2.30),(.39,2.18),(.17,2.15)]),'ink',.105,.003)
   box((0,-.47,2.24),(.12,.025,.025),'silver',bevel=.005)
  elif i==10:disc(x,z,.085,.105,'ink',.069);disc(x,z+.012,.020,.025,'gray',.077)
  elif i==13:
   pts=[]
   for j in range(65):a=j/64*math.pi*4.5;r=.006+.065*j/64;xx=x+r*math.cos(a);zz=z+r*math.sin(a)*1.2;pts.append((xx,eyey(xx,zz)-.083,zz))
   sw(pts,[(.010,.006)]*65,'cream',seg=8)
  else:
   iris={3:'cream',7:'blue',8:'red',9:'red',11:'brown',12:'gray',14:'gold',15:'blue',16:'red',17:'red',18:'lilac',19:'blue'}.get(i,'brown')
   disc(x,z,.068,.091,iris,.069)
   if i in [9,16]:eyepatch([(x-.045,z+.04),(x+.045,z+.04),(x,z-.07)],'ink',.081,.004)
   else:disc(x,z,.018 if i==14 else .028,.060,'ink',.08)
   disc(x-.018,z+.041,.014,.018,'white',.095)
  if i==7:
   for j in range(2):
    xx=s*(.34+j*.08);zz=2.045-j*.045
    facepatch([(xx,zz+.075),(xx-.023,zz+.006),(xx-.017,zz-.018),(xx,zz-.026),(xx+.017,zz-.018),(xx+.023,zz+.006)],'cyan',.014,.012)
    facepatch([(xx-.007,zz+.023),(xx-.010,zz+.003),(xx-.004,zz-.007),(xx+.001,zz+.005)],'cream',.032,.001)
  if i==8:
   for dx in [-.12,.12]:eyepatch([(x+dx,z+.03),(x+dx*.65,z+.01),(x+dx*.75,z-.02)],'red',.056,.002)
  eyepatch(mir([(.064,2.13),(.15,high),(.30,high+.035),(.45,2.31),(.49,2.37),(.46,2.27),(.30,high+.01),(.15,high-.02)]),'ink',.087,.002)
  for j in range(5 if i==15 else 3):
   xx=s*(.35+j*.031);zz=2.31+j*.014;sculptlock([(xx,eyey(xx,zz)-.09,zz),(xx+s*.03,eyey(xx,zz)-.09,zz+.03),(xx+s*(.075 if i==15 else .045),eyey(xx,zz)-.08,zz+.085)],.012,'ink')

def archivebrows(i):
 colors=['brown','ink','red','blonde','pink','brown','brown','ink','ink','red','brown','ink','ink','blonde','pink','brown','ink','brown','brown','brown']
 for s in [-1,1]:
  pts=[];n=16
  for j in range(n):
   t=j/(n-1);x=.085+.33*t;arch=[.075,.012,.045,.07,.02,.065,.05,.055,.035,.08,.035,.05,.025,.05,.085,.06,.02,.05,.03,.09][i];z=2.55+arch*math.sin(math.pi*t)
   if i==10:z+=.07*(1-t)
   if i==19:z+=.055*math.sin(math.pi*t)*(1 if s>0 else -.6)
   w=(.014 if i in [0,7,15] else .038 if i in [1,4,8,16] else .027)*(.25+.75*math.sin(math.pi*(t*.85+.10)))
   pts.append((s*x,z,w))
  outline=[(x,z+w) for x,z,w in pts]+[(x,z) for x,z,w in reversed(pts)]
  if i in [2,8,15]:
   for start,end in [(0,7),(9,16)]:sub=pts[start:end];eyepatch([(x,z+w) for x,z,w in sub]+[(x,z) for x,z,w in reversed(sub)],colors[i],.105,.004)
  else:eyepatch(outline,colors[i],.105,.005)
  if i in [5,12,17]:
   for xx in ([.22,.31] if i==17 else [.29]):
    x=s*xx;z=2.61;y=eyey(x,z)-.12
    if i==17:ring((x,y,z),.015,.030,.005,'silver',seg=20)
    else:box((x,y,z),(.012,.018,.065),'silver',bevel=.004);ell((x,y-.006,z+.035),(.012,.012,.012),'silver',seg=12,rings=8);ell((x,y-.006,z-.035),(.012,.012,.012),'silver',seg=12,rings=8)
  if i in [11,13]:
   for j in range(3):x=s*(.28+j*.04);eyepatch([(x,2.58),(x+s*.05,2.63),(x+s*.04,2.57)],colors[i],.107,.003)

def lipshape(width,z=1.91,shift=0):return [(shift-width,z),(shift-width*.5,z+.035),(shift,z+.018),(shift+width*.5,z+.035),(shift+width,z),(shift+width*.50,z-.045),(shift-width*.50,z-.045)]
def archivemouth(i):
 z=1.91;w=[.15,.19,.16,.12,.145,.13,.18,.21,.17,.16,.18,.17,.17,.11,.16,.12,.13,.16,.15,.13][i];color=['ink','plum','pink','cream','peach','wine','ink','ink','ink','ink','ink','green','red','peach','pink','brown','pink','cream','wine','pink'][i]
 facepatch(lipshape(w,z,.035 if i==4 else 0),color,.022,.035)
 if i==0:facepatch(lipshape(w*.78,z),'pale',.05,.02)
 if i==17:
  facepatch([(-.17,z-.055),(-.18,z+.025),(.16,z+.055),(.18,z-.03)],'cream',.03,.016)
  for x in [-.11,.11]:
   for zz in [z-.015,z+.018]:facepatch([(x-.008,zz-.004),(x+.008,zz-.004),(x+.008,zz+.004),(x-.008,zz+.004)],'brown',.054,0)
 facepatch([(-w*.78,z),(0,z-.007),(w*.78,z),(w*.48,z-.030),(-w*.48,z-.030)],'ink',.062,.002)
 if i in [1,6,7,8,9,10,11,13,14,15,17,18]:
  count=2 if i==13 else 8;step=w*1.55/count
  for j in range(count):
   x=(j-(count-1)/2)*step;yy=surface(x,z)-.080
   if i in [1,6,7,11]:
    for direction in [-1,1]:patch([(x-step*.38,z+direction*.021),(x+step*.38,z+direction*.021),(x,z-direction*.022)],yy,.012,'green' if i==11 else 'cream',rounded=False)
   else:box((x,yy,z-.009),(step*.83,.022,.032 if i==13 else .025),'silver' if i==9 else 'gold' if i==18 else 'white',bevel=.004)
   if i==18:gem((x,yy-.016,z-.008),step*.25,'silver')
 if i in [7,16,19]:
  endx=.12 if i==19 else .05 if i==7 else 0
  pathcurve([(0,surface(0,z)-.077,z-.022),(.02,-.62,z-.07),(endx,-.71,z-.09),(endx+.02,-.73,z-.035)],[(.055,.020),(.055,.022),(.045,.020),(.023,.014)],'pink',seg=14,steps=5)
  if i==16:
   for y,zz in [(-.64,z-.073),(-.70,z-.08)]:ell((.01,y-.01,zz+.017),(.012,.014,.012),'silver',seg=12,rings=8)
 if i==5:
  box((.035,surface(.035,z)-.105,z-.035),(.05,.014,.009),'silver',bevel=.003)
  for x in [.005,.065]:ell((x,surface(x,z)-.11,z-.035),(.012,.012,.012),'silver',seg=12,rings=8)
 if i in [2,3,12]:facepatch([(-.08,z+.016),(-.02,z+.025),(.01,z+.012),(-.06,z+.010)],'pale',.075,.001)

def archivenose(i):
 z=2.043;y=surface(0,z)-.035
 if i in [0,14]:
  w=.13 if i==0 else .085;facepatch([(-w,z+.02),(-w,z-.023),(w,z-.023),(w,z+.02)],'cream',.027,.015);facepatch([(-.035,z+.023),(-.035,z-.026),(.035,z-.026),(.035,z+.023)],'white',.047,.009)
  for s in [-1,1]:
   for k in range(3):xx=s*(.052+k*.021);facepatch([(xx-.003,z-.003),(xx+.003,z-.003),(xx+.003,z+.003),(xx-.003,z+.003)],'brown',.047,0)
  return
 if i in [1,16]:
  ell((0,y-.015,z),(.082,.070,.072),'red' if i==1 else 'plum',seg=20 if i==1 else 12,rings=12 if i==1 else 8)
  if i==16:gem((0,y-.080,z),.065,'red')
  return
 if i==9:box((0,y,z),(.11,.055,.065),'silver',bevel=.014);box((0,y-.031,z),(.083,.013,.041),'cyan',bevel=.004);return
 if i in [8,18]:
  heart((0,y,z),.052,'pink',depth=.035)
  if i==8:pathcurve([(0,y,z-.02),(.01,y-.02,z-.055),(0,y,z-.10)],[(.02,.02),(.015,.015),(.001,.001)],'pink')
  else:heart((0,y-.025,z+.005),.030,'cream',depth=.006)
  return
 facepatch([(-.052 if i!=4 else -.031,z+.02),(.052 if i!=4 else .031,z+.02),(0,z-.035 if i!=4 else z-.02)],'ink' if i==11 else 'cream' if i==12 else 'ear',.026,.025)
 if i==2:
  pts=[]
  for j in range(42):a=j/41*math.pi*4;r=.002+.036*j/41;pts.append((r*math.cos(a),y-.033,z+r*math.sin(a)))
  sw(pts,[(.007,.004)]*42,'cream',seg=8)
 if i in [3,17]:
  for xx,zz in [(-.028,.012),(.018,.015),(-.004,-.011),(.035,-.006)]:ell((xx,y-.035,z+zz),(.005,.004,.005),'brown',seg=8,rings=6)
  if i==17:facepatch([(-.02,z+.02),(0,z+.12),(.02,z+.02)],'ear',.018,.018)
 if i in [5,6,10,13,15,19]:
  color='gold' if i==15 else 'silver'
  if i in [5,15]:
   sw(arcpath((0,y-.04,z-.026),.032,.032,math.pi*.1,math.pi*1.9),[(.007,.007)]*25,color,seg=8)
   for x in [-.03,.03]:ell((x,y-.04,z-.015),(.012,.012,.012),color,seg=12,rings=8)
  elif i==6:ring((0,y-.035,z-.032),.027,.033,.007,color,seg=24)
  elif i==19:ring((0,y-.04,z-.027),.022,.027,.006,color,seg=24);gem((0,y-.04,z-.071),.022,'purple')
  else:
   for s in [-1,1]:ell((s*.04,y-.02,z+.015),(.012,.012,.012),'cream' if i==10 else 'silver',seg=12,rings=8)
   if i==10:box((0,y-.02,z+.018),(.08,.011,.012),'silver',bevel=.004)
 if i==7:cross((0,y-.04,z),.028,'silver')

def archiveears(i):
 for s in [-1,1]:
  up=i==10 or (i==11 and s>0)
  if up:
   top=3.12;rows=[(2.62+.50*t,.004+.12*math.sin(math.pi*t)**.72+.06*(1-t)**8,.004+.065*math.sin(math.pi*t)**.7,s*(.34+.20*t+.045*math.sin(t*math.pi)),.12+.11*t) for t in [j/15 for j in range(16)]]
  else:
   lengths=[1.55,1.48,1.31,1.57,1.65,1.39,1.52,1.92,1.59,1.72,1.52,1.54,1.55,1.58,1.61,1.53,1.45,1.57,1.58,1.65]
   end=lengths[i];spread=[.87,.65,.66,.78,.74,.69,.84,.63,.90,.78,.75,.77,.76,.76,.82,.78,.72,.78,.78,.82][i]
   if i==8:spread+=s*.05;end+=s*.12
   rows=[(2.74,.075,.060,s*.33,.12),(2.69,.12,.075,s*.46,.17),(2.46,.16,.08,s*(spread-.13),.23),(2.15,.16 if i!=7 else .14,.075,s*spread,.24),(end+.12,.12,.065,s*spread,.22),(end,.005,.008,s*(spread-.06),.14)]
   if i in [3,9,19]:rows[-2:]=[(end+.05,.14,.075,s*spread,.13),(end+.15,.070,.039,s*(spread-.10),-.02),(end+.20,.002,.003,s*(spread-.14),-.025)]
   if i==3 and s<0:rows=[(z,w,d,x,y+.42*(2.74-z)) for z,w,d,x,y in rows]
   if i==6:rows[-2:]=[(end+.12,.13,.08,s*spread,.13),(end,.008,.009,s*(spread-.16),.01)]
  rows=densify(rows,4);loft(rows,'silver' if i==13 else 'fur',seg=28)
  v=[];cols=10
  for z,w,d,x,y in rows:
   for j in range(cols+1):t=-.70+1.4*j/cols;v.append((x+t*w,y-d*math.sqrt(1-t*t)-.004,z))
  mesh(v,[(k*11+j,k*11+j+1,(k+1)*11+j+1,(k+1)*11+j) for k in range(len(rows)-1) for j in range(cols)],'gray' if i==13 else 'ear')
  if i==15:
   tips=[(z,w+.006,d+.006,x,y) for z,w,d,x,y in rows if z<1.76]
   loft(tips,'ink',seg=28)
  if i in [12,17,18]:
   for j in range(3 if i in [12,17] else 4):
    zz=1.70+j*.13;near=min(rows,key=lambda row:abs(row[0]-zz));z,w,d,x,y=near
    loft([(z-.028,w+.008,d+.008,x,y),(z+.030,w+.008,d+.008,x,y)],'cream' if i in [12,18] else 'ink' if i==15 else 'red',seg=28)
  if i==16:
   z,w,d,x,y=min(rows,key=lambda r:abs(r[0]-1.70))
   for j in range(7):a=j*math.tau/7;ell((x+w*math.cos(a),y+d*math.sin(a),z),(.025,.025,.025),'cream',seg=12,rings=8)

# Tattoos remain flush to the muzzle and don't alter the accepted face silhouette.
def archivetattoo(i):
 for s in [-1,1]:
  x=s*.35;z=2.02
  def mark(pts,c='ink'):return facepatch(pts,c,.004,0)
  if i in [0,5]:
   pts=[(x+.055*math.cos(j*math.tau/20),z+.04*math.sin(j*math.tau/20)) for j in range(20)];mark(pts,'red' if i==0 else 'pink')
   if i==0:mark([(x-.025,z+.06),(x+.025,z+.06),(x,z+.11)],'blue')
  elif i in [1,7]:
   for j in range(3):xx=x+s*j*.035;zz=z+(j%2)*.025;mark([(xx-.020,zz),(xx,zz+.032),(xx+.020,zz),(xx,zz-.032)],'plum' if j%2 else 'ink')
  elif i in [2,3,12]:
   for j in range(8):xx=x+s*(j%4)*.026;zz=z+(j//4)*.029
   # Stepped cells follow the cheek curve independently.
   for j in range(8):
    if (j+i)%3==0:continue
    xx=x+s*(j%4)*.026;zz=z+(j//4)*.029;mark([(xx,zz),(xx+s*.019,zz),(xx+s*.019,zz+.018),(xx,zz+.018)],'blue' if i==2 else 'ink')
  elif i in [4,17]:
   for j in range(8):xx=x+s*(j%4)*.026;zz=z+(j//4)*.030;mark([(xx-.006,zz),(xx,zz+.008),(xx+.006,zz),(xx,zz-.008)],'cream')
  elif i==6:mark([(x-.08,z+.07),(x+.02,z+.04),(x+.08,z-.03),(x-.01,z-.055)],'plum' if s<0 else 'peach')
  elif i==8:mark([(x-.05,z-.04),(x-.06,z+.02),(x-.01,z+.05),(x+.04,z+.02),(x+.01,z-.01),(x+.06,z-.04),(x+.04,z-.06),(x-.02,z-.02)],'ink')
  elif i==9:mark([(x+math.sin(j*math.pi/5)*(.065 if j%2==0 else .028),z+math.cos(j*math.pi/5)*(.065 if j%2==0 else .028)) for j in range(10)],'blue')
  elif i==10:
   for j in range(2):xx=x+s*j*.055;mark([(xx-.008,z-.028),(xx+.008,z-.028),(xx+.008,z-.005),(xx+.024,z-.005),(xx+.024,z+.008),(xx+.008,z+.008),(xx+.008,z+.027),(xx-.008,z+.027),(xx-.008,z+.008),(xx-.024,z+.008),(xx-.024,z-.005),(xx-.008,z-.005)],'ink')
  elif i==11:
   for j in range(6):a=j*math.tau/6;xx=x+.028*math.cos(a);zz=z+.026*math.sin(a);mark([(xx-.017,zz),(xx,zz+.021),(xx+.017,zz),(xx,zz-.016)],'red')
  elif i==13:
   for j in range(3):xx=x+s*j*.035;mark([(xx-.01,z+.03),(xx,z+.065),(xx+.01,z+.03),(xx+.014,z-.025),(xx,z-.04),(xx-.014,z-.025)],'cyan')
  elif i==14:
   mark([(x-.06,z-.025),(x-.06,z+.025),(x+.06,z+.025),(x+.06,z-.025)],'cream');mark([(x-.02,z-.029),(x-.02,z+.029),(x+.02,z+.029),(x+.02,z-.029)],'white')
  elif i==15:
   mark([(x-.045,z-.035),(x-.045,z+.035),(x+.045,z+.035),(x+.045,z-.035)],'red');mark([(x-.032,z-.022),(x-.032,z+.022),(x+.032,z+.022),(x+.032,z-.022)],'cream')
  elif i==16:mark([(x-.09,z+.08),(x-.02,z+.05),(x+.05,z+.07),(x+.09,z+.04),(x+.02,z+.01),(x-.05,z+.02)],'white')
  elif i==18:mark([(x-.07,z-.04),(x-.09,z+.05),(x-.025,z+.06),(x+.05,z-.005),(x+.08,z-.04)],'bronze')
  else:
   for j in range(5):xx=x+s*j*.024;mark([(xx-.016,z+.01),(xx,z+.032),(xx+.016,z+.01),(xx,z-.006)],'cream')

def build_archive(categories=None):
 builders={'head':archiveheads,'eyes':archiveeyes,'brows':archivebrows,'mouth':archivemouth,'nose':archivenose,'ears':archiveears,'tattoo':archivetattoo}
 for key,name in [('shirt','archivetops'),('legs','archivelegs'),('hat','archivehats'),('accessory','archivegear'),('extra','archiveextras')]:
  if name in globals():builders[key]=globals()[name]
 rig.animation_data.action=bpy.data.actions['Neutral'];rig.animation_data.action_slot=bpy.data.actions['Neutral'].slots[0];scene.frame_set(1)
 for cat in categories or builders:
  for i,item in enumerate(CAT[cat][24:44]):
   slot='hair' if cat=='head' else cat;begin(slot,item['id']);builders[cat](i);o=join();o['collectionBatch']=3;o['sourceTrait']=item['source'];o['design']=item['design']
   if cat=='extra':
    # Angle side props toward the portrait camera, with generous face clearance.
    for v in o.data.vertices:
     x,y,z=v.co
     if i in [0,1,2,3,4,5,7,8,11,13,14,16,18,19]:y-=.75
     x*=.86;v.co=(.932*x-.362*y,.362*x+.932*y,2.04+(z-2.04)*.84)
   if cat=='hat' and i in [5,15]:
    for v in o.data.vertices:v.co.y-=.12;v.co.z-=.055
   o.hide_set(True)
  print('ARCHIVE BUILT',cat,20,flush=True)
 print('Archive total objects',len(collection.objects),flush=True)

# Tailored torso shells follow the actual bust/waist, not a stack of flat decals.
def cup(c,color='pink',metal=False):
 x,y,z=c
 return patch([(x-.16,z+.005),(x-.12,z+.115),(x+.02,z+.13),(x+.16,z+.035),(x+.10,z-.09),(x-.07,z-.105)],y,.055,color,'Chest',.065 if not metal else .045)

def waistpanels(color='wine',bottom=.94,top=1.22):
 for s in [-1,1]:
  patch([(s*.025,top),(s*.22,top),(s*.27,1.05),(s*.22,bottom),(s*.04,bottom-.02)],-.21,.05,color,b.torso,.027)

def petalmini(color='silver',z=.72):
 for j in range(10):
  a=j*math.tau/10;x=.30*math.cos(a);y=.21*math.sin(a)
  p=patch([(-.13,z+.19),(.13,z+.19),(.15,z-.12),(0,z-.21),(-.15,z-.12)],-.28,.034,color,skirtweights,.025)
  for v in p.data.vertices:
   xx,yy,zz=v.co;v.co=(xx*math.cos(a)-yy*math.sin(a),xx*math.sin(a)+yy*math.cos(a),zz)

def archivetops(i):
 if i==0:
  loft([(1.19,.30,.22,0,0),(1.25,.32,.235,0,0)],'pink','Chest',seg=48)
  for s in [-1,1]:cup((s*.16,-.23,1.35),'pink')
  straps('pink',True);bow((0,-.34,1.25),.085,'pink','Chest')
 elif i==1:
  fittedtop('wine',1.02,1.39,True)
  for s in [-1,1]:
   patch([(s*.02,1.61),(s*.16,1.63),(s*.34,1.48),(s*.20,1.36),(s*.06,1.40)],-.20,.04,'plum','Chest',.05)
   patch([(s*.02,1.39),(s*.13,1.34),(s*.26,1.11),(s*.12,1.04),(s*.02,1.26)],-.25,.035,'wine','Chest',.04)
  gem((0,-.25,1.54),.038,'silver','Chest')
 elif i in [2,3,9]:
  color='gold' if i==3 else 'silver';fittedtop('patent',.97,1.41,True);waistpanels(color)
  for s in [-1,1]:
   cup((s*.16,-.24,1.35),color,True)
   patch([(s*.025,1.25),(s*.22,1.29),(s*.29,1.20),(s*.19,1.12),(s*.04,1.16)],-.245,.035,color,'Chest',.02)
   if i==9:gem((s*.22,-.34,1.36),.045,'cyan','Chest')
  straps('patent',i==9)
  if i==2:
   sleeves('silver',.60)
   for s,l in [(-1,'R'),(1,'L')]:ell((s*.38,0,1.52),(.18,.20,.085),'silver',b.arm(l),20,12)
 elif i in [4,15,16]:
  color='cream' if i==4 else 'patent' if i==15 else 'bronze';fittedtop(color,.93,1.42,True);waistpanels(color,.94,1.27)
  for s in [-1,1]:cup((s*.16,-.23,1.34),color)
  if i==4:
   for j in range(13):x=(j-6)*.045;ell((x,-.25,1.43+.026*math.sin(abs(x)*8)),(.027,.018,.024),'white','Chest',12,8)
   straps('cream')
  elif i==15:
   for s in [-1,1]:
    for j in range(4):gem((s*.24,-.23,1.02+j*.09),.025,'silver','Chest')
   straps('patent')
  else:
   for z,r in [(1.12,.042),(1.28,.035)]:
    tube((0,-.29,z),r,.025,'gold','Chest',16)
    for j in range(10):a=j*math.tau/10;box((r*1.1*math.cos(a),-.29,z+r*1.1*math.sin(a)),(.014,.028,.014),'gold','Chest',.002)
   straps('brown',True)
 elif i in [5,6]:
  fittedtop('cream',1.09,1.40,True);straps('ink')
  if i==5:
   for z in [1.12,1.39]:loft([(z,.33 if z>1.2 else .28,.25 if z>1.2 else .20,0,0),(z+.025,.33 if z>1.2 else .28,.25 if z>1.2 else .20,0,0)],'ink','Chest',seg=48)
   for s in [-1,1]:box((s*.19,-.26,1.27),(.11,.035,.075),'cream','Chest',.009);ell((s*.19,-.285,1.30),(.012,.009,.012),'gold','Chest',12,8)
  else:
   sleeves('pink',.68)
   for s in [-1,1]:
    patch([(s*.12,1.54),(s*.29,1.52),(s*.35,1.32),(s*.28,1.07),(s*.13,1.08),(s*.20,1.32)],-.23,.065,'pink','Chest',.03)
    patch([(s*.12,1.54),(s*.26,1.50),(s*.18,1.29),(s*.08,1.39)],-.30,.028,'cream','Chest',.012)
 elif i==7:
  fittedtop('blue',.89,1.41,True);straps('cream');barelegs('fur',.22)
  for z,r in [(.43,.48),(.56,.43),(.68,.39)]:loft([(z,r,.30,0,0),(z+.04,r+.015,.31,0,0),(z+.17,r-.07,.26,0,0)],'cream' if z==.56 else 'blue',skirtweights,folds=12,depth=.018,seg=60)
  bow((0,-.27,1.28),.11,'cream','Chest')
 elif i==8:
  fittedtop('patent',.75,1.48);sleeves('patent',1.05);pants('patent',.13);shoes(2,'patent')
  for s,l in [(-1,'R'),(1,'L')]:patch([(s*.19,.86),(s*.31,.85),(s*.30,.34),(s*.21,.17),(s*.17,.31)],-.15,.025,'cyan',b.leg(l),.015)
  box((0,-.265,1.28),(.027,.018,.35),'silver','Chest',.004);buckle((0,-.28,1.44),.035,.05,'silver','Chest')
 elif i==10:
  fittedtop('cream',1.09,1.48);loft([(1.48,.16,.16,0,0),(1.62,.13,.13,0,0)],'blue','Chest',seg=36)
  patch([(-.20,1.20),(-.25,1.35),(-.15,1.46),(.15,1.46),(.25,1.35),(.20,1.20)],-.24,.045,'blue','Chest',.028);gem((0,-.31,1.34),.055,'orange','Chest')
 elif i in [11,12,17,19]:
  color={11:'white',12:'red',17:'ink',19:'silver'}[i];fittedtop(color,.87,1.48 if i in [12,17] else 1.41,True);barelegs('fur',.30 if i==11 else .20)
  if i==19:petalmini('silver');straps('silver');waistpanels('silver')
  else:dressskirt(color,.42 if i!=17 else .30,.39,slit=i in [12,17])
  if i==11:
   for s in [-1,1]:patch([(s*.02,1.59),(s*.15,1.58),(s*.26,1.44),(s*.11,1.38)],-.20,.03,'white','Chest',.025)
   cross((-.18,-.28,1.34),.06,'red','Chest');sleeves('white',.55)
  elif i==12:
   loft([(1.48,.15,.14,0,0),(1.62,.12,.13,0,0)],'red','Chest',seg=32)
   for j in range(3):buckle((.075,-.27,1.38-j*.065),.07,.025,'gold','Chest')
  elif i==17:
   for s in [-1,1]:patch([(s*.03,1.60),(s*.12,1.61),(s*.26,1.35),(s*.14,1.30)],-.20,.04,'ink','Chest',.025)
 elif i==13:
  fittedtop('pink',1.10,1.40,True);straps('pink');sleeves('cream',.59,True)
  for s in [-1,1]:
   for j in range(7):ell((s*(.16+j*.045),-.13,1.52-.07*(j/6)),(.065,.09,.075),'cream','Chest',14,10)
 elif i==14:
  fittedtop('ivorymetal',1.13,1.39)
  patch([(-.30,1.38),(-.05,1.45),(.32,1.36),(.27,1.25),(.03,1.35),(-.28,1.29)],-.26,.045,'cream','Chest',.035)
 elif i==18:
  fittedtop('cream',1.10,1.39,True);straps('cream',True)
  beadloop(arcpath((0,-.255,1.52),.19,.09,math.pi,math.tau,15),.018,'cream')
  gem((0,-.285,1.42),.042,'blue','Chest')
  for s in [-1,1]:cup((s*.17,-.23,1.33),'cream')

def bootplates(color='silver',height=.64):
 for s,l in [(-1,'R'),(1,'L')]:
  for j in range(4):
   z=.17+j*(height-.17)/4;x=s*.215
   patch([(x-.10,z),(x+.10,z),(x+.13,z+.11),(x,z+.15),(x-.13,z+.11)],-.145,.045,color,b.leg(l),.03)

def archivelegs(i):
 if i in [0,1,4,7,8,11,13,17,19]:
  barelegs('cream' if i==17 else 'fur',.67 if i in [1,19] else .45 if i in [8,11] else .18)
  color={0:'pink',1:'patent',4:'cream',7:'blue',8:'silver',11:'brown',13:'patent',17:'cream',19:'wine'}[i]
  pants(color,.15,short=True)
  for s,l in [(-1,'R'),(1,'L')]:
   x=s*.215
   if i in [0,17]:bow((x,-.18,.73 if i==0 else .56),.085,'pink',b.leg(l))
   if i==4:
    for j in range(2):loft([(.56+j*.09,.19,.19,x,0),(.60+j*.09,.205,.20,x,0),(.68+j*.09,.16,.17,x,0)],'cream',b.leg(l),folds=8,depth=.015,seg=40)
   if i==7:box((s*.34,-.04,.76),(.12,.24,.14),'cream',b.leg(l),.027)
   if i==11:
    for j in range(8):a=j*math.tau/8;ell((x+.16*math.cos(a),.15*math.sin(a),.46),(.06,.06,.07),'cream',b.leg(l),12,8)
   if i==13:
    for z in [.65,.73,.81]:gem((s*.34,-.14,z),.023,'silver',b.leg(l))
   if i==19:
    patch([(x-.085,.20),(x+.085,.20),(x+.10,.61),(x-.10,.61)],-.17,.024,'wine',b.leg(l),.012)
    for j in range(6):
     z=.24+j*.055
     for sign in [-1,1]:sw([(x+sign*.065,-.20,z),(x-sign*.065,-.20,z+.055)],[(.005,.004)]*2,'cream',b.leg(l),8)
  if i in [1,8]:bootplates('silver',.67 if i==1 else .52)
 elif i in [2,5,9,10,12,14,16]:
  barelegs('ink' if i in [2,5] else 'fur',.22)
  color={2:'cream',5:'blue',9:'white',10:'red',12:'brown',14:'ink',16:'silver'}[i]
  if i==16:petalmini('silver')
  else:dressskirt(color,.45 if i in [2,9,12,14] else .26,.36 if i in [2,10,12] else .44,slit=i==10)
  if i==5:
   for z,r in [(.33,.48),(.45,.45),(.57,.41)]:loft([(z,r,.29,0,0),(z+.05,r+.015,.30,0,0),(z+.14,r-.04,.27,0,0)],'cream',skirtweights,folds=12,depth=.02,seg=48)
  if i==9:
   for s in [-1,1]:patch([(s*.26,.85),(s*.34,.82),(s*.36,.49),(s*.27,.49)],-.21,.022,'red',skirtweights,.013)
  if i==12:
   loft([(.84,.34,.23,0,0),(1.01,.28,.20,0,0)],'brown','Pelvis',seg=48)
   for x in [-.12,.12]:buckle((x,-.23,.93),.08,.05,'bronze')
  if i==14:
   for x,c,shape in [(-.23,'red',0),(-.08,'cream',1),(.08,'red',1),(.23,'cream',0)]:
    if shape:gem((x,-.30,.63),.05,c,'Pelvis')
    else:heart((x,-.30,.63),.05,c,'Pelvis')
  if i==2:
   for j in range(5):ell((0,-.25,.81-j*.06),(.011,.009,.011),'gold','Pelvis',12,8)
 else:
  color={3:'patent',6:'patent',15:'cream',18:'denim'}[i];pants(color,.18 if i!=18 else .23,.055 if i in [15,18] else 0);shoes(2,'patent')
  if i==3:bootplates('gold',.63)
  if i==6:
   for s,l in [(-1,'R'),(1,'L')]:patch([(s*.22-.045,.79),(s*.22+.045,.79),(s*.22+.065,.21),(s*.22-.065,.21)],-.19,.025,'cyan',b.leg(l),.012)
  if i==18:
   for s,l in [(-1,'R'),(1,'L')]:box((s*.27,-.20,.72),(.16,.035,.16),'denim',b.leg(l),.018);loft([(.14,.25,.24,s*.215,0),(.22,.25,.24,s*.215,0)],'navy',b.leg(l),seg=32)
 # A fitted waist makes every option readable in the normal portrait crop.
 loft([(.85,.335,.23,0,0),(.91,.325,.22,0,0)],'cream' if i in [2,4,9,17] else 'ink','Pelvis',seg=40)
 buckle((0,-.24,.88),.075,.045,'silver' if i in [1,6,8,13,16] else 'gold')

def capcrown(color='ink'):
 # A true rounded crown built as a closed radial surface.
 v=[];seg=40;rows=13
 for k in range(rows):
  t=k/(rows-1);r=math.cos(t*math.pi/2);z=2.69+.30*math.sin(t*math.pi/2)
  for j in range(seg):a=j*math.tau/seg;v.append((.50*r*math.cos(a),.07+.38*r*math.sin(a),z))
 mesh(v,[(k*seg+j,k*seg+(j+1)%seg,(k+1)*seg+(j+1)%seg,(k+1)*seg+j) for k in range(rows-1) for j in range(seg)]+[tuple(reversed(range(seg)))],color)
 loft([(2.68,.50,.38,0,.07),(2.73,.50,.38,0,.07)],color,seg=40)

def brim(color='ink',back=False):
 v=[];cols=32
 for r in [0,1]:
  for j in range(cols+1):
   t=-1+2*j/cols;x=t*(.42+r*.03);yy=-.23-r*.29*math.sqrt(max(0,1-t*t));z=2.69-.04*r*(1-t*t);v.append((x,-yy+.12 if back else yy,z))
 o=mesh(v,[(j,j+1,cols+2+j,cols+1+j) for j in range(cols)],color)
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Solid brim','SOLIDIFY');mod.thickness=.028;bpy.ops.object.modifier_apply(modifier=mod.name)

def headset(color='ink',slim=False):
 pathcurve([(-.51,.10,2.43),(-.47,.15,2.75),(0,.16,2.92),(.47,.15,2.75),(.51,.10,2.43)],[(.018,.017) if slim else (.045,.029)]*5,color,steps=5)
 for s in [-1,1]:
  ell((s*.51,.10,2.43),(.08,.13,.15),color,seg=20,rings=12)
  ell((s*.54,-.01,2.43),(.07,.045,.105),'silver' if slim else 'gray',seg=20,rings=12)

def archivehats(i):
 if i in [0,2]:
  headset('ink' if i==0 else 'olive',i==0)
  if i==0:pathcurve([(-.51,.12,2.44),(-.45,.21,2.76),(0,.24,2.94),(.45,.21,2.76),(.51,.12,2.44)],[(.014,.014)]*5,'silver')
  else:box((.52,-.04,2.47),(.11,.08,.10),'olive',bevel=.018)
 elif i==1:
  capcrown('red')
  for j in range(30):
   a=j*2.399;z=2.74+(j%5)*.042;r=math.sqrt(max(.01,1-((z-2.69)/.30)**2));gem((.505*r*math.cos(a),.07+.385*r*math.sin(a),z),.016,'gold')
  for j in range(6):a=j*math.tau/6;sculptlock([(0,.07,2.98),(.12*math.cos(a),.07+.11*math.sin(a),3.04),(.23*math.cos(a),.07+.20*math.sin(a),2.96)],.05,'green')
 elif i in [3,6,10,11,13]:
  color={3:'navy',6:'plum',10:'ink',11:'orange',13:'cream'}[i];capcrown(color);brim(color,i==3)
  if i==6:
   for j in range(9):a=j*math.pi/8;sculptlock([(.43*math.cos(a),-.10+.2*math.sin(a),2.88),(.48*math.cos(a),-.10+.2*math.sin(a),3.05)],.055,'silver')
  if i==10:
   for s in [-1,1]:annulus((s*.19,-.27,2.84),.085,.059,.014,'gold')
  if i==11:
   for s in [-1,1]:sculptlock([(s*.29,.04,2.92),(s*.36,.08,3.08),(s*.43,.11,3.05)],.065,'cream');ell((s*.16,-.29,2.80),(.035,.015,.045),'ink',seg=16,rings=10)
  if i==13:box((0,-.294,2.83),(.31,.025,.10),'white',bevel=.012);label('CLEAN',(0,-.315,2.805),.055,'navy','Head')
  if i==3:
   box((0,-.31,2.72),(.19,.025,.055),'cream',bevel=.012)
   for x in [-.06,0,.06]:ell((x,-.325,2.72),(.007,.004,.008),'ink',seg=10,rings=6)
 elif i==4:
  loft([(2.69,.48,.36,0,.07),(2.78,.50,.37,0,.07),(2.96,.57,.42,0,.10),(2.99,.49,.36,0,.10)],'navy',seg=48);brim('patent')
  loft([(2.72,.50,.38,0,.07),(2.78,.50,.38,0,.07)],'gold',seg=40);star((0,-.335,2.86),.07,'gold')
 elif i==5:
  loft([(2.68,.49,.37,0,.07),(2.80,.50,.38,0,.07)],'red',seg=40);brim('red');label('M',(0,-.325,2.715),.09,'gold','Head')
 elif i in [7,14,19]:
  capcrown('cream' if i==7 else 'blue' if i==14 else 'ink')
  for j in range(3):loft([(2.66+j*.06,.505,.385,0,.07),(2.71+j*.06,.505,.385,0,.07)],'white' if i==7 else 'blue' if i==14 else 'cream',seg=40)
  if i!=7:
   bow((-.43,.14,2.73),.14,'blue' if i==14 else 'cream')
   for s in [-1,1]:sculptlock([(-.43,.20,2.72),(-.46+s*.055,.31,2.44),(-.38+s*.09,.38,2.20)],.06,'blue' if i==14 else 'cream')
 elif i==8:
  capcrown('red')
  for s in [-1,1]:
   pathcurve([(s*.20,.06,2.92),(s*.44,.05,3.05),(s*.64,.08,2.98),(s*.70,.11,2.78)],[(.16,.12),(.14,.11),(.08,.06),(.008,.008)],'red',seg=16)
   ell((s*.70,.11,2.75),(.055,.05,.055),'gold',seg=16,rings=10)
 elif i==9:
  for j,c in enumerate(['purple','blue','green','gold','red']):
   z=2.72+j*.075;r=.22*(1-j/6);loft([(z,r,r*.85,0,.05),(z+.075,r-.035,(r-.035)*.85,0,.05)],c,seg=32)
  for j in range(7):a=j*math.tau/7;ell((.035*math.cos(a),.05+.03*math.sin(a),3.105),(.035,.03,.035),'cream',seg=12,rings=8)
 elif i==12:
  capcrown('cream');loft([(2.68,.52,.40,0,.07),(2.80,.52,.40,0,.07)],'cream',folds=16,depth=.012,seg=48)
  for s in [-1,1]:pathcurve([(s*.25,.07,2.94),(s*.37,.09,3.05),(s*.41,.12,3.02)],[(.10,.08),(.07,.05),(.005,.005)],'cream')
 elif i==15:
  patch([(-.30,2.75),(-.24,2.98),(0,2.91),(.27,3.02),(.36,2.75),(.16,2.67),(0,2.71),(-.15,2.65)],-.28,.09,'cream',bulge=.035)
  for s in [-1,1]:patch([(s*.05,2.78),(s*.23,2.83),(s*.18,2.74)],-.35,.02,'red',rounded=False)
 elif i==16:
  headset('ink',True)
  patch([(-.23,2.76),(-.25,2.93),(.25,2.93),(.23,2.76),(0,2.70)],-.29,.12,'gray',bulge=.04)
  for s in [-1,1]:tube((s*.24,-.36,2.79),.085,.10,'ink');tube((s*.24,-.42,2.79),.063,.014,'silver')
 elif i==17:
  headset('brown',True)
  patch([(-.30,2.72),(-.34,3.04),(.34,3.04),(.30,2.72)],-.23,.10,'olive',bulge=.018)
  box((0,-.30,2.88),(.40,.04,.15),'ink',bevel=.018);box((0,-.327,2.88),(.34,.012,.105),'green',bevel=.008)
 else:
  for s in [-1,1]:heart((s*.20,-.36,2.66),.16,'pink',depth=.025);heart((s*.20,-.385,2.66),.13,'pale',depth=.009)
  pathcurve([(-.40,-.32,2.69),(0,-.39,2.69),(.40,-.32,2.69)],[(.012,.01)]*3,'silver')

def shoulderstrap(color='ink'):
 for s in [-1,1]:pathcurve([(s*.20,.21,1.43),(s*.23,.02,1.57),(s*.25,-.20,1.43),(s*.19,-.23,1.09)],[(.035,.018)]*4,color,'Chest')

def archivegear(i):
 if i in [0,19]:
  for row in range(4 if i==0 else 3):
   pts=[]
   for j in range(19):a=j*math.pi/18;pts.append((.27*math.cos(a),-.21-.035*math.sin(a),1.55-(.10+row*.05)*math.sin(a)))
   beadloop(pts,.019,'cream')
  gem((0,-.28,1.31 if i==0 else 1.36),.065,'blue','Chest')
  if i==19:
   for s in [-1,1]:beadloop([(s*(.23+.22*t),-.13,1.49-.10*math.sin(t*math.pi)) for t in [j/10 for j in range(11)]],.021,'cream')
 elif i in [1,3,4]:
  color='plum' if i==1 else 'bronze' if i==3 else 'ink';loft([(1.54,.18,.18,0,0),(1.65,.145,.15,0,0)],color,'Chest',seg=36)
  if i==1:flower((0,-.20,1.57),.10,'pink','Chest',3)
  elif i==3:
   for x in [-.12,.12]:
    tube((x,-.18,1.59),.047,.035,'gold','Chest',16)
    for j in range(8):a=j*math.tau/8;box((x+.048*math.cos(a),-.18,1.59+.048*math.sin(a)),(.018,.035,.018),'gold','Chest',.003)
  else:
   for j in range(7):a=math.pi+j*math.pi/6;x=.175*math.cos(a);y=.18*math.sin(a);gem((x,y-.012,1.60),.031,'silver','Chest')
 elif i==2:
  for s in [-1,1]:
   patch([(s*.025,1.53),(s*.10,1.50),(s*.11,1.37),(s*.24,1.44),(s*.29,1.37),(s*.16,1.27),(s*.25,1.18),(s*.19,1.12),(s*.07,1.23),(s*.01,1.28)],-.26,.05,'gold','Chest',.025)
  chain(arcpath((0,-.20,1.65),.16,.13,math.pi,math.tau,12),.015,.022,.005,'gold')
 elif i==5:
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(3):ell((s*(.34+j*.065),0,1.52-j*.025),(.14,.19,.065),'silver',b.arm(l),20,12)
 elif i==6:
  bow((0,-.21,1.54),.26,'plum','Chest');gem((0,-.275,1.54),.05,'silver','Chest')
 elif i in [7,8]:
  beadloop(arcpath((0,-.24,1.54),.24,.27,math.pi,math.tau,22),.018,'brown' if i==7 else 'silver')
  if i==7:cross((0,-.28,1.20),.085,'gold','Chest')
  else:
   for r1,r2,c in [(.09,.06,'silver'),(.06,.035,'cyan'),(.035,.018,'plum')]:annulus((0,-.28,1.23),r1,r2,.014,c,'Chest')
 elif i in [9,11]:
  shoulderstrap('wine' if i==11 else 'ink');box((.24,-.20,1.16),(.25,.11,.31),'wine' if i==11 else 'ink','Chest',.035)
  if i==9:phone((.24,-.29,1.25),.30,'Chest',False)
  else:
   for j in range(3):box((.20+j*.04,-.27-j*.008,1.28+j*.025),(.14,.015,.17),'cream','Chest',.004);box((.20+j*.04,-.28-j*.008,1.30+j*.025),(.11,.009,.10),'blue' if j%2 else 'plum','Chest',.002)
 elif i==10:
  shoulderstrap('brown');camcorder((.18,-.28,1.26),.36,'Chest')
 elif i==12:
  chain([(.34*math.cos(a),.24*math.sin(a),.91) for a in [j*math.tau/24 for j in range(24)]],.023,.036,.008,'silver','Pelvis')
  chain([(.34,.01,.85-j*.055) for j in range(5)],.022,.034,.008,'silver','Pelvis')
 elif i==13:
  brick((-.28,-.20,1.49),(.17,.09,.10),'blue','Chest');brick((-.23,-.24,1.55),(.12,.08,.08),'red','Chest')
 elif i==14:
  screen((-.34,-.10,1.59),.24,.20,'silver','Chest');box((-.34,.0,1.49),(.06,.06,.18),'gray','Chest',.008)
 elif i==15:
  for s in [-1,1]:
   for j in range(9):t=j/8;c=(s*(.14+.24*math.sin(t*math.pi*.75)),-.14+.03*t,1.57-.45*t);ell(c,(.095,.10,.10),'cream','Chest',14,10)
 elif i==16:
  loft([(.93,.33,.25,0,0),(.99,.33,.25,0,0)],'pink','Pelvis',seg=40)
  bow((.30,.17,1.00),.40,'pink','Pelvis')
  for s in [-1,1]:pathcurve([(.30+s*.08,.20,.98),(.30+s*.28,.22,.78),(.30+s*.32,.24,.53)],[(.10,.045),(.12,.05),(.07,.03)],'pink','Pelvis')
 elif i==17:
  for s,l in [(-1,'R'),(1,'L')]:
   for j in range(3):patch([(s*.23,1.52-j*.05),(s*.44,1.52-j*.05),(s*.60,1.33-j*.07),(s*.32,1.27-j*.07)],-.18,.075,'gray' if j%2 else 'silver',b.arm(l),.027)
 elif i==18:
  loft([(.87,.34,.24,0,0),(.93,.33,.23,0,0)],'wine','Pelvis',seg=40)
  for j in range(3):x=(j-1)*.14;box((x,-.25,.83),(.11,.025,.14),'cream','Pelvis',.007);flower((x,-.27,.84),.034,'pink','Pelvis',1)

# Props are authored at unit size, then transformed as complete assemblies.
def place_parts(before,c,scale=1,rot=(0,0,0)):
 from mathutils import Euler
 R=Euler(rot).to_matrix();center=Vector(c)
 for o in set(collection.objects)-before:
  if o.type=='MESH':
   for v in o.data.vertices:v.co=center+R@(v.co*scale)

def screen(c,w=.42,h=.32,color='silver',bone='Root',tilt=0):
 before=set(collection.objects)
 box((0,0,0),(w,.075,h),color,bone,.022)
 box((0,-.042,0),(w-.05,.020,h-.05),'ink',bone,.010)
 box((0,-.055,.006),(w-.075,.009,h-.085),'cyan',bone,.005)
 # Physical screen bars and tiny status lights sit inside the bezel.
 for j in range(4):box((-.09+j*.055,-.061,-h*.17),(.035,.006,.012),'cream',bone,.002)
 ell((w*.40,-.043,-h*.38),(.009,.006,.009),'green',bone,10,6)
 place_parts(before,c,1,(0,tilt,0))

def phone(c,scale=1,bone='Root',flip=True):
 before=set(collection.objects)
 box((0,0,0),(.25,.09,.45),'silver',bone,.035);box((0,-.051,.09),(.19,.012,.13),'ink',bone,.009);box((0,-.059,.09),(.15,.008,.09),'green',bone,.004)
 for row in range(4):
  for col in range(3):box(((col-1)*.057,-.053,-.04-row*.04),(.043,.018,.027),'gray',bone,.006)
 ring((0,-.057,-.008),.026,.022,.007,'silver',bone,20)
 if flip:
  box((0,0,.24),(.24,.10,.045),'gray',bone,.015)
  box((0,.05,.41),(.25,.06,.30),'silver',bone,.026);box((0,.012,.42),(.19,.015,.21),'ink',bone,.009);box((0,.002,.43),(.15,.006,.16),'blue',bone,.005)
 else:box((-.075,.015,.28),(.025,.03,.16),'ink',bone,.009)
 place_parts(before,c,scale,(.12,0,-.12))

def camcorder(c,scale=1,bone='Root'):
 before=set(collection.objects)
 box((0,0,0),(.48,.30,.27),'silver',bone,.05);box((.16,.06,-.055),(.20,.27,.25),'gray',bone,.035)
 for r,y,d,m in [(.115,-.19,.12,'gray'),(.102,-.26,.055,'ink'),(.088,-.29,.025,'silver'),(.069,-.307,.014,'cyan'),(.035,-.318,.008,'ink')]:tube((-.09,y,.04),r,d,m,bone)
 pathcurve([(-.17,.02,.15),(-.14,.03,.25),(.13,.03,.25),(.18,.03,.13)],[(.028,.025)]*4,'ink',bone,seg=10)
 box((-.31,-.015,.01),(.25,.055,.20),'silver',bone,.015);box((-.31,-.049,.012),(.20,.012,.15),'ink',bone,.005);box((-.31,-.057,.012),(.16,.008,.11),'blue',bone,.003)
 for j in range(3):ell((.12+j*.035,-.158,.09),(.011,.008,.011),'red' if j==0 else 'ink',bone,10,6)
 box((.07,.02,.17),(.10,.14,.065),'ink',bone,.012)
 place_parts(before,c,scale,(.10,-.15,-.15))

def brick(c,size=(.20,.11,.12),color='blue',bone='Root'):
 x,y,z=c;w,d,h=size;box(c,size,color,bone,.008)
 for j in range(max(2,round(w/.07))):
  xx=x-w*.35+j*w*.70/(max(2,round(w/.07))-1);o=tube((xx,y,z+h*.58),min(.023,w*.10),.025,color,bone,16);transform(o,(xx,y,z+h*.58),(math.pi/2,0,0))

def flame(c,r=.18,bone='Root'):
 x,y,z=c
 pathcurve([(x,y,z),(x-r*.22,y,z+r*.66),(x+r*.15,y,z+r*1.35),(x+r*.31,y+.02,z+r*1.85)],[(r*.62,r*.29),(r*.48,r*.23),(r*.24,r*.13),(.002,.002)],'orange',bone,seg=14)
 pathcurve([(x,y-r*.16,z),(x+r*.11,y-r*.18,z+r*.49),(x+r*.09,y-r*.12,z+r*.95)],[(r*.29,r*.14),(r*.23,r*.10),(.002,.002)],'gold',bone,seg=12)

def skullpot(c,scale=1):
 before=set(collection.objects)
 ell((0,0,0),(.25,.18,.25),'cream','Root',24,16)
 for s in [-1,1]:
  ell((s*.10,-.164,.04),(.073,.025,.079),'ink','Root',20,12);ell((s*.10,-.181,.035),(.045,.012,.045),'bronze','Root',16,10)
  ell((s*.18,-.06,-.09),(.08,.10,.08),'cream','Root',16,10)
 patch([(-.032,-.08),(0,-.025),(.032,-.08)],-.185,.016,'ink','Root',rounded=False)
 for j in range(6):box(((j-2.5)*.044,-.16,-.17),(.037,.045,.055),'cream','Root',.008)
 loft([(.19,.17,.13,0,0),(.23,.20,.15,0,0),(.26,.15,.12,0,0)],'cream','Root',seg=32);ell((0,0,.29),(.055,.04,.035),'gold','Root',16,10)
 pathcurve([(.18,0,.06),(.37,0,.15),(.40,0,-.06),(.21,0,-.12)],[(.035,.03)]*4,'gold','Root',seg=10)
 pathcurve([(-.19,0,-.02),(-.32,-.02,.03),(-.39,-.035,.19)],[(.09,.07),(.065,.05),(.045,.034)],'cream','Root',seg=14)
 tube((-.39,-.065,.19),.032,.018,'ink','Root',20)
 place_parts(before,c,scale,(0,.10,.15))

def archiveextras(i):
 if i==0:
  camcorder((-.91,.33,2.43),.72);camcorder((.91,.53,1.47),.46)
 elif i==1:phone((.90,.35,2.08),.90)
 elif i==2:
  for j,(x,z,s) in enumerate([(-.91,2.47,.68),(.93,2.15,.62),(-.85,1.43,.56)]):phone((x,.30+j*.13,z),s,'Root',j!=1)
 elif i==3:
  for j,(x,z) in enumerate([(-.96,2.47),(.92,1.80),(-.85,1.20),(0,3.04)]):
   before=set(collection.objects)
   for ro,ri,c in [(.23,.17,'silver'),(.17,.14,'cyan'),(.14,.11,'purple'),(.11,.075,'pink'),(.075,.027,'silver')]:annulus((0,0,0),ro,ri,.018,c,'Root',40)
   place_parts(before,(x,.34+j*.09,z),1,(.15*j,.16*j,.12*j))
 elif i==4:
  for j,(x,z) in enumerate([(-.90,2.50),(.90,1.85),(-.82,1.30),(0,3.02)]):
   before=set(collection.objects);box((0,0,0),(.34,.034,.42),'cream','Root',.006);box((0,-.022,.03),(.28,.012,.29),'ink','Root',.002)
   for k in range(5):box(((k-2)*.049,-.03,.03),(.045,.009,.22 if k%2 else .13),['blue','purple','pink','plum','orange'][k],'Root',.002)
   place_parts(before,(x,.36+j*.08,z),1,(.05*j,(-1)**j*.12,(-1)**j*.17))
 elif i==5:skullpot((.91,.29,1.55),.90)
 elif i==6:
  for strand,x in enumerate([-.98,-.76,.79,1.01]):
   path=[(x+.04*math.sin(j*.7),.50+strand*.07,1.05+j*.13) for j in range(16)];chain(path,.057,.095,.018,'silver','Root')
  chain(arcpath((0,.65,2.96),1.02,.40,math.pi,math.tau,22),.055,.084,.016,'silver','Root')
 elif i==7:
  x=.93;y=.37;z=1.63;loft([(z-.22,.07,.06,x,y),(z-.17,.14,.12,x,y),(z+.10,.15,.12,x,y),(z+.19,.09,.08,x,y)],'olive','Root',seg=32)
  for row in range(4):
   zz=z-.14+row*.075
   for j in range(8):a=j*math.tau/8;box((x+.13*math.cos(a),y+.11*math.sin(a),zz),(.065,.055,.06),'olive','Root',.008)
  box((x+.035,y,z+.23),(.07,.09,.14),'gray','Root',.008);box((x+.08,y-.035,z+.13),(.05,.03,.30),'silver','Root',.007);ring((x-.04,y,z+.27),.06,.065,.009,'silver','Root')
 elif i==8:
  x=.88;y=.45;z=2.18;ell((x,y,z),(.25,.25,.25),'blue','Root',32,18)
  for j in range(7):a=j*2.399;xx=x+.18*math.cos(a);zz=z+.17*math.sin(a);patch([(xx-.07,zz),(xx-.04,zz+.09),(xx+.06,zz+.06),(xx+.08,zz-.03),(xx,zz-.06)],y-.18,.035,'green','Root',.018)
  for j in range(5):flame((x+(j-2)*.075,y,2.36),.12+.025*(j%2))
 elif i==9:
  for s in [-1,1]:
   x=s*.86;loft([(1.05,.18,.18,x,.65),(2.13,.18,.18,x,.65)],'gray','Root',seg=24)
   for j in range(8):a=j*math.tau/8;box((x+.16*math.cos(a),.65+.16*math.sin(a),2.16),(.09,.09,.13),'gray','Root',.008)
   for z in [1.35,1.70,1.96]:box((x,.458,z),(.07,.015,.13),'ink','Root',.025)
   flame((x,.64,2.22),.25)
  box((0,.75,1.27),(1.40,.18,.45),'gray','Root',.02)
  for j in range(8):box(((j-3.5)*.17,.75,1.55),(.11,.19,.16),'gray','Root',.008)
 elif i==10:
  for s in [-1,1]:
   for j in range(6):brick((s*(.85+.04*(j%2)),.54,1.26+j*.28),(.28,.18,.18),['blue','cream','gold','red'][j%4])
  for j in range(5):brick(((j-2)*.32,.58,2.99),(.29,.18,.16),['white','blue','gray'][j%3])
 elif i==11:
  for j,(x,z,r) in enumerate([(-.94,2.60,.17),(.92,2.35,.22),(-.84,1.71,.15),(.84,1.20,.13),(0,3.00,.15)]):
   ell((x,.48+j*.04,z),(r,r,r),'glass','Root',24,14)
   sw(arcpath((x,.48+j*.04-r*.78,z),r*.68,r*.68,.35,1.9,16),[(.011,.008)]*16,'white','Root',8)
 elif i==12:
  cross((-.89,.55,2.02),.55,'plum','Root');cross((-.89,.50,2.02),.46,'cyan','Root');cross((.90,.72,2.60),.31,'pink','Root')
 elif i==13:
  screen((-.88,.45,2.43),.48,.37,'silver',tilt=-.15);screen((.92,.53,1.80),.43,.35,'silver',tilt=.12);screen((0,.68,3.00),.57,.27,'silver')
  for s in [-1,1]:box((s*.87,.64,2.15),(.045,.045,1.03),'gray','Root',.008)
 elif i==14:
  x=.91;y=.40;z=1.62;box((x,y+.10,z),(.48,.38,.40),'cream','Root',.04);screen((x,y-.12,z+.02),.41,.32,'cream');box((x,y,1.36),(.21,.23,.13),'gray','Root',.015);box((x,y-.30,1.29),(.48,.23,.055),'cream','Root',.013)
  for row in range(3):
   for col in range(8):box((x+(col-3.5)*.049,y-.38+row*.065,1.329),(.039,.045,.022),'gray','Root',.004)
 elif i==15:
  before=set(collection.objects);box((0,0,0),(1.08,.55,.15),'cream','Root',.045);box((0,-.18,.09),(.92,.16,.035),'gray','Root',.009)
  for row in range(4):
   for col in range(4):box((-.30+col*.14,-.05+row*.11,.09),(.11,.085,.035),'gray' if (row+col)%3 else 'pink','Root',.008)
  box((.30,.12,.09),(.25,.22,.025),'ink','Root',.008);box((.30,.12,.108),(.20,.16,.012),'green','Root',.005)
  for j in range(4):o=tube((.25+(j%2)*.12,-.14+(j//2)*.10,.13),.028,.045,'ink','Root',16);transform(o,(.25+(j%2)*.12,-.14+(j//2)*.10,.13),(math.pi/2,0,0))
  place_parts(before,(0,-.64,1.02),.90,(.48,0,0))
 elif i==16:
  x=-.91;y=.46;z=2.15;box((x,y,z),(.48,.07,.62),'gray','Root',.025)
  for j,poly in enumerate([[(-.20,-.25),(-.04,-.04),(-.21,.25)],[(-.04,-.04),(.18,.27),(-.20,.26)],[(-.02,-.05),(.20,-.22),(.20,.23)],[(-.20,-.27),(.18,-.25),(-.03,-.08)]]):
   o=patch([(x+xx,z+zz) for xx,zz in poly],y-.05-j*.008,.03,'cyan' if j%2 else 'blue','Root',.004,False);transform(o,(x,y,z),(j*.04,j*.05,0))
 elif i==17:
  for s in [-1,1]:
   for j in range(3):pathcurve([(s*.82,.55,1.10),(s*(.95+j*.03),.56,1.65),(s*.78,.66,2.11),(s*.95,.58,2.49),(s*.88,.64,2.95)],[(.13,.11),(.16,.12),(.13,.10),(.09,.07),(.003,.003)],'gray' if j==0 else 'cream','Root',seg=14,steps=5)
 elif i==18:
  for j,(x,z) in enumerate([(-.96,2.57),(.93,2.35),(-.87,1.75),(.86,1.22),(0,3.01)]):
   before=set(collection.objects);ell((0,0,.045),(.115,.09,.13),'cream','Root',20,12)
   for s in [-1,1]:pathcurve([(s*.05,0,0),(s*.06,.015,-.13),(s*.09,.03,-.24)],[(.06,.055),(.035,.03),(.003,.003)],'cream','Root',seg=12)
   place_parts(before,(x,.40+j*.06,z),.85,(j*.10,j*.17,j*.20))
 else:
  x=.90;y=.50;z=2.30;box((x,y,z),(.43,.04,.58),'cream','Root',.008)
  for s in [-1,1]:
   for j in range(9):ell((x+s*.215,y-.02,z-.26+j*.065),(.022,.014,.025),'cream','Root',10,6)
   for j in range(6):ell((x-.19+j*.075,y-.02,z+s*.29),(.026,.014,.022),'cream','Root',10,6)
  box((x,y-.027,z),(.34,.012,.47),'pale','Root',.004)
  flower((x-.04,y-.05,z+.02),.105,'pink','Root',2);flower((x+.07,y-.05,z-.14),.060,'pink','Root',2)
  label('80',(x-.10,y-.05,z+.16),.065,'plum','Root')

if __name__=='__main__':build_archive()
