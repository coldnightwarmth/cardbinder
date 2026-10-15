"""Forty collection studies built as substantial, independently skinned solids.

Runs in build_drifmaker.py after the atelier extension. Deliberately uses no line,
curve, decal seam, or applied surface-wire helper. Cloth folds are vertices of the
cloth shell; pockets, collars, straps, armor, hardware and hems have real depth.
The catalog records the actual source images inspected, including which lower
body designs extrapolate a source's upper-body garment language.
"""
SCULPT_WARDROBE_CATALOG=json.loads((ROOT/'scripts/showroom-assets/sculpt-wardrobe-catalog.json').read_text())
SCULPT_WARDROBE_VARIANTS={k.title():[row[0] for row in rows] for k,rows in SCULPT_WARDROBE_CATALOG.items()}
SCULPT_FULLBODY=[]

sw_ink=material('Drif_SculptW_Ink',(.012,.015,.022),.66)
sw_rubber=material('Drif_SculptW_Rubber',(.029,.035,.037),.92)
sw_bone=material('Drif_SculptW_Bone',(.78,.73,.59),.89)
sw_ivory=material('Drif_SculptW_Ivory',(.94,.88,.74),.78)
sw_rose=material('Drif_SculptW_Rose',(.59,.24,.30),.74)
sw_pink=material('Drif_SculptW_Pink',(.94,.56,.64),.61)
sw_wine=material('Drif_SculptW_Wine',(.24,.012,.034),.53)
sw_red=material('Drif_SculptW_Red',(.68,.035,.035),.55)
sw_olive=material('Drif_SculptW_Field',(.115,.16,.10),.88)
sw_olivehi=material('Drif_SculptW_Field_Pocket',(.21,.25,.15),.82)
sw_slate=material('Drif_SculptW_Slate',(.22,.27,.30),.76)
sw_navy=material('Drif_SculptW_Navy',(.028,.055,.14),.79)
sw_blue=material('Drif_SculptW_Cobalt',(.035,.15,.42),.46)
sw_cyan=material('Drif_SculptW_Cyan',(.08,.57,.67),.29,.2)
sw_gold=material('Drif_SculptW_Brass',(.58,.33,.08),.27,.78)
sw_silver=material('Drif_SculptW_Steel',(.51,.59,.62),.25,.83)
sw_chrome=material('Drif_SculptW_Chrome',(.77,.83,.86),.18,.94)
sw_leather=material('Drif_SculptW_Oxblood',(.095,.027,.027),.39)
sw_tan=material('Drif_SculptW_Tan',(.43,.28,.12),.86)
sw_wood=material('Drif_SculptW_Wood',(.17,.067,.026),.86)
sw_lime=material('Drif_SculptW_Moss',(.34,.43,.08),.82)
sw_violet=material('Drif_SculptW_Violet',(.20,.055,.38),.57)
sw_orange=material('Drif_SculptW_Orange',(.90,.24,.035),.56)


def sw_loft(name,sections,mat,weights,sides=32,folds=0,amplitude=0,thickness=.022,phase=0):
    """Open-ended garment shell with actual inner wall and closed rolled edges.
    sections = (height, radius X, radius Y, center X, center Y). Cloth gathering
    changes the shell itself and fades at the waist/neck; never surface strips.
    """
    verts=[];faces=[];nr=len(sections)
    for inside in (False,True):
        for i,(z,rx,ry,cx,cy) in enumerate(sections):
            fade=.25+.75*math.sin(math.pi*i/max(1,nr-1))**.5
            for j in range(sides):
                a=j*math.tau/sides
                wave=amplitude*fade*(math.cos(folds*a+phase+1.5*i/max(1,nr-1))+.3*math.cos((folds+3)*a-phase)) if folds else 0
                inset=thickness if inside else 0
                verts.append((cx+(rx+wave-inset)*math.cos(a),cy+(ry+.65*wave-inset)*math.sin(a),z))
    count=nr*sides
    for inside in (0,1):
        off=inside*count
        for i in range(nr-1):
            for j in range(sides):
                q=(off+i*sides+j,off+i*sides+(j+1)%sides,off+(i+1)*sides+(j+1)%sides,off+(i+1)*sides+j)
                faces.append(q[::-1] if inside else q)
    for edge in (0,nr-1):
        for j in range(sides):faces.append((edge*sides+j,edge*sides+(j+1)%sides,count+edge*sides+(j+1)%sides,count+edge*sides+j))
    return mesh(name,verts,faces,mat,weights)


def sw_solid(name,outline,depth,mat,weights='Head',bevel=.009):
    """Beveled XZ polygon, front Y supplied individually for fitted panels."""
    center=Vector(tuple(sum(p[k] for p in outline)/len(outline) for k in range(3)))
    n=len(outline);verts=[];faces=[]
    minradius=min(max(.001,(Vector(p)-center).length) for p in outline)
    inset=min(.24,bevel/minradius)
    # Four loops produce a real beveled edge and a back wall.
    for shrink,dy in [(inset,-depth/2),(0,-depth/2+bevel),(0,depth/2-bevel),(inset,depth/2)]:
        for p in outline:
            p=Vector(p);v=center+(p-center)*(1-shrink);v.y=p.y+dy;verts.append(tuple(v))
    for layer in range(3):
        for j in range(n):faces.append((layer*n+j,layer*n+(j+1)%n,(layer+1)*n+(j+1)%n,(layer+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple(3*n+j for j in range(n))])
    return mesh(name,verts,faces,mat,weights,False)


def sw_box(name,center,size,mat,weights='Chest',bevel=.012):
    x,y,z=center;w,d,h=size;b=min(bevel,w*.2,h*.2,d*.22)
    points=[(x-w/2+b,y,z-h/2),(x+w/2-b,y,z-h/2),(x+w/2,y,z-h/2+b),(x+w/2,y,z+h/2-b),(x+w/2-b,y,z+h/2),(x-w/2+b,y,z+h/2),(x-w/2,y,z+h/2-b),(x-w/2,y,z-h/2+b)]
    return sw_solid(name,points,d,mat,weights,b)


def sw_sweep(name,controls,mat,weights='Head',sides=12):
    """Structural tapered solid for horns, handles and tubing, not decoration.
    controls = (x,y,z,radius), deliberately broad and visibly three dimensional.
    """
    verts=[];faces=[]
    for i,c in enumerate(controls):
        co=Vector(c[:3]);t=Vector(controls[min(i+1,len(controls)-1)][:3])-Vector(controls[max(0,i-1)][:3]);t.normalize()
        n=t.cross(Vector((0,1,0)))
        if n.length<.001:n=t.cross(Vector((0,0,1)))
        n.normalize();b=t.cross(n).normalized()
        for j in range(sides):
            a=j*math.tau/sides;verts.append(tuple(co+c[3]*(math.cos(a)*n+math.sin(a)*b)))
        if i:
            for j in range(sides):faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(controls)-1)*sides+j for j in range(sides))])
    return mesh(name,verts,faces,mat,weights)


def sw_ring(name,center,rx,rz,wall,depth,mat,weights='Chest',segments=20,plane='xz'):
    # A true ring solid, used for hardware, open collars, or brims.
    x,y,z=center;verts=[];faces=[]
    for radius_delta,along in [(0,-depth/2),(-wall,-depth/2),(-wall,depth/2),(0,depth/2)]:
        for j in range(segments):
            a=j*math.tau/segments;u=(rx+radius_delta)*math.cos(a);v=(rz+radius_delta)*math.sin(a)
            verts.append((x+u,y+along,z+v) if plane=='xz' else (x+u,y+v,z+along))
    for q in range(4):
        for j in range(segments):faces.append((q*segments+j,q*segments+(j+1)%segments,((q+1)%4)*segments+(j+1)%segments,((q+1)%4)*segments+j))
    return mesh(name,verts,faces,mat,weights)


