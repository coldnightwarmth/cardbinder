"""Third wardrobe expansion. Run inside build_drifmaker.py before its join pass.

All geometry is authored in the original bind space and weighted by the same
helpers. The five replacement heads interpret the supplied collection images;
no source-image text or background collages are baked into the character.
"""
import random

SPECTRAL_VARIANTS={
 'Eyes':['venom','anime','galaxy','dice','gears','crescent','bolts','goggles','robot','stitched'],
 'Mouth':['venom','zipper','bubblegum','ooh','moustache','beak','pacifier','stitches','candy','respirator'],
 'Shirt':['varsity','sailor','kimono','punkvest','spacesuit','knight','poncho','disco','botanical','racer'],
 'Legs':['flare','plaid','greaves','cyber','fishnet','rainbow','samurai','pajamas','skateshorts','harem'],
 'Hat':['beret','cowboy','mushroom','ushanka','flowercrown','samurai','lotus','jester','sharkhood','tiara'],
 'Accessory':['sword','angelwings','batwings','mechwings','shield','prayerbeads','potionbelt','spellbook','boombox','lantern'],
 'Head':['void','vortex','gasmask','glitch','hockey'],
 'Extra':['mon','saiyanaura','ornateframe','spiritflames','planets','arcane','storm','crystals','pixelstars','tentacles','dragon','cards'],
}

sp_hot=material('Drif_Spectral_HotPink',(.9,.015,.3),.33)
sp_lime=material('Drif_Spectral_Lime',(.37,.92,.02),.4)
sp_orange=material('Drif_Spectral_Orange',(.95,.16,.018),.5)
sp_violet=material('Drif_Spectral_Violet',(.23,.018,.6),.4)
sp_stone=material('Drif_Spectral_Stone',(.23,.28,.24),.94)
sp_pearl=material('Drif_Spectral_Pearl',(.88,.93,.91),.24,.2)
sp_onyx=material('Drif_Spectral_Onyx',(.004,.006,.012),.48,.15)

def sp_glow(name,color,strength=2,alpha=1):
 mat=material('Drif_FX_'+name,color,.5)
 bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 bs.inputs['Emission Color'].default_value=(*color,1)
 bs.inputs['Emission Strength'].default_value=strength
 bs.inputs['Alpha'].default_value=alpha
 mat.diffuse_color=(*color,alpha)
 if alpha<1 and hasattr(mat,'surface_render_method'):
  modes=[i.identifier for i in mat.bl_rna.properties['surface_render_method'].enum_items]
  if 'BLENDED' in modes:mat.surface_render_method='BLENDED'
 return mat

sp_glowgold=sp_glow('Gold',(.98,.48,.015),2)
sp_glowcyan=sp_glow('Cyan',(.025,.85,1),2)
sp_glowpink=sp_glow('Pink',(.95,.03,.5),1.7)
sp_glowwhite=sp_glow('White',(.75,.93,1),3)
sp_ghost=sp_glow('GhostFuzz',(.45,.9,1),.7,.25)

def sp_cone(name,base,tip,radius,mat,bone='Head',sides=8):
 a,b=Vector(base),Vector(tip);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.01:u=axis.cross(Vector((1,0,0)))
 u.normalize();v=axis.cross(u)
 verts=[tuple(a+radius*(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides))) for j in range(sides)]+[tuple(b)]
 return mesh(name,verts,[tuple(reversed(range(sides)))]+[(j,(j+1)%sides,sides) for j in range(sides)],mat,bone,False)

def sp_face(prefix,side,shape,mat):
 x=side*.302
 return plaque(prefix,[(x+side*a,2.17+b) for a,b in shape],-.541,.02,mat)

# Ten eye sets, including large jagged symbiote eyes.
for style in SPECTRAL_VARIANTS['Eyes']:
 p='Drif_Eyes_'+style
 for s in [-1,1]:
  x=s*.302
  if style!='venom':dm_eye_socket(p,x,ink,.235)
  if style=='venom':
   plaque(p+'_white',[(x+s*a,2.25+b) for a,b in [(-.16,-.02),(-.09,-.17),(.04,-.19),(.15,-.10),(.22,.08),(.23,.27),(.13,.18),(.18,.35),(.02,.20),(-.10,.11)]],-.56,.02,sp_pearl)
  elif style=='anime':
   ell(p+'_white',(x,-.51,2.17),(.15,.036,.205),white,n=16,m=10)
   ell(p+'_iris',(x-s*.025,-.553,2.16),(.09,.018,.15),sp_violet,n=14,m=10)
   ell(p+'_pupil',(x-s*.025,-.575,2.15),(.04,.008,.10),ink,n=12,m=8)
   for dx,z,r in [(-.035,2.24,.035),(.04,2.13,.017)]:ell(p+'_shine',(x+dx,-.587,z),(r,.006,r*1.2),glint,n=8,m=6)
  elif style=='galaxy':
   dm_disc(p+'_cosmos',(x,-.539,2.17),.145,sp_violet)
   for k in range(4):
    a=k*2.3+s;star(p+'_spark',(x+math.cos(a)*.09,-.563,2.17+math.sin(a)*.12),.026,.009,sp_glowcyan,points=4)
   dm_loop(p+'_orbit',(x,-.565,2.17),(.13,.065),.008,sp_hot,steps=20)
  elif style=='dice':
   dm_box(p+'_die',(x,-.53,2.17),(.27,.07,.28),sp_pearl,'Head')
   for dx,dz in ([(-.065,.065),(0,0),(.065,-.065)] if s<0 else [(-.065,-.065),(-.065,.065),(.065,-.065),(.065,.065)]):dm_disc(p+'_pip',(x+dx,-.573,2.17+dz),.025,ink,sides=8)
  elif style=='gears':
   star(p+'_gear',(x,-.55,2.17),.17,.13,gold,points=12)
   dm_disc(p+'_hub',(x,-.58,2.17),.09,dm_steel)
   dm_disc(p+'_pupil',(x,-.60,2.17),.045,sp_glowcyan)
  elif style=='crescent':
   dm_disc(p+'_moon',(x,-.546,2.17),.146,sp_glowgold)
   dm_disc(p+'_cutout',(x+.056,-.573,2.21),.126,ink)
   star(p+'_star',(x-.09,-.59,2.30),.035,.012,sp_pearl,points=4)
  elif style=='bolts':
   sp_face(p+'_bolt',s,[(.01,.21),(-.12,.015),(-.01,.015),(-.07,-.19),(.13,.06),(.025,.06)],sp_glowgold)
  elif style=='goggles':
   dm_loop(p+'_metal',(x,-.545,2.17),(.18,.205),.027,dm_silver,steps=20)
   ell(p+'_glass',(x,-.551,2.17),(.145,.032,.167),dm_sky,n=16,m=10)
   line(p+'_reflection',[(x-.065,-.589,2.10),(x+.045,-.589,2.25)],.012,glint,'Head',6)
  elif style=='robot':
   dm_box(p+'_panel',(x,-.536,2.17),(.30,.055,.22),dm_steel,'Head')
   for dx in [-.08,0,.08]:dm_box(p+'_led',(x+dx,-.573,2.17),(.042,.014,.095),sp_glowcyan,'Head')
  elif style=='stitched':
   for diagonal in [-1,1]:
    line(p+'_cross',[(x-.10,-.55,2.17-diagonal*.13),(x+.10,-.55,2.17+diagonal*.13)],.02,sp_pearl,'Head',6)
    for t in [-.6,0,.6]:line(p+'_thread',[(x+t*.1-.02,-.569,2.17+t*diagonal*.13+.025),(x+t*.1+.02,-.569,2.17+t*diagonal*.13-.025)],.007,sp_hot,'Head',5)
 if style=='goggles':line(p+'_bridge',[(-.12,-.53,2.22),(0,-.50,2.25),(.12,-.53,2.22)],.022,dm_silver,'Head')

