"""Fitted Mi Note garments: volumetric folds, lined hems and tailored panels."""
def mn_sleeve(p,s,label,mat,short=False,puff=False):
 end=.72 if short else 1.12;n=20;verts=[]
 sections=[(.32,.16),(.43,.21 if puff else .19),(.55,.225 if puff else .195),(end-.07,.18),(end,.175)]
 for k,(x,r) in enumerate(sections):
  for j in range(n):
   a=j*math.tau/n;rr=r+.009*math.cos(6*a+k*.8);verts.append((s*x,rr*math.cos(a),1.465+rr*math.sin(a)))
 mesh(p+'_sleeve',verts,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(4) for j in range(n)],mat,lambda co:dm_arm_weights(co,label))
 # Rolled sleeve opening has real thickness. Exposed arms belong to the body.
 st_cuff(p+'_rolledhem',s,'UpperArm.'+label if short else 'Forearm.'+label,mat,end-.025,end+.015,.18)
 if short:
  mn_ell(p+'_bareforearm',(s*.91,0,1.465),(.25,.12,.12),bpy.data.materials['Drif_Body_Main'],'Forearm.'+label,24,12)

def mn_top(p,mat,kind='shirt',short=False):
 full=kind in ['robe','poncho','dress','tabard'];hem=.19 if full else .77
 sections=[(hem,.55 if full else .40,.33 if full else .27,0,0),(.78,.44,.29,0,0),(1.03,.43,.30,0,0),(1.30,.40,.275,0,0),(1.48,.35,.23,0,0),(1.60,.22,.18,0,0)]
 if kind=='poncho':sections=[(.32,.64,.36,0,0),(.80,.60,.34,0,0),(1.25,.49,.30,0,0),(1.57,.23,.19,0,0)]
 if kind=='dress':sections=[(.18,.63,.38,0,0),(.38,.57,.35,0,0),(.70,.43,.29,0,0),(.91,.34,.25,0,0),(1.25,.40,.28,0,0),(1.49,.34,.23,0,0),(1.60,.22,.18,0,0)]
 sw_loft(p+'_tailoredshell',sections,mat,torso_weights,32,16 if kind in ['dress','robe'] else 9,.022 if full else .009,.025)
 for s,label in [(-1,'R'),(1,'L')]:mn_sleeve(p,s,label,mat,short,kind=='dress')
 sw_loft(p+'_collar',[(1.54,.235,.19,0,0),(1.61,.23,.185,0,0),(1.64,.21,.17,0,0)],mn_paper,'Chest',28,0,0,.025)
 if full:
  for s,label in [(-1,'R'),(1,'L')]:mn_ell(p+'_shoe',(s*.215,-.08,.10),(.17,.24,.10),mn_ink,'Foot.'+label)
 return sections

