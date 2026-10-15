"""Ten fitted leg sets and ten muzzle-mounted mouths; executed by build_drifmaker.py.

Uses the existing source mesh, shared rig, and geometry helpers in its namespace.
Every new leg set includes its own feet/ankles; the original tail stays in Body.
"""
LEG_VARIANTS=['denim','cargo','shorts','striped','patched','tech','skeleton','plush','boots','joggers']
MOUTH_VARIANTS=['smile','sidesmile','fangs','goldgrill','braces','tongue','cat','drool','skull','grin']

leg_denim=material('Drif_Legs_Denim',(.045,.12,.24),.88)
leg_olive=material('Drif_Legs_Olive',(.19,.24,.11),.85)
leg_coral=material('Drif_Legs_Coral',(.64,.11,.12),.82)
leg_violet=material('Drif_Legs_Violet',(.19,.075,.34),.8)
leg_lilac=material('Drif_Legs_Plush',(.49,.34,.64),.95)
leg_gray=material('Drif_Legs_Jersey',(.22,.25,.29),.9)
leg_brown=material('Drif_Legs_Boot_Leather',(.16,.075,.035),.75)
leg_silver=material('Drif_Legs_Silver',(.38,.43,.47),.35,.5)
mouth_pink=material('Drif_Mouth_Tongue',(.74,.09,.19),.5)
mouth_green=material('Drif_Mouth_Slime',(.21,.83,.18),.25)
mouth_cavity=material('Drif_Mouth_Cavity',(.035,.006,.012),.65)
cream=next(m for m in copied_materials if 'Warm_ivory' in m.name)

foot_polygons=[]
for poly in groups['Drif_Legs_original']:
    center=centers[component[poly.vertices[0]]]
    if center.z<.4 and source.data.materials[poly.material_index].name.startswith(('Azure blue','Warm ivory')):
        foot_polygons.append(poly)

def lower_weights(label):
    def weights(co):
        t=max(0,min(1,(co.z-.35)/.20))
        return {'Thigh.'+label:t,'Shin.'+label:1-t}
    return weights

def leg_section(x,z,r):
    return (z,r,r*1.08,x,0)

