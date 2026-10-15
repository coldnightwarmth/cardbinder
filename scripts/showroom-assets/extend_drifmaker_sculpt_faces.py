"""Sixty reference-led face sculptures, authored in the shared Head bind space.

Run after extend_drifmaker_atelier.py in the builder namespace. No line, curve,
wire or tube helper is used. Eyelids, gums, brows and frames are closed, broad
lofted surfaces; replacement heads have their own complete facial composition.
Tattoo polygons are the sole intentionally flat detail and follow the source
head through its BVH. Source images were visually inspected, not inferred from
filenames; the adjacent catalog records the exact reference and adaptation.
"""
import random
from mathutils.geometry import tessellate_polygon

SCULPT_FACE_CATALOG=json.loads((ROOT/'scripts/showroom-assets/sculpt-faces-catalog.json').read_text())
SCULPT_FACE_VARIANTS={k.title():[item[0] for item in items] for k,items in SCULPT_FACE_CATALOG.items()}
sf_ink=material('Drif_Sculpt_Ink',(.009,.012,.020),.48)
sf_cream=material('Drif_Sculpt_Ivory',(.92,.87,.71),.36)
sf_white=material('Drif_Sculpt_Porcelain',(.94,.96,.98),.19)
sf_red=material('Drif_Sculpt_Crimson',(.66,.012,.034),.36)
sf_flesh=material('Drif_Sculpt_Mauve',(.66,.26,.35),.63)
sf_rose=material('Drif_Sculpt_Rose',(.94,.23,.42),.35)
sf_gold=material('Drif_Sculpt_Gold',(.90,.49,.085),.24,.60)
sf_copper=material('Drif_Sculpt_Terracotta',(.52,.19,.085),.90)
sf_mortar=material('Drif_Sculpt_Mortar',(.17,.145,.12),.98)
sf_green=material('Drif_Sculpt_Moss',(.12,.21,.035),.96)
sf_lime=material('Drif_Sculpt_Moss_Tips',(.32,.42,.055),.93)
sf_cyan=material('Drif_Sculpt_Cyan',(.08,.68,.83),.25)
sf_blue=material('Drif_Sculpt_Blue',(.035,.11,.42),.31)
sf_lilac=material('Drif_Sculpt_Lilac',(.43,.30,.70),.43)
sf_gray=material('Drif_Sculpt_Ash',(.29,.31,.32),.79)
sf_silver=material('Drif_Sculpt_Silver',(.62,.69,.76),.23,.72)
sf_gum=material('Drif_Sculpt_Gum',(.29,.027,.047),.54)
sf_tan=material('Drif_Sculpt_Linen',(.65,.52,.33),.94)
sf_candy=[sf_rose,sf_gold,sf_cyan,sf_white,sf_lilac,sf_green]


def sf_outline(cx,cz,rx,rz,n=40,power=1.0,phase=0):
    def signed(v):return math.copysign(abs(v)**power,v)
    return [(cx+rx*signed(math.cos(phase+j*math.tau/n)),cz+rz*signed(math.sin(phase+j*math.tau/n))) for j in range(n)]


def sf_solid(name,outline,y,depth,mat,bevel=.08,bulge=.012):
    """Closed bevel loft: broad front, rounded shoulders, real sidewall depth."""
    cx=sum(v[0] for v in outline)/len(outline);cz=sum(v[1] for v in outline)/len(outline)
    profile=[(1-bevel,y+depth),(1,y+depth*.75),(1,y+depth*.25),(1-bevel,y),(1-bevel*2,y-bulge)]
    verts=[(cx+(x-cx)*scale,yy,cz+(z-cz)*scale) for scale,yy in profile for x,z in outline]
    n=len(outline);faces=[]
    for k in range(len(profile)-1):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+j for j in range(n))])
    return mesh(name,verts,faces,mat,'Head')


def sf_cavity(name,outline,y,mat,inside=sf_ink,wall=.20,depth=.075):
    """Closed recessed socket with a broad rounded lip and a deep inner well."""
    cx=sum(v[0] for v in outline)/len(outline);cz=sum(v[1] for v in outline)/len(outline)
    profile=[(1,y+depth*.40),(1.025,y-depth*.18),(.96,y-depth*.50),(1-wall,y-depth*.42),(1-wall-.04,y+depth*.35)]
    n=len(outline);verts=[(cx+(x-cx)*scale,yy,cz+(z-cz)*scale) for scale,yy in profile for x,z in outline];faces=[]
    for k in range(len(profile)-1):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    faces.extend([(j,(j+1)%n,(len(profile)-1)*n+(j+1)%n,(len(profile)-1)*n+j) for j in range(n)])
    obj=mesh(name+'_rim',verts,faces,mat,'Head')
    inner=[(cx+(x-cx)*(1-wall),cz+(z-cz)*(1-wall)) for x,z in outline]
    sf_solid(name+'_well',inner,y+depth*.30,.014,inside,bevel=.06,bulge=0)
    return obj


def sf_blob(name,center,scale,mat,kind='smooth',n=40,m=28,phase=0):
    """Closed radial sculpture; folds and hollows alter the actual silhouette."""
    verts=[]
    for i in range(m+1):
        theta=math.pi*i/m
        for j in range(n):
            phi=j*math.tau/n;st=math.sin(theta);f=1
            if kind=='tuft':f+=.065*math.sin(phi*9+phase)*math.sin(theta*11+phase)*st+.032*math.sin(phi*17+theta*9)*st
            elif kind=='moss':f+=.12*math.sin(phi*7+phase)*math.sin(theta*5)+.035*math.sin(theta*13+phi*11)
            elif kind=='candy':f+=.09*math.cos(phi*5+theta*3.3)*st
            elif kind=='berry':f-=.045*max(0,math.cos(phi*16+round(i/3)%2*math.pi))**8*max(0,math.cos(theta*14))**8
            elif kind=='ash':f+=.065*math.cos(phi*6+theta*3)*st
            verts.append((center[0]+scale[0]*st*math.cos(phi)*f,center[1]+scale[1]*st*math.sin(phi)*f,center[2]+scale[2]*math.cos(theta)*f))
    faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(m) for j in range(n)]
    return mesh(name,verts,faces,mat,'Head')


