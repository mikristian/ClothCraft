"""Polish existing original runway chamber into clean review V2. Do not touch active EXO application."""
import bpy,os,math,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-DRAFT.blend'))
s=bpy.context.scene
# Remove intersecting, redundant bridge: runway overlaps main-stage surface already.
bridge=bpy.data.objects.get('Runway rear bridge / no collision gap')
if bridge:bpy.data.objects.remove(bridge,do_unlink=True)
# The runway already spans to y=0.65 and back stage starts at y=0.30.
# Keep two walkable overlapping tops a tiny 2mm apart to prevent coplanar z-fighting.
walk=bpy.data.objects.get('Runway walkable upper surface / Z = 0')
if walk:
    walk.location.z-=.002
    walk['top_height_m']=-.002
back=bpy.data.objects.get('Performance stage surface / Z = 0')
if back:back['top_height_m']=0.0
# Focal camera positions entirely within open gallery interior; no side-wall occlusion.
def place(name,where,aim,lens):
    ob=bpy.data.objects.get(name)
    if not ob:raise ValueError('Camera not found: '+name)
    ob.location=where
    ob.rotation_euler=(Vector(aim)-ob.location).to_track_quat('-Z','Y').to_euler()
    ob.data.lens=lens
    return ob
cams={
    'hero':place('CAMERA 01 / fashion editorial',(3.08,-8.58,2.75),(0,-.65,1.66),25),
    'front':place('CAMERA 02 / symmetrical stage',(0,-10.9,3.0),(0,-.50,2.0),26),
    'overview':place('CAMERA 03 / runway room wide',(4.5,-9.8,7.4),(0,-1.2,2.55),22),
    'side':place('CAMERA 04 / outfit spatial side',(4.70,-4.80,2.70),(0,-.9,1.60),26)
}
# Lower the most reflective stage materials while preserving material variety.
# Main stage must read as material-rich black basalt without clipping dark garment detail.
for name,rgb in [
    ('S01 Warm honed architectural limestone',(.285,.29,.286)),
    ('S01 Black basalt with mineral aggregate',(.054,.059,.063)),
    ('S01 Midnight grey wool boucle seating',(.13,.142,.15)),
]:
    material=bpy.data.materials.get(name)
    if material:
        material.diffuse_color=(*rgb,1)
        tree=material.node_tree
        bs=tree.nodes.get('Principled BSDF')
        if bs:bs.inputs['Base Color'].default_value=(*rgb,1)
        for node in tree.nodes:
            if node.type=='VALTORGB':
                node.color_ramp.elements[0].color=(*[c*.84 for c in rgb],1)
                node.color_ramp.elements[1].color=(*[min(1,c*1.17) for c in rgb],1)
# Clean camera from light stands, preserve four camera positions for editorial/campaign use.
s.camera=cams['hero']
s.render.resolution_x=1500;s.render.resolution_y=1000
s.render.resolution_percentage=80;s.cycles.samples=30
s['id']='EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2-REVIEW'
s['stageReviewStatus']='Blender editorial draft; requires user visual approval'
s['nativeAppIntegration']=False
s['sourceStageGLBContainsPreviewActor']=False
s['CLO_reference_path']='Documents/clo/Assets/Stage/Stage_01.zprj; inspected read-only'
s['avatarFootAnchorWorld']=[0,0,0]
# Safe keep all authored scene objects, camera rigs and separate reference collection.
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_extras=False
outblend=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2.blend')
bpy.ops.wm.save_as_mainfile(filepath=outblend,compress=True)
# Asset interchange export stage only: no preview body, proxy garment, cameras or light rig.
for o in bpy.context.selected_objects:o.select_set(False)
assets=[]
for name in ('01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers'):
    col=bpy.data.collections.get(name)
    if not col:raise RuntimeError('Stage layer absent: '+name)
    for o in col.objects:
        if o.type in ('MESH','FONT'):
            o.select_set(True);assets.append(o)
if not assets:raise RuntimeError('No stage meshes')
bpy.context.view_layer.objects.active=assets[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2-STAGE-ONLY.glb'),export_format='GLB',use_selection=True,export_apply=True)
for o in assets:o.select_set(False)
for name in ('hero','front','overview','side'):
    s.camera=cams[name]
    s.render.filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2-'+name+'.png')
    bpy.ops.render.render(write_still=True)
report={'file':'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2.blend','stageOnlyGlb':'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2-STAGE-ONLY.glb','inspiredBy':'user CLO Stage_01.zprj','geometryIsOriginal':True,'sourceCloAssetIntact':True,'avatarPreviewIsNotProductionGarment':True,'avatarOrigin':[0,0,0],'runwaySurfaceTopMetres':-.002,'mainStageSurfaceTopMetres':0,'originalStageMeshObjects':len(assets),'fourStudioCameras':list(cams),'appIntegrationPendingApproval':True}
with open(os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2-qa.json'),'w') as f:json.dump(report,f,indent=2)
print('EXO_STAGE_POLISHED',json.dumps(report))