def sw_buckle(name,center,width=.09,height=.074,weights='Chest'):
    x,y,z=center;wall=.016
    sw_box(name+'_top',(x,y,z+height/2-wall/2),(width,.029,wall),sw_silver,weights,.004)
    sw_box(name+'_bottom',(x,y,z-height/2+wall/2),(width,.029,wall),sw_silver,weights,.004)
    for s in (-1,1):sw_box(name+'_side',(x+s*(width-wall)/2,y,z),(wall,.029,height),sw_silver,weights,.004)
    sw_box(name+'_tongue',(x,y-.018,z),(.013,.018,height*.78),sw_silver,weights,.003)


def sw_arm(name,side,label,mat,puff=False,cuffmat=None):
    profile=[(.32,.148),(.39,.182),(.46,.212 if puff else .191),(.54,.226 if puff else .194),(.63,.211 if puff else .188),(.70,.181),(.77,.176),(.82,.168),(.88,.174),(.94,.163),(1.02,.171),(1.08,.153),(1.12,.148)]
    verts=[];faces=[];n=28
    for i,(x,r) in enumerate(profile):
        for j in range(n):
            a=j*math.tau/n;fold=.008*math.cos(a*7+x*28)*math.sin(math.pi*i/(len(profile)-1))
            verts.append((side*x,(r+fold)*math.cos(a),1.465+(r+fold)*math.sin(a)))
    for i in range(len(profile)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+j for j in range(n))])
    obj=mesh(name+'_sleeve',verts,faces,mat,lambda co:dm_arm_weights(co,label))
    # Cuff is a thick fabric segment of the sleeve, with a rolled outside edge.
    if cuffmat:
        verts=[];faces=[]
        for x,r in [(1.055,.158),(1.075,.171),(1.11,.167),(1.13,.149)]:
            for j in range(n):
                a=j*math.tau/n;verts.append((side*x,r*math.cos(a),1.465+r*math.sin(a)))
        for i in range(3):
            for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
        faces.extend([tuple(reversed(range(n))),tuple(3*n+j for j in range(n))])
        mesh(name+'_cuff',verts,faces,cuffmat,'Forearm.'+label)
    return obj

sw_profiles={}
def sw_top(style,mat,puff=False,hem=.75,cuff=None,folds=9,bulk=0):
    p='Drif_Shirt_'+style
    profile=[(hem,.38+bulk,.245+bulk*.5,0,0),(.80,.411+bulk,.264+bulk*.5,0,0),(.94,.426+bulk,.278+bulk*.5,0,0),(1.08,.418+bulk,.28+bulk*.5,0,0),(1.24,.409+bulk,.26+bulk*.5,0,0),(1.40,.384+bulk,.232+bulk*.5,0,0),(1.50,.335,.21,0,0),(1.58,.225,.17,0,0)]
    sw_profiles[p]=profile
    sw_loft(p+'_fabric',profile,mat,torso_weights,40,folds,.012,.024)
    for s,label in [(-1,'R'),(1,'L')]:sw_arm(p,s,label,mat,puff,cuff or mat)
    sw_loft(p+'_hem',[(hem,.388+bulk,.252+bulk*.5,0,0),(hem+.025,.397+bulk,.261+bulk*.5,0,0),(hem+.055,.412+bulk,.267+bulk*.5,0,0)],cuff or mat,torso_weights,40,0,0,.035)
    return p


def sw_front(p,x,z,offset=.025):
    sections=sw_profiles.get(p,[(.75,.42,.29,0,0),(1.4,.39,.24,0,0),(1.6,.225,.17,0,0)])
    a,b=sections[0],sections[-1]
    for k in range(len(sections)-1):
        if sections[k][0]<=z<=sections[k+1][0]:a,b=sections[k:k+2];break
    t=max(0,min(1,(z-a[0])/max(.001,b[0]-a[0])));rx=a[1]*(1-t)+b[1]*t;ry=a[2]*(1-t)+b[2]*t
    return (x,-ry*math.sqrt(max(.035,1-(x/rx)**2))-offset,z)


def sw_garmentpanel(p,name,xz,mat,depth=.038,offset=.035,bevel=.009):
    # Tessellate the actual cloth surface, including interior vertices. A broad
    # belt/pocket must follow the belly between its corners, not cut through it.
    from mathutils.geometry import tessellate_polygon
    boundary=[Vector((x,z,0)) for x,z in xz]
    raw_triangles=tessellate_polygon([boundary])
    # Blender 5.2 returns source indices; earlier mathutils returns Vectors.
    triangles=[[boundary[v] if isinstance(v,int) else v for v in tri] for tri in raw_triangles]
    verts=[];faces=[]
    for side in (-1,1):
        for tri in triangles:
            steps=max(2,min(12,math.ceil(max((tri[k]-tri[(k+1)%3]).length for k in range(3))/.065)))
            indices={}
            for i in range(steps+1):
                for j in range(steps+1-i):
                    v=tri[0]+(tri[1]-tri[0])*(i/steps)+(tri[2]-tri[0])*(j/steps)
                    x,y,z=sw_front(p,v.x,v.y,offset)
                    indices[(i,j)]=len(verts);verts.append((x,y+side*depth/2,z))
            for i in range(steps):
                for j in range(steps-i):
                    faces.append((indices[i,j],indices[i+1,j],indices[i,j+1]))
                    if j<steps-i-1:faces.append((indices[i+1,j],indices[i+1,j+1],indices[i,j+1]))
    for k,(x,z) in enumerate(xz):
        nx,nz=xz[(k+1)%len(xz)];steps=max(2,math.ceil(math.hypot(nx-x,nz-z)/.065))
        for j in range(steps):
            corners=[]
            for t,side in [(j/steps,-1),((j+1)/steps,-1),((j+1)/steps,1),(j/steps,1)]:
                xx,yy,zz=sw_front(p,x+(nx-x)*t,z+(nz-z)*t,offset)
                corners.append(len(verts));verts.append((xx,yy+side*depth/2,zz))
            faces.append(tuple(corners))
    return mesh(p+'_'+name,verts,faces,mat,torso_weights)


def sw_pocket(p,x,z,width=.15,height=.15,mat=None):
    # Bellows body, dark actual pocket cavity, rolled lip, folded flap and clasp.
    m=mat or sw_olivehi
    sw_garmentpanel(p,'pocket_gusset',[(x-width/2,z-height/2),(x+width/2,z-height/2),(x+width*.54,z+height/2),(x-width*.54,z+height/2)],m,.085,.045,.014)
    sw_garmentpanel(p,'pocket_mouth',[(x-width*.44,z+height*.31),(x+width*.44,z+height*.31),(x+width*.44,z+height*.48),(x-width*.44,z+height*.48)],sw_ink,.016,.098,.003)
    sw_garmentpanel(p,'pocket_flap',[(x-width*.57,z+height*.60),(x+width*.57,z+height*.60),(x+width*.51,z+height*.22),(x,z+height*.10),(x-width*.51,z+height*.22)],m,.038,.109,.007)
    xx,yy,zz=sw_front(p,x,z+height*.27,.14);ell(p+'_pocket_snap',(xx,yy,zz),(.016,.013,.016),sw_gold,torso_weights,n=10,m=6)


def sw_lapels(p,mat,height=1.56):
    for s in (-1,1):
        sw_garmentpanel(p,'folded_lapel',[(s*.03,height),(s*.21,height+.012),(s*.31,height-.08),(s*.12,height-.17),(s*.25,height-.22),(s*.06,height-.43)],mat,.049,.06,.009)