def sf_pattern_surface(obj,kind):
    """Packed, filtered surface colour follows the head's sculpted UVs.

    Material-per-polygon stripes alias at silhouette edges. An embedded image
    gives the source's clean painted bands without any overlaid geometry.
    """
    width,height=512,256
    image=bpy.data.images.new('Drif_Sculpt_'+kind+'_paint',width=width,height=height,alpha=True)
    palette=[(.94,.23,.42),(.96,.67,.11),(.08,.68,.83),(.94,.96,.98),(.43,.30,.70),(.18,.52,.16)]
    def srgb(v):return 12.92*v if v<=.0031308 else 1.055*v**(1/2.4)-.055
    pixels=[]
    for iy in range(height):
        theta=(iy+.5)/height*math.pi
        for ix in range(width):
            phi=(ix+.5)/width*math.tau-math.pi
            x=math.sin(theta)*math.cos(phi);z=math.cos(theta)
            if kind=='Candy':
                value=(math.atan2(z,x)+math.hypot(x,z)*5.4)/math.tau*12
                color=palette[int(value)%len(palette)]
            else:
                value=x*15+1.7*math.sin(z*4.5)
                color=(.94,.96,.98) if int(math.floor(value))%2 else (.009,.012,.02)
            pixels.extend((*[srgb(c) for c in color],1))
    image.pixels=pixels;image.pack()
    mat=material('Drif_Sculpt_'+kind+'_Paint',(1,1,1),.23 if kind=='Candy' else .40)
    texture=mat.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');mat.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
    obj.data.materials.clear();obj.data.materials.append(mat)
    uv=obj.data.uv_layers.new(name='Sculpt painted surface')
    for face in obj.data.polygons:
        coords=[]
        for li in face.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            x=co.x/.64;y=co.y/.48;z=(co.z-2.15)/.66
            length=math.sqrt(x*x+y*y+z*z);theta=math.acos(max(-1,min(1,z/max(.0001,length))))
            coords.append(((math.atan2(y,x)+math.pi)/math.tau,theta/math.pi))
        if max(a for a,b in coords)-min(a for a,b in coords)>.5:coords=[(a+1 if a<.5 else a,b) for a,b in coords]
        for li,coord in zip(face.loop_indices,coords):uv.data[li].uv=coord
    return obj


def sf_tooth(name,x,z,width,height,mat=sf_cream,y=-.745,pointed=False):
    pts=[(x-width/2,z),(x+width/2,z),(x+width*.42,z-height*.82),(x,z-height),(x-width*.42,z-height*.82)]
    if pointed:pts=[(x-width/2,z),(x+width/2,z),(x+width*.08,z-height)]
    return sf_solid(name,pts,y,.045,mat,bevel=.11,bulge=.009)


def sf_iris(name,x,z,rx=.067,rz=.09,mat=sf_blue,y=-.586,shape=1):
    sf_solid(name+'_iris',sf_outline(x,z,rx,rz,32,shape),y,.021,mat,bevel=.07,bulge=.013)
    sf_solid(name+'_pupil',sf_outline(x,z,rx*.43,rz*.65,24),y-.018,.012,sf_ink,bevel=.09,bulge=.005)
    ell(name+'_shine',(x-rx*.32,y-.035,z+rz*.36),(rx*.21,.008,rz*.18),sf_white,n=12,m=8)


def sf_eye_base(name,x,z=2.23,rx=.165,rz=.185,y=-.51):
    return sf_blob(name+'_sclera',(x,y,z),(rx,.075,rz),sf_white,n=32,m=22)


def sf_lid(name,x,z,rx,rz,mat,upper=True,y=-.535,slope=0):
    # This is a half-shell, not a narrow strip; the front broad plane covers the
    # globe and rounds into the orbital brow with five closed bevel sections.
    if upper:
        outline=[(x+rx*math.cos(t),z+rz*math.sin(t)+slope*rx*math.cos(t)) for t in [j*math.pi/20 for j in range(21)]]
    else:
        outline=[(x+rx*math.cos(t),z-rz*math.sin(t)+slope*rx*math.cos(t)) for t in [j*math.pi/20 for j in range(21)]]
    return sf_solid(name,outline,y,.06,mat,bevel=.10,bulge=.023)


def sf_fitted_brow(name,outline,mat,height=.045,crease=0):
    """Broad closed cushion fitted to actual skull curvature, with cut grooves."""
    cx=sum(x for x,z in outline)/len(outline);cz=sum(z for x,z in outline)/len(outline);n=len(outline)
    verts=[];profile=[(1,.008),(.98,.025),(.80,height),(.34,height+.012)]
    for scale,offset in profile:
        for x,z in outline:
            xx=cx+(x-cx)*scale;zz=cz+(z-cz)*scale
            groove=crease*max(0,math.cos((xx-cx)*67))**12
            verts.append(sg_facepoint(xx,zz,max(.008,offset-groove)))
    verts.append(sg_facepoint(cx,cz,height+.010));faces=[]
    for row in range(len(profile)-1):
        for j in range(n):faces.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
    for j in range(n):faces.append(((len(profile)-1)*n+j,(len(profile)-1)*n+(j+1)%n,len(verts)-1))
    faces.append(tuple(reversed(range(n))))
    return mesh(name,verts,faces,mat,'Head')


