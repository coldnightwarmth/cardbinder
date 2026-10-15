"""Three additional modeled options in every trait category; shared bind space."""
ENCORE_VARIANTS={
 'Eyes':['target','petals','sleepmask'], 'Mouth':['smirk','buckteeth','whistle'],
 'Shirt':['cardigan','flightjacket','sunburst'], 'Legs':['moonboots','checkers','ripped'],
 'Hat':['chef','straw','viking'], 'Accessory':['jetpack','shoulderpet','camerabag'],
 'Head':['pumpkin','tv','crystal'], 'Extra':['butterflies','ufo','rainbow'],
 'Tattoo':['chevrons','crescentmark','circuit'], 'Nose':['diamond','wood','metal'],
 'Ears':['fox','axolotl','robot'],
}
for style in ENCORE_VARIANTS['Eyes']:
 p='Drif_Eyes_'+style
 for s in [-1,1]:
  x=s*.302
  if style=='sleepmask':
   ell(p,(x,-.54,2.17),(.205,.045,.19),dm_lilac,n=16,m=10)
   line(p+'_lash',[(x-.10,-.59,2.19),(x,-.599,2.15),(x+.10,-.59,2.19)],.012,navy,'Head',6)
  else:
   if style=='target':
    for radius,mat in [(.14,sp_glowcyan),(.095,ink),(.048,sp_glowcyan)]:dm_disc(p,(x,-.56-(.14-radius)*.25,2.17),radius,mat)
   else:
    for j in range(6):
     a=j*math.tau/6;ell(p,(x+.085*math.cos(a),-.56,2.17+.10*math.sin(a)),(.05,.017,.065),sp_hot,n=10,m=8)
    dm_disc(p,(x,-.595,2.17),.045,dm_yellow)
 if style=='sleepmask':line(p+'_bridge',[(-.17,-.54,2.20),(0,-.51,2.20),(.17,-.54,2.20)],.035,dm_lilac,'Head')
for style in ENCORE_VARIANTS['Mouth']:
 p='Drif_Mouth_'+style
 if style=='smirk':
  mouth_line(p,[(-.18,1.80),(0,1.79),(.20,1.87)],r=.016)
  mouth_line(p,[(.15,1.88),(.23,1.86),(.24,1.81)],r=.009)
 elif style=='buckteeth':
  mouth_oval(p,.17,.055,1.81,mouth_cavity)
  for x in [-.043,.043]:mouth_panel(p,[(x-.039,1.85),(x+.039,1.85),(x+.035,1.74),(x-.035,1.74)],white,.035)
 else:
  mouth_oval(p,.045,.053,1.82,mouth_cavity);dm_loop(p,(0,-.676,1.82),(.055,.063),.013,pink)
for style in ENCORE_VARIANTS['Shirt']:
 cloth={'cardigan':dm_mint,'flightjacket':leg_olive,'sunburst':dm_yellow}[style]
 p,body,sleeves=dm_shirt_base(style,cloth,dm_cream if style=='cardigan' else navy,style=='flightjacket')
 if style=='cardigan':
  for s in [-1,1]:line(p+'_trim',[(s*.20,-.20,1.51),(s*.06,-.28,1.22),(s*.025,-.26,.80)],.025,dm_cream,torso_weights)
  for z in [.89,1.03,1.17]:dm_disc(p+'_button',(0,-.30,z),.022,dm_leather,'Chest')
  for s in [-1,1]:dm_box(p+'_pocket',(s*.24,-.27,.96),(.18,.025,.15),dm_mint,torso_weights)
 elif style=='flightjacket':
  line(p+'_zip',[(0,-.305,.80),(0,-.305,1.49)],.016,dm_silver,torso_weights)
  for s in [-1,1]:
   dm_box(p+'_pocket',(s*.22,-.29,1.10),(.18,.035,.20),leg_olive,torso_weights)
   line(p+'_flap',[(s*.22-.09,-.318,1.19),(s*.22+.09,-.318,1.19)],.013,navy,torso_weights)
  star(p+'_patch',(-.22,-.29,1.36),.06,.025,dm_cream,'Chest',points=5)
 else:
  dm_disc(p+'_sun',(0,-.30,1.22),.115,sp_orange,'Chest')
  for j in range(12):
   a=j*math.tau/12;line(p+'_ray',[(.15*math.cos(a),-.305,1.22+.15*math.sin(a)),(.21*math.cos(a),-.305,1.22+.21*math.sin(a))],.012,sp_orange,'Chest',5)
