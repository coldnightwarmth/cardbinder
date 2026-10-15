"""Nine torso-mounted objects and nine surrounding compositions. No hand props."""
def mn_bell(p,c,r=.15,bone='Chest'):
 x,y,z=c;sc_lathe(p+'_bell',c,[(-r,.90*r),(-r*.8,r),(-r*.55,.78*r),(r*.45,.45*r),(r*.70,.16*r)],mn_gold,bone,24)
 mn_ell(p+'_clapper',(x,y,z-r),(.20*r,.20*r,.25*r),mn_ink,bone,12,8)
 sc_ring(p+'_loop',(x,y,z+r),r*.22,r*.28,r*.07,mn_gold,bone,n=16,m=6)

def mn_shoulderstraps(p,mat):
 for s in [-1,1]:
  # Thick shaped straps follow the front chest and crest of each shoulder.
  sw_sweep(p+'_strap',[(s*.24,-.30,.91,.035),(s*.29,-.31,1.28,.035),(s*.30,-.17,1.55,.035),(s*.30,.14,1.55,.035),(s*.25,.30,1.18,.035)],mat,'Chest',8)

def mn_book(p,c,size=(.42,.32,.10),bone='Root',mat=mn_blue):
 x,y,z=c;w,h,t=size
 sc_box(p+'_pages',(x,y,z),(w-.03,t,h-.025),mn_paper,bone,.012)
 for yy in [y-t*.6,y+t*.6]:sc_box(p+'_cover',(x,yy,z),(w,.025,h),mat,bone,.008)
 sc_box(p+'_spine',(x-w*.5,y,z),(.035,t*1.35,h),mat,bone,.01)
 for zz in [-.08,0,.08]:sc_box(p+'_pagegap',(x+w*.47,y,z+zz),(.008,t*.70,.007),mn_gold,bone,.001)

for i,style in enumerate(MN_VARIANTS['Accessory']):
 p='Drif_Accessory_'+style
 if style=='mnhalogorget':
  sw_loft(p+'_collar',[(1.44,.29,.24,0,0),(1.52,.32,.26,0,0),(1.59,.25,.21,0,0)],mn_gold,'Chest',32,10,.008,.035)
  for s in [-1,1]:sc_profile(p+'_wing',[(s*.20,1.52),(s*.42,1.70),(s*.62,1.63),(s*.54,1.42),(s*.33,1.37)],-.13,.12,mn_white,'Chest',.025)
 elif style=='mnbellharness':
  mn_shoulderstraps(p,mn_ink);mn_bell(p,(0,-.43,1.18),.18)
  sc_box(p+'_breastplate',(0,-.335,1.34),(.48,.08,.14),mn_gold,'Chest',.035)
 elif style=='mnheartlocket':
  sw_loft(p+'_ribbon',[(1.44,.28,.235,0,0),(1.51,.29,.24,0,0)],mn_red,'Chest',32,0,0,.025)
  mn_badge(p+'_outer',0,1.32,.18,mn_gold,'heart',-.34);mn_badge(p+'_enamel',0,1.32,.14,mn_red,'heart',-.37)
  mn_ell(p+'_gem',(0,-.41,1.33),(.055,.03,.06),mn_glass,'Chest')
 elif style=='mnrainpauldrons':
  for s in [-1,1]:
   for k in range(3):mn_ell(p+'_overlap',(s*(.37+.075*k),.03,1.53-.035*k),(.16,.27,.09),mn_sky,'Chest',20,10)
  mn_shoulderstraps(p,mn_purple)
 elif style=='mnneckphones':
  sc_ring(p+'_headband',(0,.02,1.51),.35,.25,.045,mn_ink,'Chest','xy',32,8)
  for s in [-1,1]:
   mn_ell(p+'_earcup',(s*.31,-.24,1.42),(.12,.10,.16),mn_gold,'Chest')
   mn_ell(p+'_cushion',(s*.30,-.32,1.42),(.09,.045,.12),mn_ink,'Chest')
   sc_box(p+'_hinge',(s*.35,-.03,1.52),(.045,.11,.08),mn_white,'Chest',.014)
 elif style=='mnnotesatchel':
  mn_shoulderstraps(p,mn_blue);mn_book(p,(.38,-.25,.99),(.31,.34,.14),'Chest',mn_blue)
  sc_profile(p+'_flap',[(.21,1.18),(.56,1.18),(.51,1.04),(.28,1.04)],-.355,.04,mn_paper,'Chest',.018)
  mn_badge(p+'_stamp',.39,1.09,.055,mn_red,'star',-.39)
 elif style=='mnbrushquiver':
  mn_shoulderstraps(p,mn_ink)
  sc_lathe(p+'_quiver',(.39,.35,1.32),[(0,.15),(.08,.16),(.53,.17),(.56,.18)],mn_blue,'Chest',24)
  for j in range(3):
   x=.30+j*.10;y=.36+(j%2)*.07;z=1.79+j*.12
   sc_lathe(p+'_handle',(x,y,1.61),[(0,.025),(z-1.61,.032)],mn_paper,'Chest',12)
   sc_box(p+'_ferrule',(x,y,z),(.10,.055,.10),mn_gold,'Chest',.01)
   mn_ell(p+'_bristles',(x,y,z+.11),(.055,.035,.10),mn_rose if j==1 else mn_sky,'Chest',16,10)
 elif style=='mnshellpack':
  mn_shoulderstraps(p,mn_teal);mn_ell(p+'_shell',(0,.39,1.22),(.43,.20,.48),mn_sky,'Chest')
  for j in range(7):
   a=j*math.pi/6;sw_sweep(p+'_rib',[(.34*math.cos(a),.47,1.12,.045),(.40*math.cos(a),.53,1.38+.21*math.sin(a),.075),(.18*math.cos(a),.42,1.71,.045)],mn_paper,'Chest',8)
 elif style=='mnpearlcollar':
  sw_loft(p+'_lace',[(1.40,.37,.28,0,0),(1.49,.34,.27,0,0),(1.59,.24,.20,0,0)],mn_paper,'Chest',48,16,.022,.024)
  for j in range(11):
   a=math.pi+j*math.pi/10;mn_ell(p+'_pearl',(.34*math.cos(a),.27*math.sin(a)-.01,1.45),(.04,.04,.04),mn_white,'Chest',12,8)