# Ten mouths fit the curved original muzzle.
for style in SPECTRAL_VARIANTS['Mouth']:
 p='Drif_Mouth_'+style
 if style=='venom':
  mouth_oval(p+'_cavity',.29,.102,1.82,mouth_cavity,.017)
  for i in range(11):
   x=(i-5)*.046;z=1.89-abs(x)*.13
   mouth_panel(p+'_uppertooth',[(x-.022,z),(x+.022,z),(x,1.79+abs(x)*.12)],sp_pearl,.037)
   mouth_panel(p+'_lowertooth',[(x-.019,1.755+abs(x)*.13),(x+.019,1.755+abs(x)*.13),(x,1.83)],sp_pearl,.039)
  line(p+'_tongue',[(.10,-.69,1.78),(.17,-.78,1.72),(.27,-.82,1.73),(.32,-.79,1.80)],.034,sp_hot,'Head',9)
 elif style=='zipper':
  mouth_line(p+'_line',[(-.25,1.82),(0,1.81),(.25,1.82)],r=.019)
  for i in range(11):
   x=(i-5)*.043;mouth_panel(p+'_tooth',[(x-.013,1.80),(x+.013,1.80),(x+.013,1.84),(x-.013,1.84)],gold,.035)
  dm_loop(p+'_pull',(.25,-.67,1.77),(.035,.055),.009,dm_silver,steps=12)
 elif style=='bubblegum':
  mouth_oval(p+'_opening',.11,.045,1.82,mouth_cavity)
  ell(p+'_bubble',(.03,-.79,1.79),(.18,.15,.18),sp_hot,n=20,m=14)
  ell(p+'_shine',(-.035,-.92,1.86),(.035,.009,.048),pink,n=10,m=8)
 elif style=='ooh':
  mouth_oval(p+'_opening',.08,.10,1.82,mouth_cavity)
  dm_loop(p+'_lip',(0,-.674,1.82),(.085,.102),.012,pink,steps=24)
 elif style=='moustache':
  mouth_line(p+'_smile',[(-.12,1.79),(0,1.77),(.12,1.79)],r=.013)
  for s in [-1,1]:line(p+'_curl',[(0,-.674,1.87),(s*.09,-.69,1.85),(s*.20,-.66,1.86),(s*.27,-.62,1.91),(s*.24,-.64,1.94)],.027,dm_leather,'Head',8)
 elif style=='beak':
  plaque(p+'_upper',[(-.16,1.88),(0,1.99),(.16,1.88),(0,1.80)],-.72,.09,sp_orange)
  plaque(p+'_lower',[(-.12,1.80),(.12,1.80),(0,1.72)],-.70,.06,dm_yellow)
 elif style=='pacifier':
  ell(p+'_guard',(0,-.69,1.83),(.15,.025,.09),dm_mint,n=18,m=8)
  ell(p+'_button',(0,-.73,1.83),(.06,.027,.05),dm_lilac,n=12,m=8)
  dm_loop(p+'_ring',(0,-.76,1.77),(.065,.07),.014,gold,steps=16)
 elif style=='stitches':
  mouth_line(p+'_seam',[(-.23,1.81),(-.10,1.83),(0,1.80),(.12,1.82),(.23,1.80)],r=.012)
  for i in range(8):
   x=(i-3.5)*.055;mouth_line(p+'_thread',[(x-.015,1.77),(x+.015,1.86)],white,r=.009,offset=.025)
 elif style=='candy':
  mouth_oval(p+'_smile',.15,.055,1.81,mouth_cavity)
  line(p+'_stick',[(.08,-.68,1.81),(.23,-.77,1.64)],.011,white,'Head',6)
  dm_disc(p+'_sweet',(.25,-.78,1.61),.10,sp_hot)
  for i in range(4):line(p+'_stripe',[(.25+.08*math.cos(i*1.6),-.803,1.61+.08*math.sin(i*1.6)),(.25,-.803,1.61)],.009,white,'Head',6)
 elif style=='respirator':
  ell(p+'_mask',(0,-.68,1.84),(.26,.06,.12),dm_steel,n=16,m=10)
  for s in [-1,1]:
   dm_disc(p+'_filter',(s*.15,-.75,1.84),.076,charcoal)
   for d in [-.025,0,.025]:line(p+'_vent',[(s*.15-.04,-.775,1.84+d),(s*.15+.04,-.775,1.84+d)],.005,dm_silver,'Head',5)