for style in ENCORE_VARIANTS['Legs']:
 p='Drif_Legs_'+style;cloth={'moonboots':dm_silver,'checkers':charcoal,'ripped':leg_denim}[style]
 rings(p+'_waist',[(.62,.35,.22,0,0),(.80,.35,.22,0,0)],cloth,'Pelvis',20)
 if style!='moonboots':subset(p+'_feet',foot_polygons)
 for s,label in [(-1,'R'),(1,'L')]:
  x=s*.215;weights=lower_weights(label)
  rings(p+'_leg',[leg_section(x,.21,.15),leg_section(x,.38,.175),leg_section(x,.53,.18),leg_section(x,.68,.18)],cloth,weights,16)
  if style=='moonboots':
   ell(p+'_boot',(x,-.07,.16),(.20,.29,.15),dm_silver,'Foot.'+label,n=16,m=10)
   for z in [.29,.36,.43]:dm_loop(p+'_rib',(x,0,z),(.185,.19),.018,navy,'Shin.'+label,'xy',16)
   ell(p+'_sole',(x,-.07,.055),(.205,.295,.045),navy,'Foot.'+label,n=16,m=8)
  elif style=='checkers':
   for row in range(5):
    for col in range(3):
     if (row+col)%2==0:dm_box(p+'_tile',(x+(col-1)*.09,-.18,.27+row*.08),(.08,.012,.075),dm_cream,weights)
  else:
   for z in [.39,.53]:
    dm_box(p+'_rip',(x,-.188,z),(.22,.016,.065),dm_sky,weights)
    for j in range(4):line(p+'_thread',[(x-.10,-.20,z-.025+j*.016),(x+.10,-.20,z-.018+j*.016)],.003,white,weights,4)
for style in ENCORE_VARIANTS['Hat']:
 p='Drif_Hat_'+style
 if style=='chef':
  rings(p,[(2.67,.37,.31,0,0),(2.91,.38,.32,0,0)],white,'Head',24)
  for x,y,z in [(-.20,0,3.03),(.20,0,3.03),(0,-.10,3.12),(0,.12,3.10)]:ell(p,(x,y,z),(.25,.25,.22),white,n=16,m=10)
 elif style=='straw':
  rings(p+'_brim',[(2.70,.68,.53,0,0),(2.74,.68,.53,0,0)],dm_tan,'Head',32)
  rings(p+'_crown',[(2.74,.34,.29,0,0),(3.03,.29,.24,0,0),(3.08,.22,.18,0,0)],dm_tan,'Head',24)
  rings(p+'_band',[(2.76,.345,.295,0,0),(2.84,.335,.285,0,0)],dm_burgundy,'Head',24)
  for j in range(5):dm_loop(p+'_weave',(0,0,2.748),(.39+j*.055,.32+j*.043),.004,stitch,'Head','xy',32)
 else:
  ell(p+'_cap',(0,0,2.68),(.40,.34,.34),dm_steel,n=20,m=12)
  for s in [-1,1]:rings(p+'_horn',[(2.72,.10,.10,s*.33,0),(2.82,.09,.09,s*.54,0),(3.03,.06,.06,s*.63,0),(3.19,.002,.002,s*.56,0)],white,'Head',12)
  line(p+'_ridge',[(0,-.34,2.63),(0,-.30,2.89),(0,0,3.03),(0,.30,2.89)],.028,dm_silver,'Head')
for style in ENCORE_VARIANTS['Accessory']:
 p='Drif_Accessory_'+style
 if style=='jetpack':
  dm_box(p+'_pack',(0,.35,1.22),(.47,.22,.55),dm_steel)
  for s in [-1,1]:
   rings(p+'_tank',[(.91,.13,.13,s*.28,.38),(1.45,.13,.13,s*.28,.38),(1.53,.08,.08,s*.28,.38)],dm_silver,'Chest',16)
   sp_cone(p+'_flame',(s*.28,.38,.90),(s*.28,.38,.62),.085,sp_glowcyan,'Chest')
   line(p+'_strap',[(s*.23,.31,1.45),(s*.26,-.22,1.43),(s*.23,-.29,.98)],.021,navy,torso_weights)
 elif style=='shoulderpet':
  c=Vector((.49,0,1.63));ell(p,c,(.17,.13,.18),sp_orange,'Chest',n=16,m=10)
  for s in [-1,1]:
   sp_cone(p,c+Vector((s*.10,0,.10)),c+Vector((s*.14,0,.29)),.08,sp_orange,'Chest')
   ell(p,c+Vector((s*.06,-.125,.03)),(.02,.01,.03),ink,'Chest',n=10,m=8)
  line(p+'_tail',[(.62,.08,1.53),(.79,.10,1.61),(.77,.10,1.78)],.055,sp_orange,'Chest')
 else:
  line(p+'_strap',[(-.24,.1,1.48),(-.25,-.25,1.42),(.33,-.29,.92),(.39,.05,.91)],.025,navy,torso_weights)
  dm_box(p+'_bag',(.34,-.22,.92),(.29,.15,.24),dm_tan,torso_weights)
  dm_disc(p+'_lens',(.34,-.31,.94),.09,charcoal,'Pelvis');dm_disc(p+'_glass',(.34,-.33,.94),.06,dm_sky,'Pelvis')