def sf_inkpatch(name,outline,mat=sf_ink):
    # Subdivide a planar polygon, then ray-project every vertex. Unlike thick
    # tubes this behaves like ink at grazing angles and stays on curved cheeks.
    polygon=[Vector((x,z,0)) for x,z in outline]
    triangles=tessellate_polygon([polygon])
    # Blender 5.2 returns indices; older supported versions return Vectors.
    triangles=[tuple(polygon[v] if isinstance(v,int) else v for v in triangle) for triangle in triangles]
    for _ in range(2):
        split=[]
        for a,b,c in triangles:
            ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2
            split.extend([(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)])
        triangles=split
    verts=[];faces=[]
    for triangle in triangles:
        faces.append(tuple(range(len(verts),len(verts)+3)))
        verts.extend(sg_facepoint(v.x,v.y,.004) for v in triangle)
    return mesh(name,verts,faces,mat,'Head',False)


# EYES -----------------------------------------------------------------------
for style in SCULPT_FACE_VARIANTS['Eyes']:
    p='Drif_Eyes_'+style
    for s in [-1,1]:
        x=s*.302
        if style=='buulids':
            sf_blob(p+'_black',(x,-.49,2.205),(.15,.095,.19),sf_ink)
            sf_iris(p,x+s*.02,2.17,.032,.061,sf_red,y=-.582)
            sf_lid(p+'_hood',x,2.29,.186,.151,sf_flesh,y=-.54,slope=s*.20)
        elif style=='deflatedbags':
            sf_eye_base(p,x,2.23,.17,.102);sf_iris(p,x,2.23,.061,.070,sf_red,y=-.584)
            sf_lid(p+'_heavyupper',x,2.278,.184,.065,sf_gray,y=-.54,slope=s*.13)
            sf_lid(p+'_lowerbag',x,2.17,.174,.085,sf_flesh,False,y=-.52)
        elif style=='waojewels':
            outline=[(x+dx,2.23+dz) for dx,dz in [(-.14,-.15),(-.18,.05),(-.11,.20),(.06,.21),(.18,.08),(.15,-.16),(0,-.21)]]
            sf_cavity(p+'_orbit',outline,-.53,sf_lilac,sf_white,wall=.16,depth=.085)
            sf_iris(p,x,2.23,.075,.16,sf_gold,y=-.592)
            for j in range(7):
                a=j*math.tau/7;sf_solid(p+'_gem',sf_outline(x+.15*math.cos(a),2.23+.19*math.sin(a),.026,.033,4),-.586,.023,[sf_cyan,sf_rose,sf_white][j%3],.10)
        elif style=='beautyglass':
            sf_eye_base(p,x,2.23,.163,.185);sf_iris(p,x,2.23,.116,.151,sf_cyan,y=-.582)
            sf_lid(p+'_upper',x,2.34,.177,.071,sf_ink,y=-.56)
            for j in range(5):
                dx=(j-2)*.057;z=2.345+.055*math.sqrt(max(0,1-(dx/.17)**2))
                sf_solid(p+'_lashfin',[(x+dx-.023,z-.018),(x+dx+.023,z-.012),(x+dx+s*.015,z+.095)],-.555,.033,sf_ink,.09)
            for dx,dz,r in [(-.045,.06,.025),(.035,-.045,.017),(.055,.035,.015)]:ell(p+'_spark',(x+dx,-.627,2.23+dz),(r,.006,r),sf_white,n=12,m=8)
        elif style=='dratinigaze':
            outline=[(x-.17,2.16-s*.045),(x-.14,2.35-s*.04),(x+.17,2.27+s*.05),(x+.13,2.10+s*.045)]
            sf_solid(p+'_white',outline,-.54,.065,sf_white,.15)
            sf_iris(p,x,2.195,.108,.093,sf_red,y=-.58)
            sf_lid(p+'_diagonalhood',x,2.285,.178,.084,sf_ink,y=-.582,slope=-s*.52)
        elif style=='blazedcushions':
            sf_eye_base(p,x,2.22,.18,.166);sf_iris(p,x+s*.035,2.16,.052,.056,sf_gray,y=-.585)
            sf_lid(p+'_droopinglid',x,2.205,.188,.174,sf_tan,y=-.555,slope=-s*.10)
            sf_lid(p+'_puffybag',x,2.125,.175,.063,sf_tan,False,y=-.54)
        elif style=='geekframes':
            sf_eye_base(p,x,2.23,.15,.19);sf_iris(p,x,2.23,.062,.084,sf_lilac,y=-.586)
            sf_cavity(p+'_acetate',sf_outline(x,2.23,.19,.23,40,.38),-.58,sf_ink,sf_white,wall=.15,depth=.07)
            # Bring optical iris in front of the actual frame's recessed lens.
            sf_iris(p+'_lens',x,2.23,.062,.086,sf_lilac,y=-.599)
            sf_solid(p+'_hinge',[(x+s*.15,2.35),(x+s*.22,2.34),(x+s*.22,2.28),(x+s*.15,2.28)],-.565,.10,sf_ink,.10)
        elif style=='mangekyoseal':
            sf_eye_base(p,x,2.23,.17,.133);sf_iris(p,x,2.23,.102,.107,sf_red,y=-.584)
            for j in range(3):
                a=j*math.tau/3;points=[(x+.022*math.cos(a),2.23+.022*math.sin(a)),(x+.096*math.cos(a+.32),2.23+.096*math.sin(a+.32)),(x+.077*math.cos(a+1.17),2.23+.077*math.sin(a+1.17))]
                sf_solid(p+'_inlay',points,-.610,.008,sf_ink,.06,bulge=0)
            sf_lid(p+'_upper',x,2.315,.177,.062,sf_ink,y=-.54,slope=s*.17)
        elif style=='millerockets':
            outline=[(x+dx*s,2.23+dz) for dx,dz in [(-.19,.11),(-.04,.045),(.16,.14),(.13,-.10),(-.08,-.07)]]
            sf_cavity(p+'_socket',outline,-.55,sf_gray,sf_ink,wall=.24,depth=.12)
            sf_solid(p+'_white',[(x-.10,2.21),(x+.095,2.24),(x+.07,2.17),(x-.07,2.17)],-.59,.019,sf_white,.12)
        else: # seethe: clenched fleshy lids and broad sculpted tears.
            sf_eye_base(p,x,2.23,.16,.13);sf_iris(p,x,2.24,.078,.088,sf_red,y=-.588)
            sf_lid(p+'_tensedlid',x,2.30,.175,.064,sf_ink,y=-.55,slope=s*.22)
            tear=[(x-.075,2.16),(x+.075,2.16),(x+.043,2.08),(x+.023,1.99),(x,1.89),(x-.018,2.02),(x-.056,2.09)]
            sf_solid(p+'_tearvolume',tear,-.56,.035,sf_cyan,.12,bulge=.015)
    if style=='geekframes':sf_solid(p+'_bridge',[(-.125,2.32),(.125,2.32),(.12,2.265),(-.12,2.265)],-.575,.075,sf_ink,.16)


