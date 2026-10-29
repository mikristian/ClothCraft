"""Original EXO Stage 01 / Runway Chamber: clean fashion presentation V3.

This standalone Blender refinement reads the V2 design and creates new review
artifacts without touching CLO's Stage_01.zprj or the installed EXO app.
Blender units: metres, Z-up; avatar feet anchor: (0,0,0), stage surface Z=0.
"""
import bpy, os, json, math
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V2.blend')
assert os.path.isfile(SRC)
bpy.ops.wm.open_mainfile(filepath=SRC)
s=bpy.context.scene
seats=bpy.data.collections['03 AUDIENCE / bleachers and individual seating']
props=bpy.data.collections['04 DETAILS / reveals, reliefs, trims and fixtures']
rig=bpy.data.collections['05 LIGHTING / physical stage rig & diffusers']
photo=bpy.data.collections['91 PHOTOGRAPHY / cameras & studio light rig']

# Remove the institutional, high-back auditorium chairs and fourth terrace.
# Original multi-terrace architecture remains in one editable Blender layer.
removed=0
for obj in list(seats.objects):
    name=obj.name
    if name.startswith(('Upholstered auditorium seat','Auditorium curved back shell','Seat back wool insert','Seat tube legs','Integrated low-level seating guide')) or any(x in name for x in ['/3','/3/']):
        bpy.data.objects.remove(obj,do_unlink=True);removed+=1
    elif name.startswith('Audience riser structure') and name.endswith('/3'):
        bpy.data.objects.remove(obj,do_unlink=True);removed+=1
    elif name.startswith('Audience brushed metal edge') and name.endswith('/3'):
        bpy.data.objects.remove(obj,do_unlink=True);removed+=1

# The original decorative aisle railing hides the new bench edge; keep the
# slender structure on stage for scale but lighten its finish and profile.
for obj in list(props.objects):
    if obj.name.startswith('Visible runway exterior stone joint'):
        bpy.data.objects.remove(obj,do_unlink=True)

# Simplify physical theatre spotlights: 2 stations of six aimable spot fixtures
# instead of four crowded rows of eight. All structural overhead trusses remain.
for obj in list(rig.objects):
    name=obj.name
    if name.startswith(('Professional theatrical Fresnel spotlight','Fresnel front diffusion lens','Barn door fin','Adjustable spotlight clamp')):
        parts=name.split(' ')
        import re
        match=re.search(r'(?:station|spotlight |lens |fin )(\d+)[/ ](\d+)',name)
        if match:
            station=int(match.group(1));lamp=int(match.group(2))
            if station in (0,3) or lamp in (1,6):
                bpy.data.objects.remove(obj,do_unlink=True)

seatmat=bpy.data.materials.get('S01 Midnight grey wool boucle seating')
metal=bpy.data.materials.get('S01 Brushed black steel')
bronze=bpy.data.materials.get('S01 Warm satin champagne stainless')
leather=bpy.data.materials.get('S01 Black leather seat shells')
slate=bpy.data.materials.get('S01 Black basalt with mineral aggregate')
assert all((seatmat,metal,bronze,leather,slate))

