import bpy,json,math
from pathlib import Path
from mathutils import Vector
out=Path('/Users/kyl/Documents/art mtg/assets/models/showroom-character');scene=bpy.context.scene;rig=bpy.data.objects['BlueFinRig'];body=bpy.data.objects['BlueFinCharacterMesh'];report={}
for name in ['Neutral','Walk','Hold_Right','Walk_Hold_Right']:
    rig.animation_data.action=bpy.data.actions[name];length=30 if name.startswith('Walk') else 60
    ranges=[]
    for f in range(1,length+2):
        scene.frame_set(f);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(dg);me=evaluated.to_mesh()
        points=[evaluated.matrix_world@v.co for v in me.vertices]
        assert all(math.isfinite(v) for p in points for v in p)
        ranges.append(min(p.z for p in points));evaluated.to_mesh_clear()
    scene.frame_set(1);bpy.context.view_layer.update();start=[p.matrix.copy() for p in rig.pose.bones]
    scene.frame_set(length+1);bpy.context.view_layer.update();loop=max(abs(a[i][j]-p.matrix[i][j]) for a,p in zip(start,rig.pose.bones) for i in range(4) for j in range(4))
    report[name]={'minGround':min(ranges),'maxGround':max(ranges),'loopError':loop,'rightHand':list(rig.pose.bones['Hand.R'].head)}
    assert loop<.0001
(out/'animation-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
scene.camera.location=(-3,-6,2.7);scene.camera.rotation_euler=(Vector((0,0,1.40))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
rig.animation_data.action=bpy.data.actions['Walk_Hold_Right'];scene.frame_set(8);scene.render.filepath=str(out/'preview-walk-hold.png');bpy.ops.render.render(write_still=True)
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1);scene.camera.location=(2.5,-6,2.65);scene.camera.rotation_euler=(Vector((0,0,1.40))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/'preview-neutral.png');bpy.ops.render.render(write_still=True)
print('ANIMATION_CHECKS_AND_PREVIEWS_COMPLETE')
