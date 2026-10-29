"""Build an original, editable, generic zipper in Blender 5.x.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python docs/hardware-materials/blender-zipper-kit/build_custom_zipper.py

Geometry is generated independently; no CLO/YKK meshes or brand marks are copied.
Edit CONFIG values in millimetres, run again, then adjust named mesh objects
and materials directly in Blender. Exports .blend + .glb + PNG preview.
"""
import bpy
from math import radians
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "output"
OUTPUT.mkdir(parents=True, exist_ok=True)

CONFIG = {
    "length_mm": 160.0,
    "tape_width_each_mm": 16.0,
    "chain_width_mm": 5.0,
    "tape_thickness_mm": 0.65,
    "teeth_pitch_mm": 3.1,
    "teeth_length_mm": 3.35,
    "slider_location_mm": 35.0,
    "slider_width_mm": 11.0,
    "puller_width_mm": 11.5,
    "puller_length_mm": 30.0,
    "finish": "brushed silver",
}

MM = 0.001
def m(value):
    return float(value) * MM

def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

def collection(name):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group

def assign(obj, group, mat):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    group.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def rounded_box(name, location_mm, size_mm, radius_mm, group, mat, bevel_segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=tuple(m(v) for v in location_mm))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = tuple(m(v) for v in size_mm)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius_mm:
        modifier = obj.modifiers.new("Soft machined edges", "BEVEL")
        modifier.width = m(radius_mm)
        modifier.segments = bevel_segments
        modifier.affect = "EDGES"
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return assign(obj, group, mat)

def rail(name, points_mm, radius_mm, group, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = m(radius_mm)
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points_mm)-1)
    for point, xyz in zip(spline.points, points_mm):
        point.co = (*[m(v) for v in xyz], 1)
    obj = bpy.data.objects.new(name, curve)
    group.objects.link(obj)
    curve.materials.append(mat)
    return obj

def look_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()

