"""Standalone Blender 5.x preview. 1 unit = 1 m, Z up. Avatar origin (0, -0.25, 0).
Exports nothing into the EXO application: user approval required before integration.
"""
import bpy, math, os, random
from mathutils import Vector
from math import radians
ROOT=os.path.dirname(os.path.abspath(__file__))
random.seed(12)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection': bpy.data.collections.remove(c)
main=bpy.data.collections.get('Collection')
main.name='00 · STAGE / Gallery 01'

def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
architecture=collection('01 · Stone gallery architecture')
platform=collection('02 · Garment platform · top elevation 0m')
detail=collection('03 · Studio details & accents')
reference=collection('90 · PREVIEW ONLY · mannequin & placeholder tee')
rig=collection('91 · Camera & studio light rig')
def move_obj(obj,col):
    for old in list(obj.users_collection):old.objects.unlink(obj)
    col.objects.link(obj)
    return obj

def shader(name,color,rough=.7,metal=0,texture=False,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1)
        bs.inputs['Emission Strength'].default_value=emission
    if texture:
        tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=145
        tex.inputs['Detail'].default_value=2.3;tex.inputs['Roughness'].default_value=.65
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13
        bump.inputs['Distance'].default_value=.008
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        ramp=m.node_tree.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.12;ramp.color_ramp.elements[0].color=(*[v*.91 for v in color],1)
        ramp.color_ramp.elements[1].position=.89;ramp.color_ramp.elements[1].color=(*[min(1,v*1.065) for v in color],1)
        m.node_tree.links.new(tex.outputs['Fac'],ramp.inputs['Fac'])
        m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
    return m

chalk=shader('PBR / mineral chalk limestone',(.54,.52,.48),.89,texture=True)
fluted=shader('PBR / fine honed pale limestone',(.66,.64,.60),.8,texture=True)
plaster=shader('PBR / dry bone architectural plaster',(.18,.185,.187),.92,texture=True)
black=shader('PBR / graphite satin anodized',(.045,.051,.057),.36,.62)
platformtop=shader('PBR / matte warm graphite podium',(.078,.082,.087),.68,texture=True)
bronze=shader('PBR / champagne brushed metal',(.38,.33,.26),.34,.76)
softlight=shader('PBR / recessed warm diffused LED',(.93,.80,.64),.32,emission=5)
coollight=shader('PBR / neutral diffused LED',(.82,.88,.93),.34,emission=4)
slate=shader('PBR / charcoal limestone slab floor',(.10,.108,.115),.83,texture=True)
tee=shader('PREVIEW ONLY / ivory cotton t-shirt',(.79,.78,.75),.78,texture=True)
body=shader('PREVIEW ONLY / matte soft warm-grey mannequin',(.43,.405,.38),.85)
pants=shader('PREVIEW ONLY / charcoal trousers',(.115,.13,.145),.92)


