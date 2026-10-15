"""Independent brows and face-fitted orb-free eyes, in the shared Head bind space.

Original interpretations of Drifella 2's angular cartoon expressions, graphic
eyeliner, curls, pixel overlays and glowing motifs. The original red brow geometry
is split out separately by the main builder; cheek marks remain on the head.
"""
BROW_VARIANTS=['arch','heavy','needle','raised','worried','slit','winged','flame','lightning','pixel','crescent','spiral']
ORB_FREE_EYES=['crescent','bolts','goggles','robot','stitched','target','petals','sleepmask']

def br_point(x,z,offset=.018):
 return sg_facepoint(x,z,offset)

def br_shape(p,outline,mat):
 front=[br_point(x,z,.027) for x,z in outline];back=[br_point(x,z,.008) for x,z in outline];n=len(outline)
 faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(p,front+back,faces,mat,'Head',False)

def br_strip(p,side,points,widths,mat):
 samples=[]
 for i,(a,b) in enumerate(zip(points,points[1:])):
  for j in range(6):
   t=j/6;samples.append((side*(a[0]*(1-t)+b[0]*t),a[1]*(1-t)+b[1]*t,widths[i]*(1-t)+widths[i+1]*t))
 samples.append((side*points[-1][0],points[-1][1],widths[-1]))
 verts=[]
 for i,(x,z,width) in enumerate(samples):
  a=samples[max(i-1,0)];b=samples[min(i+1,len(samples)-1)];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
  nx,nz=-dz/length*width/2,dx/length*width/2
  verts += [br_point(x+nx,z+nz,.027),br_point(x-nx,z-nz,.027),br_point(x+nx,z+nz,.007),br_point(x-nx,z-nz,.007)]
 faces=[]
 for i in range(len(samples)-1):
  a=i*4;b=a+4;faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,a+4,a+6,a+2),(a+1,a+3,a+7,a+5)])
 n=len(verts);faces.extend([(0,2,3,1),(n-4,n-3,n-1,n-2)])
 return mesh(p,verts,faces,mat,'Head')

arch=[(.12,2.46),(.20,2.52),(.30,2.55),(.40,2.52),(.46,2.47)]
for style in BROW_VARIANTS:
 p='Drif_Brows_'+style
 for s in [-1,1]:
  if style=='arch':br_strip(p,s,arch,[.009,.035,.044,.030,.004],sg_ink)
  elif style=='heavy':br_strip(p,s,[(.12,2.46),(.22,2.49),(.34,2.51),(.45,2.48)],[.025,.10,.11,.025],charcoal)
  elif style=='needle':br_strip(p,s,arch,[.004,.012,.014,.011,.002],sg_ink)
  elif style=='raised':br_strip(p,s,[(x,z+(.05 if s==1 else -.035)) for x,z in arch],[.009,.04,.05,.03,.004],sg_ink)
  elif style=='worried':br_strip(p,s,[(.12,2.57),(.20,2.55),(.34,2.47),(.44,2.45)],[.025,.05,.045,.006],sg_ink)
  elif style=='slit':
   br_strip(p,s,[(.12,2.46),(.20,2.49),(.28,2.51)],[.018,.06,.06],charcoal)
   br_strip(p,s,[(.32,2.52),(.39,2.53),(.46,2.50)],[.06,.052,.007],charcoal)
  elif style=='winged':br_shape(p,[(s*x,z) for x,z in [(.12,2.43),(.28,2.49),(.43,2.58),(.40,2.50),(.48,2.52),(.42,2.44),(.25,2.44)]],sg_red)
  elif style=='flame':
   br_shape(p,[(s*x,z) for x,z in [(.12,2.44),(.18,2.52),(.24,2.49),(.28,2.62),(.32,2.54),(.39,2.59),(.38,2.50),(.45,2.53),(.41,2.43)]],sp_orange)
   br_strip(p+'_core',s,[(.17,2.46),(.26,2.49),(.36,2.46)],[.015,.03,.006],sp_glowgold)
  elif style=='lightning':br_shape(p,[(s*x,z) for x,z in [(.11,2.44),(.26,2.56),(.29,2.51),(.45,2.60),(.36,2.47),(.31,2.50),(.17,2.42)]],sp_glowcyan)
  elif style=='pixel':
   for j,(x,z) in enumerate([(.14,2.46),(.20,2.50),(.26,2.54),(.32,2.54),(.38,2.50),(.44,2.46)]):br_shape(p,[(s*(x+dx),z+dz) for dx,dz in [(-.03,-.025),(.03,-.025),(.03,.025),(-.03,.025)]],sp_violet if j%2 else sp_glowcyan)
  elif style=='crescent':br_strip(p,s,[(.13,2.48),(.21,2.56),(.30,2.58),(.39,2.55),(.45,2.48)],[.002,.026,.048,.026,.002],sp_pearl)
  else:
   points=[]
   for j in range(41):
    t=j/40;a=t*math.tau*1.45;r=.012+.095*t;points.append(br_point(s*(.30+r*math.cos(a)),2.51+r*.7*math.sin(a),.026))
   line(p,points,.012,sp_violet,'Head',7)

# Fit the final eight graphic eyes directly against the curved face. Preserve
# local layer depths, and resize each symbol around its own eye center.
eye_scale={'crescent':1.10,'bolts':1.12,'goggles':1.0,'robot':1.10,'stitched':1.14,'target':1.12,'petals':1.18,'sleepmask':1.0}
for style in ORB_FREE_EYES:
 prefix='Drif_Eyes_'+style
 members=[o for o in collection.objects if o.type=='MESH' and (o.name==prefix or o.name.startswith(prefix+'_') or o.name.startswith(prefix+'.'))]
 assert not any('_socket' in obj.name for obj in members), (style,'unexpected black eye orb')
 for obj in members:
  for vertex in obj.data.vertices:
   x,y,z=vertex.co;s=-1 if x<0 else 1;scale=1 if '_bridge' in obj.name else eye_scale[style]
   x=s*.302+(x-s*.302)*scale;z=2.17+(z-2.17)*scale
   if style in ['robot','target']:
    # Keep layered panels/discs on one local tangent plane. Warping only their
    # boundary vertices lets the large base face cut through smaller details.
    z+=.05 if style=='robot' else .07
    cx=s*.302;cz=2.22 if style=='robot' else 2.24
    center_y=sg_facepoint(cx,cz,0)[1]
    dx=(sg_facepoint(cx+.01,cz,0)[1]-sg_facepoint(cx-.01,cz,0)[1])/.02
    dz=(sg_facepoint(cx,cz+.01,0)[1]-sg_facepoint(cx,cz-.01,0)[1])/.02
    head_y=center_y+dx*(x-cx)+dz*(z-cz)
    vertex.co=(x,head_y+y+.50,z)
   else:
    head_y=sg_facepoint(x,z,0)[1]
    vertex.co=(x,head_y+y+.52,z)
  obj.data.update()
print('BROWS_READY',BROW_VARIANTS,'ORB_FREE',ORB_FREE_EYES)
