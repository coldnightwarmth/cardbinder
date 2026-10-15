"""Thirty-nine enter-and-hold actions on the unmodified 19-bone Drifella skeleton.
Executed by build_drifmaker.py. Original locomotion actions are never edited.
"""
from mathutils import Quaternion, Matrix
POSE_IDS=['salute','tpose','bow','victory','think','point','summon','flex','welcome','heart','wave','dab','lunge','crane','airguitar','kneel','boxer','shrug','leanback','lookout','conductor','curtsey','fistbump','highfive','crossarms','powerpunch','balancekick','oath','present','micdrop','mnprayer','mncheekrest','mnshy','mnartistlean','mnangelspread','mnbehindback','mnlistening','mnstepturn','mnreverie']
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

def pose_lower(amount):
 # Bone locations use rest-local axes; lower in Blender world Z.
 b=rig.pose.bones['Pelvis']
 b.location+=b.bone.matrix_local.to_quaternion().inverted() @ Vector((0,0,-amount))
 bpy.context.view_layer.update()

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
 elif kind=='wave':
  pose_arm('R',(-.80,0,.50),(-.10,-.05,1),(-.25,-.04,.85));pose_turn('Head',(0,1,0),-8)
 elif kind=='dab':
  pose_arm('L',(.96,.05,.45),(.9,.05,.45));pose_arm('R',(-.4,-.35,.55),(.7,-.4,.3),(.8,0,.1));pose_turn('Head',(1,0,0),15);pose_turn('Chest',(0,1,0),-12)
 elif kind=='lunge':
  pose_lower(.07)
  pose_aim('Thigh.L',(.18,-.44,-.84));pose_aim('Shin.L',(.0,.36,-.93));pose_aim('Foot.L',(0,-1,0))
  pose_aim('Thigh.R',(-.23,.35,-.91));pose_aim('Shin.R',(0,-.15,-1));pose_aim('Foot.R',(0,-1,0))
  pose_arm('L',(.64,-.6,.24),(.6,-.75,.1));pose_arm('R',(-.55,.1,-.55),(.2,-.7,.2));pose_turn('Chest',(0,1,0),-12)
 elif kind=='crane':
  pose_aim('Thigh.L',(.18,-.8,-.15));pose_aim('Shin.L',(-.2,.25,-.9));pose_aim('Foot.L',(0,-.7,-.4))
  for side,sgn in [('R',-1),('L',1)]:pose_arm(side,(sgn*.95,0,.2),(sgn*.75,-.1,.55))
  pose_turn('Head',(0,0,1),-7)
 elif kind=='airguitar':
  pose_arm('L',(.72,-.45,-.2),(.72,-.48,.35),(.5,-.6,.2));pose_arm('R',(-.35,-.4,-.6),(.7,-.5,.1),(.6,-.4,-.1))
  pose_turn('Chest',(0,1,0),12);pose_turn('Head',(0,0,1),12)
 elif kind=='kneel':
  pose_lower(.17)
  pose_aim('Thigh.R',(-.15,-.4,-.8));pose_aim('Shin.R',(0,.8,-.3));pose_aim('Foot.R',(0,0,-1))
  pose_aim('Thigh.L',(.1,-.8,-.2));pose_aim('Shin.L',(0,0,-1));pose_aim('Foot.L',(0,-1,0))
  pose_arm('L',(.2,-.4,-.8),(-.1,-.45,-.65));pose_arm('R',(-.25,-.35,-.65),(.2,-.7,.25));pose_turn('Head',(1,0,0),9)
 elif kind=='boxer':
  pose_arm('R',(-.45,-.55,-.25),(.18,-.45,.9),(.05,-.2,.9));pose_arm('L',(.45,-.65,-.1),(-.25,-.35,.9),(-.1,-.15,.8));pose_turn('Chest',(0,1,0),-10)
 elif kind=='shrug':
  for side,sgn in [('R',-1),('L',1)]:pose_arm(side,(sgn*.6,-.1,-.4),(sgn*.2,-.3,.9),(sgn*.6,-.2,.1))
  pose_turn('Head',(0,0,1),14)
 elif kind=='leanback':
  pose_turn('Chest',(1,0,0),-17);pose_turn('Head',(1,0,0),-12)
  for side,sgn in [('R',-1),('L',1)]:pose_arm(side,(sgn*.65,.35,-.55),(sgn*.3,.1,-.8))
  pose_aim('Thigh.L',(.2,-.15,-1));pose_aim('Thigh.R',(-.2,-.15,-1))
 elif kind=='lookout':
  pose_arm('L',(.75,-.1,.55),(-.3,-.55,.75),(-.7,-.15,.2));pose_turn('Head',(0,1,0),-18);pose_turn('Chest',(1,0,0),8)
 elif kind=='conductor':
  pose_arm('R',(-.55,-.5,.4),(.15,-.5,.8),(.3,-.4,.6));pose_arm('L',(.6,-.55,-.2),(.3,-.65,.4),(.1,-.6,.3));pose_turn('Head',(0,0,1),-7)
 elif kind=='curtsey':
  pose_lower(.05)
  pose_aim('Thigh.L',(-.12,-.15,-1));pose_aim('Shin.L',(.25,.2,-1));pose_aim('Thigh.R',(-.25,0,-1));pose_aim('Shin.R',(.15,.2,-1))
  for side,sgn in [('R',-1),('L',1)]:pose_arm(side,(sgn*.75,-.05,-.5),(sgn*.2,-.15,-.85))
  pose_turn('Chest',(1,0,0),12);pose_turn('Head',(1,0,0),9)
 elif kind=='fistbump':
  pose_arm('R',(-.3,-.85,-.18),(.05,-1,.10));pose_turn('Chest',(0,1,0),-8);pose_turn('Head',(0,0,1),-6)
 elif kind=='highfive':
  pose_arm('L',(.6,-.15,.75),(-.05,-.25,1),(.12,-.50,.8));pose_turn('Chest',(0,0,1),-7)
 elif kind=='crossarms':
  pose_arm('R',(-.23,-.7,-.4),(.88,-.2,.25));pose_arm('L',(.27,-.75,-.2),(-.85,-.18,.1));pose_turn('Head',(1,0,0),-7)
 elif kind=='powerpunch':
  pose_lower(.04);pose_arm('R',(-.05,-1,.15),(.05,-1,.05));pose_arm('L',(.45,.15,-.5),(-.2,-.6,.6));pose_turn('Chest',(0,1,0),-18)
  pose_aim('Thigh.R',(-.25,.2,-1));pose_aim('Thigh.L',(.2,-.3,-1))
 elif kind=='balancekick':
  pose_aim('Thigh.L',(.75,-.6,.20));pose_aim('Shin.L',(.7,-.65,.05));pose_aim('Foot.L',(0,-1,0));pose_arm('R',(-.8,.1,.2),(-.9,-.1,.3));pose_arm('L',(.45,-.4,-.2),(-.3,-.5,.7));pose_turn('Chest',(0,0,1),8)
 elif kind=='oath':
  pose_arm('R',(-.25,-.6,-.45),(.65,-.25,.65));pose_arm('L',(.25,0,-1),(.12,-.1,-1));pose_turn('Head',(1,0,0),11)
 elif kind=='present':
  pose_arm('L',(.65,-.4,-.25),(.7,-.5,.30),(.75,-.35,.1));pose_arm('R',(-.3,.1,-1),(-.1,.2,-1));pose_turn('Head',(0,1,0),-12)
 elif kind=='micdrop':
  pose_arm('R',(-.9,-.3,-.05),(-.95,-.3,-.05),(-.5,-.2,-.7));pose_arm('L',(.4,.1,-.75),(-.3,.1,-.5));pose_turn('Chest',(0,0,1),8);pose_turn('Head',(1,0,0),14)
 elif kind=='mnprayer':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.10,-.55,-.45),(-s*.72,-.36,.65),(-s*.15,0,.9))
  pose_turn('Head',(1,0,0),12)
 elif kind=='mncheekrest':
  pose_arm('L',(.4,-.35,-.2),(-.1,-.36,.9),(-.1,0,.8));pose_turn('Head',(0,0,1),-12)
 elif kind=='mnshy':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.18,-.30,-1),(-s*.5,-.65,-.3))
  pose_turn('Head',(1,0,0),14);pose_turn('Head',(0,1,0),-10)
 elif kind=='mnartistlean':
  pose_turn('Chest',(0,0,1),-11);pose_arm('L',(.65,-.2,-.5),(-.2,-.65,.55));pose_turn('Head',(0,0,1),9)
 elif kind=='mnangelspread':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.85,.05,.4),(s*.7,-.25,.3))
  pose_turn('Head',(1,0,0),-9)
 elif kind=='mnbehindback':
  for side,s in [('R',-1),('L',1)]:pose_arm(side,(s*.3,.3,-.85),(-s*.4,.85,-.2))
  pose_turn('Chest',(1,0,0),7);pose_turn('Head',(0,0,1),-10)
 elif kind=='mnlistening':
  pose_arm('R',(-.7,0,.3),(.05,-.28,1),(.2,-.1,.8));pose_turn('Head',(0,1,0),16)
 elif kind=='mnstepturn':
  pose_aim('Thigh.L',(.15,-.35,-.9));pose_aim('Shin.L',(0,.2,-1));pose_turn('Chest',(0,1,0),18);pose_turn('Head',(0,1,0),-10)
  pose_arm('L',(.5,-.25,-.7),(.3,-.6,-.5));pose_arm('R',(-.3,.15,-.9),(-.15,.4,-.8))
 elif kind=='mnreverie':
  pose_turn('Head',(1,0,0),-14);pose_turn('Head',(0,0,1),7);pose_arm('L',(.4,-.2,-.65),(-.6,-.45,.6));pose_arm('R',(-.3,.05,-1),(-.1,-.35,-.9))
 return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}

