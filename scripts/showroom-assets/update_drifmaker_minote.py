"""Incremental Mi Note rebuild. Run Blender -b the saved library --python this file.
Keeps preexisting meshes intact and regenerates only the mn-prefixed variants.
"""
import bpy,bmesh,json,math,ast,runpy
from pathlib import Path
from mathutils import Vector,Euler
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/models/drifmaker'
scene=bpy.context.scene;rig=bpy.data.objects['DrifellaRig'];source=bpy.data.objects['BlueFinCharacterMesh'];source_rig=bpy.data.objects['BlueFinRig'];collection=bpy.data.collections['DrifmakerLibrary'];pieces=[]
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
for o in list(collection.objects):
 if o.type=='MESH' and o.name.split('_')[2:3] and o.name.split('_')[2].startswith('mn'):bpy.data.objects.remove(o,do_unlink=True)
# Remove retired whole-artwork materials and packed source images as well.
for mat in list(bpy.data.materials):
 if mat.name.startswith('Drif_MiNote_Art_'):bpy.data.materials.remove(mat,do_unlink=True)
for image in list(bpy.data.images):
 if '/textures/minote/' in image.filepath.replace('\\','/'):
  bpy.data.images.remove(image,do_unlink=True)
def hydrate(file):
 tree=ast.parse((ROOT/'scripts/showroom-assets'/file).read_text())
 # Load only helper definitions and direct material declarations, never old builds.
 for n in tree.body:
  use=isinstance(n,ast.FunctionDef)
  if isinstance(n,ast.Assign) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Name) and n.value.func.id=='material':use=True
  if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SC_FIN_OUTLINE' for t in n.targets):use=True
  if use:exec(compile(ast.Module(body=[n],type_ignores=[]),file,'exec'),globals())
for f in ['build_drifmaker.py','extend_drifmaker_legs_mouth.py','extend_drifmaker_wardrobe.py','extend_drifmaker_sculpt_faces.py','extend_drifmaker_sculpt_wardrobe.py','extend_drifmaker_sculpt_ears_extra.py','extend_drifmaker_stagecraft.py']:hydrate(f)
exec(compile((ROOT/'scripts/showroom-assets/extend_drifmaker_minote.py').read_text(),'minote','exec'),globals())
for category,ids in MN_VARIANTS.items():
 for id in ids:
  prefix='Drif_'+category+'_'+id;members=[o for o in collection.objects if o.type=='MESH' and (o.name==prefix or o.name.startswith(prefix+'_'))];assert members,prefix
  bpy.ops.object.select_all(action='DESELECT')
  for o in members:o.hide_set(False);o.select_set(True)
  bpy.context.view_layer.objects.active=members[0];bpy.ops.object.join();members[0].name=prefix
pieces=[o for o in collection.objects if o.type=='MESH']
exec(compile((ROOT/'scripts/showroom-assets/animate_drifmaker_poses.py').read_text(),'poses','exec'),globals())
build=(ROOT/'scripts/showroom-assets/build_drifmaker.py').read_text();export=build[build.index("for obj in pieces:\n    if obj.data.uv_layers"):].split('EAR_COMPATIBLE_HEADS=',1)[0];exec(export,globals())
m=json.loads((OUT/'manifest.json').read_text());m['version']=13
keys={'Shirt':'shirts','Hat':'hats','Accessory':'accessories'}
for category,ids in MN_VARIANTS.items():
 key=keys.get(category,category.lower());m['categories'][key]=[v for v in m['categories'][key] if v not in ids]+ids
m['poses']=POSE_IDS;m['clips']=[{'name':a.name,'seconds':(a.frame_range[1]-a.frame_range[0])/30} for a in bpy.data.actions]
m['earCompatibleHeads']=list(dict.fromkeys(m.get('earCompatibleHeads',[])+MN_EAR_HEADS));m['legOverrideTops']=list(dict.fromkeys(m.get('legOverrideTops',[])+MN_FULLBODY))
m['parts']=[{'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in pieces]
m['minoteSource']='https://cards.art/minotecurator/';m['categories']['bodyStyles']=list(dict.fromkeys(m['categories'].get('bodyStyles',[])+[r['id'] for r in MN_CATALOG['bodyStyle']]))
(OUT/'manifest.json').write_text(json.dumps(m,indent=2))
names={'Drif_Body','Drif_Head_original','Drif_Eyes_classic','Drif_Mouth_original','Drif_Nose_original','Drif_Ears_original','Drif_Brows_original','Drif_Shirt_original','Drif_Legs_original','Drif_Accessory_original'}
for o in pieces:o.hide_set(o.name not in names);o.hide_render=o.name not in names
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drifella-customizable.blend'));print('MINOTE_BUILT',len(pieces),flush=True)
