"""Build the modular Drifella wardrobe in Blender 5.2 through the live MCP bridge.

Open assets/models/showroom-character/blue-fin-character.blend, then execute this
file in Blender. The existing character is preserved, and only DrifmakerLibrary
is rebuilt. No website files or original model assets are overwritten.
"""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path('/Users/kyl/Documents/art mtg')
OUT = ROOT / 'assets/models/drifmaker'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
source = bpy.data.objects['BlueFinCharacterMesh']
source_rig = bpy.data.objects['BlueFinRig']
old = bpy.data.collections.get('DrifmakerLibrary')
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(old)
for datablocks in [bpy.data.meshes, bpy.data.materials]:
    for item in list(datablocks):
        if item.name.startswith('Drif_') and item.users == 0:
            datablocks.remove(item)
collection = bpy.data.collections.new('DrifmakerLibrary')
scene.collection.children.link(collection)
rig = source_rig.copy()
rig.data = source_rig.data.copy()
rig.name = 'DrifellaRig'
collection.objects.link(rig)
rig.animation_data.action = bpy.data.actions['Neutral']
scene.frame_set(1)
pieces = []

def material(name, color, rough=.6, metallic=0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    return mat

copied_materials = []
for original in source.data.materials:
    mat = original.copy()
    mat.name = 'Drif_Body_Main' if original.name.startswith('Azure blue') else 'Drif_Original_' + original.name.split('.')[0].replace(' ', '_')
    copied_materials.append(mat)
blue = next(m for m in copied_materials if m.name == 'Drif_Body_Main')
white = material('Drif_Warm_White', (.94, .90, .78))
ink = material('Drif_Eye_Ink', (.008, .015, .025), .22)
glint = material('Drif_Eye_Glint', (1, 1, 1), .2)
gold = material('Drif_Gold', (.95, .57, .12), .3, .45)
pink = material('Drif_Coral', (.97, .25, .31), .48)
navy = material('Drif_Navy', (.025, .07, .12), .65)
shirt = material('Drif_Shirt_Main', (.095, .18, .27), .82)
hat = material('Drif_Hat_Main', (.018, .075, .081), .78)
teal = material('Drif_Accessory_Main', (.025, .34, .30), .8)
charcoal = material('Drif_Charcoal', (.012, .014, .021), .75)
bomber = material('Drif_Bomber_White', (.89, .88, .81), .75)
stitch = material('Drif_Denim_Stitch', (.68, .45, .18), .8)
purple = material('Drif_Cap_Purple', (.44,.035,.88), .42)
cyan = material('Drif_Cap_Cyan', (.025,.92,.69), .42)
red = material('Drif_Necklace_Red', (.65,.025,.032), .42)

def skin(obj, weights=None):
    if weights is not None:
        for v in obj.data.vertices:
            mapping = weights(v.co) if callable(weights) else {weights: 1}
            total = sum(mapping.values())
            for name, value in mapping.items():
                if value <= 0:
                    continue
                group = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
                group.add([v.index], value/total, 'REPLACE')
    obj.parent = rig
    modifier = obj.modifiers.new('Drifella skin', 'ARMATURE')
    modifier.object = rig
    pieces.append(obj)
    return obj

def mesh(name, verts, faces, mat, weights, smooth=True):
    data = bpy.data.meshes.new(name + '_geometry')
    data.from_pydata(verts, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = smooth
    return skin(obj, weights)

def subset(name, polygons):
    # Copy UVs, smooth flags and exact weights. Connected eye components are
    # classified before this step, so no clipped eye/glint geometry remains.
    used = sorted({v for p in polygons for v in p.vertices})
    remap = {v: i for i, v in enumerate(used)}
    data = bpy.data.meshes.new(name + '_geometry')
    data.from_pydata([source.data.vertices[i].co[:] for i in used], [],
                     [[remap[v] for v in p.vertices] for p in polygons])
    data.update()
    for mat in copied_materials:
        data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    for source_group in source.vertex_groups:
        obj.vertex_groups.new(name=source_group.name)
    for i, vi in enumerate(used):
        for weight in source.data.vertices[vi].groups:
            obj.vertex_groups[weight.group].add([i], weight.weight, 'REPLACE')
    for original_layer in source.data.uv_layers:
        layer = data.uv_layers.new(name=original_layer.name)
        for p, original in zip(data.polygons, polygons):
            for li, oli in zip(p.loop_indices, original.loop_indices):
                layer.data[li].uv = original_layer.data[oli].uv
    for p, original in zip(data.polygons, polygons):
        p.material_index = original.material_index
        p.use_smooth = original.use_smooth
    return skin(obj)

# Find components in the original joined character, preserving geometry exactly.
adj = [set() for _ in source.data.vertices]
for edge in source.data.edges:
    a, b = edge.vertices
    adj[a].add(b)
    adj[b].add(a)
component = {}
centers = []
for vertex in source.data.vertices:
    if vertex.index in component:
        continue
    todo = [vertex.index]
    ids = []
    ci = len(centers)
    component[vertex.index] = ci
    while todo:
        vi = todo.pop()
        ids.append(vi)
        for neighbor in adj[vi]:
            if neighbor not in component:
                component[neighbor] = ci
                todo.append(neighbor)
    centers.append(sum((source.data.vertices[i].co for i in ids), Vector()) / len(ids))
groups = {'Drif_Body': [], 'Drif_Head_original': [], 'Drif_Eyes_classic': [], 'Drif_Shirt_original': [],
          'Drif_Accessory_original': [], 'Drif_Legs_original': [], 'Drif_Mouth_original': [], 'Drif_Ears_original': [], 'Drif_Nose_original': [], 'Drif_Brows_original': []}
for p in source.data.polygons:
    name = source.data.materials[p.material_index].name
    center = centers[component[p.vertices[0]]]
    if name.startswith('Crimson brows') and center.z>2.3:
        target = 'Drif_Brows_original'
    elif name.startswith(('Hoodie woven', 'Hoodie front')):
        target = 'Drif_Shirt_original'
    elif name.startswith(('Bag edge', 'Black woven', 'Bag hardware')):
        target = 'Drif_Accessory_original'
    elif name.startswith('Denim weave') or (center.z < .4 and name.startswith(('Azure blue', 'Warm ivory'))):
        target = 'Drif_Legs_original'
    elif name.startswith('Warm ivory') and abs(center.x)>.5 and center.z>1.65:
        target = 'Drif_Ears_original'
    elif name.startswith('Obsidian eyes') and 1.90<center.z<2 and center.y<-.60:
        target = 'Drif_Nose_original'
    elif name.startswith('Mouth inset') or (name.startswith('White tips') and 1.76 < center.z < 1.84 and center.y < -.60):
        target = 'Drif_Mouth_original'
    elif name.startswith(('Obsidian eyes', 'White tips')) and 2 < center.z < 2.4:
        target = 'Drif_Eyes_classic'
    else:
        target = 'Drif_Head_original' if center.z > 1.65 else 'Drif_Body'
    groups[target].append(p)
for name, polygons in groups.items():
    subset(name, polygons)

def ell(name, loc, scale, mat, bone='Head', n=20, m=12):
    verts = []
    for i in range(m + 1):
        theta = math.pi * i / m
        for j in range(n):
            phi = math.tau * j / n
            verts.append((loc[0] + scale[0] * math.sin(theta) * math.cos(phi),
                          loc[1] + scale[1] * math.sin(theta) * math.sin(phi),
                          loc[2] + scale[2] * math.cos(theta)))
    faces = []
    for i in range(m):
        for j in range(n):
            faces.append((i*n+j, i*n+(j+1)%n, (i+1)*n+(j+1)%n, (i+1)*n+j))
    return mesh(name, verts, faces, mat, bone)

def rings(name, sections, mat, weights, sides=20, caps=True):
    verts = [(cx+rx*math.cos(j*math.tau/sides), cy+ry*math.sin(j*math.tau/sides), z)
             for z, rx, ry, cx, cy in sections for j in range(sides)]
    faces = [(i*sides+j, i*sides+(j+1)%sides, (i+1)*sides+(j+1)%sides, (i+1)*sides+j)
             for i in range(len(sections)-1) for j in range(sides)]
    if caps:
        faces += [tuple(reversed(range(sides))), tuple((len(sections)-1)*sides+j for j in range(sides))]
    return mesh(name, verts, faces, mat, weights)

def line(name, points, radius, mat, bone, sides=8):
    verts = []
    for i, point in enumerate(points):
        tangent = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize()
        normal = tangent.cross(Vector((0,1,0)))
        if normal.length < .001:
            normal = tangent.cross(Vector((0,0,1)))
        normal.normalize()
        bitangent = tangent.cross(normal).normalized()
        for j in range(sides):
            a = j*math.tau/sides
            verts.append(tuple(Vector(point) + radius*(normal*math.cos(a)+bitangent*math.sin(a))))
    faces = [(i*sides+j, i*sides+(j+1)%sides, (i+1)*sides+(j+1)%sides, (i+1)*sides+j)
             for i in range(len(points)-1) for j in range(sides)]
    faces += [tuple(reversed(range(sides))), tuple((len(points)-1)*sides+j for j in range(sides))]
    return mesh(name, verts, faces, mat, bone)

def plaque(name, points, y, depth, mat, bone='Head'):
    verts = [(x,y,z) for x,z in points] + [(x,y+depth,z) for x,z in points]
    n = len(points)
    faces = [tuple(reversed(range(n))), tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name, verts, faces, mat, bone, False)

def star(name, center, outer, inner, mat, bone='Head', points=5):
    x,y,z = center
    polygon = [(x+(outer if i%2==0 else inner)*math.sin(math.pi*i/points),
                z+(outer if i%2==0 else inner)*math.cos(math.pi*i/points)) for i in range(points*2)]
    return plaque(name, polygon, y, .018, mat, bone)

# Eyes: sleepy half-lids and bright geometric star pupils, fitted to the same face.
for side in [-1,1]:
    x = side*.302
    ell('Drif_Eyes_sleepy_socket', (x,-.428,2.155), (.183,.098,.175), ink)
    ell('Drif_Eyes_sleepy_lid', (x,-.455,2.255), (.194,.099,.103), blue)
    line('Drif_Eyes_sleepy_lash', [(x-.145,-.529,2.198),(x,-.548,2.185),(x+.145,-.529,2.198)], .014, navy, 'Head')
    ell('Drif_Eyes_sleepy_glint', (x-side*.025,-.524,2.15), (.032,.012,.044), glint, n=12,m=8)
    ell('Drif_Eyes_star_socket', (x,-.425,2.17), (.182,.102,.255), ink)
    star('Drif_Eyes_star_pupil', (x,-.535,2.21), .132,.042,gold,points=4)
    ell('Drif_Eyes_star_glint', (x-.065,-.534,2.30), (.025,.012,.028), glint,n=10,m=8)
    ell('Drif_Eyes_spiral_socket', (x,-.425,2.17), (.182,.102,.255), ink)
    points=[]
    for j in range(65):
        a=j/64*math.tau*2.65
        r=.018+.12*j/64
        points.append((x+math.cos(a)*r,-.536,2.17+math.sin(a)*r*1.40))
    line('Drif_Eyes_spiral_swirl',points,.0125,white,'Head',7)

def torso_weights(co):
    t=max(0,min(1,(co.z-.78)/.6))
    return {'Pelvis':1-t,'Chest':t}

def sleeve(prefix, side, label, mat, length=1.12, cuff=navy):
    verts=[]
    sections=[(.32,.14),(.44,.191),(.62,.187),(.76,.174),(.84,.169),(.93,.164),(1.08,.158),(length,.146)]
    n=12
    for x,r in sections:
        for j in range(n):
            a=math.tau*j/n
            verts.append((side*x, math.cos(a)*r, 1.465+math.sin(a)*r))
    faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sections)-1) for j in range(n)]
    faces += [tuple(reversed(range(n))),tuple((len(sections)-1)*n+j for j in range(n))]
    def weights(co):
        t=max(0,min(1,(abs(co.x)-.73)/.20))
        return {'UpperArm.'+label:1-t,'Forearm.'+label:t}
    mesh(prefix+'_sleeve',verts,faces,mat,weights)
    for offset in [1.065,1.105]:
        points=[(side*offset, math.cos(j*math.tau/20)*.162,1.465+math.sin(j*math.tau/20)*.162) for j in range(21)]
        line(prefix+'_cuff',points,.018,cuff,'Forearm.'+label)