# MOUTHS ---------------------------------------------------------------------
for style in SCULPT_FACE_VARIANTS['Mouth']:
    p='Drif_Mouth_'+style
    if style=='batmanclench':
        sf_cavity(p,sf_outline(0,1.81,.275,.105,48,.52),-.69,sf_gray,sf_ink,wall=.14,depth=.05)
        for j in range(8):
            x=(j-3.5)*.058;sf_tooth(p+'_upper',x,1.88-abs(x)*.12,.052,.085,y=-.737)
            sf_tooth(p+'_lower',x,1.78+abs(x)*.1,.05,-.044,y=-.738)
    elif style=='cubonejaw':
        sf_cavity(p,[(0,1.99),(.18,1.92),(.21,1.71),(.13,1.63),(-.10,1.67),(-.20,1.86)],-.68,sf_cream,sf_ink,.23,.10)
        sf_blob(p+'_tongue',(.04,-.753,1.71),(.105,.025,.085),sf_flesh)
        for x,z in [(-.105,1.91),(.105,1.92)]:sf_tooth(p+'_fang',x,z,.058,.092,y=-.769,pointed=True)
    elif style=='chipmunkbite':
        sf_cavity(p,sf_outline(0,1.81,.25,.18,48),-.68,sf_flesh,sf_gum,.14,.075)
        for x in [-.053,.053]:sf_tooth(p+'_incisor',x,1.96,.099,.17,y=-.756)
        sf_blob(p+'_tongue',(0,-.739,1.71),(.068,.025,.032),sf_red)
        for x in [-.045,.045]:sf_tooth(p+'_lower',x,1.675,.079,-.045,y=-.746)
    elif style=='bulletjaw':
        sf_cavity(p,[(x,1.81+z) for x,z in [(-.27,.12),(-.18,.075),(0,.04),(.18,.075),(.27,.12),(.23,-.11),(0,-.16),(-.23,-.11)]],-.68,sf_red,sf_gum,.13,.075)
        for j in range(7):
            x=(j-3)*.07;sf_tooth(p+'_upper',x,1.89-abs(x)*.15,.069,.09,y=-.755,pointed=True)
            sf_tooth(p+'_lower',x,1.70+abs(x)*.1,.065,-.07,y=-.756,pointed=True)
    elif style=='demonpit':
        sf_cavity(p,sf_outline(0,1.82,.155,.245,48),-.69,sf_gum,sf_ink,.18,.09)
        for j in range(12):
            a=j*math.tau/12;x=.115*math.cos(a);z=1.82+.193*math.sin(a)
            sf_solid(p+'_tooth',sf_outline(x,z,.030,.045,16,.6),-.763,.032,sf_cream,.10)
        sf_blob(p+'_tongue',(.015,-.766,1.70),(.078,.031,.095),sf_flesh)
    elif style=='greedclamp':
        sf_cavity(p,sf_outline(0,1.82,.29,.145,48,.67),-.69,sf_flesh,sf_gum,.15,.09)
        for j in range(11):
            x=(j-5)*.047;sf_tooth(p+'_upper',x,1.928-abs(x)*.14,.043,.122,y=-.77)
            sf_tooth(p+'_lower',x,1.72+abs(x)*.12,.043,-.091,y=-.768)
    elif style=='sillycurl':
        sf_cavity(p,sf_outline(0,1.84,.24,.094,36,.55),-.69,sf_ink,sf_gum,.13,.055)
        sf_blob(p+'_tongue',(-.08,-.765,1.74),(.105,.06,.07),sf_rose)
        sf_lid(p+'_fold',-.09,1.74,.085,.03,sf_flesh,False,y=-.811)
    elif style=='sweeperbite':
        sf_cavity(p,sf_outline(0,1.83,.26,.14,48,.6),-.69,sf_white,sf_ink,.22,.09)
        for j in range(7):
            x=(j-3)*.058;sf_tooth(p+'_upper',x,1.915,.056,.097,y=-.771,pointed=True);sf_tooth(p+'_lower',x,1.737,.05,-.083,y=-.771,pointed=True)
        sf_solid(p+'_tongue',[(.055,1.82),(.25,1.77),(.34,1.72),(.35,1.66),(.29,1.64),(.11,1.73)],-.788,.055,sf_flesh,.15,bulge=.019)
    elif style=='tigermaw':
        sf_cavity(p,sf_outline(0,1.81,.25,.18,48),-.68,sf_flesh,sf_gum,.18,.12)
        for x in [-.18,.18]:
            sf_tooth(p+'_canine',x,1.95,.064,.19,y=-.775,pointed=True);sf_tooth(p+'_lowercanine',x,1.67,.05,-.13,y=-.774,pointed=True)
        for x in [-.095,-.03,.03,.095]:sf_tooth(p+'_incisor',x,1.96,.051,.062,y=-.776)
        sf_blob(p+'_tongue',(0,-.737,1.72),(.13,.035,.07),sf_rose)
    else:
        sf_cavity(p,sf_outline(0,1.82,.29,.155,48),-.69,sf_white,sf_red,.10,.07)
        for j in range(9):
            x=(j-4)*.06;sf_tooth(p+'_sawupper',x,1.94-abs(x)*.13,.061,.13,y=-.76,pointed=True);sf_tooth(p+'_sawlower',x,1.70+abs(x)*.12,.058,-.105,sf_gold,y=-.759,pointed=True)