def sw_strap(p,name,xz,mat=sw_leather,width=.065,offset=.07):
    # Wide closed ribbon solid, appropriate for load-bearing textile straps.
    verts=[]
    for i,(x,z) in enumerate(xz):
        a=Vector(xz[max(0,i-1)]);b=Vector(xz[min(len(xz)-1,i+1)]);t=(b-a).normalized();normal=Vector((-t.y,t.x))
        verts.append(sw_front(p,x+normal.x*width/2,z+normal.y*width/2,offset))
    for i,(x,z) in reversed(list(enumerate(xz))):
        a=Vector(xz[max(0,i-1)]);b=Vector(xz[min(len(xz)-1,i+1)]);t=(b-a).normalized();normal=Vector((-t.y,t.x))
        verts.append(sw_front(p,x-normal.x*width/2,z-normal.y*width/2,offset))
    return sw_solid(p+'_'+name,verts,.028,mat,torso_weights,.005)


# SHIRTS -------------------------------------------------------------------
for sw_style in SCULPT_WARDROBE_VARIANTS['Shirt']:
    if sw_style=='restraintcoat':
        p=sw_top(sw_style,sw_slate,cuff=sw_ink,bulk=.008)
        sw_loft(p+'_folded_collar',[(1.54,.235,.18,0,0),(1.59,.244,.186,0,0),(1.63,.23,.176,0,0)],sw_ink,'Chest',32,8,.006,.045)
        for z in [.90,1.12,1.34]:
            sw_garmentpanel(p,'restraint_belt',[(-.38,z-.043),(.38,z-.043),(.38,z+.043),(-.38,z+.043)],sw_leather,.039,.055)
            x,y,zz=sw_front(p,.13,z,.095);sw_buckle(p+'_restraint_buckle',(x,y,zz),.11,.085,torso_weights)
        sw_pocket(p,-.21,1.05,.16,.19,sw_slate)
    elif sw_style=='gemblazer':
        p=sw_top(sw_style,sw_rose,puff=True,cuff=sw_wine)
        sw_lapels(p,sw_pink)
        for s in (-1,1):
            sw_pocket(p,s*.22,.94,.17,.15,sw_rose)
            for k,(x,z) in enumerate([(s*.15,1.40),(s*.23,1.31),(s*.29,1.20),(s*.34,1.05),(s*.31,.83)]):
                pt=sw_front(p,x,z,.075)
                sw_box(p+'_gem_setting',pt,(.078,.035,.091),sw_gold,torso_weights,.012)
                xx,yy,zz=pt
                sw_solid(p+'_faceted_stone',[(xx,yy-.029,zz+.036),(xx+.029,yy-.035,zz),(xx,yy-.029,zz-.036),(xx-.029,yy-.035,zz)],.036,sw_cyan if k%2 else sw_pink,torso_weights,.009)
        for z in [1.08,.91]:ell(p+'_button',sw_front(p,0,z,.06),(.021,.017,.021),sw_gold,torso_weights,n=12,m=8)
    elif sw_style=='officerleather':
        p=sw_top(sw_style,sw_ink,cuff=sw_leather,hem=.72,bulk=.015)
        sw_lapels(p,sw_leather)
        sw_garmentpanel(p,'red_cravat',[(-.075,1.54),(.075,1.54),(.06,1.26),(0,1.18),(-.06,1.26)],sw_wine,.052,.046)
        for s,label in [(-1,'R'),(1,'L')]:
            sw_box(p+'_epaulette',(s*.43,-.012,1.67),(.22,.23,.07),sw_leather,'UpperArm.'+label,.018)
            for z in [1.27,1.06,.85]:ell(p+'_brass_button',sw_front(p,s*.16,z,.07),(.025,.021,.025),sw_gold,torso_weights,n=12,m=8)
            sw_pocket(p,s*.23,.91,.15,.16,sw_leather)
    elif sw_style=='bosozoku':
        p=sw_top(sw_style,sw_slate,cuff=sw_red,hem=.72)
        sw_lapels(p,sw_slate)
        for s,label in [(-1,'R'),(1,'L')]:
            sw_garmentpanel(p,'red_yoke',[(s*.21,1.51),(s*.33,1.46),(s*.37,1.35),(s*.27,1.34)],sw_red,.034,.039)
            sw_pocket(p,s*.21,1.20,.18,.13,sw_slate)
            sw_garmentpanel(p,'chest_badge',[(s*.21-.072,1.135),(s*.21+.072,1.135),(s*.21+.072,1.18),(s*.21-.072,1.18)],sw_ivory,.02,.12)
        for z in [.87,1.02,1.18,1.35]:ell(p+'_metal_button',sw_front(p,0,z,.06),(.019,.014,.019),sw_silver,torso_weights,n=10,m=6)
        sw_garmentpanel(p,'placket',[(-.026,.79),(.026,.79),(.026,1.45),(-.026,1.45)],sw_olivehi,.025,.037)
    elif sw_style=='fieldmedic':
        p=sw_top(sw_style,sw_bone,puff=True,cuff=sw_ivory)
        sw_loft(p+'_turtleneck',[(1.54,.228,.175,0,0),(1.60,.24,.18,0,0),(1.65,.21,.165,0,0)],sw_ivory,'Chest',32,12,.009,.035)
        # Broad insignia is a thick, beveled cloth applique, not surface linework.
        sw_garmentpanel(p,'cross_vertical',[(-.043,1.00),(.043,1.00),(.043,1.39),(-.043,1.39)],sw_red,.018,.035,.005)
        sw_garmentpanel(p,'cross_horizontal',[(-.19,1.17),(.19,1.17),(.19,1.25),(-.19,1.25)],sw_red,.018,.036,.005)
        for s in (-1,1):sw_pocket(p,s*.235,.88,.145,.14,sw_ivory)
    elif sw_style=='exoshell':
        p=sw_top(sw_style,sw_rubber,cuff=sw_silver)
        for s,label in [(-1,'R'),(1,'L')]:
            sw_garmentpanel(p,'pectoral_shell',[(s*.035,1.46),(s*.27,1.48),(s*.37,1.32),(s*.28,1.16),(s*.04,1.20)],sw_ivory,.075,.06,.017)
            sw_box(p+'_deltoid_plate',(s*.48,-.01,1.64),(.22,.31,.11),sw_ivory,'UpperArm.'+label,.025)
            for k,z in enumerate([.87,1.00,1.13]):
                sw_garmentpanel(p,'abdominal_plate',[(s*.025,z-.048),(s*.28,z-.048),(s*.31,z+.040),(s*.025,z+.046)],sw_silver,.051,.048,.011)
            sw_box(p+'_forearm_shell',(s*.94,-.12,1.48),(.26,.16,.20),sw_ivory,lambda co,l=label:dm_arm_weights(co,l),.028)
        sw_box(p+'_core_housing',(0,-.34,1.26),(.135,.105,.205),sw_ink,'Chest',.021)
        sw_box(p+'_core_inset',(0,-.401,1.26),(.078,.022,.137),sw_cyan,'Chest',.008)
    elif sw_style=='sunderland':
        p=sw_top(sw_style,sw_olive,cuff=sw_olivehi)
        sw_lapels(p,sw_olivehi)
        for s in (-1,1):
            sw_pocket(p,s*.21,1.27,.17,.17,sw_olivehi)
            sw_pocket(p,s*.23,.91,.20,.18,sw_olive)
        sw_garmentpanel(p,'storm_placket',[(-.035,.78),(.035,.78),(.035,1.48),(-.035,1.48)],sw_olivehi,.036,.045)
        for z in [.88,1.04,1.20,1.36]:ell(p+'_snap',sw_front(p,.012,z,.079),(.014,.012,.014),sw_gold,torso_weights,n=10,m=6)
    elif sw_style=='ruffleharness':
        p=sw_top(sw_style,sw_rose,puff=True,cuff=sw_bone,folds=16)
        # Gathered ruffle collar and peplum have integrated alternating lobes.
        sw_loft(p+'_ruffled_collar',[(1.51,.26,.185,0,0),(1.56,.285,.20,0,0),(1.62,.235,.17,0,0)],sw_bone,'Chest',48,18,.028,.018)
        collar=[(-.28,1.49),(.28,1.49)]+[(.28-.56*k/18,1.365+.018*math.cos(k*math.pi)) for k in range(19)]
        sw_garmentpanel(p,'falling_ruffle_collar',collar,sw_bone,.042,.075)
        sw_loft(p+'_ruffled_hem',[(.72,.45,.29,0,0),(.77,.44,.285,0,0),(.84,.398,.25,0,0)],sw_bone,torso_weights,48,18,.022,.02)
        for s in (-1,1):sw_strap(p,'harness',[(s*.21,1.51),(s*.25,1.22),(s*.24,.89)],sw_ink,.076,.08)
        sw_garmentpanel(p,'harness_belt',[(-.40,1.04),(.40,1.04),(.40,1.14),(-.40,1.14)],sw_ink,.035,.075)
        sw_buckle(p+'_center_buckle',(0,-.395,1.09),.13,.105,torso_weights)
    elif sw_style=='snowblouse':
        p=sw_top(sw_style,sw_ivory,puff=True,cuff=sw_blue,folds=15)
        for s in (-1,1):
            sw_garmentpanel(p,'scallop_collar',[(0,1.56),(s*.21,1.58),(s*.27,1.48),(s*.21,1.41),(s*.10,1.45)],sw_ivory,.055,.06,.018)
            sw_garmentpanel(p,'bow_loop',[(s*.015,1.44),(s*.18,1.53),(s*.21,1.44),(s*.17,1.35),(s*.015,1.40)],sw_red,.085,.105,.016)
            sw_garmentpanel(p,'bow_tail',[(s*.02,1.42),(s*.09,1.40),(s*.13,1.19),(s*.07,1.22),(s*.025,1.19)],sw_red,.045,.06,.009)
        ell(p+'_bow_knot',(0,-.32,1.43),(.048,.052,.061),sw_wine,'Chest',n=16,m=10)
        for z in [.91,1.06,1.21]:ell(p+'_pearl_button',sw_front(p,0,z,.049),(.017,.017,.017),sw_bone,torso_weights,n=12,m=8)
    else:
        p=sw_top(sw_style,sw_ink,cuff=sw_rubber,bulk=.025,folds=6)
        # Open high collar with inner fabric and broad shaped lapels under muzzle.
        sw_loft(p+'_high_collar',[(1.49,.29,.20,0,.018),(1.58,.29,.21,0,.028),(1.67,.27,.21,0,.045)],sw_rubber,'Chest',40,5,.012,.045)
        sw_garmentpanel(p,'storm_fastener',[(-.043,.79),(.043,.79),(.043,1.57),(-.043,1.57)],sw_slate,.042,.065)
        for s in (-1,1):
            sw_garmentpanel(p,'angled_welt',[(s*.18,.93),(s*.32,1.08),(s*.35,1.04),(s*.22,.87)],sw_slate,.05,.058)
        for z in [.92,1.12,1.32,1.51]:sw_box(p+'_fastening',sw_front(p,0,z,.097),(.065,.029,.043),sw_silver,torso_weights,.008)