for style in ENCORE_VARIANTS['Head']:
 p='Drif_Head_'+style
 if style=='pumpkin':
  ell(p,(0,0,2.20),(.57,.46,.58),sp_orange,n=24,m=16)
  for j in range(9):
   a=j*math.tau/9;line(p+'_groove',[(.54*math.sin(t)*math.cos(a),.44*math.sin(t)*math.sin(a),2.20+.57*math.cos(t)) for t in [.15+i*(math.pi-.3)/20 for i in range(21)]],.012,dm_leather,'Head',5)
  for s in [-1,1]:plaque(p+'_eye',[(s*.10,2.29),(s*.37,2.26),(s*.25,2.47)],-.45,.02,sp_glowgold)
  line(p+'_grin',[(-.3,-.43,2.04),(-.15,-.48,1.98),(0,-.49,2.02),(.15,-.48,1.98),(.3,-.43,2.04)],.032,sg_ink,'Head')
  line(p+'_stem',[(0,0,2.72),(.04,0,2.96),(.15,0,3.01)],.065,leg_olive,'Head')
 elif style=='tv':
  dm_box(p+'_shell',(0,.02,2.20),(1.02,.73,.95),dm_steel,'Head')
  dm_box(p+'_screen',(0,-.36,2.23),(.85,.04,.72),sp_onyx,'Head')
  for s in [-1,1]:dm_box(p+'_eye',(s*.22,-.39,2.33),(.09,.018,.17),sp_glowcyan,'Head')
  line(p+'_smile',[(-.21,-.40,2.12),(0,-.40,2.06),(.21,-.40,2.12)],.015,sp_glowcyan,'Head')
  for s in [-1,1]:line(p+'_antenna',[(0,0,2.69),(s*.30,0,3.0)],.018,dm_silver,'Head');ell(p,(s*.3,0,3.0),(.04,.04,.04),sg_red,n=8,m=6)
 else:
  rings(p,[(1.62,.08,.08,0,0),(1.85,.43,.34,0,0),(2.27,.58,.46,0,0),(2.64,.36,.29,0,0),(2.97,.015,.015,0,0)],sp_violet,'Head',8)
  for s in [-1,1]:star(p+'_eye',(s*.23,-.44,2.26),.10,.025,sp_glowcyan,points=4)
  line(p+'_rune',[(0,-.38,2.56),(-.08,-.47,2.34),(0,-.48,2.05),(.08,-.47,2.34),(0,-.38,2.56)],.009,sp_glowpink,'Head',5)
