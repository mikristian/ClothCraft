"""Polish Stage 01 into an image-textured fashion editorial review asset.
All edits remain in this isolated concept folder. Never updates EXO production stages.
"""
import bpy, math, random, os, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'EXO-STAGE01-RUNWAY-CHAMBER-FINAL-REVIEW.blend'))
random.seed(71)
s=bpy.context.scene
c=bpy.data.collections['90b SCALE REFERENCE ONLY / imported EXO body and proxy tee']
# Replace mechanical preview garment, keeping actual user's locally-available body,
# hairstyle, eyes and shoes solely in the disposable preview collection.
for ob in list(c.objects):
    if ob.name not in {'body_mesh','hair_mesh','eye_L_mesh','eye_R_mesh','eyelash_L_mesh','eyelash_R_mesh','shoes_l_mesh','shoes_r_mesh'}:
        bpy.data.objects.remove(ob,do_unlink=True)

# Opaque diffuse fabrics with fine actual surface texture and physically modeled hems.
def basic_material(name,col,rough=.80):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1)
    bs=m.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=145
    bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.09;bump.inputs['Distance'].default_value=.003
    m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
cotton=basic_material('S01 PREVIEW | matte heavy 320GSM ivory cotton',(.69,.665,.615),.91)
seams=basic_material('S01 PREVIEW | ivory garment stitching',(.56,.535,.49),.93)
denim=basic_material('S01 PREVIEW | rinsed charcoal workwear trouser',(.095,.102,.11),.88)
trim=basic_material('S01 PREVIEW | denim seam topstitch',(.155,.160,.165),.88)

def mesh_obj(name,verts,faces,material):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh);c.objects.link(ob);ob.data.materials.append(material)
    for poly in mesh.polygons:poly.use_smooth=True
    solid=ob.modifiers.new('Visual fabric shell thickness','SOLIDIFY');solid.thickness=.003
    subdiv=ob.modifiers.new('Soft fabric surface','SUBSURF');subdiv.levels=1;subdiv.render_levels=1
    return ob

def tube(name,rings,material,count=48):
    # Ring data (x_center,y_center,z_center,rx,ry,phase). A tube's elliptical
    # cross section lies in X/Y, with its longitudinal direction along Z.
    v=[];f=[]
    for k,(xc,yc,z,rx,ry,phase) in enumerate(rings):
        for j in range(count):
            a=j*2*math.pi/count
            wrinkle=.0028*math.cos(4*a+phase+z*9)*math.sin((z-.78)*5)**2
            v.append((xc+(rx+wrinkle)*math.cos(a),yc+(ry+wrinkle*.55)*math.sin(a),z))
    for k in range(len(rings)-1):
        for j in range(count):a=k*count+j;b=k*count+(j+1)%count;f.append((a,b,b+count,a+count))
    return mesh_obj(name,v,f,material)

# Closer tailoring: waist and chest radius change continuously; collar opening
# is modeled as a smaller upper ring rather than a sealed tube across the neck.
tee_rings=[]
for z,rx,ry in [(.935,.250,.155),(.96,.251,.163),(1.01,.255,.163),(1.08,.258,.16),(1.15,.258,.162),(1.23,.261,.164),(1.30,.275,.160),(1.355,.282,.159),(1.398,.286,.153),(1.42,.242,.144),(1.442,.15,.100),(1.453,.096,.076)]:
    tee_rings.append((0,0,z,rx,ry,.18))
tube('PREVIEW ORGANIC KNIT SHIRT | torso tailoring',tee_rings,cotton,64)

def sleeve(sign):
    # Longitudinal ring axis runs from neck-side upper arm to a naturally
    # drooping cuff. Cuffs follow the unclothed forearm instead of cylinders.
    verts=[];faces=[];n=36
    points=[(.237,1.382,.122),(.283,1.362,.129),(.332,1.334,.126),(.385,1.302,.119),(.434,1.268,.114),(.466,1.252,.112)]
    for index,(x,z,r) in enumerate(points):
        for j in range(n):
            a=j*math.tau/n
            verts.append((sign*x,r*math.cos(a),z+r*.82*math.sin(a)+.005*math.sin(a*3+index)))
    for k in range(len(points)-1):
        for j in range(n):a=k*n+j;b=k*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    ob=mesh_obj('PREVIEW ORGANIC KNIT SHIRT | '+('L' if sign<0 else 'R')+' sleeve',verts,faces,cotton)
    return ob
for sign in (-1,1):sleeve(sign)