for style in LEG_VARIANTS:
    prefix='Drif_Legs_'+style
    cloth={'denim':leg_denim,'cargo':leg_olive,'shorts':leg_coral,'striped':leg_violet,
           'patched':leg_denim,'tech':charcoal,'skeleton':charcoal,'plush':leg_lilac,
           'boots':leg_brown,'joggers':leg_gray}[style]
    rings(prefix+'_waist',[(.61,.35,.215,0,0),(.80,.35,.215,0,0)],cloth,'Pelvis',20)
    if style!='boots':
        subset(prefix+'_feet',foot_polygons)
    for side,label in [(-1,'R'),(1,'L')]:
        x=side*.215
        weights=lower_weights(label)
        if style=='shorts':
            rings(prefix+'_calf',[leg_section(x,.20,.137),leg_section(x,.33,.145),leg_section(x,.47,.157)],blue,weights,16)
            rings(prefix+'_short',[leg_section(x,.40,.18),leg_section(x,.46,.187),leg_section(x,.57,.187),leg_section(x,.68,.178)],cloth,weights,16)
            rings(prefix+'_short_hem',[leg_section(x,.398,.183),leg_section(x,.435,.19)],white,weights,16)
        else:
            r=.19 if style=='plush' else .174
            rings(prefix+'_trouser',[leg_section(x,.215,.142),leg_section(x,.30,.154),leg_section(x,.40,r),leg_section(x,.52,r+.006),leg_section(x,.68,.178)],cloth,weights,16)
            rings(prefix+'_cuff',[leg_section(x,.205,.147),leg_section(x,.255,.154)],navy if style in ['denim','patched'] else cloth,'Shin.'+label,16)
        if style=='denim':
            line(prefix+'_outseam',[(x+side*.158,0,.26),(x+side*.177,0,.42),(x+side*.181,0,.62)],.006,stitch,weights,6)
            line(prefix+'_knee_seam',[(x-.12,-.145,.43),(x,-.19,.43),(x+.12,-.145,.43)],.006,stitch,weights,6)
            # Rear pockets are small raised cloth panels with sewn edges.
            plaque(prefix+'_rear_pocket',[(x-.065,.61),(x+.065,.61),(x+.06,.51),(x,.485),(x-.06,.51)],.202,.012,cloth,'Thigh.'+label)
            line(prefix+'_rear_stitch',[(x-.065,.22,.60),(x+.065,.22,.60),(x+.06,.22,.52),(x,.22,.495),(x-.06,.22,.52)],.005,stitch,'Thigh.'+label,6)
        elif style=='cargo':
            ell(prefix+'_side_pocket',(x+side*.17,0,.52),(.045,.12,.115),cloth,'Thigh.'+label,n=12,m=8)
            line(prefix+'_pocket_flap',[(x+side*.209,-.10,.57),(x+side*.219,0,.55),(x+side*.209,.10,.57)],.013,navy,'Thigh.'+label)
            ell(prefix+'_pocket_clasp',(x+side*.218,-.015,.535),(.012,.028,.025),gold,'Thigh.'+label,n=8,m=6)
        elif style=='shorts':
            line(prefix+'_side_stripe',[(x+side*.183,0,.45),(x+side*.186,0,.64)],.016,white,'Thigh.'+label)
        elif style=='striped':
            for i,z in enumerate([.28,.37,.46,.55,.64]):
                rr=.155 if z<.35 else .178
                rings(prefix+'_band',[leg_section(x,z,rr+.004),leg_section(x,z+.035,rr+.005)],white if i%2==0 else pink,weights,16)
        elif style=='patched':
            patch=cyan if side<0 else pink
            plaque(prefix+'_patch',[(x-.075,.36),(x+.075,.36),(x+.065,.49),(x-.065,.49)],-.199,.013,patch,weights)
            for offset in [-.06,.0,.06]:
                line(prefix+'_patch_stitch',[(x+offset-.009,-.217,.37),(x+offset+.009,-.217,.395)],.004,white,weights,6)
            star(prefix+'_upper_patch',(x,-.204,.59),.061,.031,gold,'Thigh.'+label,points=4)
        elif style=='tech':
            plaque(prefix+'_knee_panel',[(x-.10,.39),(x-.07,.49),(x+.07,.49),(x+.10,.39),(x,.34)],-.205,.018,navy,weights)
            line(prefix+'_cyan_trace',[(x-side*.09,-.21,.26),(x-side*.11,-.213,.37),(x-side*.09,-.213,.48),(x-side*.12,-.18,.62)],.009,cyan,weights,6)
            line(prefix+'_panel_light',[(x-.065,-.23,.42),(x+.065,-.23,.42)],.009,cyan,weights,6)
        elif style=='skeleton':
            line(prefix+'_femur',[(x,-.203,.63),(x,-.203,.49)],.024,white,'Thigh.'+label)
            line(prefix+'_shin_bone',[(x,-.191,.37),(x,-.172,.26)],.02,white,'Shin.'+label)
            for z in [.60,.51,.35,.28]:
                bone='Thigh.'+label if z>.4 else 'Shin.'+label
                for delta in [-.019,.019]:
                    ell(prefix+'_bone_end',(x+delta,-.211 if z>.4 else -.182,z),(.027,.013,.022),white,bone,n=10,m=6)
            ell(prefix+'_kneecap',(x,-.207,.422),(.05,.025,.042),white,weights,n=12,m=8)
        elif style=='plush':
            for dx,dz in [(-.04,0),(0,.025),(.04,0)]:
                ell(prefix+'_cloud_patch',(x+dx,-.206,.425+dz),(.045,.025,.044),white,weights,n=12,m=8)
            rings(prefix+'_fluffy_cuff',[leg_section(x,.20,.155),leg_section(x,.255,.162)],white,'Shin.'+label,16)
        elif style=='boots':
            rings(prefix+'_boot_upper',[leg_section(x,.13,.151),leg_section(x,.24,.163),leg_section(x,.38,.167)],charcoal,'Shin.'+label,16)
            ell(prefix+'_boot_toe',(x,-.09,.125),(.182,.265,.125),charcoal,'Foot.'+label,n=16,m=10)
            line(prefix+'_boot_sole',[(x+.175*math.cos(j*math.tau/20),-.09+.25*math.sin(j*math.tau/20),.055) for j in range(21)],.016,leg_brown,'Foot.'+label)
            for z in [.23,.29,.35]:
                line(prefix+'_boot_lace',[(x-.065,-.175,z),(x+.065,-.175,z+.014)],.008,white,'Shin.'+label,6)
            ell(prefix+'_boot_buckle',(x+side*.163,-.02,.32),(.018,.04,.025),leg_silver,'Shin.'+label,n=10,m=6)
        elif style=='joggers':
            for delta,mat in [(-.014,white),(.014,pink)]:
                line(prefix+'_track_stripe',[(x+side*.157,delta,.26),(x+side*.178,delta,.43),(x+side*.183,delta,.64)],.009,mat,weights,6)
            line(prefix+'_pocket',[(x+side*.08,-.185,.58),(x+side*.13,-.14,.68)],.008,charcoal,'Thigh.'+label,6)
    if style=='joggers':
        for x in [-.035,.035]:
            line(prefix+'_drawstring',[(x,-.224,.76),(x*1.1,-.234,.70),(x*1.4,-.238,.64)],.007,white,'Pelvis',6)