for style in ['denim','bomber']:
    prefix='Drif_Shirt_'+style
    cloth=shirt if style=='denim' else bomber
    trim=navy if style=='denim' else charcoal
    rings(prefix+'_body',[(.75,.365,.23,0,0),(.81,.408,.249,0,0),(1.02,.406,.262,0,0),(1.29,.404,.239,0,0),(1.48,.354,.204,0,0),(1.56,.235,.162,0,0)],cloth,torso_weights)
    rings(prefix+'_hem',[(.748,.374,.236,0,0),(.80,.407,.251,0,0)],trim,'Pelvis')
    for side,label in [(-1,'R'),(1,'L')]:
        sleeve(prefix,side,label,cloth,cuff=trim)
    line(prefix+'_placket',[(0,-.256,.83),(0,-.280,1.08),(0,-.258,1.30),(0,-.195,1.52)],.022,trim,torso_weights)
    line(prefix+'_collar',[(-.225,-.12,1.55),(-.13,-.19,1.51),(0,-.204,1.51),(.13,-.19,1.51),(.225,-.12,1.55)],.032,trim,'Chest')
    if style=='denim':
        for z,y in [(.92,-.265),(1.06,-.282),(1.20,-.279),(1.35,-.257)]:
            ell(prefix+'_snap',(0,y,z),(.015,.008,.015),gold,torso_weights,n=10,m=6)
        for side in [-1,1]:
            x=side*.20
            plaque(prefix+'_chest_pocket',[(x-.082,1.33),(x+.082,1.33),(x+.075,1.19),(x,1.16),(x-.075,1.19)],-.250,.018,shirt,'Chest')
            line(prefix+'_pocket_stitch',[(x-.078,-.271,1.32),(x+.078,-.271,1.32),(x+.07,-.271,1.20),(x,-.271,1.175),(x-.07,-.271,1.20),(x-.078,-.271,1.32)],.005,stitch,'Chest',6)
            line(prefix+'_pocket_flap',[(x-.078,-.277,1.32),(x,-.282,1.275),(x+.078,-.277,1.32)],.011,navy,'Chest')
            ell(prefix+'_pocket_button',(x,-.289,1.295),(.012,.007,.012),gold,'Chest',n=10,m=6)
            line(prefix+'_lower_seam',[(side*.09,-.278,.86),(side*.105,-.283,1.03),(side*.115,-.265,1.15)],.005,stitch,torso_weights,6)
        plaque(prefix+'_collar_left',[(-.23,1.55),(-.12,1.56),(-.035,1.42),(-.17,1.47)],-.21,.028,shirt,'Chest')
        plaque(prefix+'_collar_right',[(.23,1.55),(.12,1.56),(.035,1.42),(.17,1.47)],-.21,.028,shirt,'Chest')
    else:
        plaque(prefix+'_neckline',[(-.11,1.53),(.11,1.53),(0,1.33)],-.243,.018,charcoal,'Chest')
        line(prefix+'_zip_teeth',[(0,-.282,.86),(0,-.303,1.08),(0,-.281,1.30)],.006,gold,torso_weights,6)
        ell(prefix+'_zip_pull',(0,-.295,1.32),(.017,.009,.035),gold,'Chest',n=10,m=6)
        for side in [-1,1]:
            line(prefix+'_collar_edge',[(side*.12,-.247,1.53),(side*.065,-.264,1.42),(0,-.266,1.33)],.023,bomber,'Chest')
        for side in [-1,1]:
            line(prefix+'_pocket',[(side*.21,-.246,1.00),(side*.30,-.22,1.16)],.018,charcoal,torso_weights)
            line(prefix+'_pocket_edge',[(side*.20,-.25,1.00),(side*.29,-.23,1.16)],.006,white,torso_weights,6)

