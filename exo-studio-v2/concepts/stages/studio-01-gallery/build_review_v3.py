"""Build review-only Gallery 01 V3 with real EXO avatar anatomy and indicative gray garment shapes.
Original stage-only GLB remains separate and never includes the reference avatar.
"""
import bpy, os, json
from mathutils import Vector,Matrix
ROOT=os.path.dirname(os.path.abspath(__file__))
PROJECT=os.path.abspath(os.path.join(ROOT,'../../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'gallery-studio-01-v2.blend'))
preview=bpy.data.collections.get('90 · PREVIEW ONLY · mannequin & placeholder tee')
for ob in list(preview.objects):bpy.data.objects.remove(ob,do_unlink=True)
prior=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(PROJECT,'public/avatars/clo-thomas.glb'))
new=list(set(bpy.data.objects)-prior)
keep=[o for o in new if o.type=='MESH' and o.name in {'body_mesh','hair_mesh','eye_L_mesh','eye_R_mesh','eyelash_L_mesh','eyelash_R_mesh','shoes_r_mesh','shoes_l_mesh'}]
for ob in keep:
    wm=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=wm
    for col in list(ob.users_collection):col.objects.unlink(ob)
    preview.objects.link(ob)
for ob in new:
    if ob not in keep: bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update()
body=next(o for o in keep if o.name=='body_mesh')
pts=[body.matrix_world@Vector(p) for p in body.bound_box]
lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)]
scale=1.75/(hi[2]-lo[2]);tx=-scale*(lo[0]+hi[0])/2;ty=-scale*(lo[1]+hi[1])/2;tz=-scale*lo[2]
trans=Matrix.Translation(Vector((tx,ty,tz)))@Matrix.Diagonal((scale,scale,scale,1))
for ob in keep:
    ob.matrix_world=trans@ob.matrix_world
    ob['preview_only']=True
    ob['preview_source']='EXO CLO Thomas preview mesh; NOT included in stage-only GLB'

# Reuse the original Blender modeler's explicit tee and trousers, not the
# broken/inconsistent preview garment in the native GLB source. They are only
# *visual scale probes*, not a simulated EXO garment or fabric.
with bpy.data.libraries.load(os.path.join(ROOT,'gallery-studio-01.blend'),link=False) as (source,loaded):
    loaded.objects=[name for name in source.objects if name.startswith(('REFERENCE TEE','REFERENCE tee','REFERENCE sewn','Reference sewn','Mannequin calf','Mannequin thigh','Mannequin trouser','Mannequin knee','Reference exposed forearm','Reference wrist'))]
for ob in loaded.objects:
    if ob:
        preview.objects.link(ob)
        ob.location.y+=.25
        ob['preview_only']=True
        ob['simulation']='Reference geometry only; not physics or real pattern'
        if ob.name.startswith('REFERENCE TEE'):
            ob.name='GARMENT REFERENCE ONLY · cotton silhouette'
# Fit sleeve/cotton references to shoulder below neck and ensure top is covered.
s=bpy.context.scene
s['stage_id']='STUDIO-01-GALLERY-V3-REVIEW'
s['prototype_only']='YES; stage environment untouched in live EXO editor'
s['reference_actor']='Real CLO Thomas avatar body plus handmade proxy cotton tee/pants'
s['reference_geometry_in_glb']=False
s.camera=bpy.data.objects['CAMERA / 01 editorial three-quarter']
s.render.resolution_x=1440;s.render.resolution_y=960;s.render.resolution_percentage=80
s.cycles.samples=25
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'gallery-studio-01-v3-REVIEW.blend'),compress=True)
for name,cam in [('hero','CAMERA / 01 editorial three-quarter'),('front','CAMERA / 02 straight-on catalog'),('side','CAMERA / 03 stage side')]:
    s.camera=bpy.data.objects[cam]
    s.render.filepath=os.path.join(ROOT,f'gallery-studio-01-v3-{name}.png')
    bpy.ops.render.render(write_still=True)
print('V3_REVIEW_READY',len(keep),len(loaded.objects))