def muzzle_point(x,z,offset=.01):
    # Original muzzle is an ellipsoid centered at (0,-.452,1.899).
    d=max(.02,1-(x/.432)**2-((z-1.899)/.223)**2)
    return (x,-.452-.205*math.sqrt(d)-offset,z)

def mouth_line(name,points,mat=mouth_cavity,r=.011,offset=.012):
    return line(name,[muzzle_point(x,z,offset) for x,z in points],r,mat,'Head',8)

def mouth_panel(name,points,mat,offset=.013):
    # The center fan follows the curved muzzle, rather than floating as a decal.
    center=(sum(x for x,z in points)/len(points),sum(z for x,z in points)/len(points))
    verts=[muzzle_point(x,z,offset) for x,z in points]+[muzzle_point(*center,offset)]
    n=len(points)
    obj=mesh(name,verts,[(i,(i+1)%n,n) for i in range(n)],mat,'Head',False)
    for polygon in obj.data.polygons:
        if polygon.normal.y>0:
            polygon.flip()
    obj.data.update()
    return obj

def mouth_oval(name,rx,rz,z,mat,offset=.013):
    return mouth_panel(name,[(rx*math.cos(j*math.tau/32),z+rz*math.sin(j*math.tau/32)) for j in range(32)],mat,offset)

def tooth(name,x,z,width,height,mat=white):
    return mouth_panel(name,[(x-width/2,z),(x+width/2,z),(x+width*.40,z-height),(x-width*.40,z-height)],mat,.026)