def cube(name,loc,dims,material,collection,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(obj.users_collection):c.objects.unlink(obj)
    collection.objects.link(obj);obj.data.materials.append(material)
    if bevel:
        mod=obj.modifiers.new('Tailored corner radius','BEVEL')
        mod.width=bevel;mod.segments=3
        obj.modifiers.new('Smooth hard surface normals','WEIGHTED_NORMAL')
    return obj

# Continuous fashion-week benches follow the side runway. Low backs keep the
# audience human-scaled and the garment fully visible from presentation views.
for side in (-1,1):
    for row in range(3):
        x=side*(2.02+row*.78)
        z=-.126+row*.10
        cube(f'S01 runway wool bench cushion {side}-{row}',(x,-3.24,z+.40),(.65,7.55,.13),seatmat,seats,.062)
        cube(f'S01 matte leather lower bench shell {side}-{row}',(x,-3.24,z+.318),(.68,7.65,.08),leather,seats,.032)
        cube(f'S01 narrow titanium seating footrail {side}-{row}',(x,-3.24,z+.095),(.61,7.43,.033),metal,seats,.011)
        cube(f'S01 bench underside architectural shadow {side}-{row}',(x,-3.24,z+.25),(.59,7.40,.08),metal,seats,.021)
        for y in (-6.90,-5.15,-3.40,-1.65,.09):
            cube(f'S01 single seat couture seam {side}-{row} {y}',(x,y,z+.474),(.57,.007,.002),leather,seats,.0)
        for y in (-6.90,-4.95,-3,-1.05,.66):
            for offset in (-.215,.215):
                cube(f'S01 bench support {side}-{row} {y} {offset}',(x+offset,y,z+.16),(.034,.042,.30),metal,seats,.008)

# Eliminate the black doorway band at stage/runway junction: the stage
# surfaces share a coherent matte basalt and a 3mm raised independent border.
front=bpy.data.objects.get('Runway walkable upper surface / Z = 0')
rear=bpy.data.objects.get('Performance stage surface / Z = 0')
if front:
    front.data.materials.clear();front.data.materials.append(slate)
    front.location.z=-.040;front['top_height_m']=-.002
if rear:
    rear.data.materials.clear();rear.data.materials.append(slate)
    rear['top_height_m']=0.0
# Shadow gap is a thin join, no big step. Deliberately dark front nose reads
# architectural, and the garment's feet remain on the zero datum.

# Use directional, material-preserving light rather than flat gallery white.
for name,color in [
    ('S01 Warm honed architectural limestone',(.225,.218,.204)),
    ('S01 Midnight grey wool boucle seating',(.12,.128,.132)),
    ('S01 Black basalt with mineral aggregate',(.060,.062,.066)),
    ('S01 Soft charcoal acoustic architectural plaster',(.063,.068,.074)),
]:
    m=bpy.data.materials.get(name)
    if not m:continue
    m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF')
    if bs:bs.inputs['Base Color'].default_value=(*color,1)
    for n in m.node_tree.nodes:
        if n.type=='VALTORGB':
            n.color_ramp.elements[0].color=(*[v*.84 for v in color],1)
            n.color_ramp.elements[1].color=(*[min(1,v*1.14) for v in color],1)
for name,energy in [
    ('Key / garment texture',650),('Fill / preserve fabric black detail',320),
    ('Overhead wardrobe / bright lace details',340),('Back rim / hair and shoulders',520),
    ('Rear wall graze',130),
]:
    obj=bpy.data.objects.get(name)
    if obj:obj.data.energy=energy
for name,emission in [('S01 Warm diffused LED 3100K',2.6),('S01 Neutral 4600K LED',2.4),('S01 Soft gold stage footlight',1.8)]:
    m=bpy.data.materials.get(name)
    if m:
        bs=m.node_tree.nodes.get('Principled BSDF')
        if bs:bs.inputs['Emission Strength'].default_value=emission
world=s.world
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.33

# Keep real showroom architecture and stage scale. The reference actor is
# deliberately hidden from stage design renders, where its old proxy tee makes
# a false impression of live garment quality; the collection remains toggleable.
ref=bpy.data.collections.get('90b SCALE REFERENCE ONLY / imported EXO body and proxy tee')
if ref:
    ref.hide_render=True
    ref.hide_viewport=True

# Four completely unobstructed cameras; interior perspectives remain INSIDE
# the room footprint and aim at the avatar feet datum.
def place(key,loc,target,lens):
    cam=bpy.data.objects.get(key)
    if not cam:raise RuntimeError('Missing stage camera '+key)
    cam.location=loc
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.lens=lens
    cam.data.clip_start=.04
    return cam
cams={
    'hero':place('CAMERA 01 / fashion editorial',(1.00,-5.9,2.60),(0,0.65,1.61),37),
    'front':place('CAMERA 02 / symmetrical stage',(0,-10.55,3.02),(0,.15,2.12),31),
    'overview':place('CAMERA 03 / runway room wide',(1.75,-8.30,8.50),(0,-1.60,2.10),25),
    'side':place('CAMERA 04 / outfit spatial side',(1.54,-1.97,2.25),(0,.65,1.38),44),
}
s.camera=cams['front']
s.render.resolution_x=1440
s.render.resolution_y=960
s.render.resolution_percentage=75
s.cycles.samples=20
s['id']='EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-REVIEW'
s['reviewStatus']='Fashion runway bench/seating polish; visual approval pending'
s['basis']='Original EXO geometry inspired by read-only analysis of local CLO Stage_01.zprj'
s['footOrigin']=[0,0,0]
s['reviewActorVisible']=False
s['userApprovalRequiredBeforeAppIntegration']=True
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':
        a.spaces.active.region_3d.view_perspective='CAMERA'
        a.spaces.active.overlay.show_extras=False

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3.blend'),compress=True)
for obj in bpy.context.selected_objects:obj.select_set(False)
stage=[]
for c in [bpy.data.collections[key] for key in ('01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers')]:
    for obj in c.objects:
        if obj.type in ('MESH','FONT'):
            obj.select_set(True);stage.append(obj)
assert stage
bpy.context.view_layer.objects.active=stage[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-STAGE-ONLY.glb'),export_format='GLB',use_selection=True,export_apply=True)
for obj in stage:obj.select_set(False)

names=['hero','front','overview','side']
if os.getenv('STAGE_REVIEW_QUICK')=='1':names=['hero','front']
for name in names:
    camera=cams[name]
    s.camera=camera
    hidden=[]
    if name=='overview':
        for obj in bpy.data.objects:
            if obj.name.startswith(('Overhead dark steel portal lintel','Acoustic overhead panel','Perimeter roof suspended beam')):
                hidden.append((obj,obj.hide_render));obj.hide_render=True
    s.render.filepath=os.path.join(ROOT,f'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-{name}.png')
    bpy.ops.render.render(write_still=True)
    for obj,previous in hidden:obj.hide_render=previous
report={
 'id':'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-REVIEW','projectRoot':ROOT,'cameras':list(cams),
 'meshObjectsExported':len(stage),'oldAuditoriumChairsRemoved':removed,
 'renderedViews':names,'avatarFeetOrigin':[0,0,0],'runwaySurfaceTopZ_m':-.002,
 'stageSurfaceTopZ_m':0,'previewActorIncludedInGlb':False,
 'installedInEXO':False,'approvedByUser':False,'sourceCLOProjectModified':False,
}
with open(os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-CLEAN-V3-review.json'),'w') as f:json.dump(report,f,indent=2)
print('EXO_RUNWAY_CLEAN_V3_READY',json.dumps(report))