# NOSES ----------------------------------------------------------------------
for style in SCULPT_FACE_VARIANTS['Nose']:
    p='Drif_Nose_'+style
    if style=='crosscast':
        for outline,y in [([(-.055,1.88),(.025,1.88),(.065,2.12),(-.015,2.14)],-.685),([(-.14,1.99),(-.11,1.92),(.14,2.01),(.11,2.08)],-.726)]:sf_solid(p+'_pad',outline,y,.037,sf_cream,.22,bulge=.012)
    elif style=='velvetpom':sf_blob(p+'_tuft',(0,-.70,1.99),(.115,.09,.10),sf_rose,'tuft',n=48,m=32)
    elif style=='candybutton':
        sf_blob(p+'_candy',(0,-.70,2.01),(.083,.073,.083),sf_red)
        sf_solid(p+'_stick',[(-.011,1.95),(.013,1.95),(.007,1.85),(-.009,1.85)],-.70,.022,sf_cream,.18)
    elif style=='carvednostrils':
        sf_blob(p+'_bridge',(0,-.675,2.015),(.125,.105,.079),sf_blue)
        for s in [-1,1]:sf_cavity(p+'_nostril',sf_outline(s*.055,1.98,.038,.029,24),-.761,sf_blue,sf_ink,.30,.033)
    elif style=='dragonbridge':
        sf_solid(p+'_nasal',[(-.05,2.12),(.04,2.12),(.115,1.99),(.08,1.945),(-.095,1.95),(-.13,2.00)],-.715,.075,sf_lilac,.23,.025)
        for s in [-1,1]:sf_cavity(p+'_nostril',sf_outline(s*.07,1.978,.025,.018,20),-.76,sf_lilac,sf_ink,.23,.024)
    elif style=='berrysnout':
        sf_blob(p+'_fruit',(0,-.697,2.00),(.092,.08,.11),sf_red,'berry',n=48,m=36)
        for j in range(7):
            a=j*2.4;x=.055*math.cos(a);z=2.0+.078*math.sin(a)
            sf_solid(p+'_seed',sf_outline(x,z,.009,.014,8),-.768,.007,sf_gold,.1,0)
    elif style=='linenpatch':
        sf_solid(p+'_cloth',[(-.12,2.02),(-.055,2.075),(.055,2.075),(.12,2.02),(.075,1.955),(-.075,1.955)],-.72,.07,sf_tan,.23,.018)
        # Coarse weave is carved into the surface vertices, not laid over it.
        obj=pieces[-1]
        for v in obj.data.vertices:
            if v.co.y<-.73:v.co.y+=.006*(.5+.5*math.cos(v.co.x*150)*math.cos(v.co.z*150))
    elif style=='bonecartilage':
        for s in [-1,1]:sf_cavity(p+'_nares',[(s*.01,2.065),(s*.085,1.963),(s*.035,1.944),(s*.012,1.96)],-.718,sf_cream,sf_ink,.28,.044)
    elif style=='houndmuzzle':
        sf_blob(p+'_leather',(0,-.715,2.005),(.12,.075,.072),sf_ink,'ash',n=40,m=24)
        for s in [-1,1]:sf_cavity(p+'_nostril',sf_outline(s*.068,1.99,.026,.019,20),-.779,sf_gray,sf_ink,.26,.023)
    else:
        sf_solid(p+'_wedge',[(-.023,2.12),(.028,2.12),(.077,1.97),(0,1.94),(-.05,1.98)],-.73,.09,sf_cream,.18,.022)