# Shift the back pieces toward the silhouette so their forms read in the portrait.
for o in collection.objects:
 if o.type!='MESH':continue
 if o.name.startswith('Drif_Accessory_mnbrushquiver_') and '_strap' not in o.name:
  for v in o.data.vertices:
   v.co.x-=1.12;v.co.y-=.16;v.co.z=1.25+(v.co.z-1.25)*1.6
 if o.name.startswith('Drif_Accessory_mnshellpack_') and '_strap' not in o.name:
  for v in o.data.vertices:v.co.x+=.40;v.co.y-=.10

# Root-mounted compositions stagger objects in depth and reserve the face lane.
for i,style in enumerate(MN_VARIANTS['Extra']):
 p='Drif_Extra_'+style
 if style=='mnopenbook':
  for s in [-1,1]:
   before=set(collection.objects);mn_book(p,(s*.36,-.79,.96),(.70,.48,.10),'Root',mn_blue)
   mn_paperpanel(p+'_paper',(s*.36,-.856,.96),(.64,.42),'Root')
   sc_transform([o for o in collection.objects if o not in before],(s*.36,-.79,.96),(-.25,0,-s*.18))
  sc_box(p+'_plinth',(0,-.59,.43),(.28,.32,.47),mn_paper,'Root',.035)
 elif style=='mnchapelarch':
  for s in [-1,1]:
   sc_box(p+'_pillar',(s*1.13,.43,1.66),(.22,.30,1.55),mn_paper,'Root',.025)
   sc_box(p+'_base',(s*1.13,.43,.85),(.35,.42,.16),mn_blue,'Root',.025)
   sc_profile(p+'_arch',[(s*1.24,2.40),(s*1.12,2.71),(s*.77,2.99),(0,3.09),(0,2.97),(s*.65,2.91),(s*1.02,2.48)],.43,.30,mn_paper,'Root',.025)
  mn_badge(p+'_keystone',0,3.03,.09,mn_gold,'cross',.23,'Root')
 elif style=='mnbellmobile':
  for j,(x,y,z,r) in enumerate([(-.97,.08,2.50,.13),(.97,.05,2.17,.15),(.77,-.18,2.91,.10),(-.98,-.27,1.27,.14)]):
   mn_bell(p,(x,y,z),r,'Root');sc_ring(p+'_suspension',(x,y,z+.30),.07,.14,.014,mn_gold,'Root',n=16,m=6)
 elif style=='mnpaintstill':
  for x,y,z,col in [(-.94,-.30,1.20,mn_rose),(1.03,.03,1.05,mn_blue),(.88,-.51,.67,mn_yellow)]:
   sc_lathe(p+'_paintjar',(x,y,z),[(-.15,.13),(-.12,.16),(.10,.16),(.14,.12),(.18,.13)],mn_paper,'Root',24)
   sc_lathe(p+'_lid',(x,y,z+.18),[(0,.14),(.04,.14)],col,'Root',24)
   mn_badge(p+'_label',x,z,.065,col,'star',y-.16,'Root')
  mn_book(p,(-.88,.10,2.48),(.37,.49,.10),'Root',mn_red)
 elif style=='mnloosepages':
  for j,(x,y,z) in enumerate([(-1.0,.05,2.5),(1.02,.20,2.67),(-.88,-.35,1.14),(.98,-.44,1.29),(.63,.30,3.04)]):
   verts=[];n=5
   for row in range(n):
    for col in range(n):
     u=col/(n-1)-.5;v=row/(n-1)-.5;verts.append((x+u*.34,y+.09*math.sin(u*4+v*3),z+v*.41))
   o=mesh(p+'_curledsheet',verts,[(r*n+c,r*n+c+1,(r+1)*n+c+1,(r+1)*n+c) for r in range(n-1) for c in range(n-1)],mn_paper,'Root');uv=o.data.uv_layers.new(name='Paper surface');uv.active_render=True
   for f in o.data.polygons:
    for li in f.loop_indices:
     vi=o.data.loops[li].vertex_index;uv.data[li].uv=(vi%n/(n-1),vi//n/(n-1))
   mod=o.modifiers.new('Paper edge','SOLIDIFY');mod.thickness=.012;sc_apply(o,mod);sc_transform([o],(x,y,z),(.1*j,.15*j,.2*(j-2)))
 elif style=='mnstagecurtain':
  for s in [-1,1]:
   sw_loft(p+'_velvet',[(.70,.23,.15,s*1.12,.49),(1.34,.13,.12,s*1.19,.49),(2.10,.27,.18,s*1.13,.49),(2.91,.32,.19,s*.99,.49)],mn_red,'Root',32,8,.028,.025)
   sc_ring(p+'_tie',(s*1.18,.49,1.40),.16,.14,.028,mn_gold,'Root','xy',24,8)
  sc_box(p+'_valance',(0,.52,2.99),(2.55,.27,.20),mn_red,'Root',.06)
 elif style=='mnpapersun':
  sc_lathe(p+'_disc',(0,.72,2.29),[(0,.76),(.08,.78),(.13,.74)],mn_yellow,'Root',48,'y')
  for j in range(12):
   a=j*math.tau/12;cx= .88*math.cos(a);cz=2.29+ .88*math.sin(a)
   sc_profile(p+'_ray',[(cx-.065*math.sin(a),cz+.065*math.cos(a)),(1.03*math.cos(a),2.29+1.03*math.sin(a)),(cx+.065*math.sin(a),cz-.065*math.cos(a))],.77,.07,mn_gold,'Root',.012)
 elif style=='mnprismrain':
  for j in range(12):
   s=-1 if j%2 else 1;x=s*(.88+.09*((j*7)%3));y=-.35+.19*(j%4);z=.82+(j//2)*.40
   sc_profile(p+'_drop',[(x,z+.13),(x-.065,z-.04),(x,z-.11),(x+.065,z-.04)],y,.10,mn_palette[j%9],'Root',.012)
 elif style=='mnblockshrine':
  for s in [-1,1]:
   for j in range(3):
    x=s*(1.05+.08*(j%2));y=.33-j*.15;z=.96+j*.46
    sc_box(p+'_brick',(x,y,z),(.31,.32,.33),mn_green if j%2 else mn_paper,'Root',.025)
    sc_profile(p+'_inset',[(x-.08,z-.09),(x+.08,z-.09),(x+.08,z+.09),(x-.08,z+.09)],y-.17,.02,mn_blue,'Root',.008)