for style in MOUTH_VARIANTS:
    prefix='Drif_Mouth_'+style
    if style=='smile':
        mouth_line(prefix+'_curve',[(-.19,1.835),(-.15,1.80),(-.08,1.775),(0,1.765),(.08,1.775),(.15,1.80),(.19,1.835)],r=.013)
        for side in [-1,1]:
            mouth_line(prefix+'_dimple',[(side*.18,1.824),(side*.205,1.842)],r=.009)
    elif style=='sidesmile':
        mouth_line(prefix+'_smirk',[(-.18,1.81),(-.08,1.79),(.04,1.80),(.14,1.835),(.19,1.87)],r=.014)
        mouth_line(prefix+'_corner',[(.18,1.83),(.20,1.87),(.175,1.885)],r=.009)
    elif style=='fangs':
        mouth_oval(prefix+'_opening',.20,.07,1.82,mouth_cavity)
        for side in [-1,1]:
            mouth_panel(prefix+'_fang',[(side*.075,1.862),(side*.132,1.846),(side*.112,1.735)],white,.03)
    elif style=='goldgrill':
        mouth_oval(prefix+'_opening',.215,.073,1.82,mouth_cavity)
        for j in range(8):
            x=(j-3.5)*.043
            tooth(prefix+'_gold_tooth',x,1.858,.038,.068,gold)
            mouth_line(prefix+'_gold_gleam',[(x-.008,1.847),(x+.008,1.847)],glint,r=.003,offset=.03)
    elif style=='braces':
        mouth_oval(prefix+'_outline',.216,.075,1.82,mouth_cavity)
        mouth_oval(prefix+'_teeth',.195,.055,1.821,white,.02)
        for j in range(7):
            x=(j-3)*.05
            mouth_panel(prefix+'_bracket',[(x-.012,1.807),(x+.012,1.807),(x+.012,1.838),(x-.012,1.838)],leg_silver,.031)
        mouth_line(prefix+'_wire',[(-.18,1.823),(-.09,1.823),(0,1.823),(.09,1.823),(.18,1.823)],cyan,r=.005,offset=.041)
    elif style=='tongue':
        mouth_oval(prefix+'_opening',.15,.075,1.815,mouth_cavity)
        ell(prefix+'_tongue',(0,-.662,1.752),(.065,.025,.073),mouth_pink,'Head',n=18,m=12)
        line(prefix+'_tongue_fold',[(0,-.69,1.79),(0,-.692,1.74)],.006,red,'Head',6)
    elif style=='cat':
        mouth_line(prefix+'_left',[(0,1.85),(-.014,1.79),(-.065,1.78),(-.12,1.82)],r=.012)
        mouth_line(prefix+'_right',[(0,1.85),(.014,1.79),(.065,1.78),(.12,1.82)],r=.012)
        for side in [-1,1]:
            for z,dx in [(1.88,0),(1.835,.02),(1.79,0)]:
                mouth_line(prefix+'_whisker',[(side*.18,z),(side*(.27+dx),z+.012)],r=.005)
    elif style=='drool':
        mouth_line(prefix+'_smile',[(-.15,1.83),(-.07,1.79),(.07,1.79),(.15,1.825)],r=.015)
        line(prefix+'_drip',[(.13,-.642,1.804),(.14,-.649,1.755),(.14,-.642,1.69)],.014,mouth_green,'Head')
        ell(prefix+'_droplet',(.14,-.64,1.67),(.025,.023,.035),mouth_green,'Head',n=14,m=10)
    elif style=='skull':
        mouth_oval(prefix+'_dark',.225,.072,1.815,mouth_cavity)
        mouth_oval(prefix+'_ivory',.209,.054,1.815,white,.02)
        mouth_line(prefix+'_split',[(-.20,1.815),(-.10,1.807),(0,1.804),(.10,1.807),(.20,1.815)],r=.006,offset=.034)
        for x in [-.14,-.07,0,.07,.14]:
            mouth_line(prefix+'_gap',[(x,1.765),(x,1.865)],r=.006,offset=.036)
        for side in [-1,1]:
            mouth_line(prefix+'_cheek_bone',[(side*.215,1.83),(side*.245,1.86),(side*.27,1.85)],white,r=.018)
    else:
        mouth_panel(prefix+'_opening',[(-.23,1.86),(-.12,1.86),(0,1.85),(.12,1.86),(.23,1.86),(.16,1.76),(0,1.725),(-.16,1.76)],mouth_cavity)
        for j in range(7):
            x=(j-3)*.05
            tooth(prefix+'_upper_tooth',x,1.849,.047,.033)
        mouth_panel(prefix+'_lower_teeth',[(-.13,1.76),(0,1.745),(.13,1.76),(.08,1.782),(0,1.77),(-.08,1.782)],white,.025)
