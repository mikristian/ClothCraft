"""Render architecture without the preview avatar. This does not alter saved Blender source."""
import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'gallery-studio-01-v3-REVIEW.blend'))
s=bpy.context.scene
preview=bpy.data.collections.get('90 · PREVIEW ONLY · mannequin & placeholder tee')
assert preview
preview.hide_render=True
s.render.resolution_percentage=85
s.cycles.samples=28
for name,camera in [('hero','CAMERA / 01 editorial three-quarter'),('front','CAMERA / 02 straight-on catalog')]:
    s.camera=bpy.data.objects[camera]
    s.render.filepath=os.path.join(ROOT,f'gallery-studio-01-v3-EMPTY-{name}.png')
    bpy.ops.render.render(write_still=True)
print('EMPTY_PREVIEW_RENDERED')
