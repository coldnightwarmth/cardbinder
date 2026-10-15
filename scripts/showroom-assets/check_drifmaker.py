"""Validate wardrobe skinning and render collection-inspired looks in Blender."""
import bpy, json, math
import numpy as np
from collections import Counter
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/kyl/Documents/art mtg')
OUT=ROOT/'assets/models/drifmaker'
scene=bpy.context.scene
rig=bpy.data.objects['DrifellaRig']
meshes=[o for o in bpy.data.collections['DrifmakerLibrary'].objects if o.type=='MESH']
manifest=json.loads((OUT/'manifest.json').read_text())
assert len(meshes)==len(manifest['parts']), ('catalog mesh count',len(meshes))
for obj in meshes:
    obj.hide_set(False)
    for vertex in obj.data.vertices:
        assert vertex.groups, (obj.name,vertex.index,'unweighted')
        assert abs(sum(g.weight for g in vertex.groups)-1)<1e-5, (obj.name,vertex.index,'weights')
        assert len(vertex.groups)<=4
    assert any(m.type=='ARMATURE' and m.object==rig for m in obj.modifiers)

def position_key(vertex):
    return tuple(round(v,6) for v in vertex.co)
source=bpy.data.objects['BlueFinCharacterMesh']
original_names=['Drif_Body','Drif_Head_original','Drif_Eyes_classic','Drif_Shirt_original','Drif_Accessory_original','Drif_Legs_original','Drif_Mouth_original','Drif_Nose_original','Drif_Ears_original','Drif_Brows_original']
assert Counter(position_key(v) for v in source.data.vertices)==Counter(position_key(v) for name in original_names for v in bpy.data.objects[name].data.vertices)
report={'normalizedWeights':True,'maxInfluences':4,'originalGeometryPreserved':True,
        'boneCount':len(rig.data.bones),'skinnedObjectCount':len(meshes),'clips':{},'neutralBounds':{},
        'verification':'Every frame of all 20 actions evaluated for finite vertices; original ten-component union compared to original mesh; includes all alternate heads, extras and ghost fibers.'}
for action in bpy.data.actions:
    rig.animation_data.action=action
    frames=range(int(action.frame_range[0]),int(action.frame_range[1])+1)
    lower=np.full(3,np.inf)
    upper=np.full(3,-np.inf)
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        deps=bpy.context.evaluated_depsgraph_get()
        for obj in meshes:
            evaluated=obj.evaluated_get(deps)
            data=evaluated.to_mesh()
            positions=np.empty(len(data.vertices)*3,dtype=np.float32)
            data.vertices.foreach_get('co',positions)
            positions=positions.reshape((-1,3))
            world=np.array(evaluated.matrix_world,dtype=np.float32)
            positions=positions@world[:3,:3].T+world[:3,3]
            assert np.isfinite(positions).all(),(action.name,frame,obj.name)
            lo=positions.min(axis=0);hi=positions.max(axis=0)
            lower=np.minimum(lower,lo);upper=np.maximum(upper,hi)
            if action.name=='Neutral' and frame==1:
                report['neutralBounds'][obj.name]=np.concatenate([lo,hi]).tolist()
            evaluated.to_mesh_clear()
    report['clips'][action.name]={'frames':len(frames),'bounds':np.concatenate([lower,upper]).tolist(),'seconds':(action.frame_range[1]-action.frame_range[0])/30}
    print('Validated',action.name,len(frames),'frames')
(OUT/'animation-validation.json').write_text(json.dumps(report,indent=2))

def look(eyes,shirt,hat,accessory,action,frame,legs='original',mouth='original',head='original',extra='none',nose='original',ears='original',tattoo='none',brows='original'):
    names=['Drif_Body','Drif_Head_'+head,'Drif_Extra_'+extra,'Drif_Eyes_'+eyes,'Drif_Shirt_'+shirt,'Drif_Hat_'+hat,'Drif_Accessory_'+accessory,'Drif_Legs_'+legs,'Drif_Mouth_'+mouth,'Drif_Nose_'+nose,'Drif_Ears_'+ears,'Drif_Tattoo_'+tattoo,'Drif_Brows_'+brows]
    if head!='original':names=[n for n in names if not n.startswith(('Drif_Eyes_','Drif_Mouth_','Drif_Nose_','Drif_Ears_','Drif_Tattoo_','Drif_Brows_'))]
    for obj in meshes:
        visible=obj.name in names
        obj.hide_set(not visible)
        obj.hide_render=not visible
    rig.animation_data.action=bpy.data.actions[action]
    scene.frame_set(frame)
    bpy.context.view_layer.update()

# RENDER_PREVIEWS: the bridge may execute this section separately after validation.
scene.camera.location=(2.4,-7,2.9)
scene.camera.rotation_euler=(Vector((0,0,1.55))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=4.15
scene.render.resolution_x=800
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.cycles.samples=20
scene.render.image_settings.file_format='PNG'
for name,args in [
    ('preview-denim',('spiral','denim','cap','necklace','Neutral',1)),
    ('preview-bomber',('star','bomber','beanie','headphones','Walk_Hold_Right',8)),
    ('preview-party',('sleepy','original','party','backpack','Crouch_Hold_Right',1)),
    ('preview-expanded-royal',('buttons','armor','crown','medallion','Neutral',1,'boots','goldgrill')),
    ('preview-expanded-mage',('cyclops','cloak','wizard','wings','Crouch_Hold_Right',1,'striped','fangs')),
    ('preview-expanded-plush',('hearts','cloud','bunny','flower','Walk_Hold_Right',8,'plush','cat')),
    ('preview-expanded-street',('pixel','jersey','spinner','cassette','Neutral',1,'tech','braces')),
    ('preview-expanded-rain',('tears','raincoat','bucket','scarf','Walk_Hold_Right',8,'cargo','drool')),
    ('preview-expanded-bones',('dead','skeleton','horns','skateboard','Crouch_Hold_Right',1,'skeleton','skull')),
]:
    look(*args)
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
look('classic','bomber','party','backpack','Neutral',1)
scene.camera.location=(-2.4,7,2.8)
scene.camera.rotation_euler=(Vector((0,0,1.55))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'preview-backpack.png')
bpy.ops.render.render(write_still=True)
scene.camera.location=(2.4,-7,2.8)
scene.camera.rotation_euler=(Vector((0,0,1.55))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
look('classic','original','none','original','Neutral',1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'drifella-customizable.blend'))
print('DRIFMAKER_VALIDATION_COMPLETE',json.dumps({'clips':len(report['clips']),'totalFrames':sum(c['frames'] for c in report['clips'].values()),'skinnedObjects':len(meshes)}))