# Hats stay within the central crown, leaving the fins clear.
rings('Drif_Hat_beanie_band',[(2.61,.425,.385,0,.015),(2.70,.459,.409,0,.015),(2.78,.445,.399,0,.015)],charcoal,'Head',28)
rings('Drif_Hat_beanie_crown',[(2.72,.44,.398,0,.015),(2.87,.39,.36,0,.025),(3.01,.23,.23,0,.04),(3.06,.035,.035,0,.04)],charcoal,'Head',28)
for x in [-.32,-.22,-.11,0,.11,.22,.32]:
    y=.015-math.sqrt(max(0,.40**2-(x*.88)**2))
    line('Drif_Hat_beanie_knit',[(x,y-.005,2.64),(x,y-.011,2.75)],.006,navy,'Head',6)
rings('Drif_Hat_cap_crown',[(2.65,.452,.402,0,.01),(2.78,.445,.395,0,.01),(2.92,.33,.31,0,.035),(2.99,.10,.10,0,.045),(3.0,.015,.015,0,.045)],hat,'Head',24)
ell('Drif_Hat_cap_brim',(0,-.40,2.67),(.47,.33,.035),hat,n=24,m=8)
ell('Drif_Hat_cap_button',(0,.045,3.005),(.048,.048,.026),hat,n=12,m=6)
for j,color in enumerate([purple,cyan,purple]):
    z=2.765+j*.044
    skew=.02 if j!=1 else -.02
    plaque('Drif_Hat_cap_emblem',[(-.072+skew,z),(.066+skew,z),(.085-skew,z+.025),(-.053-skew,z+.025)],-.412+j*.008,.015,color)
