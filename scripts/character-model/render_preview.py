import bpy
from pathlib import Path
from mathutils import Vector
out=Path('/Users/kyl/Documents/art mtg/assets/models/showroom-character')
scene=bpy.context.scene;rig=bpy.data.objects['BlueFinRig']
rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
scene.camera.location=(2.5,-6,2.65);scene.camera.rotation_euler=(Vector((0,0,1.40))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(out/'preview-neutral.png');bpy.ops.render.render(write_still=True)
print('PREVIEW_DONE')