# BROWS ----------------------------------------------------------------------
sf_brow_shapes={
 'buufolds':[(.12,2.45),(.15,2.57),(.25,2.63),(.38,2.60),(.48,2.48),(.42,2.45),(.31,2.52),(.22,2.52)],
 'millerbrow':[(.11,2.44),(.13,2.60),(.25,2.58),(.35,2.55),(.48,2.60),(.46,2.46),(.29,2.43)],
 'seethecrease':[(.10,2.54),(.17,2.60),(.32,2.53),(.48,2.48),(.45,2.43),(.27,2.46),(.16,2.49)],
 'porcelainarc':[(.12,2.47),(.16,2.56),(.25,2.62),(.37,2.59),(.47,2.48),(.41,2.49),(.31,2.54),(.22,2.52)],
 'dragonfold':[(.10,2.48),(.13,2.58),(.25,2.55),(.47,2.43),(.42,2.39),(.26,2.44)],
 'facetbrows':[(.10,2.50),(.19,2.59),(.36,2.62),(.47,2.55),(.42,2.47),(.23,2.48)],
 'geekblocks':[(.12,2.46),(.12,2.58),(.40,2.58),(.49,2.54),(.47,2.46),(.38,2.49),(.22,2.49)],
 'tiredlobes':[(.11,2.53),(.18,2.59),(.28,2.56),(.40,2.46),(.46,2.42),(.43,2.37),(.31,2.43),(.19,2.49)],
 'impbrow':[(.11,2.42),(.14,2.58),(.23,2.56),(.31,2.62),(.36,2.56),(.48,2.58),(.43,2.47),(.29,2.48)],
 'candycaps':[(.11,2.49),(.16,2.60),(.26,2.64),(.39,2.58),(.48,2.49),(.40,2.45),(.30,2.52),(.20,2.47)],
}
for index,style in enumerate(SCULPT_FACE_VARIANTS['Brows']):
    p='Drif_Brows_'+style
    mat=[sf_flesh,sf_gray,sf_ink,sf_white,sf_lilac,sf_silver,sf_ink,sf_tan,sf_cream,sf_rose][index]
    for s in [-1,1]:
        outline=[(s*x,z+(.025 if style=='tiredlobes' and s<0 else 0)) for x,z in sf_brow_shapes[style]]
        obj=sf_fitted_brow(p+'_sculpt',outline,mat,.058 if style in ['buufolds','millerbrow','impbrow'] else .041,crease=.009 if style in ['millerbrow','impbrow'] else 0)
        if style=='facetbrows':
            for face in obj.data.polygons:face.use_smooth=False


# COMPLETE REPLACEMENT HEADS -------------------------------------------------
def sf_head_eyes(p,x=.24,z=2.27,y=-.50,mat=sf_cyan):
    for s in [-1,1]:
        sf_cavity(p+'_eye',sf_outline(s*x,z,.13,.17,36),y,sf_ink,sf_white,.16,.07)
        sf_iris(p+'_iris',s*x,z,.060,.10,mat,y=y-.049)

