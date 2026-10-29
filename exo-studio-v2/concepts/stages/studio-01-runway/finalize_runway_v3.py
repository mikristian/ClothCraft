"""Set initial editable Blender V3 scene to clean runway camera and hidden scale proxy."""
import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
path=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3.blend')
bpy.ops.wm.open_mainfile(filepath=path)
s=bpy.context.scene
ref=bpy.data.collections.get('90b SCALE REFERENCE ONLY / imported EXO body and proxy tee')
if ref:
    ref.hide_render=True
    ref.hide_viewport=True
cam=bpy.data.objects['CAMERA 02 / symmetrical stage']
s.camera=cam
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_extras=False
        area.spaces.active.shading.type='MATERIAL'
s['reviewDefaultCamera']='CAMERA 02 / symmetrical stage'
s['referenceActorVisibility']='hidden in view and render; can be enabled from Outliner'
s['stageApproval']='PENDING'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=path,compress=True)
print('FINALIZED_V3_BLEND',path,'stage_objects',sum(len(c.objects) for c in bpy.data.collections if not c.name.startswith('90')))