# LEGS ---------------------------------------------------------------------
def sw_legbase(style,mat,kind='straight',feet=True):
    p='Drif_Legs_'+style
    sw_loft(p+'_waist',[(.63,.35,.22,0,0),(.73,.37,.235,0,0),(.80,.352,.22,0,0)],mat,'Pelvis',36,8,.008,.035)
    if feet:subset(p+'_original_feet',foot_polygons)
    for s,label in [(-1,'R'),(1,'L')]:
        x=s*.215;w=lower_weights(label)
        radii={'straight':[.145,.165,.175,.183,.177], 'wide':[.205,.22,.23,.215,.18], 'breech':[.14,.15,.19,.235,.19], 'bloom':[.15,.19,.225,.23,.18], 'boot':[.155,.17,.175,.18,.18]}[kind]
        sections=[(z,r,r*1.07,x,0) for z,r in zip([.215,.31,.44,.57,.69],radii)]
        sw_loft(p+'_trouser',sections,mat,w,32,8,.01,.022,phase=s*.8)
        sw_loft(p+'_cuff',[(.205,radii[0]+.005,(radii[0]+.005)*1.07,x,0),(.24,radii[0]+.015,(radii[0]+.015)*1.07,x,0)],mat,'Shin.'+label,32,0,0,.03)
    return p


def sw_legplate(p,label,x,z,outline,mat=sw_silver,depth=.045,y=-.205):
    return sw_solid(p+'_panel',[(x+dx,y,z+dz) for dx,dz in outline],depth,mat,lower_weights(label),.012)


def sw_shoe(p,s,label,mat):
    x=s*.215
    # Four cross sections make a broad rounded boot toe and built-up sole.
    sw_loft(p+'_sole',[(0,.173,.244,x,-.07),(.05,.183,.255,x,-.07),(.09,.178,.246,x,-.07)],sw_rubber,'Foot.'+label,28,0,0,.035)
    ell(p+'_toe',(x,-.095,.13),(.18,.253,.12),mat,'Foot.'+label,n=24,m=14)
    sw_loft(p+'_bootshaft',[(.12,.156,.17,x,0),(.23,.172,.187,x,0),(.34,.185,.203,x,0),(.36,.188,.206,x,0)],mat,'Shin.'+label,28,5,.006,.026)
    for z in [.23,.30]:
        sw_box(p+'_buckle_strap',(x,-.188,z),(.24,.04,.052),sw_ink,'Shin.'+label,.009)
        sw_buckle(p+'_buckle',(x+s*.055,-.22,z),.078,.055,'Shin.'+label)