for i,style in enumerate(MN_VARIANTS['Shirt']):
 p='Drif_Shirt_'+style;kind={'mnchoirrobe':'robe','mnrainponcho':'poncho','mnsainttabard':'tabard','mnpetaldress':'dress'}.get(style,'shirt')
 mat=[mn_blue,mn_white,mn_ink,mn_purple,mn_red,mn_teal,mn_blue,mn_paper,mn_rose][i]
 mn_top(p,mat,kind,style in ['mnstrawberryknit','mnsailorsmock'])
 if style=='mnstrawberryknit':
  mn_artpanel(p+'_berryprint',6,(0,-.32,1.17),(.43,.43));sw_loft(p+'_ribhem',[(.76,.411,.285,0,0),(.84,.425,.29,0,0)],mn_sky,torso_weights,40,20,.008,.03)
 elif style=='mnsailorsmock':
  for s in [-1,1]:sc_profile(p+'_squarecollar',[(s*.03,1.32),(s*.32,1.53),(s*.25,1.60),(s*.06,1.48)],-.265,.055,mn_blue,'Chest',.012)
  mn_badge(p+'_anchorheart',0,1.27,.07,mn_gold,'heart',-.32)
  for z in [.86,.94]:sw_loft(p+'_stripe',[(z,.43,.305,0,0),(z+.035,.43,.305,0,0)],mn_blue,torso_weights,32,0,0,.012)
 elif style=='mnchoirrobe':
  sc_profile(p+'_scallopcollar',[(-.32,1.56),(-.23,1.34),(-.11,1.39),(0,1.30),(.11,1.39),(.23,1.34),(.32,1.56),(0,1.64)],-.29,.055,mn_white,'Chest',.018)
  for z in [1.22,1.08,.94]:mn_ell(p+'_button',(0,-.33,z),(.025,.016,.025),mn_gold,'Chest',12,8)
  mn_artpanel(p+'_iconpanel',24,(0,-.37,.53),(.28,.47),'Pelvis')
 elif style=='mnrainponcho':
  sc_profile(p+'_stormflap',[(-.22,1.51),(.22,1.51),(.30,1.26),(-.30,1.26)],-.32,.045,mn_sky,'Chest',.025)
  for s in [-1,1]:sc_box(p+'_pocket',(s*.25,-.345,.80),(.23,.06,.20),mn_purple,'Pelvis',.035)
  mn_artpanel(p+'_rainlabel',83,(0,-.37,1.08),(.19,.21))
 elif style=='mnjestertunic':
  for s in [-1,1]:
   sc_profile(p+'_lapel',[(s*.03,1.56),(s*.31,1.48),(s*.27,1.17),(s*.12,1.28)],-.29,.06,mn_gold,'Chest',.018)
   mn_ell(p+'_bell',(s*.27,-.32,1.15),(.047,.047,.055),mn_gold,'Chest',16,10)
  sc_profile(p+'_diamond',[(-.12,1.04),(0,1.19),(.12,1.04),(0,.88)],-.33,.04,mn_ink,'Chest',.01)
 elif style=='mnlaprascoat':
  mn_ell(p+'_belly',(0,-.27,1.10),(.28,.075,.32),mn_yellow,'Chest')
  for s in [-1,1]:sc_box(p+'_toggle',(s*.17,-.35,1.40),(.08,.045,.045),mn_paper,'Chest',.012)
  mn_artpanel(p+'_lagoonpatch',65,(.23,-.27,1.17),(.16,.20))
 elif style=='mncollagejacket':
  for s in [-1,1]:sc_profile(p+'_foldlapel',[(s*.04,1.59),(s*.27,1.49),(s*.20,1.23),(s*.08,1.39)],-.285,.05,mn_paper,'Chest',.015)
  mn_artpanel(p+'_leftpanel',1,(-.19,-.30,1.08),(.25,.37));mn_artpanel(p+'_rightpanel',58,(.19,-.30,1.08),(.25,.37))
 elif style=='mnsainttabard':
  for s in [-1,1]:sc_profile(p+'_stole',[(s*.17,1.59),(s*.28,1.50),(s*.27,.28),(s*.14,.23)],-.35,.05,mn_blue,torso_weights,.015)
  mn_badge(p+'_cross',0,1.19,.12,mn_gold,'cross',-.34)
 elif style=='mnpetaldress':
  for j in range(8):
   a=j*math.tau/8;x=.27*math.cos(a);y=.22*math.sin(a)
   o=mn_ell(p+'_collarpetal',(x,y,1.52),(.14,.11,.045),mn_paper,'Chest',16,10)
  mn_artpanel(p+'_flowerprint',49,(0,-.34,.49),(.36,.39),'Pelvis')