# Rib collar resting around 1.45m, with visible stitch depth.
def curve_line(name,coords,material,width=.004,cyclic=False):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.resolution_u=12;cv.bevel_depth=width;cv.bevel_resolution=2
    spl=cv.splines.new('POLY');spl.points.add(len(coords)-1)
    for p,v in zip(spl.points,coords):p.co=(*v,1)
    spl.use_cyclic_u=cyclic
    ob=bpy.data.objects.new(name,cv);c.objects.link(ob);cv.materials.append(material)
    return ob
curve_line('PREVIEW COTTON COLLAR / upper rib',[(.096*math.cos(a*math.tau/64),.077*math.sin(a*math.tau/64),1.455) for a in range(64)],seams,.007,True)
curve_line('PREVIEW COTTON TEE / curved lower hem',[(.25*math.cos(a*math.tau/80),.155*math.sin(a*math.tau/80),.938+.007*math.cos(a*math.tau/80)) for a in range(80)],seams,.003,True)
for sign in (-1,1):
    coords=[]
    for i in range(32):
        a=i*math.tau/32
        coords.append((sign*.467,.112*math.cos(a),1.252+.112*.82*math.sin(a)))
    curve_line('PREVIEW SLEEVE CUFF / '+str(sign),coords,seams,.0035,True)

# Continuous tapered trouser cloth replaces block calves, joints and geometric
# knee-bands. Two separately stitched legs join a continuous soft waist/pelvis.
hips=[(0,0,z,rx,ry,.1) for z,rx,ry in [(.75,.23,.16),(.81,.259,.162),(.89,.269,.153),(.967,.258,.151)]]
tube('PREVIEW DENIM WORKWEAR | natural hip/waist cloth',hips,denim)
for sign in (-1,1):
    rings=[]
    # explicit leg ring data: x center, z, width, depth
    for index,(xc,z,rx,ry) in enumerate([
        (.110,.065,.093,.095),(.11,.092,.094,.095),(.11,.21,.099,.099),
        (.11,.34,.103,.100),(.11,.48,.105,.102),(.113,.61,.111,.115),
        (.118,.72,.119,.120),(.12,.82,.120,.118),(.118,.88,.121,.12),
    ]):rings.append((sign*xc,0,z,rx,ry,.12+index*.16))
    tube('PREVIEW DENIM WORKWEAR | '+('left' if sign<0 else 'right')+' leg',rings,denim)
    curve_line('PREVIEW DENIM OUTSEAM / '+str(sign),[(sign*(xc+rx),0,z) for xc,z,rx in [(.110,.065,.093),(.11,.34,.103),(.113,.61,.111),(.12,.82,.120)]],trim,.002)
curve_line('PREVIEW DENIM waistband',[(.26*math.cos(i*math.tau/64),.151*math.sin(i*math.tau/64),.972) for i in range(64)],trim,.004,True)

# Physically present stage material textures (Blender AND exported glTF),
# creating subtle stone grain rather than a uniform procedural-only shader.
# Bind original source-safe image maps to base color. The Blender model retains
# editable roughness, metal, bump and lighting; GLB receives real image maps.
images={
 'S01 Warm honed architectural limestone':'limestone',
 'S01 Black basalt with mineral aggregate':'basalt',
 'S01 Dark concrete construction':'charcoal_concrete',
 'S01 Soft charcoal acoustic architectural plaster':'architectural_plaster',
 'S01 Midnight grey wool boucle seating':'midnight_seat_fabric',
 'S01 Black leather seat shells':'black_seat_shell',
 'S01 PREVIEW | matte heavy 320GSM ivory cotton':'ivory_heavy_cotton',
 'S01 PREVIEW | rinsed charcoal workwear trouser':'rinsed_denim',
 'S01 Dark titanium stainless':'satin_steel',
}
for mname,mapname in images.items():
    m=bpy.data.materials.get(mname)
    assert m,('Stage material unavailable',mname)
    image=bpy.data.images.load(str(ROOT/'textures'/(mapname+'.png')),check_existing=True)
    image.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage')
    node.label='EXO Physical PBR / '+mapname
    node.name='EXO PBR Texture'
    node.image=image
    node.interpolation='Linear'
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

