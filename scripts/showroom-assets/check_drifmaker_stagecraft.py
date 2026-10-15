"""Validate new prop anchors/coin separation and render a focused contact sheet."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/kyl/Documents/art mtg');OUT=ROOT/'assets/models/drifmaker';QA=Path('/tmp/drifmaker-stagecraft-qa');QA.mkdir(exist_ok=True)
scene=bpy.context.scene;rig=bpy.data.objects['DrifellaRig'];collection=bpy.data.collections['DrifmakerLibrary'];manifest=json.loads((OUT/'manifest.json').read_text())
gear=['arcadegauntlet','wristcassette','gemcuffs','punchmitts','aegisbracer','potionstaff','foldingfan','stagemic','instantcam','handlantern'];hats=list(manifest['stagecraftSources'])
for id in gear:
 o=bpy.data.objects['Drif_Accessory_'+id];bones={o.vertex_groups[g.group].name for v in o.data.vertices for g in v.groups if g.weight>0}
 assert bones and bones<={'Hand.L','Hand.R','Forearm.L','Forearm.R'},(id,bones)
centers=[Vector(c) for c in manifest['coinShower']['centers']];assert len(centers)==64
assert all((a-b).length>.212 for i,a in enumerate(centers) for b in centers[i+1:])
# Ensure the claimed radius covers the actual detailed coin geometry, not only
# its nominal cylinder. All pieces share Chest weights and preserve this gap.
coin=bpy.data.objects['Drif_Extra_coinshower'];radius=max(min((v.co-c).length for c in centers) for v in coin.data.vertices)
assert radius<=.096,(radius,'coin escape sphere')
assert all(coin.vertex_groups[g.group].name=='Chest' for v in coin.data.vertices for g in v.groups if g.weight>0)
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=480;scene.render.resolution_y=520;scene.render.resolution_percentage=100
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=3.7
scene.camera.location=(2.7,-7,2.25);scene.camera.rotation_euler=(Vector((0,0,1.6))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.image_settings.file_format='PNG'
def look(id,category,pose='Neutral'):
 names={'Drif_Body','Drif_Head_original','Drif_Eyes_classic','Drif_Mouth_original','Drif_Nose_original','Drif_Ears_original','Drif_Brows_original','Drif_Shirt_original','Drif_Legs_original'}
 if category=='Shirt':names.discard('Drif_Shirt_original')
 if category:names.add('Drif_'+category+'_'+id)
 for o in collection.objects:
  if o.type=='MESH':o.hide_render=o.name not in names;o.hide_set(o.hide_render)
 rig.animation_data.action=bpy.data.actions[pose];scene.frame_set(61 if pose.startswith('Pose_') else 1)
 scene.render.filepath=str(QA/(id+'.png'));bpy.ops.render.render(write_still=True)
for id in hats:look(id,'Hat')
for id in ['hardcoretechno','seedoilfree','ainsliejersey']:look(id,'Shirt')
for id in gear:look(id,'Accessory','Pose_welcome')
for id in ['neondoor','confettiburst','solareclipse','ribbonvortex','coinshower']:look(id,'Extra')
for id in manifest['poses'][-8:]:look(id,None,'Pose_'+id)
validation={'handProps':gear,'hats':hats,'coinCount':len(centers),'actualCoinRadius':radius,'minimumGap':manifest['coinShower']['minimumClearance']}
for path in [QA/'validation.json',OUT/'stagecraft-validation.json']:path.write_text(json.dumps(validation,indent=2))
print('STAGECRAFT_QA_COMPLETE',radius)
