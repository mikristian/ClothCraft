"""Compare optimized GLB against Blender source using unchanged studio lights/camera.
Never modifies saved `.blend`; all scene replacement is transient.
"""
import bpy,os
from pathlib import Path
root=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(root/'EXO-STAGE01-V4-APPROVAL-CANDIDATE.blend'))
s=bpy.context.scene
actor=bpy.data.objects.get('PREVIEW FITTING MANNEQUIN - 1.75m BODY REFERENCE ONLY')
if actor:actor.hide_render=True
for name in ['01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers']:
    c=bpy.data.collections.get(name)
    if c:
        for ob in c.objects:ob.hide_render=True
path=root/'EXO-STAGE01-V4-STAGE-RUNTIME-OPTIMIZED-REVIEW.glb'
old=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(path))
new=list(set(bpy.data.objects)-old)
assert len([o for o in new if o.type=='MESH'])==23,len(new)
for o in new:
    if o.type=='MESH':
        o.hide_render=False
        o['originates']='V4 optimized render verification only'
s.camera=bpy.data.objects['REVIEW CAM 01 · room frontal']
s.render.resolution_percentage=66;s.cycles.samples=16
s.render.filepath=str(root/'EXO-STAGE01-V4-OPTIMIZED-VERIFY.png')
bpy.ops.render.render(write_still=True)
print('OPTIMIZED_VISUAL_VERIFY_SAVED')