for i,style in enumerate(MN_VARIANTS['Legs']):
 p='Drif_Legs_'+style;mat=[mn_blue,mn_white,mn_ink,mn_purple,mn_red,mn_paper,mn_sky,mn_ink,mn_green][i]
 skirt=style in ['mnpleatskirt','mnchoirskirt']
 sw_loft(p+'_waist',[(.67,.35,.22,0,0),(.80,.32,.21,0,0)],mat,'Pelvis',24,0,0,.02)
 if skirt:sw_loft(p+'_pleats',[(.22 if style=='mnchoirskirt' else .38,.49,.30,0,0),(.57,.42,.27,0,0),(.77,.32,.21,0,0)],mat,'Pelvis',48,16,.026,.025)
 for s,label in [(-1,'R'),(1,'L')]:
  x=s*.215;w=lower_weights(label);boot=style in ['mnrainwaders','mnpetalboots'];short=style=='mnsailorshorts'
  sec=[(.20,.15,.17,x,0),(.33,.16,.18,x,0),(.48,.18,.19,x,0),(.62,.20,.21,x,0),(.73,.14,.155,s*.19,0)]
  if short:sec=sec[2:]
  if not skirt:sw_loft(p+'_leg',sec,mat,w,24,8,.012,.025)
  if short or skirt:mn_ell(p+'_stocking',(x,0,.31),(.14,.15,.22),mn_paper,'Shin.'+label)
  mn_ell(p+'_toe',(x,-.095,.115),(.18,.25,.11),mn_ink if not boot else mat,'Foot.'+label)
  sw_loft(p+'_sole',[(.025,.18,.25,x,-.09),(.065,.185,.255,x,-.09)],mn_ink,'Foot.'+label,24,0,0,.02)
  if boot:sw_loft(p+'_shaft',[(.12,.16,.18,x,0),(.38,.18,.20,x,0),(.53,.205,.215,x,0)],mat,w,24,5,.008,.03)
  if style=='mnquilttrousers':
   for z in [.32,.45,.58]:mn_ell(p+'_quilt',(x,-.175,z),(.14,.045,.075),mn_paper,w,16,10)
  if style=='mnpatchdenim':mn_artpanel(p+'_patch',2,(x,-.218,.56),(.19,.17),'Thigh.'+label)
  if style=='mnjesterpants':sc_profile(p+'_diamond',[(x-.10,.52),(x,.68),(x+.10,.52),(x,.36)],-.22,.035,mn_gold,w,.008)
  if style=='mnpetalboots':
   for k in [-1,0,1]:mn_ell(p+'_petalcuff',(x+k*.085,-.17,.50),(.06,.045,.10),mn_rose,'Shin.'+label,16,10)