for style in ENCORE_VARIANTS['Extra']:
 p='Drif_Extra_'+style
 if style=='butterflies':
  for i,(x,z,scale) in enumerate([(-.91,2.45,1),(.87,1.72,.8),(-.76,1.02,.65)]):
   start=len(pieces)
   for s in [-1,1]:
    # Raised wing tips add a folded-wing profile before each butterfly is tilted.
    wingstart=len(pieces)
    ell(p,(x+s*.09*scale,0,z+.06*scale),(.12*scale,.025,.15*scale),sp_hot,'Chest',n=12,m=8)
    ell(p,(x+s*.08*scale,0,z-.10*scale),(.09*scale,.025,.10*scale),dm_lilac,'Chest',n=12,m=8)
    sp_float_finish(wingstart,(x,0,z),(x,0,z),(0,0,s*(24+i*9)))
   line(p,[(x,-.03,z-.11*scale),(x,-.03,z+.12*scale)],.012,sg_ink,'Chest',5)
   sp_float_finish(start,(x,0,z),[(-1.07,.57,2.48),(1.0,-.44,1.80),(-.85,-.57,1.08)][i],[(18,21,-18),(-25,18,26),(28,-16,-22)][i])
 elif style=='ufo':
  start=len(pieces)
  ell(p,(.82,.14,2.80),(.32,.25,.065),dm_silver,'Chest',n=24,m=10)
  ell(p,(.82,.14,2.87),(.15,.14,.14),sp_glowcyan,'Chest',n=16,m=10)
  for j in range(8):
   a=j*math.tau/8;ell(p,(.82+.25*math.cos(a),.14+.19*math.sin(a),2.78),(.025,.025,.025),sp_glowgold,'Chest',n=8,m=6)
  for j in range(3):line(p,[(.75+j*.07,.14,2.72),(.58+j*.23,.14+(j-1)*.12,2.23)],.008,sp_glowcyan,'Chest',5)
  sp_float_finish(start,(.82,.14,2.80),(1.05,-.43,2.86),(12,-15,-14),.88)
 else:
  start=len(pieces)
  for i,mat in enumerate([sg_red,sp_orange,dm_yellow,sp_lime,sp_glowcyan,sp_violet]):
   r=1.03-i*.045;line(p,[(r*math.cos(j*math.pi/40),.46+i*.025+.10*math.sin(j*math.pi/20),1.96+r*math.sin(j*math.pi/40)) for j in range(41)],.027,mat,'Chest',7)
  for s in [-1,1]:
   for j in range(3):ell(p,(s*(.86+j*.10),.43+j*.05,1.95+(.06 if j==1 else 0)),(.16,.10,.11),white,'Chest',n=12,m=8)
  sp_float_finish(start,(0,.46,2.4),(-.38,.98,2.46),(-8,7,10))
for style in ENCORE_VARIANTS['Tattoo']:
 p='Drif_Tattoo_'+style
 for s in [-1,1]:
  if style=='chevrons':
   for j in range(3):sg_inkline(p,[(s*.43,2.10-j*.055),(s*.50,2.06-j*.055),(s*.56,2.10-j*.055)])
  elif style=='crescentmark':
   sg_inkline(p,[(s*.50+.035*math.cos(a),2.03+.065*math.sin(a)) for a in [math.pi*.3+j*math.pi*1.4/20 for j in range(21)]],.009)
  else:
   sg_inkline(p,[(s*.43,2.08),(s*.52,2.08),(s*.52,1.93),(s*.44,1.93)],.005)
   for x,z in [(s*.43,2.08),(s*.44,1.93)]:sg_mark(p,[(x+.012*math.cos(j*math.tau/8),z+.012*math.sin(j*math.tau/8)) for j in range(8)])
for style in ENCORE_VARIANTS['Nose']:
 p='Drif_Nose_'+style
 if style=='diamond':plaque(p,[(-.065,1.99),(0,2.06),(.065,1.99),(0,1.92)],-.69,.045,sp_glowcyan)
 elif style=='wood':sp_cone(p,(0,-.65,1.98),(0,-.93,2.02),.055,dm_tan)
 else:
  ell(p,(0,-.68,1.98),(.075,.05,.06),dm_silver,n=12,m=8)
  for s in [-1,1]:dm_disc(p,(s*.035,-.728,1.98),.014,sg_ink)
for style in ENCORE_VARIANTS['Ears']:
 p='Drif_Ears_'+style
 for s in [-1,1]:
  if style=='fox':
   plaque(p,[(s*.47,2.30),(s*.77,2.35),(s*.72,2.91)],.01,.17,sp_orange)
   plaque(p,[(s*.55,2.38),(s*.69,2.41),(s*.70,2.74)],-.01,.02,dm_cream)
  elif style=='axolotl':
   for j in range(3):
    z=2.18+j*.15;line(p,[(s*.51,0,z),(s*.79,0,z+.10)],.045,pink,'Head')
    for k in range(3):line(p,[(s*(.61+k*.07),0,z+.04+k*.025),(s*(.62+k*.07),0,z+.16+k*.025)],.018,sp_hot,'Head',5)
  else:
   dm_box(p,(s*.60,.02,2.30),(.18,.20,.40),dm_silver,'Head')
   for j in range(4):dm_box(p,(s*.70,-.09,2.18+j*.07),(.08,.02,.03),sp_glowcyan,'Head')
print('ENCORE_VARIANTS_READY',{k:len(v) for k,v in ENCORE_VARIANTS.items()})