# Shirts: independent silhouette, tailoring and relief details.
for style in SPECTRAL_VARIANTS['Shirt']:
 cloth={'varsity':dm_burgundy,'sailor':sp_pearl,'kimono':sp_violet,'punkvest':charcoal,'spacesuit':sp_pearl,'knight':dm_steel,'poncho':dm_tan,'disco':sp_hot,'botanical':teal,'racer':sp_orange}[style]
 trim=gold if style in ['kimono','knight','disco'] else navy
 p,body,sleeves=dm_shirt_base(style,cloth,trim,lower=.66 if style in ['kimono','poncho'] else .75)
 if style=='varsity':
  for obj in sleeves:obj.data.materials[0]=sp_pearl
  plaque(p+'_letter',[(-.22,1.38),(-.08,1.38),(-.08,1.34),(-.13,1.34),(-.13,1.20),(-.08,1.20),(-.08,1.16),(-.22,1.16)],-.26,.015,dm_yellow,'Chest')
  for z in [.9,1.08,1.26,1.43]:dm_disc(p+'_snap',(0,-.28,z),.015,sp_pearl,torso_weights)
 elif style=='sailor':
  for s in [-1,1]:plaque(p+'_collar',[(s*.02,1.32),(s*.30,1.49),(s*.20,1.55),(0,1.40)],-.25,.02,navy,'Chest')
  plaque(p+'_tie',[(-.045,1.35),(.045,1.35),(.07,1.08),(0,1.01),(-.07,1.08)],-.29,.025,dm_burgundy,'Chest')
 elif style=='kimono':
  for s in [-1,1]:line(p+'_wrap',[(s*.23,-.17,1.55),(s*.08,-.28,1.23),(-s*.16,-.27,.91)],.038,gold,torso_weights,6)
  rings(p+'_obi',[(.87,.41,.27,0,0),(1.04,.415,.278,0,0)],dm_rose,torso_weights,24)
  for x,z in [(-.23,1.24),(.20,1.38)]:star(p+'_flower',(x,-.27,z),.065,.027,sp_pearl,torso_weights,points=5)
 elif style=='punkvest':
  for s,label in [(-1,'R'),(1,'L')]:
   plaque(p+'_lapel',[(s*.06,1.42),(s*.24,1.53),(s*.28,1.30),(s*.13,1.18)],-.285,.022,dm_burgundy,'Chest')
   for k in range(4):sp_cone(p+'_spike',(s*(.39+k*.06),-.07,1.62),(s*(.39+k*.06),-.07,1.73),.028,dm_silver,'UpperArm.'+label)
  line(p+'_zip',[(-.10,-.28,.85),(.03,-.29,1.24)],.012,dm_silver,torso_weights)
 elif style=='spacesuit':
  dm_box(p+'_control',(0,-.29,1.26),(.28,.06,.22),navy,'Chest')
  for i,c in enumerate([sp_glowcyan,sp_glowgold,sp_glowpink]):dm_disc(p+'_lamp',((i-1)*.08,-.33,1.29),.023,c,'Chest',sides=10)
  line(p+'_hose',[(-.27,-.25,1.34),(-.38,-.29,1.12),(-.28,-.31,.95),(.18,-.29,.95)],.027,dm_silver,torso_weights)
 elif style=='knight':
  plaque(p+'_cuirass',[(-.3,1.42),(0,1.53),(.3,1.42),(.27,1.08),(0,.96),(-.27,1.08)],-.275,.045,dm_silver,torso_weights)
  line(p+'_cross',[(0,-.33,1.44),(0,-.34,1.10)],.018,gold,'Chest');line(p+'_cross',[(-.11,-.34,1.33),(.11,-.34,1.33)],.018,gold,'Chest')
 elif style=='poncho':
  mesh(p+'_drape',[(-.42,-.24,1.49),(.42,-.24,1.49),(-.56,-.27,.80),(0,-.31,.63),(.56,-.27,.80)],[(0,1,4,3,2)],dm_tan,torso_weights,False)
  for i in range(9):
   x=(i-4)*.11;z=.64+abs(x)*.3;line(p+'_fringe',[(x,-.31,z+.03),(x,-.31,z-.08)],.013,dm_cream,'Pelvis',6)
  line(p+'_chevron',[(-.47,-.29,1.05),(0,-.34,.88),(.47,-.29,1.05)],.035,sp_orange,torso_weights)
 elif style=='disco':
  for i in range(7):
   for j in range(6):
    x=(i-3)*.075;z=.90+j*.09;dm_disc(p+'_sequin',(x,dm_front_surface(x,z)-.013,z),.025,gold if (i+j)%2 else dm_silver,torso_weights,sides=6,depth=.006)
 elif style=='botanical':
  for s in [-1,1]:
   line(p+'_vine',[(s*.06,-.29,.86),(s*.15,-.29,1.12),(s*.12,-.23,1.43)],.012,dm_mint,torso_weights)
   for i in range(4):
    z=.95+i*.11;x=s*(.12+(.04 if i%2 else -.02));ell(p+'_leaf',(x,dm_front_surface(x,z)-.025,z),(.055,.017,.025),sp_lime,torso_weights,n=10,m=6)
 elif style=='racer':
  for x in [-.13,.13]:line(p+'_stripe',[(x,-.258,.80),(x,-.29,1.1),(x,-.22,1.49)],.038,sp_pearl,torso_weights)
  for i in range(4):
   for j in range(3):dm_box(p+'_checker',(.15+i*.04,-.27,1.24+j*.04),(.038,.012,.038),ink if (i+j)%2 else glint,'Chest')

