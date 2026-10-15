"""Ten enter-and-hold actions on the unmodified 19-bone Drifella skeleton.
Executed by build_drifmaker.py. Original locomotion actions are never edited.
"""
from mathutils import Quaternion, Matrix
POSE_IDS=['salute','tpose','bow','victory','think','point','summon','flex','welcome','heart']
for old_action in list(bpy.data.actions):
 if old_action.name.startswith('Pose_'):bpy.data.actions.remove(old_action,do_unlink=True)
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
neutral={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}

def pose_reset():
 for b in rig.pose.bones:
  b.location,b.rotation_quaternion,b.scale=[v.copy() for v in neutral[b.name]]
 bpy.context.view_layer.update()

def pose_turn(name,axis,degrees):
 b=rig.pose.bones[name];b.rotation_quaternion=b.rotation_quaternion @ Quaternion(Vector(axis),math.radians(degrees))
 bpy.context.view_layer.update()

def pose_aim(name,direction):
 b=rig.pose.bones[name];rest=b.bone.matrix_local.to_quaternion()
 q=(rest @ Vector((0,1,0))).rotation_difference(Vector(direction).normalized()) @ rest
 b.matrix=Matrix.LocRotScale(b.head.copy(),q,Vector((1,1,1)))
 bpy.context.view_layer.update()

def pose_arm(side,upper,fore,hand=None):
 pose_aim('UpperArm.'+side,upper);pose_aim('Forearm.'+side,fore)
 pose_aim('Hand.'+side,hand or fore)

def pose_target(kind):
 pose_reset()
 if kind=='tpose':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s,0,0),(s,0,0))
 elif kind=='salute':
  pose_arm('R',(-.75,-.18,.76),(0,-.43,.75),(.2,-.2,.45));pose_turn('Head',(0,0,1),-4)
 elif kind=='bow':
  pose_turn('Chest',(1,0,0),62);pose_turn('Head',(1,0,0),12)
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.16,.10,-1),(s*.03,-.12,-1))
 elif kind=='victory':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.7,0,.75),(s*.24,-.05,.9))
  pose_turn('Head',(1,0,0),-6)
 elif kind=='think':
  pose_arm('R',(-.32,-.35,-.25),(.35,-.12,.63),(.1,.02,.7));pose_turn('Head',(0,0,1),12)
 elif kind=='point':
  pose_arm('L',(.9,-.25,.2),(.9,-.25,.18));pose_turn('Head',(0,1,0),12)
 elif kind=='summon':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.55,-.65,-.1),(-s*.15,-.75,.35),(-s*.2,-.65,.2))
  pose_turn('Head',(1,0,0),8)
 elif kind=='flex':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s,0,.1),(-s*.12,-.06,1),(-s*.3,0,.6))
 elif kind=='welcome':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.8,-.1,-.3),(s*.5,-.6,.4),(s*.2,-.5,.4))
  pose_turn('Head',(1,0,0),-4)
 elif kind=='heart':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.25,-.7,-.25),(-s*.8,-.3,.4),(-s*.8,0,.45))
  pose_turn('Head',(1,0,0),6)
 return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}

for kind in POSE_IDS:
 name='Pose_'+kind
 old_action=bpy.data.actions.get(name)
 if old_action:bpy.data.actions.remove(old_action,do_unlink=True)
 rig.animation_data.action=None
 target=pose_target(kind)
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 # Small anticipation, smooth arrival, settling, then an exactly repeated end.
 for frame,t in [(1,0),(7,.025),(20,.38),(36,.90),(45,1),(61,1)]:
  for b in rig.pose.bones:
   a,q,sc=neutral[b.name];ta,tq,ts=target[b.name]
   b.location=a.lerp(ta,t);b.rotation_quaternion=q.slerp(tq,t);b.scale=sc.lerp(ts,t)
   if b.name=='Chest' and frame==7:b.rotation_quaternion @= Quaternion((1,0,0),math.radians(-3))
   for field in ['location','rotation_quaternion','scale']:b.keyframe_insert(field,frame=frame,group=b.name)
 action['drifmaker_pose']=kind;action['hold_frame']=45;action['duration_seconds']=2
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
print('POSE_ACTIONS_READY',POSE_IDS)