# Headwear follows the skull crown; the fin corridor remains open.
for i,style in enumerate(MN_VARIANTS['Hat']):
 p='Drif_Hat_'+style
 if style=='mnberrybonnet':
  st_dome(p,mn_red,.60,.54,2.61,.34,.016)
  for j in range(13):
   a=j*2.4;x=.48*math.cos(a);y=.02+.44*math.sin(a);z=2.70+.16*(j%3)/2
   mn_ell(p+'_seed',(x,y,z),(.025,.018,.035),mn_gold,'Head',12,8)
  for s in [-1,1]:sc_profile(p+'_leaf',[(s*.04,2.93),(s*.30,3.07),(s*.29,2.91),(s*.12,2.88)],-.05,.07,mn_green,'Head',.015)
 elif style=='mncakefascinator':
  sc_lathe(p+'_cake',(0,.04,2.69),[(0,.43),(.06,.44),(.08,.38),(.28,.36),(.31,.34)],mn_paper,'Head',32)
  for j in range(9):
   a=j*math.tau/9;mn_ell(p+'_icing',(.35*math.cos(a),.04+.35*math.sin(a),2.93),(.09,.09,.06),mn_white,'Head',16,10)
  for x,y in [(-.16,-.08),(.13,-.10),(0,.17)]:mn_ell(p+'_berry',(x,y,3.015),(.07,.07,.095),mn_red,'Head',16,10)
 elif style=='mnmitre':
  sc_profile(p+'_mitre',[(-.40,2.62),(.40,2.62),(.35,2.94),(0,3.08),(-.35,2.94)],.08,.36,mn_paper,'Head',.025)
  mn_badge(p+'_cross',0,2.91,.12,mn_gold,'cross',-.12,'Head')
 elif style=='mnfez':
  sc_lathe(p+'_felt',(0,.06,2.65),[(0,.43),(.045,.45),(.34,.35),(.37,.34)],mn_red,'Head',32)
  sw_sweep(p+'_tassel',[(0,.06,3.03,.045),(.18,-.02,3.02,.04),(.34,-.10,2.93,.035),(.37,-.10,2.78,.06)],mn_ink,'Head',10)
 elif style=='mnsailorpillbox':
  sc_lathe(p+'_cap',(0,.03,2.66),[(0,.49),(.08,.51),(.12,.49),(.21,.44),(.23,.42)],mn_white,'Head',32)
  sw_loft(p+'_ribbon',[(2.67,.495,.495,0,.03),(2.73,.515,.515,0,.03)],mn_blue,'Head',32,0,0,.015)
  mn_badge(p+'_badge',0,2.80,.07,mn_gold,'cross',-.465,'Head')
 elif style=='mnjestercoif':
  st_dome(p,mn_red,.59,.53,2.63,.24,.025)
  for s in [-1,1]:
   sw_sweep(p+'_capfold',[(s*.24,.05,2.81,.17),(s*.44,.06,3.01,.13),(s*.61,.02,2.98,.10),(s*.65,-.02,2.80,.055)],mn_red,'Head',16)
   mn_ell(p+'_bell',(s*.65,-.02,2.75),(.075,.075,.08),mn_gold,'Head',16,10)
 elif style=='mnbandagedcap':
  st_dome(p,mn_paper,.60,.54,2.61,.25,.014)
  for k in range(4):
   o=sw_loft(p+'_wrap',[(2.59+k*.055,.59-k*.018,.54-k*.016,0,.03),(2.65+k*.055,.595-k*.018,.545-k*.016,0,.03)],mn_white if k%2 else mn_paper,'Head',40,4,.004,.024)
  sc_profile(p+'_patch',[(-.25,2.70),(-.06,2.73),(-.07,2.86),(-.25,2.83)],-.515,.026,mn_rose,'Head',.01)
 elif style=='mnlagooncap':
  st_dome(p,mn_sky,.60,.54,2.62,.26,.012)
  for s in [-1,1]:sw_sweep(p+'_curledfin',[(s*.32,.03,2.76,.13),(s*.42,.03,2.98,.12),(s*.37,-.01,3.03,.085),(s*.25,-.06,3.01,.055)],mn_sky,'Head',16)
  sc_profile(p+'_crest',[(-.12,2.85),(0,3.10),(.12,2.85)],-.14,.13,mn_paper,'Head',.025)
 elif style=='mnpetalveil':
  st_dome(p,mn_paper,.60,.54,2.62,.18,.014)
  for j in range(7):
   a=math.pi+j*math.pi/6;x=.49*math.cos(a);y=.03+.49*math.sin(a)
   for k in range(5):
    t=k*math.tau/5;mn_ell(p+'_petal',(x+.06*math.cos(t),y-.02,2.76+.06*math.sin(t)),(.065,.03,.045),mn_rose,'Head',12,8)
   mn_ell(p+'_heart',(x,y-.05,2.76),(.035,.026,.035),mn_gold,'Head',12,8)
  sw_loft(p+'_veil',[(2.00,.55,.48,0,.22),(2.39,.61,.54,0,.20),(2.69,.48,.42,0,.18)],mn_paper,'Head',32,12,.018,.015)
  # Remove the front half of the drape to leave the entire face visible.
  o=pieces[-1];bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.y<.10],context='VERTS');bm.to_mesh(o.data);bm.free()