for sw_style in SCULPT_WARDROBE_VARIANTS['Legs']:
    cloth={'restraintstraps':sw_slate,'gemskirt':sw_wine,'officerbreeches':sw_ink,'bosozokuwide':sw_slate,'medicwraps':sw_bone,'exogreaves':sw_rubber,'fieldkneepads':sw_olive,'rufflebloomers':sw_rose,'snowpleats':sw_blue,'stormwaders':sw_ink}[sw_style]
    kind='wide' if sw_style=='bosozokuwide' else 'breech' if sw_style=='officerbreeches' else 'bloom' if sw_style=='rufflebloomers' else 'straight'
    p=sw_legbase(sw_style,cloth,kind,sw_style not in ['officerbreeches','exogreaves','stormwaders'])
    if sw_style in ['gemskirt','snowpleats']:
        # Split pleated panels are weighted independently to each leg; this avoids
        # a single rigid skirt bridging apart during walk/crouch.
        for s,label in [(-1,'R'),(1,'L')]:
            x=s*.215;w=lower_weights(label)
            sw_loft(p+'_split_pleats',[(.38,.235,.255,x,0),(.47,.227,.247,x,0),(.59,.203,.23,x,0),(.72,.177,.205,x,0)],sw_rose if sw_style=='gemskirt' else sw_blue,w,40,10,.028,.022)
            sw_loft(p+'_hem',[(.375,.235,.255,x,0),(.405,.238,.257,x,0)],sw_gold if sw_style=='gemskirt' else sw_ivory,w,40,10,.018,.028)
            if sw_style=='gemskirt':
                for k in range(3):
                    xx=x+(k-1)*.105
                    sw_box(p+'_jewel_setting',(xx,-.247,.54),(.06,.028,.075),sw_gold,w,.01)
                    ell(p+'_jewel',(xx,-.272,.54),(.020,.017,.026),sw_cyan,w,n=8,m=6)
    for s,label in [(-1,'R'),(1,'L')]:
        x=s*.215;w=lower_weights(label)
        if sw_style=='restraintstraps':
            for z in [.31,.48,.62]:
                sw_loft(p+'_restraint',[(z-.025,.182 if z>.35 else .17,.195 if z>.35 else .183,x,0),(z+.025,.182 if z>.35 else .17,.195 if z>.35 else .183,x,0)],sw_leather,w,28,0,0,.032)
                sw_buckle(p+'_buckle',(x,-.212,z),.085,.067,w)
            sw_legplate(p,label,x,.54,[(-.11,.04),(.11,.04),(.11,-.08),(-.11,-.08)],sw_slate,.055,-.217)
        elif sw_style=='officerbreeches':
            sw_shoe(p,s,label,sw_leather)
            sw_loft(p+'_boot_cuff',[(.32,.18,.188,x,0),(.37,.188,.194,x,0),(.39,.174,.184,x,0)],sw_leather,'Shin.'+label,28,0,0,.04)
            sw_legplate(p,label,x,.55,[(-.13,.09),(.12,.09),(.13,-.06),(.02,-.09),(-.12,-.06)],sw_leather,.029,-.221)
        elif sw_style=='bosozokuwide':
            sw_loft(p+'_rolled_wide_hem',[(.21,.217,.231,x,0),(.26,.226,.238,x,0),(.29,.219,.233,x,0)],sw_red,'Shin.'+label,36,12,.012,.035)
            sw_legplate(p,label,x,.59,[(-.11,.05),(.11,.05),(.11,-.05),(-.11,-.05)],sw_ivory,.03,-.234)
            sw_box(p+'_tab',(x,-.263,.60),(.10,.025,.034),sw_red,'Thigh.'+label,.006)
        elif sw_style=='medicwraps':
            for k in range(5):
                z=.25+k*.075;r=.165 if k<2 else .184
                sw_loft(p+'_overlapping_wrap',[(z,r,.183 if k<2 else .204,x,0),(z+.023,r+.009,.192 if k<2 else .213,x,0),(z+.061,r+.005,.188 if k<2 else .209,x,0)],sw_ivory if k%2 else sw_bone,w,28,3,.006,.022)
            sw_legplate(p,label,x,.58,[(-.07,-.055),(.07,-.055),(.07,.055),(-.07,.055)],sw_red,.021,-.229)
        elif sw_style=='exogreaves':
            sw_shoe(p,s,label,sw_silver)
            sw_legplate(p,label,x,.50,[(-.11,.16),(.11,.16),(.14,.05),(.10,-.05),(0,-.09),(-.10,-.05),(-.14,.05)],sw_ivory,.08,-.22)
            sw_legplate(p,label,x,.29,[(-.09,.09),(.09,.09),(.105,-.05),(.06,-.09),(-.06,-.09),(-.105,-.05)],sw_silver,.06,-.22)
            sw_box(p+'_knee_inset',(x,-.277,.44),(.13,.024,.052),sw_cyan,w,.008)
            for dx in [-.079,.079]:ell(p+'_knee_rivet',(x+dx,-.274,.50),(.017,.011,.017),sw_ink,w,n=10,m=6)
        elif sw_style=='fieldkneepads':
            sw_legplate(p,label,x,.44,[(-.12,.10),(.12,.10),(.14,0),(.09,-.11),(-.09,-.11),(-.14,0)],sw_rubber,.071,-.205)
            sw_legplate(p,label,x,.44,[(-.084,.067),(.084,.067),(.097,0),(.063,-.074),(-.063,-.074),(-.097,0)],sw_olivehi,.03,-.254)
            sw_box(p+'_cargo_gusset',(x+s*.18,.01,.59),(.075,.18,.15),sw_olivehi,'Thigh.'+label,.018)
            sw_box(p+'_cargo_flap',(x+s*.19,-.015,.66),(.08,.20,.045),sw_olive,'Thigh.'+label,.012)
        elif sw_style=='rufflebloomers':
            sw_loft(p+'_ruffled_cuff',[(.25,.175,.19,x,0),(.285,.213,.225,x,0),(.32,.20,.216,x,0)],sw_bone,w,40,14,.023,.024)
            for dx in [-.045,.045]:
                sw_solid(p+'_bow_loop',[(x,-.252,.55),(x+dx*2,-.258,.60),(x+dx*2.2,-.26,.53),(x,-.252,.52)],.043,sw_wine,'Thigh.'+label,.008)
            ell(p+'_bow_knot',(x,-.275,.54),(.025,.021,.033),sw_wine,'Thigh.'+label,n=12,m=8)
        elif sw_style=='stormwaders':
            sw_shoe(p,s,label,sw_rubber)
            sw_loft(p+'_reinforced_shaft',[(.22,.180,.195,x,0),(.34,.188,.207,x,0),(.46,.199,.217,x,0),(.48,.201,.220,x,0)],sw_rubber,w,32,4,.005,.036)
            sw_legplate(p,label,x,.56,[(-.11,.10),(.11,.10),(.12,-.10),(-.12,-.10)],sw_slate,.047,-.207)
            for z in [.49,.62]:sw_box(p+'_fastener',(x,-.244,z),(.13,.034,.034),sw_silver,w,.008)


# HATS ---------------------------------------------------------------------
def sw_hatcap(p,mat,rx=.43,ry=.37,peak=3.02):
    sw_loft(p+'_cap',[(2.64,rx,ry,0,.035),(2.73,rx+.012,ry+.012,0,.035),(2.84,rx*.85,ry*.88,0,.035),(2.94,rx*.53,ry*.57,0,.035),(peak,.04,.04,0,.035)],mat,'Head',40,6,.006,.035)
    sw_loft(p+'_headband',[(2.62,rx+.025,ry+.026,0,.035),(2.68,rx+.030,ry+.031,0,.035)],mat,'Head',40,0,0,.045)


def sw_brim(p,mat,back=False):
    # Curved closed bill, with multiple cross sections and substantial thickness.
    verts=[];faces=[];rows=6;cols=16
    for layer in (0,1):
        for i in range(rows):
            t=i/(rows-1)
            for j in range(cols+1):
                u=(j/cols-.5)*2;x=.35*u*(1-.08*t);y=(-.22-.37*t)*math.sqrt(max(.12,1-u*u*.66));z=2.65-.06*t-.055*u*u
                verts.append((x,-y if back else y,z+layer*.034))
    N=rows*(cols+1)
    for layer in (0,1):
        for i in range(rows-1):
            for j in range(cols):
                a=layer*N+i*(cols+1)+j;faces.append((a,a+1,a+cols+2,a+cols+1))
    boundary=list(range(cols+1))+[i*(cols+1)+cols for i in range(1,rows)]+list(range((rows-1)*(cols+1)+cols-1,(rows-1)*(cols+1)-1,-1))+[i*(cols+1) for i in range(rows-2,0,-1)]
    for j,a in enumerate(boundary):b=boundary[(j+1)%len(boundary)];faces.append((a,b,N+b,N+a))
    return mesh(p+'_bill',verts,faces,mat,'Head')


