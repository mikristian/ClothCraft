"""Render an authentic saved EXO V2 garment + avatar + print artwork.

Uses the project's native solver vertex positions and the exact EXO saved
print graphic, paired to a freshly baked mesh with identical vertex indexing.
No garment, tech-pack, or source design data is copied to the public website.
Blender must run this in background, with `-- --snapshot ... --baked-obj ...`.
"""
import argparse
import base64
import io
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image

argv=__import__('sys').argv
argv=argv[argv.index('--')+1:] if '--' in argv else []
parser=argparse.ArgumentParser()
parser.add_argument('--snapshot',required=True)
parser.add_argument('--baked-obj',required=True)
parser.add_argument('--output',required=True)
options=parser.parse_args(argv)

data=json.loads(Path(options.snapshot).read_text())
xyz=data['state']['x']
print('EXO source:',data['template']['name'],'vertices',len(xyz),'graphic',[(x.get('name'),x.get('panel')) for x in data.get('printGraphics',[])])

# Parse the canonical baked OBJ without relying on Blender OBJ importer vertex
# reordering. Group/face identities remain those of the Rust compiler.
uv=[];faces=[];face_uv=[];groups=[];active='front';positions=[]
with open(options.baked_obj) as stream:
 for line in stream:
  tokens=line.split()
  if not tokens:continue
  if tokens[0]=='v':positions.append(tuple(float(x) for x in tokens[1:4]))
  elif tokens[0]=='vt':uv.append(tuple(float(x) for x in tokens[1:3]))
  elif tokens[0]=='g':active=tokens[1]
  elif tokens[0]=='f':
   verts=[int(x.split('/')[0])-1 for x in tokens[1:]]
   uv_ix=[int(x.split('/')[1])-1 for x in tokens[1:]]
   faces.append(verts);face_uv.append(uv_ix);groups.append(active)
assert len(positions)==len(xyz),f"Saved native solver {len(xyz)} vertices differ from baked {len(positions)}"

# Create the transparent graphic atlas in the source object's panel-local UV
# coordinates. Native graphic.positionMm uses top-left coordinates in mm.
front_uv=[uv[t] for fi,indexes in enumerate(face_uv) if groups[fi]=='front' for t in indexes]
minu=min(v[0] for v in front_uv);maxu=max(v[0] for v in front_uv)
minv=min(v[1] for v in front_uv);maxv=max(v[1] for v in front_uv)
span_x=maxu-minu;span_y=maxv-minv
atlas=Image.new('RGBA',(2048,2048),(255,255,255,0))
for graphic in data.get('printGraphics',[]):
 if not graphic.get('visible',True) or graphic.get('panel')!='front':continue
 source=graphic.get('dataUrl','')
 if not source.startswith('data:image/png;base64,'):continue
 original=Image.open(io.BytesIO(base64.b64decode(source.split(',',1)[1]))).convert('RGBA')
 width_mm=float(graphic['widthMm']);height_mm=float(graphic['heightMm'])
 x_mm,y_mm=graphic.get('positionMm') or [span_x*500-width_mm/2,span_y*500-height_mm/2]
 xx=round(x_mm/(span_x*1000)*atlas.width)
 yy=round(y_mm/(span_y*1000)*atlas.height)
 ww=max(1,round(width_mm/(span_x*1000)*atlas.width))
 hh=max(1,round(height_mm/(span_y*1000)*atlas.height))
 original=original.resize((ww,hh),Image.Resampling.LANCZOS)
 atlas.alpha_composite(original,(xx,yy))
 print('Print on native physical UV',graphic['name'],'atlas placement',xx,yy,ww,hh,'source',source[:22])
atlas_path='/tmp/exo-saved-graphic-atlas.png'
atlas.save(atlas_path)

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('EXO saved native cloth mesh')
mesh.from_pydata([(float(v[0]),-float(v[2]),float(v[1])) for v in xyz],[],faces)
mesh.update()
cloth=bpy.data.objects.new('EXO V2 actual native saved simulated T-shirt',mesh)
bpy.context.collection.objects.link(cloth)