# Ten lower-body styles. All keep the original foot geometry and joint blending.
for style in SPECTRAL_VARIANTS['Legs']:
 p='Drif_Legs_'+style
 cloth={'flare':sp_violet,'plaid':dm_burgundy,'greaves':dm_steel,'cyber':charcoal,'fishnet':charcoal,'rainbow':dm_sky,'samurai':navy,'pajamas':dm_lilac,'skateshorts':dm_tan,'harem':teal}[style]
 rings(p+'_waist',[(.62,.35,.22,0,0),(.80,.35,.22,0,0)],cloth,'Pelvis',20)
 subset(p+'_feet',foot_polygons)
 for s,label in [(-1,'R'),(1,'L')]:
  x=s*.215;weights=lower_weights(label)
  radii=[.22,.20,.17,.18] if style=='flare' else [.14,.21,.23,.18] if style=='harem' else [.145,.16,.178,.18]
  rings(p+'_leg',[leg_section(x,z,r) for z,r in zip([.22,.35,.52,.68],radii)],cloth,weights,16)
  if style=='plaid':
   for z in [.29,.40,.51,.62]:dm_loop(p+'_cross',(x,0,z),(.185,.201),.014,dm_tan,weights,plane='xy',steps=16)
   for dx in [-.07,.07]:line(p+'_stripe',[(x+dx,-.17,.25),(x+dx,-.19,.65)],.012,dm_tan,weights)
  elif style=='greaves':
   plaque(p+'_plate',[(x-.12,.56),(x+.12,.56),(x+.10,.27),(x,.23),(x-.10,.27)],-.21,.026,dm_silver,weights)
   star(p+'_crest',(x,-.25,.46),.07,.027,gold,weights,points=4)
  elif style=='cyber':
   for dx in [-.085,.085]:line(p+'_trace',[(x+dx,-.19,.24),(x+dx,-.21,.43),(x+dx*.7,-.19,.64)],.012,sp_glowcyan,weights)
   dm_box(p+'_knee',(x,-.215,.44),(.13,.035,.09),dm_steel,weights)
  elif style=='fishnet':
   for k in range(6):
    z=.25+k*.065
    for diagonal in [-1,1]:line(p+'_net',[(x-.12,-.18,z),(x+.12,-.18,z+diagonal*.11)],.007,dm_silver,weights,5)
  elif style=='rainbow':
   for j,c in enumerate([sp_hot,sp_orange,dm_yellow,sp_lime,dm_sky,sp_violet]):rings(p+'_band',[leg_section(x,.24+j*.067,.183),leg_section(x,.29+j*.067,.184)],c,weights,16)
  elif style=='samurai':
   for j in range(4):
    z=.29+j*.085;plaque(p+'_lamellar',[(x-.14,z+.06),(x+.14,z+.06),(x+.155,z),(x-.155,z)],-.21,.025,dm_steel,weights)
    line(p+'_lace',[(x-.11,-.242,z+.035),(x+.11,-.242,z+.035)],.009,dm_rose,weights,5)
  elif style=='pajamas':
   for j in range(3):star(p+'_star',(x+(.065 if j%2 else -.04),-.20,.31+j*.12),.042,.016,dm_yellow,weights,points=5)
  elif style=='skateshorts':
   rings(p+'_hem',[leg_section(x,.40,.19),leg_section(x,.46,.195)],sp_orange,weights,16)
   for z in [.25,.29,.33]:dm_loop(p+'_sockstripe',(x,0,z),(.15,.164),.012,sp_pearl,weights,plane='xy',steps=16)
  elif style=='harem':
   dm_loop(p+'_anklet',(x,0,.24),(.15,.16),.025,gold,'Shin.'+label,plane='xy',steps=16)
   line(p+'_fold',[(x,-.25,.55),(x+s*.07,-.24,.43),(x,-.18,.28)],.012,dm_mint,weights)
  elif style=='flare':
   for dx in [-.07,.07]:line(p+'_seam',[(x+dx,-.24,.23),(x+dx,-.18,.66)],.007,pink,weights)

# Ten sculpted hats, keeping fins and the face opening clear.
for style in SPECTRAL_VARIANTS['Hat']:
 p='Drif_Hat_'+style
 if style=='beret':
  rings(p+'_band',[(2.66,.40,.36,0,.02),(2.73,.42,.37,0,.02)],charcoal,'Head',24)
  ell(p+'_crown',(.09,.025,2.81),(.48,.42,.14),dm_burgundy,n=24,m=10)
  line(p+'_stem',[(.12,.03,2.92),(.13,.035,3.0)],.018,dm_burgundy,'Head')
 elif style=='cowboy':
  ell(p+'_brim',(0,0,2.72),(.61,.46,.06),dm_tan,n=24,m=8)
  rings(p+'_crown',[(2.73,.32,.28,0,.03),(3.02,.29,.26,0,.03),(3.08,.23,.21,0,.03)],dm_leather,'Head',20)
  dm_loop(p+'_band',(0,.03,2.8),(.326,.289),.022,gold,plane='xy',steps=24)
 elif style=='mushroom':
  rings(p+'_stalk',[(2.67,.27,.25,0,0),(2.91,.25,.23,0,0)],dm_cream,'Head',20)
  ell(p+'_cap',(0,.02,2.98),(.52,.45,.22),dm_rose,n=24,m=12)
  for x,y,z,r in [(-.25,-.22,3.08,.09),(.23,-.24,3.09,.07),(0,-.39,2.99,.06),(.05,.03,3.19,.10)]:ell(p+'_spot',(x,y,z),(r,r*.7,.015),white,n=12,m=6)
 elif style=='ushanka':
  ell(p+'_crown',(0,.03,2.81),(.43,.37,.18),dm_leather,n=20,m=10)
  for s in [-1,1]:ell(p+'_flap',(s*.43,-.01,2.66),(.09,.25,.21),dm_tan,n=14,m=10)
  dm_box(p+'_badge',(0,-.34,2.79),(.15,.02,.13),dm_steel,'Head');star(p+'_star',(0,-.36,2.79),.052,.02,gold,points=5)
 elif style=='flowercrown':
  dm_loop(p+'_vine',(0,.01,2.73),(.43,.37),.025,teal,plane='xy',steps=24)
  for j in range(9):
   a=j*math.tau/9;x=.43*math.cos(a);y=.01+.37*math.sin(a)
   for k in range(5):ell(p+'_petal',(x+.055*math.cos(k*math.tau/5),y,2.76+.055*math.sin(k*math.tau/5)),(.045,.025,.047),[pink,dm_lilac,sp_pearl][j%3],n=8,m=6)
   ell(p+'_pollen',(x,y-.027,2.76),(.025,.017,.025),gold,n=8,m=6)
 elif style=='samurai':
  rings(p+'_helmet',[(2.68,.45,.39,0,.02),(2.86,.39,.35,0,.02),(3.02,.08,.09,0,.02)],dm_steel,'Head',20)
  for s in [-1,1]:line(p+'_crest',[(s*.05,-.38,2.79),(s*.18,-.39,2.95),(s*.37,-.36,3.14)],.038,gold,'Head')
  star(p+'_crestcenter',(0,-.42,2.84),.065,.028,dm_rose,points=4)
 elif style=='lotus':
  dm_loop(p+'_band',(0,0,2.72),(.40,.35),.025,gold,plane='xy',steps=24)
  for j in range(9):
   a=j*math.tau/9;sp_cone(p+'_petal',(.20*math.cos(a),.20*math.sin(a),2.73),(.35*math.cos(a),.35*math.sin(a),3.04),.12,dm_lilac)
  ell(p+'_jewel',(0,0,2.91),(.13,.13,.15),sp_glowpink,n=10,m=8)
 elif style=='jester':
  rings(p+'_band',[(2.66,.41,.36,0,0),(2.76,.42,.37,0,0)],sp_violet,'Head',24)
  for s,c in [(-1,dm_yellow),(0,dm_rose),(1,dm_sky)]:
   rings(p+'_point',[(2.75,.15,.17,s*.25,0),(2.96,.13,.13,s*.32,0),(3.13,.06,.07,s*.45,0),(3.07,.005,.005,s*.58,0)],c,'Head',12)
   ell(p+'_bell',(s*.58,0,3.06),(.05,.05,.05),gold,n=10,m=8)
 elif style=='sharkhood':
  rings(p+'_hood',[(2.65,.43,.39,0,.03),(2.86,.41,.37,0,.03),(3.01,.14,.15,0,.05)],dm_sky,'Head',24)
  sp_cone(p+'_fin',(0,.03,2.99),(0,.14,3.29),.13,dm_steel)
  for s in [-1,1]:
   ell(p+'_eye',(s*.29,-.28,2.85),(.045,.023,.05),ink,n=10,m=8)
   for j in range(4):sp_cone(p+'_tooth',(s*(.05+j*.075),-.35,2.72),(s*(.05+j*.075),-.36,2.63),.025,white)
 elif style=='tiara':
  dm_loop(p+'_band',(0,0,2.73),(.42,.37),.019,dm_silver,plane='xy',steps=24)
  for x,z,r in [(-.26,2.84,.07),(-.13,2.91,.085),(0,3.0,.115),(.13,2.91,.085),(.26,2.84,.07)]:
   star(p+'_gem',(x,-.36,z),r,r*.45,sp_glowcyan,points=4)
   line(p+'_mount',[(x,-.36,2.73),(x,-.36,z)],.009,dm_silver,'Head',6)