for sw_style in SCULPT_WARDROBE_VARIANTS['Hat']:
    p='Drif_Hat_'+sw_style
    if sw_style=='falconhelm':
        sw_hatcap(p,sw_silver,.445,.385,3.03)
        # Central raised beak crest plus overlapping swept temple plates.
        sw_solid(p+'_forehead_ridge',[(-.14,-.325,2.72),(0,-.47,2.61),(.14,-.325,2.72),(.075,-.20,3.04),(0,-.12,3.16),(-.075,-.20,3.04)],.075,sw_chrome,'Head',.013)
        for s in (-1,1):
            for k in range(3):
                sw_solid(p+'_temple_scale',[(s*.33,.02+k*.08,2.79-k*.035),(s*.53,.07+k*.08,2.80-k*.035),(s*.52,.16+k*.08,2.67-k*.035),(s*.38,.12+k*.08,2.63-k*.035)],.065,sw_silver,'Head',.015)
            ell(p+'_hinge',(s*.447,-.075,2.73),(.046,.028,.046),sw_gold,n=16,m=10)
    elif sw_style=='psychiccrest':
        sw_hatcap(p,sw_navy,.42,.36,2.98)
        for s in (-1,1):
            sw_solid(p+'_swept_prong',[(s*.05,-.30,2.71),(s*.35,-.25,2.80),(s*.43,-.19,3.27),(s*.34,-.19,3.13),(s*.27,-.20,3.01),(s*.14,-.24,3.07),(s*.10,-.21,3.40)],.11,sw_silver,'Head',.018)
        sw_solid(p+'_center_keel',[(-.075,-.35,2.72),(.075,-.35,2.72),(.075,-.25,3.18),(0,-.19,3.38),(-.075,-.25,3.18)],.10,sw_chrome,'Head',.015)
        for s in (-1,1):sw_box(p+'_vent',(s*.24,-.342,2.77),(.09,.055,.075),sw_ink,'Head',.01)
    elif sw_style=='wingedslump':
        sw_hatcap(p,sw_ink);sw_brim(p,sw_orange)
        sw_box(p+'_front_patch',(0,-.355,2.82),(.32,.045,.13),sw_bone,'Head',.018)
        for s in (-1,1):
            for k in range(4):
                sw_solid(p+'_wing_feather',[(s*.35,.06,2.84),(s*(.58+k*.055),.04,3.05+k*.005),(s*(.57+k*.055),.10,2.94-k*.035),(s*.38,.12,2.77)],.045,sw_ivory,'Head',.009)
        ell(p+'_cap_button',(0,.035,3.035),(.058,.052,.038),sw_orange,n=16,m=10)
    elif sw_style=='patchsprite':
        sw_hatcap(p,sw_bone,.44,.38,3.00);sw_brim(p,sw_bone)
        for s in (-1,1):
            sw_sweep(p+'_bent_ear',[(s*.24,.01,2.88,.105),(s*.31,.01,3.09,.093),(s*.39,-.01,3.27,.063),(s*.47,-.02,3.29,.025)],sw_bone,'Head',16)
            sw_sweep(p+'_ear_tip',[(s*.39,-.01,3.25,.067),(s*.47,-.02,3.29,.028),(s*.50,-.02,3.27,.008)],sw_ink,'Head',16)
            sw_ring(p+'_button_eye',(s*.14,-.355,2.84),.043,.048,.020,.036,sw_ink,'Head',16)
            ell(p+'_cheek_patch',(s*.25,-.325,2.75),(.039,.024,.032),sw_orange,n=14,m=8)
        sw_solid(p+'_cloth_mouth',[(-.13,-.374,2.74),(0,-.394,2.71),(.13,-.374,2.74),(.09,-.374,2.70),(0,-.394,2.68),(-.09,-.374,2.70)],.025,sw_ink,'Head',.005)
    elif sw_style=='starsbandana':
        sw_hatcap(p,sw_bone,.435,.37,2.99)
        band_sections=[(2.63+i*.016,.483-.033*i/10,.419-.029*i/10,0,.035) for i in range(11)]
        band=sw_loft(p+'_wrapped_band',band_sections,sw_red,'Head',40,8,.008,.03)
        band.data.materials.append(sw_ivory)
        for face in band.data.polygons:
            # Ivory stripes are material regions of the curved textile itself.
            row=int(round((face.center.z-2.638)/.016))
            if row in (1,3,5):face.material_index=1
        sw_solid(p+'_blue_fold',[(-.40,-.19,2.66),(-.05,-.385,2.66),(-.05,-.36,2.89),(-.29,-.27,2.92)],.038,sw_blue,'Head',.01)
        for x,z in [(-.30,2.74),(-.17,2.75),(-.23,2.83)]:
            sw_solid(p+'_fold_star',[(x,-.385,z+.026),(x+.015,-.385,z+.007),(x+.029,-.385,z-.015),(x,-.385,z-.007),(x-.029,-.385,z-.015),(x-.015,-.385,z+.007)],.021,sw_ivory,'Head',.004)
        ell(p+'_knot',(.40,.15,2.68),(.072,.073,.06),sw_red,n=16,m=10)
        for k in range(2):sw_solid(p+'_tie_tail',[(.40,.18,2.70),(.49,.22,2.68),(.55,.29,2.40-k*.05),(.42,.26,2.45-k*.05)],.035,sw_red if k else sw_blue,'Head',.008)
    elif sw_style=='catknithood':
        sw_hatcap(p,sw_ink,.45,.40,3.04)
        # Broad hollow folded ears with a recessed inner fabric face.
        for s in (-1,1):
            sw_solid(p+'_ear_shell',[(s*.19,.03,2.89),(s*.43,.04,2.86),(s*.47,.04,3.27),(s*.35,.025,3.21)],.16,sw_ink,'Head',.023)
            sw_solid(p+'_ear_inner',[(s*.26,-.065,2.97),(s*.39,-.065,2.96),(s*.42,-.06,3.17)],.022,sw_slate,'Head',.008)
        sw_loft(p+'_turned_cuff',[(2.61,.484,.433,0,.035),(2.68,.49,.439,0,.035),(2.75,.470,.417,0,.035)],sw_rubber,'Head',48,16,.009,.048)
    elif sw_style=='leatherbat':
        sw_hatcap(p,sw_leather,.43,.37,3.02)
        for s in (-1,1):
            sw_solid(p+'_bat_wing',[(s*.31,.045,2.85),(s*.48,.06,3.22),(s*.64,.08,3.20),(s*.79,.10,3.08),(s*.86,.12,2.87),(s*.71,.11,2.98),(s*.62,.09,2.91),(s*.55,.08,3.02),(s*.45,.06,2.83)],.065,sw_leather,'Head',.012)
            sw_solid(p+'_wing_bone',[(s*.34,-.003,2.88),(s*.48,.012,3.22),(s*.52,.017,3.20),(s*.39,.001,2.89)],.045,sw_ink,'Head',.008)
        sw_solid(p+'_forehead_plating',[(-.12,-.354,2.79),(0,-.39,2.70),(.12,-.354,2.79),(.07,-.29,2.97),(-.07,-.29,2.97)],.051,sw_ink,'Head',.012)
    elif sw_style=='thorncirclet':
        sw_ring(p+'_woven_circlet',(0,.03,2.68),.45,.39,.068,.09,sw_violet,'Head',32,'xy')
        for j in range(12):
            a=j*math.tau/12;xx=.43*math.cos(a);yy=.03+.37*math.sin(a)
            sw_sweep(p+'_thorn',[(xx,yy,2.68,.046),(xx*1.05,yy*1.05,2.79,.03),(xx*1.12,yy*1.11,2.93+(j%3)*.025,.004)],sw_violet,'Head',10)
        for j in range(6):
            a=j*math.tau/6;ell(p+'_wood_knot',(.45*math.cos(a),.03+.39*math.sin(a),2.67),(.066,.06,.056),sw_ink,n=12,m=8)
    elif sw_style=='clothram':
        sw_hatcap(p,sw_tan,.44,.38,3.01)
        for s in (-1,1):
            controls=[]
            for j in range(12):
                t=j/11;a=.10+t*math.pi*1.7;r=.21*(1-.58*t)
                controls.append((s*(.44+r*math.sin(a)),.045+r*math.cos(a),2.80-.22*t,.092*(1-.64*t)))
            sw_sweep(p+'_curled_horn',controls,sw_tan,'Head',16)
            sw_solid(p+'_earflap',[(s*.33,.10,2.74),(s*.47,.12,2.72),(s*.50,.14,2.51),(s*.38,.13,2.48)],.07,sw_wood,'Head',.016)
        sw_loft(p+'_folded_wool',[(2.64,.493,.435,0,.035),(2.70,.497,.438,0,.035),(2.76,.474,.412,0,.035)],sw_wood,'Head',40,10,.011,.04)
    else:
        sw_hatcap(p,sw_orange,.435,.375,3.025);sw_brim(p,sw_violet,True)
        sw_solid(p+'_front_cutout',[(-.12,-.38,2.64),(.12,-.38,2.64),(.10,-.385,2.78),(-.10,-.385,2.78)],.031,sw_violet,'Head',.012)
        sw_box(p+'_adjuster',(0,-.41,2.65),(.28,.034,.048),sw_violet,'Head',.01)
        for x in [-.08,-.04,0,.04,.08]:ell(p+'_adjuster_stud',(x,-.434,2.65),(.011,.008,.011),sw_gold,n=8,m=6)
        ell(p+'_button',(0,.035,3.039),(.044,.044,.025),sw_violet,n=12,m=8)


