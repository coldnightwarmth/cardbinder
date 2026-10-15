"""Validate new bind weights, every animation frame's bone transforms and posed surfaces."""
import bpy,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'assets/models/drifmaker';catalog=json.loads((ROOT/'scripts/showroom-assets/minote-catalog.json').read_text());rig=bpy.data.objects['DrifellaRig'];scene=bpy.context.scene;meshes=[o for o in bpy.data.collections['DrifmakerLibrary'].objects if o.type=='MESH'];new=[o for o in meshes if len(o.name.split('_'))>2 and o.name.split('_')[2].startswith('mn')]
assert len(meshes)==644 and len(new)==108
bones={b.name for b in rig.data.bones};assert len(bones)==19
for obj in new:
 obj.hide_set(False)
 for v in obj.data.vertices:
  assert v.groups and len(v.groups)<=4
  assert abs(sum(g.weight for g in v.groups)-1)<1e-5
  assert all(obj.vertex_groups[g.group].name in bones for g in v.groups)
 if obj.name.startswith('Drif_Accessory_'):assert all(obj.vertex_groups[g.group].name=='Chest' for v in obj.data.vertices for g in v.groups)
report={'skinnedParts':644,'newParts':108,'bones':19,'normalizedWeights':True,'newGearChestOnly':True,'actions':{},'newPoseSurfaces':{}}
for action in bpy.data.actions:
 rig.animation_data.action=action;frames=range(int(action.frame_range[0]),int(action.frame_range[1])+1)
 for frame in frames:
  scene.frame_set(frame);bpy.context.view_layer.update()
  assert all(math.isfinite(v) for bone in rig.pose.bones for row in bone.matrix for v in row),(action.name,frame)
 report['actions'][action.name]={'finiteBoneFrames':len(frames)}
 if action.name.startswith('Pose_mn'):
  ends=[]
  for frame in [1,20,45,61]:
   scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();lo=[float('inf')]*3;hi=[float('-inf')]*3
   for obj in new:
    evaluated=obj.evaluated_get(deps);data=evaluated.to_mesh()
    for v in data.vertices:
     for axis in range(3):assert math.isfinite(v.co[axis]);lo[axis]=min(lo[axis],v.co[axis]);hi[axis]=max(hi[axis],v.co[axis])
    evaluated.to_mesh_clear()
   if frame in [45,61]:ends.append([tuple(v for row in bone.matrix for v in row) for bone in rig.pose.bones])
  assert ends[0]==ends[1],action.name+' does not hold'
  report['newPoseSurfaces'][action.name]={'sampledFrames':[1,20,45,61],'finiteSurfaces':True,'heldEndpoint':True,'bounds':lo+hi}
assert len(report['newPoseSurfaces'])==9
(out/'minote-validation.json').write_text(json.dumps(report,indent=2));print('MINOTE_VALIDATED',len(report['actions']),sum(v['finiteBoneFrames'] for v in report['actions'].values()),flush=True)
