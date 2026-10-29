"""Blender-only EXO Studio 01 Runway Chamber draft, inspired by user's Stage_01.ZPRJ geometry.
Original geometry, no purchased CLO asset geometry reused. 1 Blender unit = 1 metre.
CLO user's source is only inspected/read. Stage geometry and reference preview stay separate.
"""
import bpy,math,os,json,random
from mathutils import Vector
from math import pi
ROOT=os.path.dirname(os.path.abspath(__file__))
ROOT_PROJECT=os.path.abspath(os.path.join(ROOT,'../../..'))
random.seed(47)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for coll in list(bpy.data.collections):
    if coll.name=='Collection':bpy.data.collections.remove(coll)

def group(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
shell=group('01 ARCHITECTURE / enveloping performance space')
runway=group('02 RUNWAY / walkable geometry origin 0,0,0')
seating=group('03 AUDIENCE / bleachers and individual seating')
setdetails=group('04 DETAILS / reveals, reliefs, trims and fixtures')
rig=group('05 LIGHTING / physical stage rig & diffusers')
reference=group('90 REFERENCE / removable scale actor ONLY')
photography=group('91 PHOTOGRAPHY / cameras & studio light rig')

def mat(name,c,rough=.65,metal=.0,noise=0,bump=.10,emit=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    nodes=m.node_tree.nodes;link=m.node_tree.links
    bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if emit:
        bs.inputs['Emission Color'].default_value=(*c,1)
        bs.inputs['Emission Strength'].default_value=emit
    if noise:
        inp=nodes.new('ShaderNodeTexNoise');inp.inputs['Scale'].default_value=noise;inp.inputs['Detail'].default_value=4
        tex=nodes.new('ShaderNodeTexCoord');link.new(tex.outputs['Generated'],inp.inputs['Vector'])
        ramp=nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.26;ramp.color_ramp.elements[1].position=.75
        ramp.color_ramp.elements[0].color=(*[x*.84 for x in c],1)
        ramp.color_ramp.elements[1].color=(*[min(1,x*1.17) for x in c],1)
        link.new(inp.outputs['Fac'],ramp.inputs['Fac']);link.new(ramp.outputs['Color'],bs.inputs['Base Color'])
        bumpNode=nodes.new('ShaderNodeBump');bumpNode.inputs['Strength'].default_value=bump
        bumpNode.inputs['Distance'].default_value=.004
        link.new(inp.outputs['Fac'],bumpNode.inputs['Height']);link.new(bumpNode.outputs['Normal'],bs.inputs['Normal'])
    return m
stone=mat('S01 Warm honed architectural limestone',(0.35,.34,.32),.89,noise=90,bump=.13)
slate=mat('S01 Black basalt with mineral aggregate',(.067,.074,.08),.8,noise=150,bump=.12)
concrete=mat('S01 Dark concrete construction',(.095,.105,.113),.84,noise=72,bump=.17)
plaster=mat('S01 Soft charcoal acoustic architectural plaster',(.087,.093,.098),.9,noise=160,bump=.07)
metal=mat('S01 Brushed black steel',(.035,.039,.043),.37,.72)
bronze=mat('S01 Warm satin champagne stainless',(.36,.28,.19),.32,.69)
stainless=mat('S01 Dark titanium stainless',(.16,.17,.17),.29,.82)
seatmat=mat('S01 Midnight grey wool boucle seating',(.19,.20,.21),.89,noise=150,bump=.08)
seatback=mat('S01 Black leather seat shells',(.046,.046,.05),.59)
ledwarm=mat('S01 Warm diffused LED 3100K',(1,.77,.55),.4,emit=6)
ledwhite=mat('S01 Neutral 4600K LED',(.8,.89,1),.4,emit=4.6)
ledgold=mat('S01 Soft gold stage footlight',(.99,.67,.29),.3,emit=3.0)
velvet=mat('S01 Deep velvet side drapery',(.024,.025,.028),.95,noise=37,bump=.045)

def move(obj,c):
    for old in list(obj.users_collection):old.objects.unlink(obj)
    c.objects.link(obj)
    return obj

def cube(name,loc,dims,m,c,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object;ob.name=name;ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    move(ob,c);ob.data.materials.append(m)
    if bevel:
        mod=ob.modifiers.new('Light-catching edge microbevel','BEVEL');mod.width=bevel;mod.segments=2
        ob.modifiers.new('Shading weighted corner normals','WEIGHTED_NORMAL')
    return ob

def cyl(name,loc,r,dep,m,c,vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=dep,location=loc)
    ob=move(bpy.context.object,c);ob.name=name;ob.data.materials.append(m)
    for poly in ob.data.polygons:poly.use_smooth=True
    return ob

def rod(name,source,dest,r,m,c,n=12):
    a=Vector(source);b=Vector(dest);ob=cyl(name,(a+b)/2,r,(b-a).length,m,c,n)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob

def plane_custom(name,points,material,c):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);c.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def text_mesh(name,txt,loc,size,m,c):
    cv=bpy.data.curves.new(name,'FONT');cv.body=txt;cv.size=size;cv.align_x='CENTER';cv.extrude=.001;cv.space_character=1.12
    ob=bpy.data.objects.new(name,cv);c.objects.link(ob);ob.location=loc
    # Blender text faces +Z by default; face runway toward negative Y.
    ob.rotation_euler=(pi/2,0,0);cv.materials.append(m)
    return ob

# Fully enclosing 11m by 15m original theatre dimensions; the camera looks
# into an OPEN FRONT cross-section (no facade outside field of view).
cube('Sub-floor foundation / monolithic dark concrete',(0,-2.0,-.475),(11.1,15.2,.30),concrete,shell,.08)
cube('Audience floor / clean mineral basalt',(0,-2.0,-.303),(11.0,15.15,.060),slate,shell,.006)
cube('Left acoustic wall / 7m reveal',(-5.50,-1.9,2.90),(.27,15,6.1),plaster,shell,.014)
cube('Right acoustic wall / 7m reveal',(5.50,-1.9,2.90),(.27,15,6.1),plaster,shell,.014)
cube('Rear monolithic wall',(0,5.55,2.9),(11.05,.30,6.3),concrete,shell,.012)
# Roof with deep acoustic coffers; front y<-5 deliberately open to inspection.
for i in range(9):
    y=-4.9+i*1.22
    cube(f'Overhead dark steel portal lintel {i+1:02}',(0,y,6.15),(10.85,.155,.31),metal,shell,.016)
for sx in (-1,1):
    x=sx*5.26
    cube(f'Perimeter roof suspended beam {sx}',(x,.2,6.17),(.20,11.6,.30),metal,shell,.02)
    for z in (.29,2.20,4.65):
        cube(f'Acoustic dark stone horizontal picture rail {sx} {z}',(sx*5.31,-2,z),(.11,14.75,.085),black if False else metal,shell,.005)
# Wall relief and architectural baseboards; upper rough stone slats.
for sx in (-1,1):
    for i in range(22):
        yy=-8.7+i*.625
        cube(f'Fluted side acoustic panel {sx} {i:02}',(sx*5.23,yy,3.52),(.065,.39,4.8),slate,setdetails,.015)
        if i%3==1:
            cube(f'Brass interior cheek reveal {sx} {i:02}',(sx*5.17,yy+.224,3.15),(.022,.012,3.4),bronze,setdetails,.002)

# Back stage and one runway spine both have walkable top at global Z=0.
cube('Performance stage visible platform face',(0,2.75,-.153),(7.45,4.9,.303),metal,runway,.035)
cube('Performance stage surface / Z = 0',(0,2.75,-.029),(7.48,4.92,.058),slate,runway,.009)
cube('Runway drop shadow base',(0,-3.25,-.18),(2.6,7.85,.21),metal,runway,.033)
cube('Runway walkable upper surface / Z = 0',(0,-3.25,-.038),(2.56,7.80,.076),slate,runway,.014)
cube('Runway rear bridge / no collision gap',(0,.6,-.05),(2.52,1.6,.10),slate,runway,.013)
cube('Runway front apron',(0,-7.24,-.110),(3.02,.63,.22),concrete,runway,.028)
# Beveled flat platform edges, recessed LEDs, control thresholds.
for side in (-1,1):
    x=side*1.282
    cube(f'Runway brushed bronze perimeter {side}',(x,-3.25,.002),(.013,7.62,.005),bronze,setdetails,.002)
    cube(f'Runway integrated low-profile LED {side}',(x+side*.035,-3.25,-.054),(.022,7.62,.012),ledwarm,setdetails,.004)
    cube(f'Front main-stage chrome trim {side}',(side*3.71,2.75,-.035),(.014,4.62,.012),bronze,setdetails,.003)
cube('Runway bronze metal nose',(0,-7.18,-.026),(2.56,.018,.014),bronze,setdetails,.004)
cube('Runway concealed front diffuser',(0,-7.193,-.072),(2.38,.018,.014),ledwarm,setdetails,.005)
for y in [0.95,1.25,1.55,1.85]:
    cube(f'Stage hand polished slate seam y={y:.2}',(0,y,.002),(6.76,.007,.003),stainless,setdetails,0)

# Spatial depth: monumental stage wall with inset rectangular floating art bay.
cube('Backstage monumental block / deep shadow field',(0,5.29,2.6),(8.05,.35,5.25),metal,shell,.018)
cube('Stone backfield center',(0,5.073,2.73),(5.05,.08,4.83),stone,shell,.015)
for side in (-1,1):
    cube(f'Giant limestone wing pilaster {side}',(side*3.57,4.94,2.78),(1.00,.50,5.36),stone,shell,.055)
    cube(f'Inset gold perimeter vertical reveal {side}',(side*2.60,4.987,2.82),(.026,.10,4.61),bronze,setdetails,.004)
    cube(f'Giant wing inset matte graphite rail {side}',(side*4.30,5.00,2.55),(.10,.18,4.88),metal,setdetails,.008)
for z in (.56,5.08):
    cube(f'Floating central ceiling frame {z}',(0,4.995,z),(5.26,.14,.046),bronze,setdetails,.005)
# Dimensional sculpted limestone gill fins, with repeating hierarchy of depth.
for i in range(-12,13):
    x=i*.187
    depth=.18 if i%3==0 else .082
    cube(f'Carved limestone rear standing rib {i:+03}',(x,4.99-depth*.48,2.78),(.094,depth,4.30),stone,setdetails,.014)
# Tall standing columns flank runway exit and create an enveloping layered image.
for sx in (-1,1):
    cube(f'Stone side inturned display pier {sx}',(sx*4.49,3.20,2.28),(.40,.50,4.9),stone,shell,.045)
    cube(f'Subtle vertical gallery light wash {sx}',(sx*4.285,3.2,2.60),(.018,.06,3.81),ledwarm,setdetails,.003)
    cube(f'Bronze side mask {sx}',(sx*4.69,3.18,2.58),(.018,.49,4.75),bronze,setdetails,.005)
text_mesh('Rear stage small engraved EXO logotype','E X O',(0,4.828,4.8),.28,metal,setdetails)
text_mesh('Rear stage secondary inscription','A T E L I E R   /   S T U D I O   0 1',(0,4.820,4.48),.09,bronze,setdetails)

# Seating: stepped concrete terraces + dozens of individually modeled chairs.
# This is the largest difference from the previous flat wall/gallery stage.
for side in (-1,1):
    for row in range(4):
        xx=side*(2.02+row*.78)
        cube(f'Audience riser structure {side}/{row}',(xx,-3.23,-.195+row*.10),(.755,7.90,.12),concrete,seating,.018)
        cube(f'Audience brushed metal edge {side}/{row}',(xx-side*.35,-3.23,-.127+row*.10),(.018,7.69,.015),bronze,seating,.004)
        for col in range(9):
            yy=-6.83+col*.84
            # Chair seat follows a realistic 46cm seat and 43cm back at small scale.
            zbase=-.126+row*.10
            seat=cube(f'Upholstered auditorium seat S{side} R{row} C{col}',(xx,yy,zbase+.41),(.55,.44,.095),seatmat,seating,.035)
            shellback=cube(f'Auditorium curved back shell S{side} R{row} C{col}',(xx,yy+.17,zbase+.78),(.54,.09,.57),seatback,seating,.025)
            inner=cube(f'Seat back wool insert S{side} R{row} C{col}',(xx,yy+.115,zbase+.80),(.49,.026,.48),seatmat,seating,.018)
            for dx in (-.205,.205):
                rod(f'Seat tube legs {side}/{row}/{col}/{dx}',(xx+dx,yy,zbase+.03),(xx+dx,yy,zbase+.39),.019,stainless,seating)
        # Low level aisle marker follows audience riser.
        cube(f'Integrated low-level seating guide {side}/{row}',(xx,-7.24,zbase+.045),(.53,.018,.012),ledgold,seating,.002)

# Side audience rails and step nosings set the sight lines.
for side in (-1,1):
    railx=side*1.63
    for yy in (-7.9,-3.5,.7):
        rod(f'Runway gallery guardrail post {side}/{yy}',(railx,yy,-.26),(railx,yy,.41),.025,stainless,setdetails)
    rod(f'Runway low gallery handrail {side}',(railx,-7.9,.41),(railx,.7,.41),.025,bronze,setdetails)
    for k in range(16):
        yy=-7.6+k*.56
        cube(f'Visible runway exterior stone joint {side}/{k}',(side*1.45,yy,-.096),(.025,.014,.007),metal,setdetails,.001)

# Overhead catwalk trusses: recognizable actual 3D rig, focusable lights,
# brackets and cable conduits, three bands across the interior room.
for station,y in enumerate((-5.35,-2.2,1.20,3.47)):
    for zoff in (0,.25):
        for side in (-1,1):
            rod(f'Truss station {station} tube {zoff} x-end {side}',(-4.93,y,5.65+zoff),(4.93,y,5.65+zoff),.037,metal,rig,16)
    for n in range(19):
        xx=-4.7+n*.525
        rod(f'Truss station {station} diagonal {n}',(xx,y,5.65),(xx+.28,y,5.90),.012,stainless,rig,10)
    for k in range(8):
        x=-3.60+k*1.02
        rod(f'Adjustable spotlight clamp at station{station}/lamp{k}',(x,y,5.66),(x,y,5.48),.027,metal,rig)
        ob=cyl(f'Professional theatrical Fresnel spotlight {station}/{k}',(x,y,5.32),.125,.27,metal,rig,24)
        ob.rotation_euler=(0,.075 if k%2==0 else -.075,0)
        cyl(f'Fresnel front diffusion lens {station}/{k}',(x,y,5.17),.092,.015,ledwhite,rig,20)
        for ax in (-.145,.145):
            cube(f'Barn door fin {station}/{k}/{ax}',(x+ax,y,5.16),(.055,.29,.12),metal,rig,.008)
    for end in (-1,1):
        rod(f'Ceiling suspension cable {station}/{end}',(end*4.8,y,6.14),(end*4.8,y,5.86),.02,stainless,rig)
# Recessed architectural downlights and ceiling acoustic slabs.
for y in (-3.94,-1.25,1.58,4.10):
    cube(f'Acoustic overhead panel at {y}',(0,y,6.33),(8.8,.92,.16),plaster,shell,.026)
    for side in (-1,1):
        cube(f'Recessed ceiling linear luminous channel {side} {y}',(side*3.4,y,6.19),(.018,.62,.02),ledwhite,rig,.004)

# Studio photometric rig is stored separately from physical fixtures; render
# spotlights and fixtures are independent adjustable controls in Blender.
def area(name,loc,target,power,size,color=(1,1,1),size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=size_y or size;data.color=color
    ob=bpy.data.objects.new(name,data);photography.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
area('Key / garment texture',(-3.1,-3.0,5.45),(0,.25,1.2),1300,3.6,(1,.93,.82),2.2)
area('Fill / preserve fabric black detail',(3.4,-1.2,4.6),(0,.1,1.0),720,3.0,(.81,.88,1),2.4)
area('Overhead wardrobe / bright lace details',(0,-.85,5.8),(0,0,1.10),580,4,(1,1,1),1.9)
area('Back rim / hair and shoulders',(0,3.5,4.4),(0,.2,1.2),900,3.4,(1,.83,.68),1.5)
area('Rear wall graze',(-2.2,3.9,5.05),(0,4.8,2.9),225,3,(1,.91,.82),1.0)

# User CLO file has explicit separate physical stage and garment/avatar; align
# native reference to platform top exactly at origin before any integration.
anchor=bpy.data.objects.new('EXO AVATAR FEET ANCHOR / global (0,0,0)',None)
runway.objects.link(anchor);anchor.empty_display_type='ARROWS';anchor.empty_display_size=.32
anchor.location=(0,0,0);anchor.hide_render=True
anchor['avatar_reference_height_m']=1.75
anchor['stage_origin_floor_z_m']=0.0
anchor['collidable_floor_surfaces']=['Runway walkable upper surface / Z = 0','Performance stage surface / Z = 0']

# Real installed CLO Thomas avatar & PREVIEW garment, linked for scale only.
# All preview meshes stay in independently removable collection and are excluded
# from stage-only GLB. The saved body/tee mesh is not a simulated EXO garment.
existing=os.path.join(ROOT_PROJECT,'concepts/stages/studio-01-gallery/gallery-studio-01-v3-REVIEW.blend')
if os.path.isfile(existing):
    with bpy.data.libraries.load(existing,link=False) as (fromFile,toFile):
        toFile.collections=['90 · PREVIEW ONLY · mannequin & placeholder tee'] if '90 · PREVIEW ONLY · mannequin & placeholder tee' in fromFile.collections else []
    if toFile.collections:
        coll=toFile.collections[0]
        if coll:
            bpy.context.scene.collection.children.link(coll)
            coll.name='90b SCALE REFERENCE ONLY / imported EXO body and proxy tee'


def camera(name,loc,target,lens):
    data=bpy.data.cameras.new(name);data.lens=lens
    ob=bpy.data.objects.new(name,data);photography.objects.link(ob)
    ob.location=loc;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler();return ob
cams={
 'hero':camera('CAMERA 01 / fashion editorial',(7.1,-10.6,4.7),(0,-.35,2.03),32),
 'front':camera('CAMERA 02 / symmetrical stage',(0,-13.1,4.25),(0,-.10,2.13),33),
 'overview':camera('CAMERA 03 / runway room wide',(9.7,-12.8,11.7),(0,-1.72,2.0),28),
 'side':camera('CAMERA 04 / outfit spatial side',(7,-4.7,3.35),(0,-.05,1.3),31),
}
s=bpy.context.scene;s.camera=cams['hero']
s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True
s.render.resolution_x=1500;s.render.resolution_y=1000
s.render.resolution_percentage=75
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
s.render.film_transparent=False
world=bpy.data.worlds.new('Gallery restrained low-key ambience');s.world=world
world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.38,.42,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
s['id']='EXO-STAGE01-RUNWAY-CHAMBER-V1-REVIEW'
s['based_on']='Dimensional and functional study of local CLO Stage_01.zprj; original asset mesh/textures NOT copied'
s['source_reference']='User CLO Stage_01.zprj original 11m x 16m x 7m showroom / runway'
s['review_only']=True
s['not_integrated_into_exo_app']=True
s['avatar_foot_anchor_blender']=[0,0,0]
s['geometry_units']='metres'
s['GLB_transform']='Blender Z-up maps to Three.js Y-up'
s['collision']='Proposed walkable mesh floor, not yet wired into EXO collision'
for ar in bpy.context.screen.areas:
    if ar.type=='VIEW_3D':
        ar.spaces.active.region_3d.view_perspective='CAMERA'

out_blend=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-DRAFT.blend')
bpy.ops.wm.save_as_mainfile(filepath=out_blend,compress=True)
# Save optional review GLB containing ONLY original stage geometry (excludes
# all spot photography lights, proxy avatar and cameras); don't install in app.
for ob in bpy.context.selected_objects:ob.select_set(False)
stage_objs=[]
for col in (shell,runway,seating,setdetails,rig):
    for ob in col.objects:
        if ob.type in ('MESH','FONT'):
            ob.select_set(True);stage_objs.append(ob)
if stage_objs:
    bpy.context.view_layer.objects.active=stage_objs[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-STAGE-ONLY-DRAFT.glb'),export_format='GLB',use_selection=True,export_apply=True)
for ob in stage_objs:ob.select_set(False)

for name in ('hero','front','overview','side'):
    s.camera=cams[name]
    s.render.filepath=os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-'+name+'.png')
    bpy.ops.render.render(write_still=True)
report={'stageId':'EXO-STAGE01-RUNWAY-CHAMBER-V1-REVIEW','reference':'CLO Stage_01.zprj (inspected, unchanged)','studioFootprintMeters':[11.1,15.2],'heightMeters':6.5,'avatarOrigin':[0,0,0],'walkableSurfaceMeters':0,'stageObjects':len(stage_objs),'referenceActorExcludedFromGlb':True,'integratedIntoApp':False,'cameraViews':list(cams.keys())}
with open(os.path.join(ROOT,'EXO-STAGE01-RUNWAY-CHAMBER-review.json'),'w') as fd:json.dump(report,fd,indent=2)
print('EXO_STAGE01_STANDALONE_REVIEW',json.dumps(report))