for style in SCULPT_FACE_VARIANTS['Head']:
    p='Drif_Head_'+style
    if style=='ceramiccarapace':
        sf_blob(p+'_shell',(0,.025,2.15),(.63,.49,.66),sf_blue,n=56,m=36)
        sf_blob(p+'_muzzle',(0,-.445,1.94),(.35,.17,.23),sf_white,n=40,m=28)
        sf_head_eyes(p,.24,2.31,-.448,sf_blue)
        for s in [-1,1]:sf_solid(p+'_sideplate',[(s*.44,2.56),(s*.63,2.44),(s*.64,1.99),(s*.48,1.91),(s*.48,2.16)],-.14,.26,sf_cream,.13,.03)
        sf_cavity(p+'_mouth',sf_outline(0,1.85,.13,.045,28),-.602,sf_white,sf_ink,.30,.026)
    elif style=='masonryidol':
        sf_solid(p+'_mortar',[(-.43,1.47),(.43,1.47),(.60,2.66),(.49,2.78),(-.49,2.78),(-.60,2.66)],-.34,.72,sf_mortar,.06)
        for row in range(7):
            z=1.56+row*.17;half=.42+row*.024
            for j in range(4):
                x=-half+(j+.5)*(2*half/4)+(row%2)*.035;w=2*half/4-.016
                sf_solid(p+'_brick',sf_outline(x,z,w/2,.075,8,.4),-.405,.16,sf_copper,.14,.004)
        for s in [-1,1]:sf_cavity(p+'_eye',sf_outline(s*.24,2.27,.13,.08,24,.5),-.49,sf_mortar,sf_gold,.20,.06)
        sf_cavity(p+'_mouth',sf_outline(0,1.88,.21,.057,24,.4),-.493,sf_mortar,sf_ink,.18,.04)
    elif style=='candywhorl':
        obj=sf_blob(p+'_swirl',(0,0,2.15),(.64,.48,.66),sf_white,'candy',n=64,m=44)
        sf_pattern_surface(obj,'Candy')
        for s in [-1,1]:sf_cavity(p+'_eye',sf_outline(s*.23,2.27,.075,.115,28),-.49,sf_white,sf_ink,.25,.05)
        sf_cavity(p+'_mouth',sf_outline(0,1.95,.14,.06,32),-.49,sf_rose,sf_white,.23,.05)
    elif style=='mossrelic':
        sf_blob(p+'_stone',(0,0,2.15),(.63,.48,.66),sf_tan,'ash',n=48,m=32)
        sf_blob(p+'_muzzle',(0,-.44,1.93),(.26,.17,.20),sf_cream)
        sf_head_eyes(p,.24,2.30,-.44,sf_green)
        rng=random.Random(481)
        for j in range(23):
            s=-1 if j%2 else 1;x=s*(.37+rng.random()*.19);z=1.79+rng.random()*.85;y=-.15-rng.random()*.16;r=.063+rng.random()*.045
            sf_blob(p+'_moss',(x,y,z),(r,.07,r*.85),sf_green if j%3 else sf_lime,'moss',n=16,m=12,phase=j)
        sf_cavity(p+'_nose',sf_outline(0,2.01,.06,.04,24),-.608,sf_tan,sf_ink,.30,.03)
    elif style=='onyxcat':
        sf_blob(p+'_skull',(0,0,2.15),(.64,.46,.64),sf_ink,'ash',n=48,m=32)
        for s in [-1,1]:
            sf_solid(p+'_ear',[(s*.34,2.60),(s*.52,2.82),(s*.62,2.48)],-.06,.22,sf_ink,.16,.025)
            sf_cavity(p+'_socket',[(s*.10,2.31),(s*.42,2.39),(s*.39,2.19),(s*.17,2.16)],-.47,sf_gray,sf_ink,.21,.075)
            sf_iris(p+'_iris',s*.25,2.26,.04,.065,sf_gray,y=-.54)
        sf_blob(p+'_jaw',(0,-.35,1.83),(.41,.19,.20),sf_gray)
        sf_cavity(p+'_mouth',sf_outline(0,1.88,.30,.085,40),-.53,sf_gray,sf_ink,.20,.05)
        for j in range(9):sf_tooth(p+'_teeth',(j-4)*.059,1.927,.049,.065,sf_cream,y=-.573)
    elif style=='lilacdrake':
        sf_blob(p+'_skull',(0,.03,2.15),(.62,.46,.67),sf_lilac,n=48,m=32)
        sf_blob(p+'_muzzle',(0,-.44,1.96),(.38,.20,.245),sf_rose,n=40,m=28)
        sf_head_eyes(p,.245,2.32,-.44,sf_lilac)
        for s in [-1,1]:
            sf_solid(p+'_fin',[(s*.48,2.49),(s*.64,2.69),(s*.64,2.10),(s*.49,2.08)],-.05,.13,sf_cyan,.15,.025)
            sf_cavity(p+'_nostril',sf_outline(s*.10,2.00,.028,.019,20),-.638,sf_rose,sf_ink,.28,.023)
        sf_cavity(p+'_mouth',sf_outline(0,1.85,.12,.035,24),-.621,sf_rose,sf_gum,.26,.027)
    elif style=='ashimp':
        sf_blob(p+'_skull',(0,.025,2.15),(.63,.46,.65),sf_gray,'ash',n=48,m=32)
        for s in [-1,1]:
            sf_solid(p+'_horn',[(s*.36,2.56),(s*.46,2.82),(s*.60,2.74),(s*.55,2.48)],-.02,.23,sf_ink,.11,.03)
            sf_cavity(p+'_orbit',[(s*.10,2.33),(s*.40,2.42),(s*.43,2.24),(s*.16,2.16)],-.47,sf_gray,sf_ink,.27,.10)
            sf_iris(p+'_iris',s*.27,2.285,.05,.067,sf_gold,y=-.54)
            sf_solid(p+'_cheek',[(s*.18,2.09),(s*.46,2.22),(s*.54,2.11),(s*.33,1.90)],-.44,.17,sf_cream,.14,.035)
        sf_cavity(p+'_maw',sf_outline(0,1.89,.30,.14,40),-.49,sf_gray,sf_ink,.22,.09)
        for j in range(9):sf_tooth(p+'_tooth',(j-4)*.055,1.965-abs(j-4)*.007,.048,.11,sf_cream,y=-.55,pointed=True)
    elif style=='opartmask':
        obj=sf_blob(p+'_striped',(0,0,2.15),(.63,.48,.66),sf_white,n=64,m=40)
        sf_pattern_surface(obj,'Opart')
        for s in [-1,1]:sf_cavity(p+'_eye',sf_outline(s*.24,2.27,.077,.13,28),-.49,sf_ink,sf_white,.25,.05)
        sf_cavity(p+'_mouth',sf_outline(0,1.94,.17,.05,28),-.49,sf_ink,sf_white,.24,.04)
    elif style=='berrybust':
        sf_blob(p+'_berry',(0,0,2.15),(.62,.49,.64),sf_red,'berry',n=80,m=56)
        for row in range(8):
            theta=.40+row*.31
            for j in range(16):
                a=j*math.tau/16+(row%2)*.15;x=.624*math.sin(theta)*math.cos(a);y=.494*math.sin(theta)*math.sin(a);z=2.15+.644*math.cos(theta)
                if y<-.15 and 1.98<z<2.43 and abs(x)<.40:continue
                sf_blob(p+'_seed',(x,y,z),(.018,.012,.027),sf_gold,n=10,m=8)
        for s in [-1,1]:sf_cavity(p+'_eye',sf_outline(s*.24,2.28,.085,.125,28),-.49,sf_red,sf_ink,.25,.055)
        sf_cavity(p+'_mouth',sf_outline(0,1.95,.14,.05,28),-.50,sf_red,sf_white,.25,.04)
        for j in range(5):
            a=j*math.tau/5;x=.16*math.cos(a)
            sf_solid(p+'_leaf',[(0,2.72),(x-.07,2.79),(x+.03,2.83),(.04,2.70)],-.05+.10*math.sin(a),.08,sf_green,.18,.025)
    else:
        sf_blob(p+'_skull',(0,.025,2.15),(.63,.47,.65),sf_ink,n=48,m=32)
        sf_blob(p+'_muzzle',(0,-.43,1.92),(.37,.18,.22),sf_ink,'candy',n=40,m=28)
        sf_head_eyes(p,.25,2.32,-.44,sf_red)
        for x,z,r in [(-.48,2.4,.06),(.48,2.4,.06),(-.15,2.65,.047),(.16,2.64,.05),(-.43,1.91,.05),(.43,1.91,.05),(0,2.57,.033),(-.47,2.08,.034),(.47,2.08,.034)]:
            y=-.47*math.sqrt(max(.03,1-(x/.65)**2-((z-2.15)/.68)**2));sf_cavity(p+'_orbseat',sf_outline(x,z,r*1.23,r*1.23,24),y-.015,sf_ink,sf_red,.20,.04)
        sf_cavity(p+'_mouth',sf_outline(0,1.85,.22,.065,32),-.598,sf_ink,sf_red,.23,.04)
        for j in range(7):sf_tooth(p+'_tooth',(j-3)*.056,1.89,.047,.047,sf_cream,y=-.625)

    # Keep every replacement grounded at the common collar attachment. The
    # masonry silhouette is deliberately square but still spans the shared
    # minimum 1.24-unit width required by the wardrobe fit contract.
    members=[o for o in collection.objects if o.type=='MESH' and o.name.startswith(p+'_')]
    lowest=min(v.co.z for o in members for v in o.data.vertices)
    for obj in members:
        for vertex in obj.data.vertices:
            if style=='masonryidol':vertex.co.x*=1.05
            if lowest>1.49:vertex.co.z-=max(0,min(1,(2.10-vertex.co.z)/.60))*(lowest-1.485)
        obj.data.update()