def cub(name,loc,size,mat,col,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    move_obj(obj,col);obj.data.materials.append(mat)
    if bevel:
        mod=obj.modifiers.new('Soft architectural microbevels','BEVEL');mod.width=bevel;mod.segments=3
        mod.affect='EDGES'
        norm=obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return obj

def cyl(name,loc,radius,depth,mat,col,vertices=64,radius2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius if radius2 is None else radius2,depth=depth,location=loc)
    ob=bpy.context.object;ob.name=name;move_obj(ob,col);ob.data.materials.append(mat)
    for poly in ob.data.polygons:poly.use_smooth=True
    return ob

def ellipsoid(name,loc,scale,mat,col):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=scale;move_obj(ob,col);ob.data.materials.append(mat)
    for f in ob.data.polygons:f.use_smooth=True
    return ob

def beam(name,a,b,radius,mat,col):
    A=Vector(a);B=Vector(b);mid=(A+B)/2;ob=cyl(name,mid,radius,(B-A).length,mat,col,vertices=28)
    ob.rotation_euler=(B-A).to_track_quat('Z','Y').to_euler()
    return ob

def label(name,content,location,size,mat,col,align='CENTER'):
    cr=bpy.data.curves.new(name,'FONT');cr.body=content;cr.size=size;cr.extrude=.0003;cr.bevel_depth=.0003
    cr.align_x=align;cr.space_character=1.3
    ob=bpy.data.objects.new(name,cr);col.objects.link(ob);ob.location=location
    ob.rotation_euler[0]=math.pi/2
    ob.data.materials.append(mat)
    return ob

# RENDER GALLERY: stage floor is at global elevation Z = 0, so a native avatar
# may stand on it WITHOUT offsets. Behind the stage, decorative floor is lower.
cub('Infinite charcoal gallery floor', (0,-.46,-.222),(9.6,8.4,.18),slate,architecture,.025)
cub('Solid rear studio wall',(0,2.9,1.8),(9.5,.3,4.65),chalk,architecture,.03)
cub('Gallery ceiling upper soffit',(0,1.68,4.12),(9.6,2.65,.24),plaster,architecture,.05)
cub('Rear central inset, warm mineral',(0,2.718,1.78),(4.0,.17,3.72),plaster,architecture,.015)
cub('Inset upper recessed shadow rail',(0,2.59,3.657),(4.12,.13,.028),black,detail,.004)
cub('Inset vertical shadow border L',(-2.036,2.59,1.83),(.04,.12,3.72),black,detail,.004)
cub('Inset vertical shadow border R',(2.036,2.59,1.83),(.04,.12,3.72),black,detail,.004)

# Stone ribs: dimensional shadowed rhythm without arches or distracting branding.
for side in (-1,1):
    for i in range(8):
        x=side*(2.25+i*.243)
        depth=.095 if i%2==0 else .07
        cub('Fluted stone fin %s %02d'%(('L' if side<0 else 'R'),i), (x,2.62-depth*.2,1.84),(.132,depth,3.78),fluted,architecture,.017)
    cub('Outer monolithic pilaster %s'%side,(side*4.3,2.48,1.84),(.2,.34,3.88),chalk,architecture,.02)
    cub('Side ambient channel %s'%side,(side*2.119,2.49,1.80),(.018,.023,3.35),softlight,detail,.004)
    cub('Freestanding graphite fin %s'%side,(side*3.76,1.96,1.55),(.075,.31,3.05),black,detail,.008)

# Podium geometry / garment standing origin Z=0.
cub('Structural podium · shadow plinth',(0,-.29,-.167),(3.54,2.98,.12),black,platform,.025)
cub('Bronze podium reveal',(0,-.29,-.092),(3.56,3.0,.028),bronze,platform,.01)
cub('Body-safe walkable top · Z=0',(0,-.29,-.043),(3.54,2.98,.086),platformtop,platform,.022)
cub('Front toe-kick glow',(0,-1.789,-.133),(3.31,.018,.011),softlight,detail,.004)
cub('Left top edge fine inlay',(-1.69,-.29,.002),(.009,2.8,.003),bronze,detail,.001)
cub('Right top edge fine inlay',(1.69,-.29,.002),(.009,2.8,.003),bronze,detail,.001)

# Two lower gallery steps, offset behind the primary action zone.
cub('Back limestone riser shadow',(0,1.89,-.135),(5.28,.88,.13),black,architecture,.025)
cub('Back architectural tread',(0,1.89,-.057),(5.25,.85,.08),chalk,architecture,.022)

# Recessed warm vertical strips and backlit hanging overhead light bars.
cub('Suspended architectural black light housing',(0,.36,3.78),(4.9,.76,.15),black,detail,.018)
cub('Recessed cinematic ceiling diffuser',(0,.31,3.692),(4.65,.52,.025),coollight,detail,.008)
for i,xx in enumerate((-2.48,2.48)):
    cub(f'Rear wall floating light bar {i}',(xx,2.50,3.59),(.035,.065,.35),softlight,detail,.009)

# Restraint: a subtle studio identifier that can be hidden independently.
label('Embossed studio monogram','STUDIO  /  01',(0,2.615,3.26),.13,fluted,detail)
label('Technical set edition','GALLERY EDITION',(0,2.614,3.07),.064,bronze,detail)

# Landing marker for future EXO avatar and garment: 1.75m, origin at platform.
origin=bpy.data.objects.new('AVATAR_ORIGIN · floor at Z=0 · preview offset Y=-0.25',None)
platform.objects.link(origin);origin.empty_display_type='ARROWS';origin.empty_display_size=.36
origin.location=(0,-.25,0);origin.hide_render=True
origin['feet_z_m']=0.0;origin['avatar_height_reference_m']=1.75
origin['stage_surface']='Body-safe walkable top · Z=0'

# Reference mannequin is NOT a true imported CLO/EXO garment. It is in a
# separate collection to make removal before future export trivial.
Y=-.25
# Two legs and understated footwear
for x in (-.105,.105):
    cyl('Mannequin calf, reference', (x,Y,.307),.064,.48,pants,reference,32,radius2=.078)
    cyl('Mannequin thigh, reference',(x,Y,.717),.088,.41,pants,reference,32,radius2=.106)
    ellipsoid('Mannequin trouser hem and shoe',(x,Y-.058,.061),(.094,.16,.055),black,reference)
    ellipsoid('Mannequin knee joint',(x,Y,.528),(.073,.073,.065),pants,reference)
# Waist and neck silhouette
ellipsoid('Mannequin hips',(0,Y,.957),(.23,.15,.145),pants,reference)
ellipsoid('Mannequin neck',(0,Y,1.466),(.068,.061,.08),body,reference)
ellipsoid('Mannequin head',(0,Y,1.628),(.102,.107,.134),body,reference)
# Reference cotton tee in a human scale, soft actual garment silhouette
rings=[(.972,.26,.147),(1.06,.254,.153),(1.17,.251,.157),(1.26,.268,.166),(1.354,.28,.17),(1.412,.13,.105)]
verts=[];faces=[];n=48
for z,rx,ry in rings:
    for j in range(n):
        ang=2*math.pi*j/n
        verts.append((rx*math.cos(ang),Y+ry*math.sin(ang),z))
for k in range(len(rings)-1):
    for j in range(n):
        a=k*n+j;b=k*n+(j+1)%n
        faces.append((a,b,b+n,a+n))
mesh=bpy.data.meshes.new('Reference tee barrel mesh');mesh.from_pydata(verts,[],faces);mesh.update()
teeobj=bpy.data.objects.new('REFERENCE TEE · swap for actual garment later',mesh);reference.objects.link(teeobj)
teeobj.data.materials.append(tee)
for poly in mesh.polygons:poly.use_smooth=True
for sign in (-1,1):
    sleeve=beam('REFERENCE tee dropped sleeve',(sign*.239,Y,1.363),(sign*.404,Y,1.235),.11,tee,reference)
    sleeve.scale.x=.93;sleeve.scale.y=.83
    beam('Reference exposed forearm',(sign*.411,Y,1.209),(sign*.49,Y-.004,1.03),.052,body,reference)
    ellipsoid('Reference wrist/hand',(sign*.494,Y-.008,.996),(.044,.047,.074),body,reference)
# Thin collar trim
bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,location=(0,Y,1.427),major_radius=.10,minor_radius=.007)
coll=bpy.context.object;coll.name='Reference sewn neckline';coll.scale.y=.87;move_obj(coll,reference);coll.data.materials.append(shader('PREVIEW neckline',(.68,.67,.65),.8))