def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in list(bpy.data.collections):
        if col.name != "Collection" and not col.objects:
            bpy.data.collections.remove(col)

    cfg = CONFIG
    length = cfg["length_mm"]
    tape_width = cfg["tape_width_each_mm"]
    chain_width = cfg["chain_width_mm"]
    pitch = cfg["teeth_pitch_mm"]
    halfgap = chain_width * .37

    cloth = material("EXO | deep graphite woven tape", (.048,.057,.075), 0.06, .87)
    stitching = material("EXO | fine nylon thread", (.19,.22,.25), 0.02, .82)
    teeth_mat = material("EXO | pale polished nickel teeth", (.73,.78,.84), .86, .23)
    slider_mat = material("EXO | brushed silver slider", (.47,.54,.60), .87, .28)
    puller_mat = material("EXO | custom champagne pull tab", (.71,.57,.34), .85, .24)
    dark = material("EXO | engraved detail", (.09,.12,.15), .7, .43)

    tape_group = collection("01 | TWO SEPARATE FABRIC TAPES")
    tooth_group = collection("02 | METAL ZIPPER TEETH")
    slider_group = collection("03 | CUSTOM SLIDER BODY")
    pull_group = collection("04 | CUSTOM PULLER AND HINGE")
    stop_group = collection("05 | STOPS AND END TERMINALS")
    product_groups = [tape_group,tooth_group,slider_group,pull_group,stop_group]

    for side, sign in [("L",-1),("R",1)]:
        x = sign * (halfgap+tape_width/2)
        rounded_box(f"Tape_{side} | {tape_width:g} mm width", (x,0,-.5),
                    (tape_width,length,cfg["tape_thickness_mm"]),.12,tape_group,cloth)
        for index in (0,1):
            sx = sign * (halfgap+2.0+index*.75)
            rail(f"Thread_{side}_{index+1}",[(sx,-length*.48,.14),(sx,length*.48,.14)],
                 .12,tape_group,stitching)
        rail(f"Zipper side cord_{side}",[(sign*halfgap,-length/2,.23),(sign*halfgap,length/2,.23)],
             .58,tape_group,stitching)

    count = max(1,int((length-14.0)/pitch))
    for i in range(count):
        y = -length*.5+7.0 + i*pitch
        for side, sign in [("L",-1),("R",1)]:
            rounded_box(f"Tooth_{side}_{i+1:03d}",
                (sign*(halfgap+.65),y+(pitch*.12 if sign==1 else 0),.45),
                (cfg["teeth_length_mm"],pitch*.78,1.5),.34,tooth_group,teeth_mat,2)

    # An independently modeled zipper-head geometry. The flared opening has
    # front, back, side walls and a central wedge rather than a painted image.
    sy = cfg["slider_location_mm"]
    sw = cfg["slider_width_mm"]
    rounded_box("Slider | top pressure plate",(0,sy,2.35),(sw,13.0,1.65),1.0,slider_group,slider_mat,4)
    rounded_box("Slider | bottom pressure plate",(0,sy,-1.30),(sw*.90,12.1,1.35),.85,slider_group,slider_mat,3)
    for side,sign in [("L",-1),("R",1)]:
        rounded_box(f"Slider | {side} guide wall",(sign*(sw*.5-.75),sy,.50),(1.5,10,3.8),.6,slider_group,slider_mat)
        rounded_box(f"Slider | {side} throat channel",(sign*sw*.22,sy+4,2.75),(sw*.19,4,.35),.12,slider_group,dark)
    rounded_box("Slider | separating wedge",(0,sy+3.3,.1),(1.75,5.0,2.55),.50,slider_group,teeth_mat)
    rounded_box("Slider | raised rib",(0,sy-2.6,3.35),(sw*.57,3.1,.8),.35,slider_group,teeth_mat)

    rounded_box("Hinge | swivel rivet",(0,sy-3.15,4.35),(4.2,4.2,1.2),.65,pull_group,puller_mat)
    pull_width = cfg["puller_width_mm"]
    pull_length = cfg["puller_length_mm"]
    py = sy-pull_length*.52-5
    rounded_box("Puller | solid custom tab",(0,py,6.5),(pull_width,pull_length*.74,1.7),2.3,pull_group,puller_mat,5)
    # Raised lip and perforated-look open rectangular loop.
    ylo = py-pull_length*.40
    yhi = py-pull_length*.12
    loop_half = pull_width*.25
    rail("Puller | open machined grip hole",[
        (-loop_half,ylo,7.52),(-loop_half,yhi,7.52),
        (loop_half,yhi,7.52),(loop_half,ylo,7.52),(-loop_half,ylo,7.52)],
        .45,pull_group,dark)
    rounded_box("Puller | embossed custom EXO mark",(0,py+4.0,7.5),(pull_width*.48,2.2,.12),.24,pull_group,dark)

    for sign,side in [(-1,"L"),(1,"R")]:
        rounded_box(f"Top stop_{side}",(sign*halfgap,length*.5-3,1.3),(3.4,5.6,2.4),.5,stop_group,slider_mat)
    rounded_box("Bottom box stop",(0,-length*.5+3.5,1.1),(7.5,6.8,2.6),.6,stop_group,slider_mat)

    master = bpy.data.objects.new("EXO CUSTOM ZIPPER | CONFIG IN SCRIPT",None)
    bpy.context.scene.collection.objects.link(master)
    for k,v in cfg.items():
        master[k]=v
    master["source"]="Original procedural EXO geometry. CLO generic OBJ files referenced only; no copied CLO/YKK meshes."

    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1120
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color=(.065,.075,.090)
    scene.view_settings.view_transform="AgX"

    presentation = collection("99 | STUDIO LIGHTS (EXCLUDE FROM GLB)")
    bg = material("Backdrop | soft dark charcoal",(.04,.055,.075),.04,.83)
    rounded_box("Backdrop",(0,0,-5),(130,235,1.5),0,presentation,bg)
    for name,loc,power,size in [
      ("Softbox | left",(-.12,-.08,.22),.7, .20),
      ("Softbox | right",(.13,.02,.17),.5, .16),
      ("Softbox | rim",(.01,.16,.24),.3,.10),
    ]:
        ld=bpy.data.lights.new(name,"AREA")
        ld.energy=power
        ld.shape="DISK"
        ld.size=size
        ob=bpy.data.objects.new(name,ld)
        presentation.objects.link(ob)
        ob.location=loc
        look_at(ob,(0,0,0))

    cam=bpy.data.cameras.new("EXO orthographic product view")
    cam.type="ORTHO"
    cam.ortho_scale=.255
    camera=bpy.data.objects.new("Camera | zipper detail",cam)
    presentation.objects.link(camera)
    camera.location=(.10,-.12,.29)
    look_at(camera,(0,0,0))
    scene.camera=camera
    scene.render.filepath=str(OUTPUT/"EXO_Custom_Zipper_Studio.png")

    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/"EXO_Custom_Zipper.blend"))
    # Only the original editable zipper geometry goes into GLB.
    bpy.ops.object.select_all(action="DESELECT")
    count_export=0
    for group in product_groups:
        for obj in group.objects:
            if obj.type in {"MESH","CURVE"}:
                obj.select_set(True)
                count_export+=1
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT/"EXO_Custom_Zipper.glb"),export_format="GLB",
                              use_selection=True,export_apply=True)
    bpy.ops.render.render(write_still=True)
    print(f"EXO_CUSTOM_ZIPPER_DONE objects={count_export} teeth={count*2} output={OUTPUT}")

if __name__ == "__main__":
    main()
