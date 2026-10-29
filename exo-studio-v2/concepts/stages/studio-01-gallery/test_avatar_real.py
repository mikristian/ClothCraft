import bpy,os
from mathutils import Vector
p=os.path.dirname(os.path.abspath(__file__))
root=os.path.abspath(os.path.join(p,'../../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(p,'gallery-studio-01-v2.blend'))
preview=bpy.data.collections.get('90 · PREVIEW ONLY · mannequin & placeholder tee')
for ob in list(preview.objects):bpy.data.objects.remove(ob,do_unlink=True)
prior=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'public/avatars/clo-thomas.glb'))
imported=list(set(bpy.data.objects)-prior)
meshes=[o for o in imported if o.type=='MESH' and o.name!='Icosphere' and len(o.data.polygons)>500]
for ob in meshes:
    matrix=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=matrix
    for c in list(ob.users_collection):c.objects.unlink(ob)
    preview.objects.link(ob)
for ob in imported:
    if ob not in meshes:bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update()
body=next(o for o in meshes if o.name=='body_mesh')
verts=[body.matrix_world @ Vector(c) for c in body.bound_box]
minz=min(v.z for v in verts);maxz=max(v.z for v in verts)
scale=1.75/(maxz-minz)
for ob in meshes:
    world=ob.matrix_world.copy()
    # Parent matrices are already resolved. Global scale and offset preserve proportions.
    ob.matrix_world = __import__('mathutils').Matrix.Translation(Vector((0,0,-minz*scale))) @ __import__('mathutils').Matrix.Diagonal(Vector((scale,scale,scale,1))) @ world
bpy.context.view_layer.update()
s=bpy.context.scene;s.camera=bpy.data.objects['CAMERA / 01 editorial three-quarter']
s.render.resolution_percentage=62
s.cycles.samples=18
s.render.filepath=os.path.join(p,'test-gallery-real-avatar.png')
bpy.ops.render.render(write_still=True)
print('REAL_AVATAR',len(meshes),len([ob for ob in meshes if 'cloth' in ob.name.lower()]),scale)