# ACCESSORIES --------------------------------------------------------------
def sw_harness(p,mat=sw_leather):
    # Shoulder straps are closed broad ribbons with front/back thickness.
    for s in (-1,1):
        controls=[(s*.24,-.30,1.02),(s*.27,-.28,1.30),(s*.29,-.20,1.52),(s*.29,.02,1.60),(s*.28,.25,1.46),(s*.24,.32,1.15)]
        verts=[];faces=[]
        for x,y,z in controls:verts.extend([(x-.036,y-.014,z),(x+.036,y-.014,z),(x+.036,y+.014,z),(x-.036,y+.014,z)])
        for i in range(len(controls)-1):
            for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
        faces.extend([tuple(reversed(range(4))),tuple((len(controls)-1)*4+j for j in range(4))])
        mesh(p+'_loadstrap',verts,faces,mat,torso_weights)


def sw_chainlink(p,x,y,z,alternate=False,mat=sw_silver,weights='Chest',scale=1):
    obj=sw_ring(p+'_link',(x,y,z),.045*scale,.067*scale,.020*scale,.025*scale,mat,weights,16)
    if alternate:
        for v in obj.data.vertices:
            xx=v.co.x-x;yy=v.co.y-y;v.co.x=x+yy;v.co.y=y+xx
    return obj


