"""Author showroom locomotion on the existing rig through the Blender bridge."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
OUT=Path('/Users/kyl/Documents/art mtg/assets/models/showroom-character')
rig=bpy.data.objects['BlueFinRig'];body=bpy.data.objects['BlueFinCharacterMesh'];arm=rig.data;scene=bpy.context.scene
# Preserve original clips and all mesh/material/weight data.
for track in rig.animation_data.nla_tracks:track.mute=True
spec={b.name:(b.head_local.copy(),b.tail_local.copy(),b.parent.name if b.parent else None) for b in arm.bones}
def aim(name,direction):
    pb=rig.pose.bones[name];rest=arm.bones[name].matrix_local.to_quaternion();head,tail,parent=spec[name]
    desired=(tail-head).rotation_difference(Vector(direction).normalized()) @ rest
    if pb.parent:
        parent_world=pb.parent.matrix.to_quaternion();parent_rest=pb.parent.bone.matrix_local.to_quaternion()
        pb.rotation_quaternion=(parent_world @ parent_rest.inverted() @ rest).inverted() @ desired
    else:pb.rotation_quaternion=rest.inverted() @ desired
    bpy.context.view_layer.update()
def axis(name,angle,vector=(1,0,0)):
    rest=arm.bones[name].matrix_local.to_quaternion()
    rig.pose.bones[name].rotation_quaternion=rest.inverted() @ Quaternion(vector,angle) @ rest
def smooth(a,b,t):return a+(b-a)*t*t*(3-2*t)
# time, knee fold, torso lean, head counter-tilt, arm swing (forward/up), tail lift
jump_keys=[
 (0,0,0,0,0,0),(.12,.85,.32,-.17,-.38,-.12),
 (.20,.05,-.10,.08,1.05,.24),(.40,.72,-.08,.10,1.30,.34),
 (.57,.48,.04,-.03,.88,.16),(.79,.08,.14,-.10,.35,-.10),
 (.88,.95,.36,-.19,-.15,-.28),(1.02,.18,.09,-.06,.08,.13),(1.10,0,0,0,0,0)]
def jump_values(t):
    for a,b in zip(jump_keys,jump_keys[1:]):
        if t<=b[0]:
            u=max(0,min(1,(t-a[0])/(b[0]-a[0])))
            return [smooth(x,y,u) for x,y in zip(a[1:],b[1:])]
    return [0]*5
created=[]
for kind,length,walk in [('Crouch',60,False),('Crouch_Walk',40,True),('Jump',33,False)]:
 for hold in [False,True]:
    name=kind+('_Hold_Right' if hold else '')
    old=bpy.data.actions.get(name)
    if old:bpy.data.actions.remove(old)
    action=bpy.data.actions.new(name);action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(1,length+2):
        scene.frame_set(frame)
        for pb in rig.pose.bones:
            pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
        t=(frame-1)/30;phase=(frame-1)/length*math.tau
        if kind=='Jump':bend,lean,head,swing,tail=jump_values(t)
        else:bend=1.04;lean=.34+.012*math.sin(phase);head=-.18;swing=0;tail=.15
        axis('Pelvis',lean*.22);axis('Chest',lean*.78);axis('Head',head)
        axis('Tail',tail);axis('TailTip',-.55*tail)
        # Hips sit behind the feet, balancing the large head over the planted soles.
        rig.pose.bones['Root'].location.z=-.07*bend
        for side,label in [(-1,'R'),(1,'L')]:
            stride=math.sin(phase+(math.pi if side==1 else 0))*.18 if walk else 0
            axis('Thigh.'+label,-bend+stride-lean*.22)
            axis('Shin.'+label,2*bend+max(0,-stride)*.3)
            axis('Foot.'+label,-bend-stride-max(0,-stride)*.3)
            bpy.context.view_layer.update()
            if hold and label=='R':
                # Keep the card readable while the shoulder absorbs body motion.
                aim('UpperArm.R',(-.20,-.23-.10*max(0,swing),-.33+.10*max(0,swing)))
                aim('Forearm.R',(-.02,-.32,.055+.04*max(0,swing)))
                aim('Hand.R',(-.02,-.22,.035))
            else:
                arm_swing=swing if kind=='Jump' else -.08+stride*.6
                aim('UpperArm.'+label,(side*(.17+.09*max(0,swing)),-.42*math.sin(arm_swing),-.42*math.cos(arm_swing)))
                aim('Forearm.'+label,(side*.045,-.10-.25*math.sin(arm_swing),-.28*math.cos(arm_swing)))
                aim('Hand.'+label,(side*.02,-.05-.19*math.sin(arm_swing),-.20*math.cos(arm_swing)))
        bpy.context.view_layer.update()
        # Ground contact for crouch, anticipation, and landing; release the feet in flight.
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
        lowest=min((evaluated.matrix_world @ v.co).z for v in mesh.vertices);evaluated.to_mesh_clear()
        ground=1
        if kind=='Jump':
            if .14<t<.24:ground=1-(t-.14)/.10
            elif .24<=t<.72:ground=0
            elif .72<=t<.807:ground=(t-.72)/.087
        rig.pose.bones['Root'].location.y-=lowest*ground
        for pb in rig.pose.bones:
            if pb.name=='CardSocket.R':continue
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
            pb.keyframe_insert('location',frame=frame,group=pb.name)
    created.append(name)
rig.animation_data.action=bpy.data.actions['Crouch_Hold_Right'];scene.frame_set(1)
scene.frame_start=1;scene.frame_end=61
rig['clips']=', '.join(a.name for a in bpy.data.actions)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
# Read enum values on this Blender before using export options.
props=bpy.ops.export_scene.gltf.get_rna_type().properties
assert 'ACTIONS' in [i.identifier for i in props['export_animation_mode'].enum_items]
format_items=[i.identifier for i in props['export_format'].enum_items]
# Dynamic format enums are empty in this Blender; existing exporter default is GLB.
kwargs=dict(filepath=str(OUT/'blue-fin-character.glb'),use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_all_influences=False,export_skins=True,export_yup=True,export_force_sampling=True,export_def_bones=False)
if 'GLB' in format_items:kwargs['export_format']='GLB'
bpy.ops.export_scene.gltf(**kwargs)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blue-fin-character.blend'))
info=json.loads((OUT/'model-info.json').read_text())
info['clips']=[{'name':a.name,'seconds':(a.frame_range[1]-a.frame_range[0])/30} for a in bpy.data.actions]
info['locomotion']={'jumpSeconds':1.1,'takeoffSeconds':.14,'flightSeconds':2/3,'crouchBackLeanRadians':.34}
(OUT/'model-info.json').write_text(json.dumps(info,indent=2))
print('Created',created)
