"""Create a PRIVATE Blender reference gallery from locally installed CLO OBJ archives.

This script imports the 21 generic pullers and 9 generic sliders included in
the user's existing CLO installation. Original source files are never modified.
The resulting .blend is saved under ~/Documents/EXO Asset Research rather than
the project repository or EXO's public asset bundle. Do not redistribute it
without checking the source asset license.

YKK's .zpl and .zsd files use CLO-specific binary containers and are not imported.
"""
import bpy
import json
import tempfile
import zipfile
from pathlib import Path
from mathutils import Matrix, Vector

SOURCE = Path("/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims/Zipper")
DEST = Path.home() / "Documents" / "EXO Asset Research" / "CLO Zipper Reference Gallery"
DEST.mkdir(parents=True, exist_ok=True)
COLS = 6
STEP = .093

def label(text, x, y):
    curve=bpy.data.curves.new(text,"FONT")
    curve.body=text
    curve.size=.008
    curve.align_x="CENTER"
    ob=bpy.data.objects.new(text,curve)
    bpy.context.scene.collection.objects.link(ob)
    ob.location=(x,y-.036,0)

def main():
    if not SOURCE.is_dir():
        raise RuntimeError(f"Local CLO library unavailable: {SOURCE}")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    archives=[*(sorted((SOURCE/"Puller"/"OBJ").glob("*.zip"))),
              *(sorted((SOURCE/"Slider"/"OBJ").glob("*.zip")))]
    if len(archives)!=30:
        raise RuntimeError(f"Expected 30 installed generic OBJ archives, found {len(archives)}")
    report=[]
    for index,archive in enumerate(archives):
        col=index%COLS
        row=index//COLS
        center_x=(col-(COLS-1)/2)*STEP
        center_y=(2-row)*STEP
        with tempfile.TemporaryDirectory(prefix="clo-zipper-local-ref-") as tmp:
            with zipfile.ZipFile(archive) as z:
                if z.testzip():
                    raise RuntimeError(f"Damaged source ZIP {archive}")
                z.extractall(tmp)
            objs=[p for p in Path(tmp).rglob("*") if p.suffix.lower()==".obj"]
            if len(objs)!=1:
                raise RuntimeError(f"{archive.name}: expected one OBJ, got {len(objs)}")
            bpy.ops.object.select_all(action="DESELECT")
            bpy.ops.wm.obj_import(filepath=str(objs[0]))
            imported=list(bpy.context.selected_objects)
            meshes=[ob for ob in imported if ob.type=="MESH"]
            if not meshes:
                raise RuntimeError(f"{archive.name} failed to import")
            corners=[ob.matrix_world @ Vector(corner) for ob in meshes for corner in ob.bound_box]
            minimum=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
            maximum=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
            midpoint=(minimum+maximum)*.5
            dimensions=maximum-minimum
            factor=.055/max(dimensions)
            group=bpy.data.collections.new(archive.stem+" | CLO original, local reference only")
            bpy.context.scene.collection.children.link(group)
            for ob in imported:
                for old in list(ob.users_collection):
                    old.objects.unlink(ob)
                group.objects.link(ob)
                ob.matrix_world=Matrix.Translation((center_x,center_y,.025)) @ Matrix.Scale(factor,4) @ Matrix.Translation(-midpoint) @ ob.matrix_world
                ob.name=f"{archive.stem} | {ob.name}"
            # Texture references point into this disposable extraction directory.
            # Embed any successfully imported images before that directory exits.
            bpy.ops.file.pack_all()
            label(archive.stem.replace("_"," "),center_x,center_y)
            report.append(dict(source=str(archive),name=archive.stem,
                               meshes=len(meshes),
                               vertices=sum(len(ob.data.vertices) for ob in meshes),
                               original_obj_extent=[round(v,5) for v in dimensions],
                               normalized_scale=round(factor,7)))
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x=1300
    scene.render.resolution_y=980
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.world.color=(.06,.07,.09)
    camera_data=bpy.data.cameras.new("Reference grid camera")
    camera_data.type="ORTHO"
    camera_data.ortho_scale=.63
    camera=bpy.data.objects.new("Reference grid camera",camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location=(0,-.15,.75)
    camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.camera=camera
    for name,xyz,energy in [("Gallery white key",(-.35,-.1,.55),12),("Gallery fill",(.28,.2,.55),9)]:
        ld=bpy.data.lights.new(name,"AREA")
        ld.energy=energy; ld.size=.36
        ob=bpy.data.objects.new(name,ld)
        bpy.context.scene.collection.objects.link(ob)
        ob.location=xyz
        ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(DEST/"CLO_Generic_Pullers_Sliders_Reference.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST/"CLO_Generic_Pullers_Sliders_Reference_LOCAL_ONLY.blend"))
    bpy.ops.render.render(write_still=True)
    (DEST/"import-manifest.json").write_text(json.dumps(report,indent=2))
    print(f"PRIVATE_CLO_GALLERY_DONE entries={len(report)} meshes={sum(x['meshes'] for x in report)} dest={DEST}")

if __name__=="__main__":
    main()