# Studio photographic illumination (physical large light sources, not exported).
def area(name,position,target,power,size,size_y=None,color=(1,1,1)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=size_y or size;data.color=color
    obj=bpy.data.objects.new(name,data);rig.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj
area('Softbox 01 | front left 3.4m',(-3.4,-3.9,4.8),(0,0,1.25),570,3.4,2.5,(1,.95,.89))
area('Softbox 02 | right fill',(3.2,-1.0,3.5),(0,0,1.25),320,2.9,2.4,(.89,.93,1.0))
area('Large overhead front diffused',(0,-.65,4.15),(0,0,1.2),440,4.0,2.0,(1,.99,.97))
area('Back garment rim',(0,2.1,3.6),(0,0,1.18),490,2.3,2.0,(1,.92,.81))

def camera(name,position,target,lens):
    data=bpy.data.cameras.new(name);data.lens=lens
    ob=bpy.data.objects.new(name,data);rig.objects.link(ob)
    ob.location=position;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
hero=camera('CAMERA / 01 editorial three-quarter',(3.55,-6.1,2.83),(0,.31,1.68),35)
front=camera('CAMERA / 02 straight-on catalog',(0,-8.1,2.25),(0,.39,1.76),39)
side=camera('CAMERA / 03 stage side',(7,-3.1,2.95),(0,.2,1.68),37)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
scene.camera=hero
scene.render.engine='CYCLES'
scene.cycles.samples=14 if os.environ.get('STAGE_FAST') else 28
scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=60 if os.environ.get('STAGE_FAST') else 100
scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('Studio soft grey ambient') if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.42,.44,.47,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.27
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
scene.render.image_settings.color_mode='RGB'
# Keep preview geometry excluded from future exports, but visible in test renders.
scene['stage_id']='STUDIO-01-GALLERY'
scene['stage_units']='metres'
scene['asset_status']='PREVIEW_ONLY__NOT_INSTALLED'
scene['garment_and_mannequin']='Reference proxy - replace with actual EXO avatar/garment'
scene['stage_stageFloorTopZ']=0
scene['usage']='Native project garment and 2D patterns remain separate from stage'
# Resolve viewport to camera, hide light widgets.
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':
        a.spaces.active.region_3d.view_perspective='CAMERA'

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'gallery-studio-01.blend'))
if not os.environ.get('STAGE_FAST'):
    reference.hide_render=True
    scene.camera=hero
    scene.render.filepath=os.path.join(ROOT,'gallery-studio-01-stage-only.png')
    bpy.ops.render.render(write_still=True)
    reference.hide_render=False
for name,cam in ([('hero',hero)] if os.environ.get('STAGE_FAST') else [('hero',hero),('front',front),('side',side)]):
    scene.camera=cam
    scene.render.filepath=os.path.join(ROOT,'gallery-studio-01-'+name+'.png')
    bpy.ops.render.render(write_still=True)
print('STAGE_PROTOTYPE_READY',ROOT)