# Back-mounted sword and three additional wing constructions.
for style in SPECTRAL_VARIANTS['Accessory']:
 p='Drif_Accessory_'+style
 if style=='sword':
  line(p+'_sheath',[(-.38,.40,.72),(.45,.40,1.83)],.062,dm_leather,'Chest',8)
  line(p+'_bladeedge',[(-.36,.335,.75),(.45,.335,1.83)],.012,dm_silver,'Chest',6)
  line(p+'_grip',[(.45,.40,1.84),(.68,.40,2.15)],.038,charcoal,'Chest',8)
  line(p+'_guard',[(.30,.40,1.95),(.59,.40,1.73)],.035,gold,'Chest',8)
  ell(p+'_pommel',(.70,.40,2.18),(.055,.05,.06),gold,'Chest',n=10,m=8)
  for s in [-1,1]:line(p+'_strap',[(s*.21,.3,1.46),(s*.25,-.21,1.42),(-s*.18,-.31,.96)],.022,dm_leather,torso_weights)
 elif style in ['angelwings','batwings','mechwings']:
  for s in [-1,1]:
   if style=='angelwings':
    line(p+'_spar',[(s*.22,.30,1.35),(s*.60,.40,1.68),(s*.95,.42,2.15)],.065,dm_cream,'Chest')
    for j in range(7):
     x=s*(.42+j*.08);z=1.46+j*.09
     obj=ell(p+'_feather',(x,.43,z),(.105,.045,.34-j*.018),sp_pearl,'Chest',n=10,m=8)
     pivot=Vector((x,.43,z))
     for v in obj.data.vertices:
      d=v.co-pivot;a=-s*.55;v.co=pivot+Vector((d.x*math.cos(a)-d.z*math.sin(a),d.y,d.x*math.sin(a)+d.z*math.cos(a)))
   elif style=='batwings':
    outline=[(s*.22,.34,1.44),(s*.55,.38,1.89),(s*1.03,.4,2.12),(s*.90,.42,1.66),(s*1.08,.42,1.30),(s*.70,.4,1.42),(s*.45,.37,1.06)]
    mesh(p+'_membrane',outline,[(0,1,2,3),(0,3,4,5),(0,5,6)],sp_violet,'Chest',False)
    for j in [2,4,6]:line(p+'_rib',[outline[0],outline[j]],.023,dm_burgundy,'Chest')
   else:
    line(p+'_arm',[(s*.23,.32,1.37),(s*.64,.39,1.85)],.05,dm_steel,'Chest')
    for j in range(5):
     x=s*(.50+j*.09);z=1.70-j*.10
     plaque(p+'_blade',[(x-s*.06,z+.15),(x+s*.14,z+.48),(x+s*.22,z+.42),(x+s*.06,z-.18)],.43,.035,dm_silver,'Chest')
     line(p+'_glow',[(x,.405,z),(x+s*.16,.405,z+.37)],.01,sp_glowcyan,'Chest',6)
 elif style=='shield':
  plaque(p+'_shield',[(-.34,1.57),(0,1.69),(.34,1.57),(.29,.98),(0,.77),(-.29,.98)],.38,.08,dm_steel,'Chest')
  line(p+'_rim',[(-.34,.48,1.57),(0,.48,1.69),(.34,.48,1.57),(.29,.48,.98),(0,.48,.77),(-.29,.48,.98),(-.34,.48,1.57)],.023,gold,'Chest')
  star(p+'_crest',(0,.49,1.28),.20,.075,gold,'Chest',points=4)
 elif style=='prayerbeads':
  for j in range(19):
   a=math.pi*j/18;x=.24*math.cos(a);z=1.46-.35*math.sin(a);ell(p+'_bead',(x,-.28-.06*math.sin(a),z),(.038,.038,.038),dm_leather,'Chest',n=10,m=8)
  for dx in [-.03,0,.03]:line(p+'_tassel',[(0,-.36,1.09),(dx,-.36,.92)],.013,dm_burgundy,'Chest',6)
 elif style=='potionbelt':
  dm_loop(p+'_belt',(0,0,.91),(.44,.29),.025,dm_leather,'Pelvis',plane='xy',steps=24)
  for j,c in enumerate([dm_mint,sp_hot,dm_sky]):
   x=(j-1)*.21;ell(p+'_flask',(x,-.31,.92),(.07,.055,.10),c,'Pelvis',n=12,m=8);dm_box(p+'_cork',(x,-.31,1.025),(.05,.04,.035),dm_tan,'Pelvis')
 elif style=='spellbook':
  dm_box(p+'_pages',(.36,-.24,1.02),(.23,.10,.28),dm_cream,'Pelvis')
  for y in [-.30,-.18]:dm_box(p+'_cover',(.36,y,1.02),(.25,.018,.30),sp_violet,'Pelvis')
  star(p+'_seal',(.36,-.32,1.02),.075,.028,gold,'Pelvis',points=5)
  line(p+'_strap',[(-.2,.2,1.49),(-.2,-.24,1.48),(.39,-.28,1.07)],.016,dm_leather,torso_weights)
 elif style=='boombox':
  dm_box(p+'_case',(0,-.37,.96),(.53,.14,.29),dm_steel,'Pelvis')
  for s in [-1,1]:dm_disc(p+'_speaker',(s*.17,-.46,.96),.105,ink,'Pelvis');dm_loop(p+'_rim',(s*.17,-.48,.96),(.08,.08),.009,dm_silver,'Pelvis')
  dm_box(p+'_display',(0,-.45,1.01),(.11,.025,.07),sp_glowcyan,'Pelvis')
  line(p+'_strap',[(-.22,.1,1.50),(-.22,-.25,1.44),(0,-.40,1.12),(.22,-.25,1.44),(.22,.1,1.50)],.018,charcoal,torso_weights)
 elif style=='lantern':
  line(p+'_hook',[(.35,.05,.99),(.50,-.10,.99),(.50,-.16,.88)],.014,gold,'Pelvis')
  ell(p+'_flame',(.50,-.16,.72),(.045,.04,.075),sp_glowgold,'Pelvis',n=10,m=8)
  for z in [.60,.84]:dm_box(p+'_cap',(.50,-.16,z),(.17,.14,.035),dm_steel,'Pelvis')
  for dx in [-.07,.07]:
   for dy in [-.055,.055]:line(p+'_rail',[(.50+dx,-.16+dy,.60),(.50+dx,-.16+dy,.84)],.009,gold,'Pelvis',5)