rainbow=[(.76,.03,.08),(.96,.31,.025),(.98,.77,.06),(.10,.65,.22),(.035,.30,.89),(.52,.08,.80)]
for j,color in enumerate(rainbow):
    z=2.67+j*.095
    r=.285*(1-j/6)
    next_r=.285*(1-(j+1)/6)
    m=material('Drif_Party_Rainbow_'+str(j),color,.63)
    rings('Drif_Hat_party_band',[(z,r,r,0,.02),(z+.095,max(.003,next_r),max(.003,next_r),0,.02)],m,'Head',24)
ell('Drif_Hat_party_tip',(0,.02,3.26),(.052,.052,.052),white,n=14,m=8)
line('Drif_Hat_party_brim',[(.287*math.cos(j*math.tau/24),.02+.287*math.sin(j*math.tau/24),2.675) for j in range(25)],.018,white,'Head')

# Headphones use the front lateral head zone, below all hat attachment volumes.
for side in [-1,1]:
    ell('Drif_Accessory_headphones_cushion',(side*.555,-.205,2.16),(.115,.17,.205),charcoal,n=20,m=12)
    ell('Drif_Accessory_headphones_shell',(side*.63,-.207,2.16),(.08,.145,.17),purple,n=20,m=12)
    ell('Drif_Accessory_headphones_disk',(side*.69,-.208,2.16),(.018,.083,.105),charcoal,n=12,m=10)
    for j in range(3):
        y=-.29+j*.085
        z=2.30+(.025 if j==1 else 0)
        verts=[(side*.645,y-.03,z),(side*.645,y+.03,z),(side*.705,y+.025,z),(side*.705,y-.025,z),(side*.74,y,z+.13)]
        mesh('Drif_Accessory_headphones_spike',verts,[(0,1,2,3),(0,4,1),(1,4,2),(2,4,3),(3,4,0)],purple,'Head',False)