# TATTOOS --------------------------------------------------------------------
for style in SCULPT_FACE_VARIANTS['Tattoo']:
    p='Drif_Tattoo_'+style
    if style=='jesterduality':
        x=-.47;z=2.03
        sf_inkpatch(p+'_star',[(x+(.068 if j%2==0 else .028)*math.sin(j*math.pi/5),z+(.068 if j%2==0 else .028)*math.cos(j*math.pi/5)) for j in range(10)],sf_flesh)
        sf_inkpatch(p+'_drop',[(.46,2.10),(.424,2.01),(.43,1.97),(.47,1.96),(.49,2.0)],sf_green)
    elif style=='pilledglyphs':
        # A compact gothic monogram derived from the source lettering, laid as
        # ink. Its broad blackletter stems are polygons with no raised outlines.
        for j in range(5):
            x=-.16+j*.075;z=2.60+.018*math.sin(j*.9)
            sf_inkpatch(p+'_glyph',[(x-.022,z-.06),(x-.022,z+.065),(x,z+.08),(x+.018,z+.062),(x+.027,z-.05),(x+.008,z-.064),(x+.005,z+.038),(x-.006,z+.045),(x-.006,z-.05)])
    elif style=='troupeseal':
        x=-.48;z=2.01;sf_inkpatch(p+'_body',sf_outline(x,z,.041,.067,24))
        for s in [-1,1]:
            for j in range(4):
                zz=z+.043-j*.025
                sf_inkpatch(p+'_leg',[(x+s*.025,zz),(x+s*.065,zz+.028),(x+s*.087,zz+.048),(x+s*.080,zz+.055),(x+s*.059,zz+.037),(x+s*.024,zz+.007)])
        sf_inkpatch(p+'_six',[(x-.01,z+.02),(x-.018,z-.012),(x,z-.028),(x+.019,z-.008),(x+.009,z+.002),(x-.003,z-.009),(x+.001,z+.019)],sf_cream)
    elif style=='seetheink':
        for s in [-1,1]:sf_inkpatch(p+'_tear',[(s*.43,2.12),(s*.48,2.09),(s*.46,1.99),(s*.49,1.90),(s*.465,1.81),(s*.44,1.93),(s*.44,2.02),(s*.41,2.08)],sf_cyan)
    elif style=='millerwash':
        for s in [-1,1]:sf_inkpatch(p+'_shadow',[(s*.39,2.20),(s*.58,2.15),(s*.56,2.10),(s*.60,2.07),(s*.53,2.04),(s*.57,2.00),(s*.46,2.01),(s*.40,2.08)])
    elif style=='brickink':
        for s in [-1,1]:
            for row in range(4):
                for col in range(2):
                    x=s*(.39+col*.072+(row%2)*.023);z=2.13-row*.060
                    sf_inkpatch(p+'_brick',[(x-.027,z-.020),(x+.027,z-.020),(x+.027,z+.020),(x-.027,z+.020)],sf_copper)
    elif style=='berryfreckles':
        for s in [-1,1]:
            for row in range(3):
                for col in range(4):
                    x=s*(.28+col*.068+(row%2)*.022);z=2.05-row*.061
                    sf_inkpatch(p+'_seed',sf_outline(x,z,.011,.021,12),sf_gold)
    elif style=='candyink':
        for s in [-1,1]:
            x=s*.48;z=2.02
            for band in range(5):
                a=band*math.tau/5;points=[]
                for j in range(12):
                    t=j/11;r=.008+.085*t;aa=a+t*math.pi*1.8;points.append((x+r*math.cos(aa),z+r*math.sin(aa)))
                for j in reversed(range(12)):
                    t=j/11;r=.014+.085*t;aa=a+t*math.pi*1.8;points.append((x+r*math.cos(aa+.13),z+r*math.sin(aa+.13)))
                sf_inkpatch(p+'_swirl',points,sf_candy[band])
    elif style=='opartcheeks':
        for s in [-1,1]:
            for j in range(5):
                x=s*(.31+j*.045)
                sf_inkpatch(p+'_stripe',[(x,2.13),(x+s*.018,2.13),(x+s*.045,2.01),(x+s*.02,1.88),(x,1.88),(x+s*.025,2.01)])
    else:
        for s in [-1,1]:
            for j in range(7):
                x=s*(.36+(j%3)*.063);z=2.11-(j//3)*.09;r=.016+(j%3)*.004
                sf_inkpatch(p+'_orb',sf_outline(x,z,r,r,20),sf_red)

for category,ids in SCULPT_FACE_VARIANTS.items():
    assert len(ids)==10 and len(set(ids))==10,category
    for style in ids:
        prefix='Drif_'+category+'_'+style
        assert any(o.type=='MESH' and (o.name==prefix or o.name.startswith(prefix+'_') or o.name.startswith(prefix+'.')) for o in collection.objects),prefix
print('SCULPT_FACES_READY',SCULPT_FACE_VARIANTS)
