"""Camera correction after visual QA of the stand-alone EXO stage.
Keeps the original draft untouched and saves a revised .blend for user review.
"""
import bpy,os,math,json
from mathutils import Vector
root=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'EXO-STAGE01-RUNWAY-CHAMBER-DRAFT.blend'))
s=bpy.context.scene
camera_configs={
 'hero':('CAMERA 01 / fashion editorial',(3.4,-8.9,3.45),(0,.12,1.95),39),
 'close':('CAMERA 05 / actual garment close',(2.60,-4.5,2.53),(0,.07,1.22),44),
 'side':('CAMERA 04 / outfit spatial side',(3.65,-1.88,2.38),(0,.25,1.18),38),
 'cutaway':('CAMERA 03 / runway room wide',(6.0,-11.7,9.9),(0,-1.65,2.3),29),
}
for key,(name,position,target,lens) in camera_configs.items():
    cam=bpy.data.objects.get(name)
    if cam is None:
        data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data)
        bpy.data.collections['91 PHOTOGRAPHY / cameras & studio light rig'].objects.link(cam)
    cam.location=position
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.lens=lens

# Small mineral color adjustment for flatter original gallery-white background.
for matname,color in [('S01 Warm honed architectural limestone',(.30,.29,.275)),('S01 Midnight grey wool boucle seating',(.135,.14,.15))]:
    mat=bpy.data.materials.get(matname)
    if mat:
        mat.diffuse_color=(*color,1)
        ramp=next((n for n in mat.node_tree.nodes if n.type=='VALTORGB'),None)
        if ramp:
            ramp.color_ramp.elements[0].color=(*[x*.85 for x in color],1)
            ramp.color_ramp.elements[1].color=(*[min(1,x*1.17) for x in color],1)
        else:mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)

s['review_pass']='V2 camera fixes, toned masonry + seating'
s['render_qa']='Overview roof hides only for cutaway render; saved Blender stage remains intact'
s.camera=bpy.data.objects['CAMERA 01 / fashion editorial']
s.cycles.samples=22
s.render.resolution_percentage=75
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'EXO-STAGE01-RUNWAY-CHAMBER-V2-REVIEW.blend'),compress=True)

for key in ('hero','close','side','cutaway'):
    s.camera=bpy.data.objects[camera_configs[key][0]]
    if key=='cutaway':
        # Remove acoustic roof slats from overview renderer only; source .blend
        # contains the full ceiling. Required to see internal geometry.
        changed=[]
        for ob in bpy.data.objects:
            if ob.name.startswith(('Overhead dark steel portal lintel','Acoustic overhead panel','Perimeter roof suspended beam')):
                changed.append((ob,ob.hide_render));ob.hide_render=True
    s.render.filepath=os.path.join(root,f'EXO-STAGE01-RUNWAY-CHAMBER-V2-{key}.png')
    bpy.ops.render.render(write_still=True)
    if key=='cutaway':
        for ob,prev in changed:ob.hide_render=prev
print('EXO_RUNWAY_STAGE_V2_REVIEW_READY')