# Localized, dark grounded palette and realistic soft-box intensity. Stage
# illumination comes from both real photo rig lights and architectural strips.
illum={
 'Key / garment texture':850,
 'Fill / preserve fabric black detail':370,
 'Overhead wardrobe / bright lace details':420,
 'Back rim / hair and shoulders':540,
 'Rear wall graze':160,
}
for name,power in illum.items():
    light=bpy.data.objects.get(name)
    assert light and light.type=='LIGHT'
    light.data.energy=power
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.13
s.view_settings.look='AgX - Medium High Contrast'
s.view_settings.view_transform='AgX'
s.view_settings.view_settings if False else None
s.view_settings.view_settings if False else None

# Distinct independent camera compositions for same studio: 2D/3D editor can
# later select cameras while garment stays in its own persistent coordinate space.
def camera(name,pos,target,lens):
    cam=bpy.data.objects.get(name)
    if cam is None:
        d=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,d)
        bpy.data.collections['91 PHOTOGRAPHY / cameras & studio light rig'].objects.link(cam)
    cam.location=pos
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.lens=lens
    return cam

cams={
 'editorial':camera('CAMERA 01 / fashion editorial',(3.35,-7.15,2.86),(0,-.05,1.51),48),
 'garment':camera('CAMERA 05 / actual garment close',(2.9,-4.25,2.25),(0,-.05,1.30),48),
 'front':camera('CAMERA 02 / symmetrical stage',(0,-12.8,3.15),(0,-.22,1.80),34),
 'runway':camera('CAMERA 06 / runway perspective',(0,-8.72,1.89),(0,2.52,1.60),36),
}

# Collection and status audit, explicit that preview does not represent native
# editable garment physics or a CLO garment. Review occurs before app changes.
assert not any(o.name.startswith('Mannequin') for o in c.objects)
s['stageVersion']='V3 photographic material and apparel review'
s['originalCloZprjUntouched']=True
s['stageStatus']='PREVIEW ONLY: user approval pending'
s['sourceStageGeometry']='Original EXO Blender; no CLO third-party meshes copied'
s['separateStageOnlyGLB']=True
s['actorShown']='CLO Thomas body with original lightweight proxy garment for illustrative scale only'
s['garmentPhysics']='Not connected. Clothcraft native Rust unchanged.'
s['avatarFeetAnchor']=[0,0,0]
s['stageLevelBlenderZMetres']=0.0

s.camera=cams['editorial']
s.render.engine='CYCLES';s.cycles.samples=28;s.cycles.use_denoising=True
s.render.resolution_x=1400;s.render.resolution_y=1050
s.render.resolution_percentage=72
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'EXO-STAGE01-V3-EDITORIAL-REVIEW.blend'),compress=True)

# Preserve read-only original and isolate candidate environment; only final
# Blender and GLB in concept folder, no live manifest updates.
for obj in bpy.context.selected_objects:obj.select_set(False)
stage=[]
for collection_name in ['01 ARCHITECTURE / enveloping performance space','02 RUNWAY / walkable geometry origin 0,0,0','03 AUDIENCE / bleachers and individual seating','04 DETAILS / reveals, reliefs, trims and fixtures','05 LIGHTING / physical stage rig & diffusers']:
    for ob in bpy.data.collections[collection_name].objects:
        if ob.type in ('MESH','FONT'):ob.select_set(True);stage.append(ob)
bpy.context.view_layer.objects.active=stage[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'EXO-STAGE01-V3-STAGE-ONLY-REVIEW.glb'),export_format='GLB',use_selection=True,export_apply=True)
for ob in stage:ob.select_set(False)

if os.environ.get('STAGE_V3_FAST'):
    s.cycles.samples=14;s.render.resolution_percentage=67
    shots=['editorial','garment']
else:
    shots=['editorial','garment','front','runway']
for shot in shots:
    s.camera=cams[shot]
    s.render.filepath=str(ROOT/f'EXO-STAGE01-V3-{shot}.png')
    bpy.ops.render.render(write_still=True)
report={'status':'STANDALONE VISUAL REVIEW','stageVersion':'V3','originalReference':'CLO Stage_01.zprj inspected without modification','blender':'EXO-STAGE01-V3-EDITORIAL-REVIEW.blend','stageOnlyGlb':'EXO-STAGE01-V3-STAGE-ONLY-REVIEW.glb','stageMeshCount':len(stage),'bodyActor':len(c.objects),'bodyInGlb':False,'imagePbrMaterials':len(images),'feetAnchor':[0,0,0],'floorTop':0,'editorIntegration':'NOT INSTALLED','renderShots':shots}
(ROOT/'EXO-STAGE01-V3-review.json').write_text(json.dumps(report,indent=2))
print('EXO_STAGE_V3_READY',json.dumps(report),flush=True)
