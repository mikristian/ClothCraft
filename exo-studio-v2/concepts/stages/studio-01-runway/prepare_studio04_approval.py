"""Stage 01 V4 review. Preserve existing independent revisions and user's CLO source.
Replaces obviously synthetic clothing proxies with neutral fitting mannequin,
adds detail/camera/lighting looks without embedding actor into stage asset.
"""
import bpy,os,json,math
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(root/'EXO-STAGE01-V3-EDITORIAL-REVIEW.blend'))
s=bpy.context.scene
actor=bpy.data.collections['90b SCALE REFERENCE ONLY / imported EXO body and proxy tee']
assert len(actor.objects)>10
for obj in list(actor.objects):
    if obj.name!='body_mesh':bpy.data.objects.remove(obj,do_unlink=True)
body=bpy.data.objects.get('body_mesh');assert body and body.type=='MESH'
body.name='PREVIEW FITTING MANNEQUIN - 1.75m BODY REFERENCE ONLY'

mat=bpy.data.materials.new('REVIEW ONLY · honed matte neutral mannequin')
mat.use_nodes=True
mat.diffuse_color=(.45,.44,.405,1)
bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.45,.44,.405,1)
bs.inputs['Roughness'].default_value=.83;bs.inputs['Metallic'].default_value=0
body.data.materials.clear();body.data.materials.append(mat)
body['previewOnly']=True
body['garmentPreview']='This asset is mannequin reference only. Actual user-designed garment is added later in EXO.'

photo=bpy.data.collections['91 PHOTOGRAPHY / cameras & studio light rig']

def camera(name,xyz,focus,lens):
    ob=bpy.data.objects.get(name)
    if ob is None:
        data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);photo.objects.link(ob)
    ob.location=xyz
    ob.rotation_euler=(Vector(focus)-ob.location).to_track_quat('-Z','Y').to_euler()
    ob.data.lens=lens
    ob.data.dof.use_dof=False
    return ob

shots={
 'gallery':camera('REVIEW CAM 01 · room frontal',(0,-12.55,3.0),(0,-.3,2.25),36),
 'mannequin':camera('REVIEW CAM 02 · mannequin detail',(2.72,-4.25,2.34),(0,.05,1.13),51),
 'architecture':camera('REVIEW CAM 03 · geometric stage editorial',(3.8,-8.6,4.5),(0,1.20,2.3),34),
 'roofless':camera('REVIEW CAM 04 · cutaway plan',(6.15,-12.2,10.5),(0,-1.8,2.2),29),
}

# Camera / lighting rigs remain user-editable in Blender; no invisible lights
# or overlays are embedded in stage-only GLB.
for name,power in [('Key / garment texture',800),('Fill / preserve fabric black detail',450),('Overhead wardrobe / bright lace details',340),('Back rim / hair and shoulders',580),('Rear wall graze',130)]:
    light=bpy.data.objects.get(name)
    if light and light.type=='LIGHT':light.data.energy=power
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22

s['stageVersion']='V4 review / actual material maps, human-scale mannequins'
s['stageIntegration']='NOT INSTALLED, USER APPROVAL REQUIRED'
s['mannequin']='Real reference human from local CLO Thomas asset; render-only placeholder'
s['standOriginMetres']=[0,0,0]
s['nativeUndoSystemChanged']=False
s.camera=shots['gallery']
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1600;s.render.resolution_y=1100
s.render.resolution_percentage=78
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGB'
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'

def save(path):
    bpy.ops.wm.save_as_mainfile(filepath=str(path),compress=True)
save(root/'EXO-STAGE01-V4-APPROVAL-CANDIDATE.blend')

# This candidate GLB includes studio geometry, source PBR image maps, and
# 0 avatar models. User approval is strictly required before app integration.
for obj in bpy.context.selected_objects:obj.select_set(False)
stage=[]
for collection_name in ['01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers']:
    for obj in bpy.data.collections[collection_name].objects:
        if obj.type in ('MESH','FONT'):obj.select_set(True);stage.append(obj)
bpy.context.view_layer.objects.active=stage[0]
bpy.ops.export_scene.gltf(filepath=str(root/'EXO-STAGE01-V4-STAGE-ONLY-CANDIDATE.glb'),export_format='GLB',use_selection=True,export_apply=True)
for obj in stage:obj.select_set(False)

# Stage-only render where the mannequin is hidden by Blender's render toggle.
# Keeping actor intact in saved Blender means designer can reveal it instantly.
fast=bool(os.environ.get('STAGE_APPROVAL_FAST'))
s.render.resolution_percentage=70 if fast else 85
s.cycles.samples=16 if fast else 28
for name in ['gallery','mannequin','architecture','roofless'][:2 if fast else 4]:
    s.camera=shots[name]
    body.hide_render=name in ('gallery','architecture','roofless')
    hide=[]
    if name=='roofless':
        for obj in bpy.data.objects:
            if obj.name.startswith(('Overhead dark steel portal lintel','Acoustic overhead panel','Perimeter roof suspended beam')):
                hide.append((obj,obj.hide_render));obj.hide_render=True
    s.render.filepath=str(root/f'EXO-STAGE01-V4-{name}.png')
    bpy.ops.render.render(write_still=True)
    for obj,prev in hide:obj.hide_render=prev
body.hide_render=False
report={'scene':'EXO Stage 01 / Runway Chamber','status':'Awaiting user aesthetic approval','newSourceBlend':'EXO-STAGE01-V4-APPROVAL-CANDIDATE.blend','stageOnlyGLB':'EXO-STAGE01-V4-STAGE-ONLY-CANDIDATE.glb','meshCount':len(stage),'materialSource':'Packed original authored PBR maps','avatarInStageGLB':False,'avatarPreview':'Real 1.75 m body mannequin, no faked garment','normalFeetPosition':[0,0,0],'approvalImages':['EXO-STAGE01-V4-gallery.png','EXO-STAGE01-V4-mannequin.png'],'integratedIntoApp':False}
(root/'EXO-STAGE01-V4-review.json').write_text(json.dumps(report,indent=2))
print('STAGE_V4_READY',json.dumps(report))