for sw_style in SCULPT_WARDROBE_VARIANTS['Accessory']:
    p='Drif_Accessory_'+sw_style
    if sw_style=='deliveryrig':
        sw_harness(p,sw_olive)
        sw_box(p+'_delivery_frame',(0,.39,1.25),(.62,.11,.68),sw_slate,torso_weights,.035)
        sw_box(p+'_cargo_crate',(0,.57,1.29),(.54,.32,.49),sw_olivehi,torso_weights,.037)
        for s in (-1,1):
            for z in [1.10,1.47]:sw_box(p+'_crate_latch',(s*.22,.755,z),(.09,.04,.09),sw_silver,torso_weights,.014)
            sw_loft(p+'_canister',[(1.04,.063,.063,s*.35,.49),(1.30,.063,.063,s*.35,.49),(1.33,.053,.053,s*.35,.49)],sw_ink,torso_weights,20,0,0,.015)
            sw_box(p+'_canister_label',(s*.35,.412,1.18),(.075,.026,.11),sw_lime,torso_weights,.01)
        sw_box(p+'_front_pod_frame',(0,-.39,1.18),(.33,.16,.37),sw_orange,torso_weights,.045)
        ell(p+'_pod_window',(0,-.49,1.18),(.125,.058,.142),sw_gold,torso_weights,n=24,m=16)
        sw_box(p+'_pod_latch',(0,-.49,.99),(.11,.061,.06),sw_slate,torso_weights,.012)
    elif sw_style=='spikedpauldrons':
        for s,label in [(-1,'R'),(1,'L')]:
            # Three overlapping substantial plates follow the upper-arm bone.
            for j in range(3):
                x=s*(.42+j*.07)
                sw_solid(p+'_lamellar_plate',[(x-s*.12,-.17,1.61-j*.018),(x+s*.12,-.17,1.61-j*.018),(x+s*.11,.05,1.70-j*.018),(x-s*.11,.05,1.70-j*.018)],.11,sw_silver,'UpperArm.'+label,.018)
            for j in range(3):
                x=s*(.38+j*.11)
                sw_sweep(p+'_forged_spike',[(x,0,1.72,.055),(x+s*.045,.015,1.85,.035),(x+s*.10,.04,1.94,.003)],sw_chrome,'UpperArm.'+label,10)
        sw_box(p+'_sternum_harness',(0,-.33,1.38),(.24,.07,.15),sw_leather,'Chest',.02)
        sw_harness(p,sw_leather)
    elif sw_style=='reliccase':
        sw_harness(p,sw_wine)
        sw_box(p+'_relic_back',(0,-.40,1.13),(.42,.095,.52),sw_wood,torso_weights,.027)
        sw_box(p+'_gold_bezel',(0,-.46,1.13),(.38,.05,.48),sw_gold,torso_weights,.02)
        sw_box(p+'_inset_relic',(0,-.493,1.13),(.30,.025,.40),sw_wine,torso_weights,.008)
        for s in (-1,1):
            for z in [.93,1.33]:sw_box(p+'_corner_claw',(s*.16,-.525,z),(.067,.05,.067),sw_gold,torso_weights,.015)
        sw_solid(p+'_relic_central_gem',[(-.095,-.525,1.14),(0,-.55,1.27),(.095,-.525,1.14),(0,-.55,1.02)],.04,sw_cyan,torso_weights,.012)
        for z in [.96,1.32]:
            for x in [-.07,0,.07]:sw_box(p+'_glyph_block',(x,-.523,z),(.035,.025,.027),sw_gold,torso_weights,.005)
    elif sw_style=='handheldsling':
        sw_harness(p,sw_slate)
        sw_box(p+'_console_shell',(0,-.43,1.11),(.58,.15,.36),sw_bone,torso_weights,.043)
        sw_box(p+'_screen_bezel',(0,-.522,1.13),(.285,.036,.235),sw_rubber,torso_weights,.014)
        sw_box(p+'_screen',(0,-.546,1.13),(.235,.019,.182),sw_cyan,torso_weights,.006)
        # Built scene blocks in the recessed screen; this is an object face.
        for x,z,w,h,mat in [(-.06,1.10,.10,.04,sw_lime),(.07,1.15,.045,.08,sw_blue),(0,1.09,.038,.045,sw_orange)]:sw_box(p+'_screen_pixel',(x,-.559,z),(w,.012,h),mat,torso_weights,.003)
        sw_box(p+'_dpad_horizontal',(-.211,-.532,1.11),(.10,.036,.036),sw_ink,torso_weights,.006)
        sw_box(p+'_dpad_vertical',(-.211,-.534,1.11),(.036,.038,.10),sw_ink,torso_weights,.006)
        for x,z in [(.19,1.08),(.235,1.14)]:ell(p+'_button',(x,-.537,z),(.025,.021,.025),sw_wine,torso_weights,n=14,m=8)
        for x in [-.025,.025]:sw_box(p+'_menu_button',(x,-.529,.972),(.035,.022,.015),sw_slate,torso_weights,.004)
    elif sw_style=='chesspouch':
        sw_harness(p,sw_ink)
        sw_box(p+'_leather_case',(.12,-.39,1.02),(.43,.16,.43),sw_ink,torso_weights,.038)
        for i in range(4):
            for j in range(4):sw_box(p+'_inlaid_square',(.12+(i-1.5)*.083,-.486,1.02+(j-1.5)*.083),(.081,.025,.081),sw_ivory if (i+j)%2 else sw_wood,torso_weights,.005)
        sw_box(p+'_hinged_lid',(.12,-.405,1.25),(.46,.19,.06),sw_wood,torso_weights,.016)
        sw_buckle(p+'_latch',(.12,-.528,1.25),.085,.065,torso_weights)
        # Three distinct carved chessmen sit in built pockets across the lid.
        for k,x in enumerate([-.015,.12,.255]):
            sw_loft(p+'_piece_stem',[(1.29,.031,.031,x,-.40),(1.32,.037,.037,x,-.40),(1.38,.018,.018,x,-.40),(1.40,.027,.027,x,-.40)],sw_bone,torso_weights,16,0,0,.008)
            if k==0:ell(p+'_pawn',(x,-.40,1.43),(.034,.034,.034),sw_bone,torso_weights,n=12,m=8)
            elif k==1:sw_box(p+'_rook',(x,-.40,1.43),(.075,.07,.06),sw_bone,torso_weights,.006)
            else:sw_solid(p+'_knight',[(x-.027,-.40,1.40),(x+.03,-.40,1.40),(x+.03,-.40,1.49),(x-.04,-.40,1.48),(x-.05,-.40,1.45),(x-.015,-.40,1.44)],.055,sw_bone,torso_weights,.009)
    elif sw_style=='mimiclockbox':
        sw_harness(p,sw_leather)
        sw_box(p+'_chest_body',(0,.47,1.20),(.59,.36,.34),sw_wood,torso_weights,.034)
        sw_box(p+'_open_mouth',(0,.67,1.36),(.51,.065,.105),sw_ink,torso_weights,.009)
        sw_loft(p+'_domed_lid',[(1.39,.30,.20,0,.48),(1.47,.28,.19,0,.48),(1.53,.20,.15,0,.48),(1.56,.04,.04,0,.48)],sw_wood,torso_weights,28,0,0,.035)
        for x in [-.23,.23]:
            sw_box(p+'_reinforcement',(x,.67,1.22),(.06,.04,.36),sw_gold,torso_weights,.01)
            sw_box(p+'_hinge',(x,.29,1.39),(.10,.075,.08),sw_gold,torso_weights,.014)
        for x in [-.19,-.095,0,.095,.19]:
            sw_solid(p+'_tooth',[(x-.029,.722,1.40),(x+.029,.722,1.40),(x,.73,1.31)],.035,sw_bone,torso_weights,.006)
        sw_buckle(p+'_lock',(0,.72,1.17),.12,.11,torso_weights)
    elif sw_style=='clockworkrelic':
        sw_harness(p,sw_leather)
        sw_ring(p+'_outer_frame',(0,-.45,1.15),.255,.30,.045,.105,sw_gold,torso_weights,32)
        sw_box(p+'_rear_movement',(0,-.412,1.15),(.30,.052,.38),sw_wood,torso_weights,.04)
        for x,z,r in [(-.075,1.24,.085),(.085,1.14,.094),(-.045,1.03,.07)]:
            sw_ring(p+'_gear_core',(x,-.487,z),r,r,r*.32,.04,sw_silver,torso_weights,20)
            for k in range(10):
                a=k*math.tau/10
                sw_box(p+'_gear_tooth',(x+math.cos(a)*r,-.49,z+math.sin(a)*r),(.028,.044,.028),sw_silver,torso_weights,.004)
            ell(p+'_axle',(x,-.523,z),(.019,.018,.019),sw_gold,torso_weights,n=10,m=6)
        sw_solid(p+'_clock_hand',[(-.012,-.54,1.13),(.013,-.54,1.13),(.08,-.54,1.29),(.05,-.54,1.27)],.024,sw_wine,torso_weights,.005)
        for s in (-1,1):sw_box(p+'_frame_mount',(s*.22,-.45,1.15),(.085,.13,.10),sw_gold,torso_weights,.016)
    elif sw_style=='toonbook':
        sw_harness(p,sw_violet)
        sw_box(p+'_page_block',(0,.45,1.20),(.40,.14,.45),sw_bone,torso_weights,.015)
        for y in [.35,.55]:sw_box(p+'_leather_cover',(0,y,1.20),(.45,.052,.50),sw_violet,torso_weights,.025)
        sw_box(p+'_spine',(-.217,.45,1.20),(.07,.24,.50),sw_wine,torso_weights,.02)
        # Cartoon castle silhouette becomes substantial carved cover relief.
        for x,z,h in [(-.125,1.21,.19),(0,1.26,.29),(.125,1.20,.17)]:
            sw_box(p+'_castle_tower',(x,.597,z),(.092,.043,h),sw_pink,torso_weights,.008)
            sw_solid(p+'_castle_roof',[(x-.072,.61,z+h/2),(x+.072,.61,z+h/2),(x,.615,z+h/2+.09)],.045,sw_wine,torso_weights,.008)
        sw_box(p+'_clasp',(.235,.45,1.17),(.08,.28,.09),sw_gold,torso_weights,.014)
        for z in [1.04,1.19,1.34]:sw_box(p+'_binding_ridge',(-.252,.45,z),(.03,.255,.036),sw_gold,torso_weights,.008)
    elif sw_style=='chaineddeck':
        sw_harness(p,sw_slate)
        sw_box(p+'_deck_case',(0,-.40,1.13),(.32,.16,.43),sw_wood,torso_weights,.024)
        sw_box(p+'_deck_border',(0,-.495,1.13),(.29,.042,.39),sw_gold,torso_weights,.01)
        sw_box(p+'_deck_insert',(0,-.526,1.13),(.235,.025,.33),sw_wine,torso_weights,.008)
        # Actual interlocking links, rotated alternately; no drawn chain lines.
        for j in range(7):
            x=-.21+j*.07;z=1.14+.11*math.cos(j*math.pi/6)
            sw_chainlink(p,x,-.565,z,j%2==1,sw_silver,torso_weights,.78)
        sw_buckle(p+'_lock',(0,-.61,1.06),.105,.10,torso_weights)
    else:
        sw_harness(p,sw_ink)
        # A capsule-shaped carrier translated directly from the cyber-jacket pill.
        sw_loft(p+'_canister',[(1.00,.13,.13,0,.47),(1.05,.18,.18,0,.47),(1.27,.18,.18,0,.47),(1.34,.14,.14,0,.47)],sw_ivory,torso_weights,32,0,0,.035)
        ell(p+'_blue_cap',(0,.47,1.33),(.18,.18,.13),sw_blue,torso_weights,n=24,m=14)
        sw_loft(p+'_locking_collar',[(1.24,.19,.19,0,.47),(1.29,.19,.19,0,.47)],sw_silver,torso_weights,32,0,0,.038)
        for s in (-1,1):
            sw_box(p+'_carrier_clip',(s*.17,.36,1.13),(.065,.15,.24),sw_ink,torso_weights,.013)
            sw_box(p+'_release',(s*.17,.27,1.18),(.048,.035,.07),sw_orange,torso_weights,.008)
        sw_box(p+'_window',(0,.666,1.12),(.14,.025,.13),sw_cyan,torso_weights,.02)

print('SCULPT_WARDROBE_BUILT', {k:len(v) for k,v in SCULPT_WARDROBE_VARIANTS.items()})
