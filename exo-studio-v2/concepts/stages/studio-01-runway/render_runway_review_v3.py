"""Render secondary V3 review angles with a cutaway roof for overview only."""
import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3.blend'))
s=bpy.context.scene
s.render.resolution_x=1440;s.render.resolution_y=960;s.render.resolution_percentage=75
s.cycles.samples=20
for key,camera in [('overview','CAMERA 03 / runway room wide'),('side','CAMERA 04 / outfit spatial side')]:
    s.camera=bpy.data.objects[camera]
    changed=[]
    if key=='overview':
        for obj in bpy.data.objects:
            if obj.name.startswith(('Overhead dark steel portal lintel','Acoustic overhead panel','Perimeter roof suspended beam')):
                changed.append((obj,obj.hide_render));obj.hide_render=True
    s.render.filepath=os.path.join(ROOT,f'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-{key}.png')
    bpy.ops.render.render(write_still=True)
    for obj,prev in changed:obj.hide_render=prev
print('EXO_RUNWAY_V3_SECONDARY_ANGLES_RENDERED')
