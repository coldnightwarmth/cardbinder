import bpy
from mathutils import Vector
scene=bpy.context.scene;rig=bpy.data.objects['BlueFinRig'];rig.animation_data.action=bpy.data.actions['Neutral'];scene.frame_set(1)
scene.camera.location=(5,-1.6,2.4);scene.camera.rotation_euler=(Vector((0,0,1.40))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath='/Users/kyl/Documents/art mtg/assets/models/showroom-character/preview-side.png';bpy.ops.render.render(write_still=True)
print('SIDE_PREVIEW_COMPLETE')
