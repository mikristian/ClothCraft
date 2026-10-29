"""Non-destructive import and bounds QA for the stage-only GLB."""
import bpy,os,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'gallery-studio-01-v2-STAGE-ONLY-DRAFT.glb'))
meshes=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
assert len(meshes)>=35,len(meshes)
assert not any(any(s in ob.name.lower() for s in ('reference tee','mannequin','body_mesh','cloth_mesh','shoes')) for ob in meshes)
name=next((ob for ob in meshes if 'body-safe walkable top' in ob.name.lower()),None)
assert name is not None, [ob.name for ob in meshes]
zs=[(name.matrix_world@Vector(p)).z for p in name.bound_box]
# Reimport of glb by Blender restores a z-up world. Podium top should be at 0.
assert abs(max(zs))<0.025,max(zs)
sceneBounds={axis:[round(min((ob.matrix_world@Vector(c))[index] for ob in meshes for c in ob.bound_box),3),round(max((ob.matrix_world@Vector(c))[index] for ob in meshes for c in ob.bound_box),3)] for index,axis in enumerate('xyz')}
report=dict(ok=True,meshes=len(meshes),platformTopZ=round(max(zs),5),bounds=sceneBounds,referenceAvatarIncluded=False)
print('STAGE_GLTF_VALIDATION',json.dumps(report))
