"""Read-only analysis of user's own CLO Stage_01.zprj. Extract archive to /tmp and render visual reference.
Never modify the CLO asset or copy it into app production assets.
"""
import bpy,zipfile,io,os,tempfile,json,math
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parent
src=Path('/Users/mikylecouto/Documents/clo/Assets/Stage/Stage_01.zprj')
with zipfile.ZipFile(src) as outer:
    with zipfile.ZipFile(io.BytesIO(outer.read('Stage_01.zip'))) as archive:
        stage=Path(tempfile.mkdtemp(prefix='exo-clo-stage-01-readonly-'))
        for entry in archive.infolist():
            if Path(entry.filename).name != entry.filename:raise RuntimeError('Unsafe archive entry')
            (stage/entry.filename).write_bytes(archive.read(entry.filename))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(stage/'Stage_01.obj'))
body=next(x for x in bpy.context.scene.objects if x.type=='MESH')
body.scale=(.001,.001,.001)
bpy.context.view_layer.update()
bounds=[body.matrix_world@Vector(point) for point in body.bound_box]
lo=[min(v[i] for v in bounds) for i in range(3)];hi=[max(v[i] for v in bounds) for i in range(3)]
mat_stats=[(m.name,len(m.node_tree.nodes) if m.use_nodes else 0) for m in bpy.data.materials]
print('REFERENCE_ACTUAL_METRES',lo,hi,len(body.data.vertices),len(body.data.polygons),len(body.data.materials))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=750;scene.render.resolution_percentage=85
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('CLO 01 neutral ambience');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.4,.42,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75

def area(loc,power,size):
    data=bpy.data.lights.new('Reference key','AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new('Reference key',data);scene.collection.objects.link(ob)
    ob.location=loc;ob.rotation_euler=(Vector((0,-1.5,2))-ob.location).to_track_quat('-Z','Y').to_euler()
area((1,-5,8),3800,9)
area((-8,1,4),2300,12)
cam_data=bpy.data.cameras.new('Reference inspection');camera=bpy.data.objects.new('Reference inspection',cam_data)
scene.collection.objects.link(camera);scene.camera=camera;cam_data.type='ORTHO';cam_data.ortho_scale=20.8
for name,loc,target in [
    ('front',(0,-25,10),(0,-1.7,2.7)),
    ('three-quarter',(16,-21,13),(0,-2,2.8)),
    ('rear',(0,20,10),(0,-1,2.6)),
]:
    camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(root/f'clo-stage01-REFERENCE-{name}.png')
    bpy.ops.render.render(write_still=True)
(root/'clo-stage01-reference-measurements.json').write_text(json.dumps({'originalFile':str(src),'extraction':'Temporary analysis only','meshVertices':len(body.data.vertices),'meshFaces':len(body.data.polygons),'materials':len(body.data.materials),'bboxMinMeters':lo,'bboxMaxMeters':hi,'sourceMaterialNames':[m.name for m in body.data.materials],'originalSourceModified':False},indent=2))
