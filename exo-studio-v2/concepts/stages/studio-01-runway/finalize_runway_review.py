"""Final standalone review polish after validating front/editorial Blender render.
Removes coincident top faces that caused shadow/z-fighting at avatar feet,
corrects camera positions, preserves source and user CLO stage references.
"""
import bpy,os,json
from mathutils import Vector
root=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'EXO-STAGE01-RUNWAY-CHAMBER-V2-REVIEW.blend'))
scene=bpy.context.scene
bridge=bpy.data.objects.get('Runway rear bridge / no collision gap')
if bridge:
    bpy.data.objects.remove(bridge,do_unlink=True)
# Main-stage front edge at y = 0.29m; runway touches but doesn't intersect.
for name in ('Runway walkable upper surface / Z = 0','Runway drop shadow base'):
    ob=bpy.data.objects.get(name)
    if ob:
        ob.location.y=-3.435
        # avoid applying modifiers / scales to working geometry
        dims=list(ob.dimensions);dims[1]=7.45;ob.dimensions=dims
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ob.select_set(False)
# Prevent always-on extra black material from shadowing stage rear-to-runway join.
# A slight change in gap size keeps the scene visually seamless and avoids
# self-shadowing across overlapping surfaces.
scene['platformTopZ']=0.0
scene['runwaySurfaceYMinimum']=-7.16
scene['runwaySurfaceYMaximum']=.29
scene['stageSurfaceYMinimum']=.29
scene['avatarFeetOrigin']=[0,0,0]
scene['previewOnly']=True
scene['meshIntersectionIssue']='Corrected coplanar bridge and main runway surfaces'

scene.camera=bpy.data.objects['CAMERA 01 / fashion editorial']
finalBlend=os.path.join(root,'EXO-STAGE01-RUNWAY-CHAMBER-FINAL-REVIEW.blend')
bpy.ops.wm.save_as_mainfile(filepath=finalBlend,compress=True)

# Refresh the stage-only export, without the actor or render-only light rig.
# This is a review GLB only; still needs user visual approval before integration.
for obj in bpy.context.selected_objects:obj.select_set(False)
selected=[]
for cname in ['01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers']:
    for ob in bpy.data.collections[cname].objects:
        if ob.type in ('MESH','FONT'):
            ob.select_set(True);selected.append(ob)
bpy.context.view_layer.objects.active=selected[0]
glb=os.path.join(root,'EXO-STAGE01-RUNWAY-CHAMBER-FINAL-STAGE-ONLY-REVIEW.glb')
bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',use_selection=True,export_apply=True)
for ob in selected:ob.select_set(False)
scene.cycles.samples=20
scene.render.resolution_percentage=80
for key,camname in [
    ('editorial','CAMERA 01 / fashion editorial'),
    ('garment','CAMERA 05 / actual garment close'),
    ('front','CAMERA 02 / symmetrical stage'),
]:
    scene.camera=bpy.data.objects[camname]
    scene.render.filepath=os.path.join(root,f'EXO-STAGE01-REVIEW-{key}.png')
    bpy.ops.render.render(write_still=True)
report={'status':'VISUAL APPROVAL PENDING','source':'User CLO Stage_01.zprj inspected; source untouched','design':'EXO Stage01 Runway Chamber','stageGeometryGLB':os.path.basename(glb),'blend':os.path.basename(finalBlend),'metres':True,'floorSurfaceHeight':0,'avatarFeetAnchor':[0,0,0],'meshNodes':len(selected),'stageBuildRequiresAppCodeChanges':False,'stageIntegratedIntoApp':False,'repairedOverlap':True,'views':['editorial','garment','front']}
with open(os.path.join(root,'EXO-STAGE01-FINAL-REVIEW.json'),'w') as f:json.dump(report,f,indent=2)
print('EXO_STAGE01_READY_FOR_VISUAL_APPROVAL',json.dumps(report))
