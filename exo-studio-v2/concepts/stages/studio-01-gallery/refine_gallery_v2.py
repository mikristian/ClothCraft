"""Editorial gallery studio V2: Blender-only review asset, not installed in EXO.

Run /Applications/Blender.app/Contents/MacOS/Blender -b --python concepts/stages/studio-01-gallery/refine_gallery_v2.py
Asset metrics: 1 Blender unit=1 m, Blender Z-up, GLB Y-up. Avatar feet anchor at (0,0,0).
The imported avatar is a reference ONLY; it is omitted from the stage GLB.
"""
import bpy, os, math, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
PROJECT=os.path.abspath(os.path.join(ROOT,'../../..'))
SOURCE=os.path.join(ROOT,'gallery-studio-01.blend')
assert os.path.exists(SOURCE), SOURCE
bpy.ops.wm.open_mainfile(filepath=SOURCE)
s=bpy.context.scene

def material(name, rgb=None, rough=None, metal=None):
    m=bpy.data.materials.get(name)
    if not m: raise RuntimeError('Material missing '+name)
    node=m.node_tree.nodes.get('Principled BSDF')
    if rgb is not None:
        m.diffuse_color=(*rgb,1)
        node.inputs['Base Color'].default_value=(*rgb,1)
        for ramp in m.node_tree.nodes:
            if ramp.type=='VALTORGB':
                ramp.color_ramp.elements[0].color=(*[c*.91 for c in rgb],1)
                ramp.color_ramp.elements[1].color=(*[min(1,c*1.065) for c in rgb],1)
    if rough is not None:node.inputs['Roughness'].default_value=rough
    if metal is not None:node.inputs['Metallic'].default_value=metal
    return m

material('PBR / mineral chalk limestone',(.285,.295,.307),.91)
material('PBR / fine honed pale limestone',(.405,.409,.412),.84)
material('PBR / dry bone architectural plaster',(.205,.22,.229),.88)
material('PBR / matte warm graphite podium',(.058,.064,.068),.71)
material('PBR / charcoal limestone slab floor',(.083,.086,.09),.9)
material('PBR / champagne brushed metal',(.345,.305,.253),.31,.66)
material('PBR / graphite satin anodized',(.029,.033,.04),.41,.42)
material('PBR / recessed warm diffused LED',(.72,.65,.55),.36)
material('PBR / neutral diffused LED',(.78,.83,.86),.38)

# Lightboxes remain soft and garment-friendly, but use narrower, more directional
# illumination so the rear architectural geometry retains sculptural depth.
for name,energy in [
    ('Softbox 01 | front left 3.4m',375),
    ('Softbox 02 | right fill',195),
    ('Large overhead front diffused',235),
    ('Back garment rim',305),
]:
    ob=bpy.data.objects.get(name)
    if ob: ob.data.energy=energy
world=s.world
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.13
s.view_settings.view_transform='AgX'
s.view_settings.look='AgX - Medium High Contrast'
s.view_settings.view_settings if False else None

# The floor-foot anchor needs to match the native EXO editor exactly; an avatar
# loaded at origin must stand on the top surface without translation.
anchor=bpy.data.objects.get('AVATAR_ORIGIN · floor at Z=0 · preview offset Y=-0.25')
if anchor:
    anchor.name='EXO_AVATAR_FEET_ORIGIN · (0,0,0)'
    anchor.location=(0,0,0)
    anchor['coordinate_system']='Blender (X,Y,Z-up), GLB transforms to Three.js (X,Y-up,Z)'
    anchor['collision_target']='Stage platform walkable top at Z = 0'

# Delete only the authored PREVIEW mannequin, retain all stage sets and structure.
preview=bpy.data.collections.get('90 · PREVIEW ONLY · mannequin & placeholder tee')
assert preview, 'Preview-only collection missing'
for ob in list(preview.objects): bpy.data.objects.remove(ob,do_unlink=True)

avatar=os.path.join(PROJECT,'public/avatars/preview/clo-thomas.glb')
assert os.path.exists(avatar), avatar
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=avatar)
imported=list(set(bpy.data.objects)-before)
meshes=[ob for ob in imported if ob.type=='MESH' and len(ob.data.polygons)>100]
if not meshes: raise RuntimeError('No actual avatar body mesh imported')
# Clean importer auxiliary meshes and parents; body geometry is already world-aligned.
for ob in imported:
    if ob not in meshes:bpy.data.objects.remove(ob,do_unlink=True)
for ob in meshes:
    ob.parent=None
    for col in list(ob.users_collection): col.objects.unlink(ob)
    preview.objects.link(ob)
    ob.name='SCALE REFERENCE ONLY · actual CLO Thomas avatar mesh'
    mat=bpy.data.materials.new('SCALE REFERENCE | clay neutral body')
    mat.diffuse_color=(.30,.31,.312,1);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.30,.31,.312,1);bs.inputs['Roughness'].default_value=.84
    ob.data.materials.clear();ob.data.materials.append(mat)

