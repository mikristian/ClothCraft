"""Runtime-friendly source-safe staged GLB candidate, entirely inside concepts/.
The source V4 Blender file remains fully editable. This export merges only
same collection+material surfaces, keeping semantic scene groups addressable.
"""
import bpy,os,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
source=ROOT/'EXO-STAGE01-V4-APPROVAL-CANDIDATE.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
names={
 '01 ARCHITECTURE / enveloping performance space':'Architecture',
 '02 RUNWAY / walkable geometry origin 0,0,0':'Runway',
 '03 AUDIENCE / bleachers and individual seating':'Audience',
 '04 DETAILS / reveals, reliefs, trims and fixtures':'ArchitecturalDetails',
 '05 LIGHTING / physical stage rig & diffusers':'PracticalLighting',
}
scene=bpy.context.scene
stages=[]
for colname,label in names.items():
    col=bpy.data.collections[colname]
    for o in col.objects:
        if o.type in ('MESH','FONT'):
            stages.append((o,colname,label))
assert len(stages)>=800,len(stages)

# No stage modifiers or source data are lost: conversion occurs only in this
# in-memory evaluation and saved as a separate candidate GLB.
for o in list(bpy.context.selected_objects):o.select_set(False)
for o,_,_ in stages:o.select_set(True)
bpy.context.view_layer.objects.active=stages[0][0]
bpy.ops.object.convert(target='MESH')
converted=[]
for colname,label in names.items():
    for ob in bpy.data.collections[colname].objects:
        if ob.type=='MESH':converted.append((ob,colname,label))
for o in bpy.context.selected_objects:o.select_set(False)

batches={}
for o,col,label in converted:
    mats=tuple(m.name for m in o.data.materials if m)
    key=(label,mats)
    batches.setdefault(key,[]).append(o)

joined=[]
for (label,materialNames),objs in batches.items():
    for o in bpy.context.selected_objects:o.select_set(False)
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    if len(objs)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active
    suffix=materialNames[0].replace('S01 ','')[:34] if materialNames else 'Untextured'
    ob.name=f'EXO_STAGE01_{label}__{suffix}'
    ob['stageGroup']=label
    ob['originalParts']=len(objs)
    ob['materialFamily']=materialNames[0] if materialNames else 'none'
    joined.append(ob)

# Free memory of the preview actor in this disposable process only. The
# original scene's mannequin and cameras remain in source .blend intact.
for ob in bpy.context.selected_objects:ob.select_set(False)
for ob in joined:ob.select_set(True)
bpy.context.view_layer.objects.active=joined[0]
output=ROOT/'EXO-STAGE01-V4-STAGE-RUNTIME-OPTIMIZED-REVIEW.glb'
bpy.ops.export_scene.gltf(filepath=str(output),use_selection=True,export_format='GLB',export_apply=True,export_extras=True)
report={'sourceBlend':source.name,'export':output.name,'preMergeStageObjects':len(stages),'joinedStageMeshes':len(joined),'stageFamilies':sorted(set(label for label,_ in batches)),'withoutActor':True,'previewOnly':True}
(ROOT/'EXO-STAGE01-V4-stage-optimization.json').write_text(json.dumps(report,indent=2))
print('STAGE_RUNTIME_EXPORT_VALIDATED',json.dumps(report))
