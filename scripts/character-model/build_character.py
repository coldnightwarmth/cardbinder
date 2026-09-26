"""Build the low-poly blue fin character, deformation rig, and four GLB clips.
Run inside Blender through the local MCP bridge. Does not change the website.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
ROOT=Path('/Users/kyl/Documents/art mtg')
OUT=ROOT/'assets/models/showroom-character'
OUT.mkdir(parents=True,exist_ok=True)
# Preserve unrelated content: only replace this generator's named collection.
old=bpy.data.collections.get('BlueFinCharacter')
if old:
    for obj in list(old.objects): bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.collections.remove(old)
collection=bpy.data.collections.new('BlueFinCharacter');bpy.context.scene.collection.children.link(collection)
parts=[]
def move_collection(obj):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)

def material(name,color,rough=.65):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    return m
blue=material('Azure blue',(.012,.11,.82),.4)
cream=material('Warm ivory fins and muzzle',(.93,.76,.66),.68)
white=material('White tips and eye glints',(.97,.97,1),.4)
black=material('Obsidian eyes',(.008,.006,.009),.2)
red=material('Crimson brows',(.62,.009,.016),.5)
mouth=material('Mouth inset',(.18,.018,.022),.72)
seam=material('Denim stitching',(.32,.19,.075),.85)
charcoal=material('Bag edge piping',(.025,.026,.031),.8)
metal=material('Bag hardware',(.15,.16,.18),.35)
atlas=bpy.data.images.load(str(OUT/'material-atlas.png'),check_existing=True)
atlas.pack()
def atlasmat(name):
    m=material(name,(.8,.8,.8),.88);bs=m.node_tree.nodes.get('Principled BSDF')
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Linear'
    m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);return m
fabric=atlasmat('Hoodie woven fabric');hoodie=atlasmat('Hoodie front artwork');denim=atlasmat('Denim weave');bagmat=atlasmat('Black woven bag')
# All regions are sampled from the supplied sheet, without modifying it.
W,H=atlas.size
# Image is supplied at 1536 x 1024; coordinates below are relative to that layout.
def uvrect(rect,u,v):
    x0,y0,x1,y1=rect;return ((x0+(x1-x0)*u)/1536,1-(y1-(y1-y0)*v)/1024)
FAB=(1461,264,1494,382);DEN=(1464,891,1504,937);BAG=(1244,571,1392,615)
def uv_sample(obj,rect):
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        for i,li in enumerate(poly.loop_indices):
            u,v=[(0,0),(1,0),(1,1),(0,1)][i%4];layer.data[li].uv=uvrect(rect,u,v)
def bind(obj,weights):
    for vert in obj.data.vertices:
        values=weights(vert.co) if callable(weights) else {weights:1}
        total=sum(values.values())
        for name,value in values.items():
            if value<=0:continue
            group=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            group.add([vert.index],value/total,'REPLACE')
    parts.append(obj);return obj

def finish(obj,name,mat,weights,smooth=True,rect=None):
    obj.name=name;move_collection(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:p.use_smooth=smooth
    if rect:uv_sample(obj,rect)
    bind(obj,weights);obj.select_set(False);return obj

def ell(name,loc,scale,mat,bone,segments=20,rings=12,smooth=True,rect=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.scale=scale;return finish(o,name,mat,bone,smooth,rect)
def box(name,loc,scale,mat,bone,bevel=.04,rect=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft low-poly edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat,bone,False,rect)
def mesh(name,verts,faces,mat,bone,rect=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);collection.objects.link(obj);data.materials.append(mat)
    if not name.startswith(('Faceted fin','Angled eyebrow','Mouth opening','Tiny fang')):
        for polygon in data.polygons:polygon.use_smooth=True
    if rect:uv_sample(obj,rect)
    return bind(obj,bone)
def line(name,coords,radius,mat,bone):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=0;curve.resolution_u=1
    sp=curve.splines.new('POLY');sp.points.add(len(coords)-1)
    for pt,co in zip(sp.points,coords):pt.co=(*co,1)
    obj=bpy.data.objects.new(name,curve);collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH')
    obj=bpy.context.object;obj.data.materials.append(mat)
    if mat==fabric:uv_sample(obj,FAB)
    bind(obj,bone);obj.select_set(False);return obj

def vertical_rings(name,rings,mat,weights,sides=16,rect=None):
    vs=[]
    for z,rx,ry,cx,cy in rings:
        for j in range(sides):
            a=2*math.pi*j/sides;vs.append((cx+rx*math.cos(a),cy+ry*math.sin(a),z))
    faces=[]
    for i in range(len(rings)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+j for j in range(sides))])
    return mesh(name,vs,faces,mat,weights,rect)

def torso_weights(co):
    t=max(0,min(1,(co.z-.78)/.6));return {'Pelvis':1-t,'Chest':t}
torso=vertical_rings('Hoodie body',[(.75,.36,.225,0,0),(.81,.405,.245,0,0),(1.02,.39,.25,0,0),(1.29,.40,.235,0,0),(1.48,.35,.20,0,0),(1.56,.235,.16,0,0)],fabric,torso_weights,20,FAB)
torso.data.materials.append(hoodie)
uv=torso.data.uv_layers.active
for poly in torso.data.polygons:
    if poly.center.y<-.12:
        poly.material_index=1
        for li in poly.loop_indices:
            co=torso.data.vertices[torso.data.loops[li].vertex_index].co
            uv.data[li].uv=uvrect((1027,203,1209,448),max(0,min(1,(co.x+.4)/.8)),max(0,min(1,(co.z-.75)/.81)))
# Hem, hood, neckline and cords.
vertical_rings('Ribbed hoodie hem',[(.745,.37,.23,0,0),(.81,.397,.247,0,0)],fabric,'Pelvis',20,FAB)
ell('Hood folded behind neck',(0,.145,1.51),(.36,.265,.235),fabric,'Chest',20,10,True,FAB)
line('Hood neckline',[(-.22,-.13,1.55),(-.13,-.215,1.49),(0,-.23,1.475),(.13,-.215,1.49),(.22,-.13,1.55)],.025,fabric,'Chest')
for x in [-.10,.10]:
    line('Drawstring',[(x,-.227,1.47),(x*.86,-.25,1.37),(x*.9,-.263,1.27)],.012,fabric,'Chest')
# Neck and generously proportioned head.
ell('Blue neck',(0,0,1.58),(.18,.16,.18),blue,'Head',16,8)
head=ell('Head',(0,0,2.10),(.625,.50,.655),blue,'Head',28,18)
# Round out the cranium behind the face without burying the facial features.
for vertex in head.data.vertices:
    if vertex.co.y>0:vertex.co.y*=1.34
head.data.update()
# Angular cream fins, with sculpted ridge fans.
for side in [-1,1]:
    outline=[(.53,2.51),(.85,2.84),(.88,2.46),(1.00,2.25),(.85,2.09),(.84,1.72),(.54,1.87)]
    vs=[(side*x,-.06,z) for x,z in outline]+[(side*.71,-.245,2.25)]+[(side*x,.085,z) for x,z in outline]+[(side*.71,.16,2.25)]
    fs=[]
    for j in range(7):
        fs.append((7,j,(j+1)%7));fs.append((15,8+(j+1)%7,8+j));fs.append((j,8+j,8+(j+1)%7,(j+1)%7))
    # Sweep each fin 20 degrees backward around its attachment to the head.
    pivot=Vector((side*.53,0,2.25));turn=Matrix.Rotation(math.radians(side*20),3,'Z')
    vs=[tuple(pivot+turn@(Vector(v)-pivot)) for v in vs]
    obj=mesh('Faceted fin '+str(side),vs,fs,cream,'Head')
    if side==-1:
        for poly in obj.data.polygons:poly.flip()
# Eye sockets/glints and eyebrow shapes sit on the front of the head.
for side in [-1,1]:
    ell('Glossy eye '+str(side),(side*.302,-.425,2.17),(.182,.102,.255),black,'Head',20,14,True)
    ell('Eye reflection '+str(side),(side*.285,-.519,2.26),(.069,.020,.094),white,'Head',14,10,True)
    vs=[(side*.13,-.491,2.30),(side*.365,-.448,2.57),(side*.44,-.42,2.56),(side*.405,-.45,2.46)]
    mesh('Angled eyebrow '+str(side),vs,[(0,1,2,3)],red,'Head')
    for a,b in [((.39,2.035),(.455,2.01)),((.423,2.068),(.426,1.992))]:
        line('Red eye mark',[(side*a[0],-.478,a[1]),(side*b[0],-.475,b[1])],.013,red,'Head')
ell('Muzzle',(0,-.452,1.899),(.432,.205,.223),cream,'Head',24,12)
# Small mouth patch, teeth and nostrils are deliberately geometry, not decals.
mesh('Mouth opening',[(-.109,-.638,1.79),(0,-.659,1.836),(.109,-.638,1.79),(0,-.638,1.77)],[(0,1,2,3)],mouth,'Head')
for s in [-1,1]:
    mesh('Tiny fang',[(s*.053,-.654,1.809),(s*.085,-.649,1.799),(s*.071,-.658,1.774)],[(0,1,2)],white,'Head')
    ell('Nostril',(s*.125,-.641,1.96),(.012,.009,.023),black,'Head',8,6)
ell('Forehead pearl',(0,-.411,2.548),(.068,.045,.07),white,'Head',12,8,True)
# Arms in a T rest pose. Sleeve rings provide actual elbow deformation loops.
for s,label in [(-1,'R'),(1,'L')]:
    def armweights(co,s=s,label=label):
        x=abs(co.x);t=max(0,min(1,(x-.73)/.20));return {'UpperArm.'+label:1-t,'Forearm.'+label:t}
    vs=[];rings=[(.32,.14),(.44,.19),(.62,.185),(.76,.17),(.84,.165),(.93,.16),(1.08,.155),(1.13,.145)]
    n=12
    for x,r in rings:
        for j in range(n):
            a=2*math.pi*j/n;vs.append((s*x,math.cos(a)*r,1.465+math.sin(a)*r))
    faces=[]
    for i in range(len(rings)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces+=[tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))]
    sleeve=mesh('Hoodie sleeve.'+label,vs,faces,fabric,armweights,FAB)
    if s==1:
        for p in sleeve.data.polygons:p.flip()
    ell('Blue mitten.'+label,(s*1.21,0,1.465),(.16,.12,.12),blue,'Hand.'+label,16,10)
    ell('White mitten tip.'+label,(s*1.32,-.004,1.465),(.066,.10,.10),white,'Hand.'+label,12,8)
    ell('Mitten thumb.'+label,(s*1.21,-.093,1.41),(.065,.061,.064),blue,'Hand.'+label,12,8)
# Shorts / legs, denim cuffs, back pockets, small warm feet.
vertical_rings('Denim waist',[(.61,.35,.215,0,0),(.80,.35,.215,0,0)],denim,'Pelvis',16,DEN)
for s,label in [(-1,'R'),(1,'L')]:
    x=s*.215
    def legweights(co,label=label):
        t=max(0,min(1,(co.z-.35)/.20));return {'Thigh.'+label:t,'Shin.'+label:1-t}
    vertical_rings('Shorts leg.'+label,[(.255,.185,.20,x,0),(.31,.193,.21,x,0),(.40,.20,.211,x,0),(.52,.195,.218,x,0),(.68,.187,.215,x,0)],denim,legweights,12,DEN)
    vertical_rings('Rolled denim cuff.'+label,[(.25,.191,.209,x,0),(.305,.203,.22,x,0)],denim,'Shin.'+label,12,(378,765,440,797))
    ell('Blue ankle.'+label,(x,0,.23),(.14,.145,.12),blue,'Shin.'+label,12,8)
    ell('Ivory foot.'+label,(x,-.09,.125),(.182,.265,.125),cream,'Foot.'+label,16,8)
# Tail points behind the body; tip and base follow a two-bone chain.
def tailweights(co):
    t=max(0,min(1,(co.y-.46)/.32));return {'Tail':1-t,'TailTip':t}
# Curved tapered tail made from aligned cross-sections.
centers=[((0,.16,.66),.12),((0,.32,.64),.17),((0,.50,.68),.19),((0,.67,.78),.18),((0,.82,.90),.14),((0,.95,1.04),.025)]
vs=[];n=12
for (cx,cy,cz),r in centers:
    for j in range(n):
        a=j*math.tau/n;vs.append((cx+math.cos(a)*r,cy-math.sin(a)*r*.65,cz+math.sin(a)*r*.7))
fs=[]
for i in range(len(centers)-1):
    for j in range(n):fs.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
fs.extend([tuple(reversed(range(n))),tuple((len(centers)-1)*n+j for j in range(n))])
tail=mesh('Blue tail with white tip',vs,fs,blue,tailweights);tail.data.materials.append(white)
for p in tail.data.polygons:
    if p.center.y>.77:p.material_index=1
# Bag sits behind the left hip, still facing mostly outward. Arms remain symmetric.
line('Crossbody strap front',[(-.31,-.145,1.535),(-.23,-.238,1.44),(-.02,-.273,1.26),(.19,-.216,1.13),(.36,-.07,1.10),(.41,.17,1.11)],.034,charcoal,torso_weights)
line('Crossbody strap back',[(-.31,.145,1.535),(-.21,.24,1.42),(.02,.263,1.25),(.27,.28,1.10),(.39,.33,1.11)],.034,charcoal,torso_weights)
bag_parts_start=len(parts)
box('Crossbody bag',(.355,-.30,1.025),(.34,.155,.37),bagmat,'Pelvis',.055,BAG)
box('Bag flap',(.355,-.389,1.115),(.34,.035,.17),bagmat,'Pelvis',.032,BAG)
box('Bag latch',(.355,-.414,1.049),(.069,.024,.064),metal,'Pelvis',.008)
line('Bag lower piping',[(.21,-.377,.91),(.25,-.397,.87),(.45,-.397,.87),(.50,-.377,.91)],.008,charcoal,'Pelvis')
bag_origin=Vector((.355,-.30,1.025));bag_position=Vector((.38,.245,1.005))
bag_turn=Matrix.Rotation(math.radians(100),3,'Z') @ Matrix.Rotation(math.radians(-6),3,'Y')
for part in parts[bag_parts_start:]:
    for vertex in part.data.vertices:vertex.co=bag_position+bag_turn@(vertex.co-bag_origin)
    part.data.update()
# Deformation skeleton: right is character-right (viewer-left).
arm=bpy.data.armatures.new('BlueFinSkeleton');rig=bpy.data.objects.new('BlueFinRig',arm);collection.objects.link(rig);rig.show_in_front=True
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec={}
def bone(name,head,tail,parent=None):
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
    spec[name]=(Vector(head),Vector(tail),parent);return b
bone('Root',(0,0,0),(0,0,.25))
bone('Pelvis',(0,0,.68),(0,0,.98),'Root')
bone('Chest',(0,0,.98),(0,0,1.49),'Pelvis')
bone('Head',(0,0,1.49),(0,0,2.30),'Chest')
for s,label in [(-1,'R'),(1,'L')]:
    bone('UpperArm.'+label,(s*.35,0,1.465),(s*.79,0,1.465),'Chest')
    bone('Forearm.'+label,(s*.79,0,1.465),(s*1.115,0,1.465),'UpperArm.'+label)
    bone('Hand.'+label,(s*1.115,0,1.465),(s*1.35,0,1.465),'Forearm.'+label)
    bone('Thigh.'+label,(s*.215,0,.68),(s*.215,0,.405),'Pelvis')
    bone('Shin.'+label,(s*.215,0,.405),(s*.215,0,.17),'Thigh.'+label)
    bone('Foot.'+label,(s*.215,0,.17),(s*.215,-.24,.12),'Shin.'+label)
bone('Tail',(0,.17,.67),(0,.53,.70),'Pelvis');bone('TailTip',(0,.53,.70),(0,.95,1.04),'Tail')
bone('CardSocket.R',(-1.24,-.095,1.465),(-1.24,-.095,1.65),'Hand.R')
arm.edit_bones['CardSocket.R'].use_deform=False
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
# Join the character to one skinned mesh, preserving materials and vertex groups.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=torso;bpy.ops.object.join();body=bpy.context.object;body.name='BlueFinCharacterMesh'
modifier=body.modifiers.new('Weighted deformation','ARMATURE');modifier.object=rig;body.parent=rig
# Normalize all vertex weights and enforce a maximum of four influences.
bpy.ops.object.vertex_group_limit_total(limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False)
# Recalculate outside normals consistently, preserving faceted surfaces.
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
body.select_set(False)
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
# Absolute desired bone directions are converted into local pose rotations.
def aim(name,direction):
    pb=rig.pose.bones[name];rest=arm.bones[name].matrix_local.to_quaternion();head,tail,parent=spec[name]
    desired=(tail-head).rotation_difference(Vector(direction).normalized()) @ rest
    if pb.parent:
        parent_world=pb.parent.matrix.to_quaternion();parent_rest=pb.parent.bone.matrix_local.to_quaternion()
        pb.rotation_quaternion=(parent_world @ parent_rest.inverted() @ rest).inverted() @ desired
    else:pb.rotation_quaternion=rest.inverted() @ desired
    bpy.context.view_layer.update()
def axis_pose(name,angle,axis):
    rest=arm.bones[name].matrix_local.to_quaternion();rig.pose.bones[name].rotation_quaternion=rest.inverted() @ Quaternion(axis,angle) @ rest

fps=30;scene=bpy.context.scene;scene.render.fps=fps
clips=[('Neutral',60,False,False),('Walk',30,True,False),('Hold_Right',60,False,True),('Walk_Hold_Right',30,True,True)]
for oldaction in list(bpy.data.actions):
    if oldaction.name in [c[0] for c in clips]:bpy.data.actions.remove(oldaction)
for name,length,walk,hold in clips:
    action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
    for frame in range(1,length+2):
        phase=(frame-1)/length*math.tau;scene.frame_set(frame)
        for pb in rig.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
        sway=math.sin(phase)
        rig.pose.bones['Chest'].location.y=0 if walk else .004*math.sin(phase)
        axis_pose('Chest',(.027*sway if walk else .012*sway),(0,0,1))
        axis_pose('Head',(-.021*sway if walk else .009*sway),(0,0,1))
        axis_pose('Tail',.12*sway,(0,0,1));axis_pose('TailTip',.10*math.sin(phase-.5),(1,0,0))
        bpy.context.view_layer.update()
        for s,label in [(-1,'R'),(1,'L')]:
            swing=(math.sin(phase+(math.pi if s==1 else 0))*.40) if walk else 0
            # Positive rotation around X swings the leg forward (-Y).
            axis_pose('Thigh.'+label,-swing,(1,0,0))
            knee=max(0,-math.sin(phase+(math.pi if s==1 else 0)))*.5 if walk else 0
            axis_pose('Shin.'+label,knee,(1,0,0));axis_pose('Foot.'+label,swing-knee,(1,0,0))
            if hold and label=='R':
                aim('UpperArm.R',(-.20,-.23,-.33))
                aim('Forearm.R',(-.02,-.32,.055))
                aim('Hand.R',(-.02,-.22,.035))
            else:
                aim('UpperArm.'+label,(s*.17,swing*.42,-.42))
                aim('Forearm.'+label,(s*.04,-.035+swing*.23,-.32))
                aim('Hand.'+label,(s*.02,-.02+swing*.12,-.23))
        bpy.context.view_layer.update()
        if walk:
            # Keep the supporting foot on the floor through the whole cycle.
            evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());temp=evaluated.to_mesh()
            lowest=min((evaluated.matrix_world @ v.co).z for v in temp.vertices);evaluated.to_mesh_clear()
            rig.pose.bones['Root'].location.y-=lowest
            bpy.context.view_layer.update()
        for pb in rig.pose.bones:
            if pb.name=='CardSocket.R':continue
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
            if pb.name in ('Root','Chest'):pb.keyframe_insert('location',frame=frame,group=pb.name)
    rig.animation_data.action=None
    track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);strip.action_frame_start=1;strip.action_frame_end=length+1;track.mute=True
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_start=1;scene.frame_end=61;scene.frame_set(1)
# Non-exported studio for useful previews, separate from the character.
studio=bpy.data.collections.get('CharacterPreviewStudio')
if studio:
    for o in list(studio.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(studio)
studio=bpy.data.collections.new('CharacterPreviewStudio');scene.collection.children.link(studio)
# Hide default scene objects in previews only, without deleting them.
for obj in list(scene.objects):
    if obj.name not in collection.objects:
        obj.hide_render=True;obj.hide_set(True)
world=bpy.data.worlds.new('Character studio world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.075,.10,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01));ground=bpy.context.object;ground.name='Preview floor'
for c in list(ground.users_collection):c.objects.unlink(ground)
studio.objects.link(ground);ground.data.materials.append(material('Studio floor',(.085,.095,.12),.9))
def light(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(-3,-4,6),450,4);light('Fill',(3,-1,3),220,3);light('Rim',(0,3,4),500,3)
data=bpy.data.cameras.new('Character preview camera');cam=bpy.data.objects.new('Character preview camera',data);studio.objects.link(cam);cam.location=(3,-6,2.9);cam.rotation_euler=(Vector((0,0,1.40))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=3.65;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
# Save model before optional rendering; export only selected character objects.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
triangles=sum(len(p.vertices)-2 for p in body.data.polygons)
assert all(abs(sum(g.weight for g in v.groups)-1)<.001 for v in body.data.vertices),'Unnormalized weights'
assert max(len(v.groups) for v in body.data.vertices)<=4
rig['clips']='Neutral, Walk, Hold_Right, Walk_Hold_Right';rig['front_axis']='-Y';rig['card_attachment']='CardSocket.R';rig['reference']='User turnaround 2026-09-26';rig['triangle_count']=triangles
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blue-fin-character.blend'))
# Export Actions mode exports the four rig actions as individual clips.
bpy.ops.export_scene.gltf(filepath=str(OUT/'blue-fin-character.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_all_influences=False,export_skins=True,export_yup=True,export_force_sampling=True,export_def_bones=False)
(OUT/'model-info.json').write_text(json.dumps({'triangles':triangles,'vertices':len(body.data.vertices),'bones':len(arm.bones),'clips':[{'name':n,'seconds':l/fps} for n,l,_,_ in clips],'cardSocket':'CardSocket.R','sourceFront':'-Y','exportUp':'+Y','maxWeightsPerVertex':max(len(v.groups) for v in body.data.vertices)},indent=2))
# Present the model in the connected Blender viewport.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=4.5;area.spaces.active.region_3d.view_location=Vector((0,0,1.35));area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion();area.spaces.active.shading.type='MATERIAL'
print('CHARACTER_BUILT',triangles,'triangles',len(body.data.vertices),'vertices',len(arm.bones),'bones',flush=True)
