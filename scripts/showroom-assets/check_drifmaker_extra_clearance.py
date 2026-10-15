"""Compare extra/body intersections in Blender against an earlier wardrobe file.

Set DRIFMAKER_BASELINE to a .blend snapshot path before executing through the
bridge. The report counts mesh-pair surface intersections, not hidden/occluded
pixels. It covers the classic wardrobe at neutral and ten held pose endpoints.
"""
import bpy,json
from mathutils.bvhtree import BVHTree
from pathlib import Path
scene=bpy.context.scene;rig=bpy.data.objects['DrifellaRig'];collection=bpy.data.collections['DrifmakerLibrary']
extras={obj.name:obj for obj in collection.objects if obj.name.startswith('Drif_Extra_')}
body_names=['Drif_Body','Drif_Head_original','Drif_Ears_original','Drif_Mouth_original','Drif_Shirt_original','Drif_Legs_original']
body=[bpy.data.objects[name] for name in body_names]
original_objects=set(bpy.data.objects);original_actions=set(bpy.data.actions);visibility={obj:obj.hide_get() for obj in collection.objects};saved_action=rig.animation_data.action;saved_frame=scene.frame_current
with bpy.data.libraries.load(str(DRIFMAKER_BASELINE),link=False) as (source,target):target.objects=list(extras)
old=dict(zip(extras,target.objects));tmp=bpy.data.collections.new('Drifmaker clearance check');scene.collection.children.link(tmp)
for obj in old.values():
 tmp.objects.link(obj);obj.parent=rig;obj.hide_set(False)
 for modifier in obj.modifiers:
  if modifier.type=='ARMATURE':modifier.object=rig
for obj in extras.values():obj.hide_set(False)
for obj in body:obj.hide_set(False)
def tree(obj,deps):
 evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
 result=BVHTree.FromPolygons([evaluated.matrix_world@v.co for v in mesh.vertices],[p.vertices[:] for p in mesh.polygons],all_triangles=False)
 evaluated.to_mesh_clear();return result
report={'method':'Surface-intersection pairs against classic body, head, fins, mouth, hoodie and legs at neutral and all 10 held pose endpoints. Occlusion is allowed; this is a clipping comparison, not a guarantee for every wardrobe combination.','poses':{},'byExtra':{name:{'before':0,'after':0} for name in extras}}
try:
 for action in ['Neutral']+['Pose_'+id for id in ['salute','tpose','bow','victory','think','point','summon','flex','welcome','heart']]:
  rig.animation_data.action=bpy.data.actions[action];scene.frame_set(1 if action=='Neutral' else 61);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();bodies=[tree(obj,deps) for obj in body];counts={'before':0,'after':0}
  for name in extras:
   for phase,objects in [('before',old),('after',extras)]:
    mesh=tree(objects[name],deps);n=sum(bool(mesh.overlap(b)) for b in bodies);counts[phase]+=n;report['byExtra'][name][phase]+=n
  report['poses'][action]=counts
 report['total']={phase:sum(value[phase] for value in report['poses'].values()) for phase in ['before','after']}
 Path('/Users/kyl/Documents/art mtg/assets/models/drifmaker/extra-clearance-validation.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report))
finally:
 for obj in list(bpy.data.objects):
  if obj not in original_objects:bpy.data.objects.remove(obj,do_unlink=True)
 bpy.data.collections.remove(tmp)
 for action in list(bpy.data.actions):
  if action not in original_actions and action.users==0:bpy.data.actions.remove(action)
 for obj,hidden in visibility.items():obj.hide_set(hidden)
 rig.animation_data.action=saved_action;scene.frame_set(saved_frame)