# Alternate heads replace the whole original head, muzzle, fins, eyes and mouth.
def sp_horns(p,mat,kind='curve'):
 for s in [-1,1]:
  rings(p+'_horn',[(2.35,.12,.12,s*.51,.02),(2.62,.11,.10,s*.59,.02),(2.86,.065,.06,s*.66,.04),(3.05,.003,.003,s*.69,.04)],mat,'Head',10)

def sp_hood(p,mat):
 ell(p+'_hood',(0,.015,2.19),(.59,.47,.61),mat,n=24,m=16)
 # Raised pointed brow and curved edge make a deep face aperture.
 line(p+'_rim',[(-.45,-.30,1.85),(-.48,-.34,2.22),(-.34,-.32,2.53),(0,-.30,2.75),(.34,-.32,2.53),(.48,-.34,2.22),(.45,-.30,1.85)],.055,mat,'Head',8)
 ell(p+'_void',(0,-.405,2.21),(.41,.10,.43),sp_onyx,n=24,m=16)

for style in SPECTRAL_VARIANTS['Head']:
 p='Drif_Head_'+style
 if style=='void':
  sp_hood(p,charcoal);sp_horns(p,dm_steel)
  star(p+'_starlight',(0,-.52,2.22),.19,.024,sp_glowwhite,points=4)
  ell(p+'_core',(0,-.546,2.22),(.035,.015,.035),glint,n=12,m=8)
 elif style=='vortex':
  sp_hood(p,dm_burgundy);sp_horns(p,dm_burgundy)
  for k in range(4):
   points=[]
   for j in range(65):
    t=j/64;a=t*math.tau*2.2+k*math.pi/2;r=.025+.36*t
    points.append((r*math.cos(a),-.52-.015*t,2.21+r*math.sin(a)))
   line(p+'_spiral',points,.009,[dm_sky,sp_glowcyan,dm_mint,dm_silver][k],'Head',5)
  # A small golden curled dragon crest echoes the reference's playful overlay.
  line(p+'_dragon',[(-.10,-.60,2.43),(-.22,-.62,2.57),(-.39,-.62,2.55),(-.45,-.62,2.42)],.065,dm_yellow,'Head',8)
  ell(p+'_dragonface',(-.46,-.62,2.39),(.11,.04,.08),dm_yellow,n=12,m=8)
  ell(p+'_dragoneye',(-.44,-.665,2.43),(.016,.008,.023),ink,n=8,m=6)
 elif style=='gasmask':
  ell(p+'_skull',(0,.015,2.20),(.55,.43,.56),sp_stone,n=22,m=16);sp_horns(p,dm_cream)
  for s in [-1,1]:
   ell(p+'_socket',(s*.245,-.36,2.34),(.18,.10,.15),charcoal,n=16,m=10)
   dm_loop(p+'_eyering',(s*.245,-.447,2.34),(.18,.15),.025,dm_steel,steps=20)
   ell(p+'_lens',(s*.245,-.45,2.34),(.145,.025,.12),dm_tan if s>0 else ink,n=16,m=10)
  ell(p+'_nose',(0,-.40,2.02),(.28,.17,.22),sp_stone,n=16,m=10)
  dm_disc(p+'_filter',(0,-.59,2.01),.165,dm_steel,depth=.045)
  for r in [.14,.10,.06]:dm_loop(p+'_filterring',(0,-.617,2.01),(r,r),.01,navy,steps=24)
  for s in [-1,1]:line(p+'_hose',[(s*.23,-.40,1.97),(s*.43,-.30,1.84),(s*.40,-.10,1.68),(s*.20,-.19,1.61)],.06,sp_stone,'Head',10)
 elif style=='glitch':
  sp_hood(p,dm_leather);sp_horns(p,dm_cream)
  for k in range(6):
   pts=[]
   for j in range(37):
    t=j/36;a=t*math.tau*1.4+k*math.tau/6;r=.025+.38*t
    pts.append((math.cos(a)*r,-.535,2.21+math.sin(a)*r))
   line(p+'_tendril',pts,.017,sp_onyx,'Head',5)
   for j in range(4,36,5):
    x,y,z=pts[j];dm_box(p+'_pixels',(x,y-.025,z),(.045,.012,.025),[sp_lime,sp_hot,sp_glowcyan,dm_yellow][(j+k)%4],'Head')
  rng=random.Random(512)
  for j in range(55):
   a=rng.random()*math.tau;r=.50;z=2.18+.50*math.sin(a);x=r*math.cos(a)
   line(p+'_fiber',[(x,-.17,z),(x*1.10,-.19,z-.09)],.0035,dm_tan,'Head',4)
 elif style=='hockey':
  ell(p+'_head',(0,.02,2.20),(.55,.43,.55),dm_burgundy,n=22,m=14)
  for s in [-1,1]:
   rings(p+'_fin',[(2.24,.14,.11,s*.49,0),(2.57,.15,.09,s*.61,0),(2.92,.07,.05,s*.71,.01),(3.07,.003,.003,s*.70,.01)],dm_burgundy,'Head',10)
   for j in range(5):line(p+'_stripe',[(s*.51,-.11,2.35+j*.10),(s*.68,-.075,2.43+j*.10)],.019,sp_onyx,'Head',5)
  # An actual perforated mask: omit front ellipsoid quads inside eye/vent holes.
  verts=[];faces=[];n=64;m=36
  for i in range(m+1):
   theta=math.pi*i/m
   for j in range(n):
    phi=math.tau*j/n;verts.append((.46*math.sin(theta)*math.cos(phi),-.37+.16*math.sin(theta)*math.sin(phi),2.20+.49*math.cos(theta)))
  for i in range(m):
   for j in range(n):
    ids=[i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j];c=sum((Vector(verts[k]) for k in ids),Vector())/4
    holes=[(-.21,2.28,.135,.075),(.21,2.28,.135,.075),(0,2.57,.025,.025),(-.045,2.53,.021,.021),(.045,2.53,.021,.021),(-.07,1.96,.025,.025),(0,1.92,.025,.025),(.07,1.96,.025,.025),(-.11,2.04,.024,.024),(.11,2.04,.024,.024)]
    if c.y<-.37 and any(((c.x-x)/rx)**2+((c.z-z)/rz)**2<1 for x,z,rx,rz in holes):continue
    faces.append(ids)
  mesh(p+'_mask',verts,faces,sp_pearl,'Head')
  for s in [-1,1]:
   ell(p+'_eye',(s*.21,-.452,2.28),(.09,.028,.068),ink,n=14,m=8)
   ell(p+'_iris',(s*.21,-.486,2.28),(.032,.009,.055),dm_silver,n=10,m=8)