points=[]
for j in range(25):
    a=math.pi*j/24
    points.append((.61*math.cos(a),-.10,2.19+.407*math.sin(a)))
line('Drif_Accessory_headphones_band',points,.039,charcoal,'Head')

# A pendant uses the chest bone; the cord follows the same blended torso weights
# as each garment. It stays above the original shirt front and all jackets.
line('Drif_Accessory_necklace_cord',[(-.19,-.16,1.55),(-.20,-.255,1.42),(-.13,-.302,1.23),(0,-.323,1.13),(.13,-.302,1.23),(.20,-.255,1.42),(.19,-.16,1.55)],.014,charcoal,torso_weights)
for x,y,z,r in [(-.185,-.28,1.37,.037),(-.14,-.31,1.26,.04),(-.08,-.33,1.18,.041),(0,-.35,1.12,.057),(.08,-.33,1.18,.041),(.14,-.31,1.26,.04),(.185,-.28,1.37,.037)]:
    ball=ell('Drif_Accessory_necklace_ball',(x,y,z),(r,r*.72,r),red,torso_weights,n=16,m=10)
    ball.data.materials.append(white)
    for polygon in ball.data.polygons:
        if polygon.center.z<z:
            polygon.material_index=1
    line('Drif_Accessory_necklace_band',[(x+r*math.cos(j*math.tau/16),y+r*.72*math.sin(j*math.tau/16),z) for j in range(17)],.005,charcoal,torso_weights,6)
    ell('Drif_Accessory_necklace_button',(x,y-r*.8,z),(r*.25,.006,r*.25),charcoal,torso_weights,n=10,m=6)
    ell('Drif_Accessory_necklace_button_inset',(x,y-r*.92,z),(r*.12,.004,r*.12),white,torso_weights,n=8,m=6)