for kind in POSE_IDS:
 name='Pose_'+kind
 old_action=bpy.data.actions.get(name)
 if old_action:bpy.data.actions.remove(old_action,do_unlink=True)
 rig.animation_data.action=None
 target=pose_target(kind)
 # New emotes have a deliberate passing gesture before reaching their held pose.
 waypoint=None
 if kind in ['wave','dab','lunge','crane','airguitar','kneel','boxer','shrug','leanback','lookout','conductor','curtsey','fistbump','highfive','crossarms','powerpunch','balancekick','oath','present','micdrop','mnprayer','mncheekrest','mnshy','mnartistlean','mnangelspread','mnbehindback','mnlistening','mnstepturn','mnreverie']:
  pose_target(kind)
  if kind in ['fistbump','powerpunch']:pose_arm('R',(-.5,-.25,-.2),(.15,-.25,.95))
  elif kind=='highfive':pose_arm('L',(.8,-.1,.1),(.1,-.4,.8))
  elif kind=='crossarms':pose_arm('L',(.8,-.3,-.4),(.5,-.3,-.2))
  elif kind=='balancekick':pose_aim('Shin.L',(-.2,.4,-1))
  elif kind=='oath':pose_turn('Head',(1,0,0),-16)
  elif kind=='present':pose_arm('L',(.3,-.7,-.4),(-.1,-.6,.6))
  elif kind=='micdrop':pose_arm('R',(-.3,-.6,.1),(.1,-.3,.95))
  elif kind=='wave':pose_arm('R',(-.7,0,.6),(.35,-.1,1),(.5,0,.8))
  elif kind=='dab':pose_arm('L',(.45,-.4,-.35),(-.5,-.5,.5))
  elif kind=='airguitar':pose_arm('R',(-.5,-.4,-.1),(.6,-.5,.7),(.5,-.3,.4))
  elif kind=='boxer':pose_arm('R',(-.25,-.8,.1),(.1,-1,.1))
  elif kind=='conductor':pose_arm('L',(.7,-.1,.6),(.15,-.3,.95))
  elif kind=='shrug':pose_turn('Head',(0,0,1),-23)
  elif kind=='lookout':pose_turn('Head',(0,1,0),32)
  else:pose_turn('Chest',(0,1,0),-12)
  waypoint={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 # Small anticipation, smooth arrival, settling, then an exactly repeated end.
 for frame,t in [(1,0),(7,.025),(20,.38),(36,.90),(45,1),(61,1)]:
  for b in rig.pose.bones:
   a,q,sc=neutral[b.name];ta,tq,ts=target[b.name]
   b.location=a.lerp(ta,t);b.rotation_quaternion=q.slerp(tq,t);b.scale=sc.lerp(ts,t)
   if waypoint and frame==20:b.location,b.rotation_quaternion,b.scale=[v.copy() for v in waypoint[b.name]]
   if b.name=='Chest' and frame==7:b.rotation_quaternion @= Quaternion((1,0,0),math.radians(-3))
   for field in ['location','rotation_quaternion','scale']:b.keyframe_insert(field,frame=frame,group=b.name)
 action['drifmaker_pose']=kind;action['hold_frame']=45;action['duration_seconds']=2
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
print('POSE_ACTIONS_READY',POSE_IDS)