# Ghost fuzz is one low-cost skinned mesh of tapered, translucent fibers.
rng=random.Random(91273);gv=[];gf=[]
for j in range(260):
 u=rng.uniform(-1,1);a=rng.random()*math.tau;n=Vector((math.sqrt(1-u*u)*math.cos(a),math.sqrt(1-u*u)*math.sin(a),u))
 center=Vector((0,0,2.20));base=center+Vector((n.x*.575,n.y*.465,n.z*.59));tip=base+n*rng.uniform(.025,.075)
 tangent=n.cross(Vector((0,0,1)))
 if tangent.length<.01:tangent=Vector((1,0,0))
 tangent.normalize();v=n.cross(tangent);idx=len(gv);r=.007
 gv.extend([tuple(base+tangent*r),tuple(base-tangent*r),tuple(tip),tuple(base+v*r),tuple(base-v*r)])
 gf.extend([(idx,idx+1,idx+2),(idx+3,idx+4,idx+2)])
mesh('Drif_Ghost_Fuzz',gv,gf,sp_ghost,'Head',False)

# Extras occupy their own layer around the character. They follow the root/chest
# during locomotion; head-centered frames follow Head and never animate the pose.
for style in SPECTRAL_VARIANTS['Extra']:
 p='Drif_Extra_'+style
 if style=='mon':
  c=Vector((-.83,-.02,1.94))
  ell(p+'_buddy',c,(.23,.19,.26),dm_lilac,'Chest',n=18,m=12)
  ell(p+'_belly',c+Vector((0,-.17,-.05)),(.16,.04,.14),dm_cream,'Chest',n=14,m=8)
  for s in [-1,1]:
   sp_cone(p+'_ear',c+Vector((s*.13,0,.17)),c+Vector((s*.22,0,.42)),.09,dm_lilac,'Chest')
   ell(p+'_eye',c+Vector((s*.08,-.18,.06)),(.031,.02,.045),ink,'Chest',n=10,m=8)
   ell(p+'_arm',c+Vector((s*.23,0,-.02)),(.09,.065,.07),dm_lilac,'Chest',n=10,m=8)
   ell(p+'_foot',c+Vector((s*.12,-.02,-.22)),(.085,.085,.055),dm_lilac,'Chest',n=10,m=8)
  line(p+'_tail',[tuple(c+Vector((.17,.12,-.10))),tuple(c+Vector((.36,.16,-.05))),tuple(c+Vector((.35,.14,.10)))],.035,dm_lilac,'Chest')
 elif style=='saiyanaura':
  for j in range(18):
   a=j*math.tau/18;x=.73*math.cos(a);z=1.7+1.19*math.sin(a)
   plaque(p+'_flame',[(x-.11,z-.12),(x-.065,z+.10),(x+.04,z+.30),(x+.13,z+.66),(x+.17,z+.20),(x+.12,z-.18)],.48,.018,sp_glowgold,'Pelvis')
  for s in [-1,1]:line(p+'_lightning',[(s*.72,-.02,1.05),(s*.88,-.02,1.38),(s*.74,-.02,1.48),(s*.91,-.02,1.85),(s*.80,-.02,2.02)],.014,sp_glowwhite,'Pelvis',5)
 elif style=='ornateframe':
  for w,h,r in [(.91,.97,.035),(.85,.91,.014),(.97,1.03,.018)]:
   line(p+'_frame',[(-w,.42,2.15-h),(w,.42,2.15-h),(w,.42,2.15+h),(-w,.42,2.15+h),(-w,.42,2.15-h)],r,gold,'Head',8)
  for s in [-1,1]:
   for t in [-1,1]:
    cx=s*.91;cz=2.15+t*.97
    pts=[(cx+.12*math.cos(j*math.tau/24)*(1-j/32),.42,cz+.15*math.sin(j*math.tau/24)*(1-j/32)) for j in range(25)]
    line(p+'_filigree',pts,.016,gold,'Head',6)
  star(p+'_crest',(0,.42,3.18),.15,.065,gold,points=6)
 elif style=='spiritflames':
  for i,(x,z) in enumerate([(-.8,2.35),(.82,1.95),(-.65,1.20)]):
   ell(p+'_spirit',(x,-.04,z),(.12,.095,.17),sp_glowcyan,'Chest',n=12,m=10)
   sp_cone(p+'_wisp',(x,-.04,z+.12),(x+.09,-.04,z+.38),.08,sp_glowcyan,'Chest')
   for dx in [-.035,.035]:ell(p+'_eye',(x+dx,-.135,z+.02),(.014,.008,.023),ink,'Chest',n=8,m=6)
 elif style=='planets':
  for i,(x,z,r) in enumerate([(-.85,2.48,.16),(.84,2.0,.14),(-.74,1.20,.10)]):
   ell(p+'_planet',(x,0,z),(r,r,r),[dm_lilac,dm_sky,sp_orange][i],'Chest',n=16,m=10)
   dm_loop(p+'_ring',(x,0,z),(r*1.65,r*.45),.017,gold,'Chest',steps=24)
 elif style=='arcane':
  for r in [.89,.98]:dm_loop(p+'_circle',(0,.39,2.12),(r,r),.013,sp_glowcyan,steps=64)
  star(p+'_sigil',(0,.42,2.12),.89,.45,sp_glowpink,points=6)
  for i in range(12):
   a=i*math.tau/12;star(p+'_rune',(.94*math.cos(a),.37,2.12+.94*math.sin(a)),.045,.018,sp_glowgold,points=4)
 elif style=='storm':
  for x,z,r in [(-.23,3.0,.21),(0,3.09,.25),(.25,3.0,.19)]:ell(p+'_cloud',(x,.25,z),(r,.17,r*.55),dm_steel,'Head',n=14,m=8)
  for s in [-1,1]:line(p+'_bolt',[(s*.28,.2,2.98),(s*.49,.15,2.74),(s*.38,.1,2.73),(s*.62,.0,2.48)],.015,sp_glowgold,'Head',5)
  for x in [-.25,0,.25]:line(p+'_rain',[(x,.30,2.84),(x-.025,.30,2.70)],.008,dm_sky,'Head',5)
 elif style=='crystals':
  for i in range(7):
   a=i*math.tau/7;x=.85*math.cos(a);z=1.97+.85*math.sin(a)
   sp_cone(p+'_top',(x,.14,z),(x+.03,.14,z+.22),.085,[dm_lilac,sp_glowcyan,sp_hot][i%3],'Chest',5)
   sp_cone(p+'_base',(x,.14,z),(x-.03,.14,z-.14),.085,[dm_lilac,sp_glowcyan,sp_hot][i%3],'Chest',5)
 elif style=='pixelstars':
  for i,(x,z) in enumerate([(-.82,2.50),(.80,2.63),(-.77,1.60),(.79,1.35),(0,3.12)]):
   for dx,dz in [(0,0),(-.06,0),(.06,0),(0,-.06),(0,.06)]:dm_box(p+'_pixel',(x+dx,-.1,z+dz),(.055,.04,.055),[sp_glowpink,sp_glowgold,sp_glowcyan][i%3],'Chest')
 elif style=='tentacles':
  for s in [-1,1]:
   for j in range(3):
    pts=[(s*.20,.40,1.0+j*.15),(s*.6,.4,1.1+j*.22),(s*.84,.25,1.5+j*.25),(s*.80,.10,1.8+j*.25),(s*.65,.04,1.78+j*.25)]
    line(p+'_tendril',pts,.032,sp_onyx,'Chest',7)
    for point in pts[2:]:ell(p+'_sucker',(point[0],point[1]-.028,point[2]),(.017,.012,.022),sp_hot,'Chest',n=8,m=6)
 elif style=='dragon':
  pts=[(-.75,.1,1.28),(-.95,.10,1.70),(-.78,.1,2.07),(-.60,.06,2.32),(-.75,0,2.54),(-.91,-.03,2.49)]
  line(p+'_serpent',pts,.075,dm_mint,'Chest',10)
  ell(p+'_head',(-.91,-.03,2.49),(.15,.10,.11),dm_mint,'Chest',n=14,m=10)
  ell(p+'_eye',(-.94,-.13,2.52),(.023,.014,.025),dm_rose,'Chest',n=10,m=6)
  for j in range(1,5):
   x,y,z=pts[j];sp_cone(p+'_spine',(x,y+.04,z),(x-.05,y+.1,z+.15),.045,gold,'Chest')
 elif style=='cards':
  for i,(x,z,a) in enumerate([(-.83,2.23,-.2),(.80,1.90,.2),(-.70,1.20,-.1)]):
   card=dm_box(p+'_card',(x,-.12,z),(.25,.025,.36),dm_cream,'Chest')
   star(p+'_suit',(x,-.15,z),.073,.027,[dm_rose,sp_violet,teal][i],'Chest',points=4)
   for dx,dz in [(-.08,.12),(.08,-.12)]:dm_disc(p+'_pip',(x+dx,-.15,z+dz),.019,dm_rose,'Chest',sides=4)

print('SPECTRAL_VARIANTS_READY', {k:len(v) for k,v in SPECTRAL_VARIANTS.items()})