# A soft creature backpack, inspired by the collection's plush backpack trait.
ell('Drif_Accessory_backpack_body',(0,.385,1.12),(.305,.205,.365),teal,'Chest',n=24,m=16)
ell('Drif_Accessory_backpack_belly',(0,.566,1.04),(.213,.048,.233),white,'Chest',n=20,m=12)
for side in [-1,1]:
    ell('Drif_Accessory_backpack_ear',(side*.215,.39,1.43),(.085,.11,.15),teal,'Chest',n=16,m=10)
    ell('Drif_Accessory_backpack_eye',(side*.115,.575,1.28),(.027,.022,.035),charcoal,'Chest',n=12,m=8)
    ell('Drif_Accessory_backpack_foot',(side*.19,.45,.83),(.13,.13,.095),teal,'Chest',n=16,m=10)
    ell('Drif_Accessory_backpack_arm',(side*.29,.41,1.09),(.087,.11,.17),teal,'Chest',n=16,m=10)
    line('Drif_Accessory_backpack_strap',[(side*.22,.28,1.47),(side*.27,.02,1.56),(side*.28,-.20,1.43),(side*.29,-.25,1.24),(side*.28,-.23,1.03),(side*.28,.20,.96)],.031,charcoal,torso_weights)
line('Drif_Accessory_backpack_smile',[(-.07,.603,1.22),(0,.613,1.19),(.07,.603,1.22)],.008,charcoal,'Chest',6)
# Keep the soft bag above the original tail sweep; straps retain the torso fit.
backpack_center=Vector((0,.385,1.12))
for obj in collection.objects:
    if obj.name.startswith('Drif_Accessory_backpack_') and 'strap' not in obj.name:
        for vertex in obj.data.vertices:
            vertex.co=backpack_center+(vertex.co-backpack_center)*.80+Vector((0,0,.11))
        obj.data.update()

# Expand the catalog with fitted lower-body/mouth sets and the additional wardrobe.
for extension_name in ['extend_drifmaker_legs_mouth.py','extend_drifmaker_wardrobe.py','extend_drifmaker_spectral.py','extend_drifmaker_signature.py','extend_drifmaker_encore.py','extend_drifmaker_brows.py','refine_drifmaker_portraits.py','extend_drifmaker_holiday.py']:
    extension_path=ROOT/'scripts/showroom-assets'/extension_name
    exec(compile(extension_path.read_text(),str(extension_path),'exec'),globals())