mesh.uv_layers.new(name='Physical printed cutline UV')
for i,face in enumerate(mesh.polygons):
 group=groups[i]
 for local,j in enumerate(face.loop_indices):
  tex=uv[face_uv[i][local]]
  if group=='front':
   xy=((tex[0]-minu)/span_x,(tex[1]-minv)/span_y)
  else:xy=(0,0)
  mesh.uv_layers.active.data[j].uv=xy

def make_cloth_material(name,with_print=False):
 mat=bpy.data.materials.new(name);mat.use_nodes=True
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 shader=nodes.get('Principled BSDF')
 shader.inputs['Base Color'].default_value=(.76,.79,.79,1)
 shader.inputs['Roughness'].default_value=.87
 shader.inputs['Metallic'].default_value=0.0
 if with_print:
  image=bpy.data.images.load(atlas_path)
  image.colorspace_settings.name='sRGB'
  tex=nodes.new('ShaderNodeTexImage');tex.image=image
  mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX'
  mix.inputs[1].default_value=(.76,.79,.79,1)
  links.new(tex.outputs['Alpha'],mix.inputs[0])
  links.new(tex.outputs['Color'],mix.inputs[2])
  links.new(mix.outputs['Color'],shader.inputs['Base Color'])
 return mat
front=make_cloth_material('Real EXO printed Nike tee',True)
back=make_cloth_material('Rear garment panel',False)
mesh.materials.append(front);mesh.materials.append(back)
for face,group in zip(mesh.polygons,groups):face.material_index=0 if group=='front' else 1
for p in mesh.polygons:p.use_smooth=True

# Licensed CC0 MakeHuman mannequin already included with the installed EXO app.
avatar=data.get('avatar_path')
if not avatar or not Path(avatar).is_file():raise RuntimeError('Saved EXO avatar geometry unavailable')
bpy.ops.wm.obj_import(filepath=avatar)
human=bpy.context.selected_objects[0]
human.name='Actual EXO saved avatar (MakeHuman CC0)'
human.rotation_euler=(math.pi/2,0,0)
skin=bpy.data.materials.new('Muted plaster avatar')
skin.use_nodes=True
skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.43,.46,.47,1)
skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.88
human.data.materials.clear();human.data.materials.append(skin)

# Simple photograph-style showcase setup keeps the screenshot faithful to the
# actual native mesh, with no invented 3D garment or third-party stock photo.
bpy.context.scene.render.engine='BLENDER_EEVEE'
scene=bpy.context.scene
scene.render.resolution_x=1220
scene.render.resolution_y=1500
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.render.filepath=options.output
scene.render.film_transparent=False
scene.world.color=(.22,.24,.25)
scene.render.image_settings.color_mode='RGBA'

def aim(obj,target):
 direction=Vector(target)-obj.location
 obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

camera_data=bpy.data.cameras.new('EXO editorial portrait')
camera=bpy.data.objects.new('EXO editorial portrait',camera_data)
bpy.context.collection.objects.link(camera)
camera.location=(1.9,-3.5,2.05)
aim(camera,(0,-.05,1.02))
camera_data.lens=60
scene.camera=camera

def light(name,location,power,size):
 objdata=bpy.data.lights.new(name,'AREA');obj=bpy.data.objects.new(name,objdata)
 bpy.context.collection.objects.link(obj);obj.location=location
 objdata.energy=power;objdata.shape='DISK';objdata.size=size
 aim(obj,(0,0,1.2))
light('Large key softbox',(-2.5,-3.5,4.4),410,3.4)
light('Mid fill',(2.8,-1.2,2.1),215,2.5)
light('Background rim',(-1.8,2.4,2.8),350,2.1)

ground=bpy.data.meshes.new('floor')
ground.from_pydata([(-4,-4,-.02),(4,-4,-.02),(4,4,-.02),(-4,4,-.02)],[],[(0,1,2,3)])
ground.update()
floor=bpy.data.objects.new('Neutral photo studio floor',ground);bpy.context.collection.objects.link(floor)
floor_material=bpy.data.materials.new('Warm grey floor');floor_material.diffuse_color=(.13,.15,.15,1)
floor_material.use_nodes=True
floor_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.13,.15,.15,1)
floor.data.materials.append(floor_material)

scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
bpy.ops.render.render(write_still=True)
print('Wrote native-derived portrait',scene.render.filepath)