# Normalize world dimensions with 1.75m avatar height, feet on z=0.
bpy.context.view_layer.update()
def bounds(objects):
    pts=[ob.matrix_world@Vector(p) for ob in objects for p in ob.bound_box]
    return [min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]
lo,hi=bounds(meshes);scale=1.75/(hi[2]-lo[2]);middle_x=(lo[0]+hi[0])/2;middle_y=(lo[1]+hi[1])/2
for ob in meshes:
    ob.scale*=scale
    ob.location.x=(ob.location.x-middle_x)*scale
    ob.location.y=(ob.location.y-middle_y)*scale
    ob.location.z=(ob.location.z-lo[2])*scale
    ob['preview_only']=True
    ob['source']='EXO public/avatars/preview/clo-thomas.glb'
    ob['target_height_m']=1.75
bpy.context.view_layer.update()
lo,hi=bounds(meshes)
assert abs(lo[2])<0.005 and abs(hi[2]-1.75)<0.005,(lo,hi)

# Keep the figure readable against the central inset. Golden architectural
# reveals are intentionally narrow: silhouette and fabric remain the focal point.
for ob in bpy.data.objects:
    if ob.name=='Embossed studio monogram':
        ob.data.body='GALLERY   01';ob.data.size=.115
    if ob.name=='Technical set edition':
        ob.data.body='EXO  /  STUDIO SCENES'

rig=bpy.data.collections.get('91 · Camera & studio light rig')
assert rig

def camera(name,position,target,lens):
    ob=bpy.data.objects.get(name)
    if ob is None:
        data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);rig.objects.link(ob)
    ob.location=position
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    ob.data.lens=lens
    return ob

# Reference avatar is vertically framed, with enough breathing room to read
# the podium and wall geometry. The viewport remains navigable in Blender.
hero=camera('CAMERA / 01 editorial three-quarter',(3.0,-5.6,2.72),(0,.35,1.57),40)
front=camera('CAMERA / 02 straight-on catalog',(0,-6.5,2.38),(0,.48,1.70),38)
side=camera('CAMERA / 03 stage side',(6.4,-3.3,2.64),(0,.28,1.57),38)

s['stage_id']='STUDIO-01-GALLERY-V2-DRAFT'
s['asset_status']='BLENDER_REVIEW_ONLY__USER_APPROVAL_REQUIRED'
s['reference_avatar_source']='EXO public/avatars/preview/clo-thomas.glb'
s['reference_avatar_height_m']=1.75
s['stage_model_excludes_reference_avatar']=True
s['avatar_standing_position_blender']=[0,0,0]
s['native_app_untouched']=True
s.camera=hero
s.render.engine='CYCLES'
s.cycles.samples=24
s.cycles.use_denoising=True
s.render.resolution_x=1440
s.render.resolution_y=960
s.render.resolution_percentage=75
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGB'
s.render.film_transparent=False
s.render.filepath=os.path.join(ROOT,'gallery-studio-01-v2-hero.png')
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_extras=False
        area.spaces.active.shading.type='MATERIAL'

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'gallery-studio-01-v2.blend'),compress=True)

# Export stage only to a non-app concept directory; no startup manifests or
# production presets are changed. This draft file is for structural QA only.
selected=[]
for ob in bpy.context.selected_objects:ob.select_set(False)
for colname in ['01 · Stone gallery architecture','02 · Garment platform · top elevation 0m','03 · Studio details & accents']:
    col=bpy.data.collections.get(colname)
    if not col: raise RuntimeError('Missing stage layer '+colname)
    for ob in col.objects:
        if ob.type=='MESH':ob.select_set(True);selected.append(ob)
bpy.context.view_layer.objects.active=selected[0]
output=os.path.join(ROOT,'gallery-studio-01-v2-STAGE-ONLY-DRAFT.glb')
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
for ob in selected:ob.select_set(False)

s.render.resolution_percentage=75
for suffix,cam in [('hero',hero),('front',front),('side',side)]:
    s.camera=cam
    s.render.filepath=os.path.join(ROOT,f'gallery-studio-01-v2-{suffix}.png')
    bpy.ops.render.render(write_still=True)

report={
    'stage':'STUDIO-01-GALLERY-V2-DRAFT','status':'visual-review-only',
    'blend':'gallery-studio-01-v2.blend','draftGlb':os.path.basename(output),
    'coordinates':'Blender Z-up, GLB Y-up, metres','avatarFeetOrigin':[0,0,0],
    'platformTopZ':0,'stageOnlyMeshCount':len(selected),
    'referenceAvatarSource':'public/avatars/preview/clo-thomas.glb',
    'referenceAvatarHeightMetres':1.75,'referenceInGlb':False,
    'scenes':['01 editorial three-quarter','02 straight-on catalog','03 stage side'],
    'approvedForIntegration':False,
}
with open(os.path.join(ROOT,'gallery-studio-01-v2-review.json'),'w') as f:json.dump(report,f,indent=2)
print('EXO_GALLERY_V2_SAVED',json.dumps(report))