variant_catalog={
    'Eyes':['classic','sleepy','star','spiral'],
    'Shirt':['original','denim','bomber'],
    'Hat':['cap','beanie','party'],
    'Accessory':['original','headphones','necklace','backpack'],
    'Legs':['original']+LEG_VARIANTS,
    'Mouth':['original']+MOUTH_VARIANTS,
    'Head':['original'],
    'Extra':[], 'Nose':['original'], 'Ears':['original'], 'Tattoo':[], 'Brows':['original']+BROW_VARIANTS,
}
for category,ids in EXTENDED_VARIANTS.items():
    variant_catalog[category].extend(ids)
for category,ids in SPECTRAL_VARIANTS.items():
    variant_catalog[category].extend(ids)

for category,ids in SIGNATURE_VARIANTS.items():
    variant_catalog[category].extend(ids)

for category,ids in ENCORE_VARIANTS.items():
    variant_catalog[category].extend(ids)

for category,ids in HOLIDAY_VARIANTS.items():
    variant_catalog[category].extend(ids)

exec(compile((ROOT/'scripts/showroom-assets/animate_drifmaker_poses.py').read_text(),'animate_drifmaker_poses.py','exec'),globals())

def variant_matches(name,prefix):
    return name==prefix or name.startswith(prefix+'_') or name.startswith(prefix+'.')

# One skinned object per choice batches disconnected pieces with common materials
# and keeps the per-visitor skeleton/node cost small in crowded showrooms.
joined = []
for category, variants in variant_catalog.items():
    for variant in variants:
        prefix='Drif_'+category+'_'+variant
        members=[o for o in collection.objects if o.type=='MESH' and variant_matches(o.name,prefix)]
        assert members, 'Missing variant geometry: '+prefix
        if len(members)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in members:
                obj.select_set(True)
            bpy.context.view_layer.objects.active=members[0]
            bpy.ops.object.join()
        members[0].name=prefix
        joined.append(members[0])
pieces=[bpy.data.objects['Drif_Body'],bpy.data.objects['Drif_Ghost_Fuzz']]+joined

# Export all alternatives in the same bind space. Runtime enables exactly one
# name prefix in each category and shares the cloned skeleton across all meshes.
for obj in pieces:
    obj['drifmaker_part'] = obj.name.split('.')[0]
    obj.hide_set(False)
    obj.hide_render = False
rig.hide_set(False)
source.hide_set(True)
source.hide_render = True
source_rig.hide_set(True)
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces+[rig]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties
assert 'ACTIONS' in [i.identifier for i in props['export_animation_mode'].enum_items]
kwargs=dict(filepath=str(OUT/'drifella-customizable.glb'),use_selection=True,
            export_animations=True,export_animation_mode='ACTIONS',export_skins=True,
            export_yup=True,export_force_sampling=True,export_def_bones=False)
formats=[i.identifier for i in props['export_format'].enum_items]
if 'GLB' in formats:
    kwargs['export_format']='GLB'
bpy.ops.export_scene.gltf(**kwargs)

def selection(eyes='classic',shirt='original',hat='none',accessory='original',legs='original',mouth='original',head='original',extra='none',nose='original',ears='original',tattoo='none',brows='original'):
    names=['Drif_Body','Drif_Head_'+head,'Drif_Shirt_'+shirt,'Drif_Hat_'+hat,'Drif_Accessory_'+accessory,'Drif_Legs_'+legs,'Drif_Extra_'+extra]
    if shirt=='wizardrobe':names.remove('Drif_Legs_'+legs)
    if head in ['pumpkin','tv','crystal']:names.append('Drif_Ears_original')
    if head=='original':
        names+=['Drif_Eyes_'+eyes,'Drif_Mouth_'+mouth,'Drif_Nose_'+nose,'Drif_Ears_'+ears,'Drif_Tattoo_'+tattoo,'Drif_Brows_'+brows]
    for obj in pieces:
        visible=obj.name in names
        obj.hide_set(not visible)
        obj.hide_render=not visible

selection()
scene.frame_set(1)
manifest={
    'version':8,'asset':'drifella-customizable.glb','source':'drifella-customizable.blend',
    'bodyMaterial':'Drif_Body_Main','shirtMaterial':'Drif_Shirt_Main',
    'hatMaterial':'Drif_Hat_Main','accessoryMaterial':'Drif_Accessory_Main',
    'orientation':{'blenderUp':'+Z','blenderForward':'-Y','gltfUp':'+Y','gltfForward':'+Z'},
    'categories':{'eyes':variant_catalog['Eyes'],'shirts':variant_catalog['Shirt'],
                  'hats':['none']+variant_catalog['Hat'],'accessories':['none']+variant_catalog['Accessory'],
                  'legs':variant_catalog['Legs'],'mouth':variant_catalog['Mouth'],
                  'head':variant_catalog['Head'],'extra':['none']+variant_catalog['Extra'],'nose':variant_catalog['Nose'],'ears':variant_catalog['Ears'],'tattoo':['none']+variant_catalog['Tattoo'],'brows':['none']+variant_catalog['Brows'],'bodyStyles':['solid','ghost','gold','silver','matteblack','camo']},
    'inspiration':{'collection':'Drifella 2','url':'https://www.tensor.trade/trade/drifella_2',
                   'traits':['jean jacket','white bomber','solana cap','doomer black beanie','rainbow party hat','sleppy','pixelady star','spiral','dark magician spiky headphones','pokeball necklace','warlax backpack']},
    'nodePrefixes':{'eyes':'Drif_Eyes_','shirts':'Drif_Shirt_','hats':'Drif_Hat_','accessories':'Drif_Accessory_','legs':'Drif_Legs_','mouth':'Drif_Mouth_','head':'Drif_Head_','extra':'Drif_Extra_','nose':'Drif_Nose_','ears':'Drif_Ears_','tattoo':'Drif_Tattoo_','brows':'Drif_Brows_'},
    'orbFreeEyes':ORB_FREE_EYES,'earringAnchor':list(sg_earring_anchor),
    'headFits':{name:{'scale':list(fit[:3]),'verticalOffset':fit[3],'pivot':[0,0,2.20]} for name,fit in HEAD_FITS.items()},
    'legOverrideTops':['wizardrobe'],
    'classicFinHeads':['pumpkin','tv','crystal'],
    'poses':POSE_IDS,
    'clips':[{'name':a.name,'seconds':(a.frame_range[1]-a.frame_range[0])/30} for a in bpy.data.actions],
    'bones':[b.name for b in rig.data.bones],
    'parts':[{'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in pieces],
    'originalParts':{name:len(polygons) for name,polygons in groups.items()},
    'extraLayout':'Portrait-aware satellite positions with front fin clearance and varied depth/tilt; a curved rear rainbow, visible storm, lowered halo, raised lantern, offset shield, and wider jetpack pods.',
    'notes':'All components share the original 19-bone rest pose, 10 locomotion actions and 10 enter-and-hold pose actions. Alternate heads replace the original head and facial categories without discarding choices; pumpkin, TV and crystal retain the classic fin ears. Replacement heads fit the original collar height and silhouette. Extra is independent of accessories. Ghost color and rim transparency cover the entire body, facial surfaces and bare feet, with a skinned fuzz mesh. Gold coats all body and facial surfaces. The Swag World hoodie embeds the user-supplied photograph with torso and sleeve UVs. The holiday extension adds mirrored Mog eyewear, a red VR headset, a Santa cap, a layered beard, four original-fin variations, and an ankle-length star robe that overrides legs while preserving the saved choice. Camo is a seamless rest-space runtime skin finish.'
}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
# Camera/view setup is scoped to the saved customization source.
from mathutils import Quaternion
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=Vector((0,0,1.55))
            area.spaces.active.region_3d.view_distance=5.0
            area.spaces.active.region_3d.view_rotation=Quaternion((.819, .574, .0, .0))
            area.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drifella-customizable.blend'))
print('DRIFMAKER_BUILT',json.dumps({'pieces':len(pieces),'clips':len(manifest['clips']),'path':str(OUT)}))
