import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {planModarisNativeReferenceRecompute20261027 as plan} from './modarisNativeReferenceRecompute20261027.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js'

function fixture(){
  const snapshot={revision:8,template:{panels:[
    {id:'front',layout_2d:[0,0],polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['a','b','c','d']}},
    {id:'back',layout_2d:[0,0],polygon:{points:[[0,0],[.3,0],[.3,.2],[0,.2]],edges:['e','f','g','h']}},
  ]}}
  const stored=create(snapshot,{measurements:{reach:{valueMm:250}},bindings:[
    {id:'reach-point',panelId:'front',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'},
  ]})
  assert.equal(stored.ok,true,stored.reason)
  return {snapshot,sidecar:stored.sidecar}
}
function rustFixture(){
  const data=fixture()
  for(const panel of data.snapshot.template.panels){
    panel.name=panel.id
    panel.fabric='fabric_1'
    panel.grain_degrees=90
    panel.pattern={width:panel.polygon.points[1][0],height:panel.polygon.points[2][1],nx:1,ny:1}
    panel.placement={translation:[0,1.5,0.38],rotation_degrees:[0,0,0]}
    panel.pins=[]
    panel.polygon.subdivisions=0
    panel.polygon.meshing={target_edge_m:.025,anisotropy:1,axis_degrees:0,min_angle_degrees:25,max_vertices:20000}
    Object.assign(panel.polygon,{curves:{},free_curve_points:{},vertex_ids:{},vertex_mirror_groups:{},
      holes:[],lines:[],target_lengths:{},notches:[],seam_allowances:{},annotations:[],measurements:{}})
  }
  const stored=create(data.snapshot,{measurements:data.sidecar.measurements,bindings:data.sidecar.bindings})
  assert.equal(stored.ok,true,stored.reason)
  data.sidecar=stored.sidecar
  return data
}
const option={panelId:'front',pointIndex:1,originalPosition:[.4,0],position:[.42,0]}

test('source movement drives bound dependent on same panel; untouched panel remains unchanged',()=>{
  const {snapshot,sidecar}=fixture(),initial=structuredClone(snapshot)
  const result=plan(snapshot,sidecar,option)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.proposal.pointCount,2)
  assert.deepEqual(result.proposal.commands[0].edits,[[1,[.42,0]],[2,[.42,.25]]])
  assert.equal(result.unchangedOtherPanels,true)
  assert(Object.isFrozen(result.proposal.commands[0].edits))
  assert.deepEqual(snapshot,initial)
  const after=structuredClone(snapshot);after.revision++
  after.template.panels[0].polygon.points[1]=[.42,0]
  after.template.panels[0].polygon.points[2]=[.42,.25]
  const witness=rebase(snapshot,after,sidecar,result.proposal)
  assert.equal(witness.ok,true,witness.reason)
  const altered=structuredClone(after);altered.template.panels[1].polygon.points[1][0]=.31
  assert.equal(rebase(snapshot,altered,sidecar,result.proposal).ok,false)
})

test('stale snapshots, bound source, duplicate targets and dependency cycles fail closed',()=>{
  const {snapshot,sidecar}=fixture()
  assert.match(plan(snapshot,sidecar,{...option,originalPosition:[.3,0]}).reason,/differs/)
  const stale=structuredClone(snapshot);stale.revision++
  assert.match(plan(stale,sidecar,option).reason,/Stale/)
  assert.match(plan(snapshot,sidecar,{...option,pointIndex:2,originalPosition:[.4,.3]}).reason,/Bound source/)
  const dup=structuredClone(sidecar)
  dup.bindings.push({...dup.bindings[0],id:'duplicate'})
  assert.equal(plan(snapshot,dup,option).ok,false)
  const cyclic=structuredClone(sidecar);cyclic.bindings[0].dependsOn=['reach-point']
  assert.equal(plan(snapshot,cyclic,option).ok,false)
})

test('cross-panel transitive dependency fails closed instead of falsely reporting a regenerated graph',()=>{
  const {snapshot}=fixture(),original=structuredClone(snapshot)
  const created=create(snapshot,{measurements:{reach:{valueMm:250},backHeight:{valueMm:200}},bindings:[
    {id:'front-reach',panelId:'front',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'},
    {id:'back-height',panelId:'back',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'backHeight',dependsOn:['front-reach']},
  ]})
  assert.equal(created.ok,true,created.reason)
  const result=plan(snapshot,created.sidecar,option)
  assert.equal(result.ok,false)
  assert.match(result.reason,/Cross-panel dependency requires atomic multi-panel regeneration/)
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual(snapshot,original)
})

test('unsafe topology and native attachments reject without partial mutation',()=>{
  const {snapshot,sidecar}=fixture(),original=structuredClone(snapshot)
  assert.equal(plan(snapshot,sidecar,{...option,position:[-.2,.3]}).ok,false)
  const attached=structuredClone(snapshot);attached.template.panels[0].pin_points=[[0,0]]
  assert.match(plan(attached,sidecar,option).reason,/Stale|Attached/)
  assert.deepEqual(snapshot,original)
})

test('Rust serialized rectangle defaults and 3D placement survive verified native rebase',()=>{
  const {snapshot,sidecar}=rustFixture(),original=structuredClone(snapshot)
  const result=plan(snapshot,sidecar,option)
  assert.equal(result.ok,true,result.reason)
  const after=structuredClone(snapshot)
  after.revision++
  after.template.panels[0].polygon.points[1]=[.42,0]
  after.template.panels[0].polygon.points[2]=[.42,.25]
  after.template.panels[0].pattern.width=.42
  const witness=rebase(snapshot,after,sidecar,result.proposal)
  assert.equal(witness.ok,true,witness.reason)
  assert.deepEqual(after.template.panels[0].placement,original.template.panels[0].placement)
  const tampered=structuredClone(after)
  tampered.template.panels[0].placement.translation[2]+=.01
  assert.equal(rebase(snapshot,tampered,sidecar,result.proposal).ok,false)
  assert.deepEqual(snapshot,original)
})

test('Rust u32 primitive subdivisions allow zero and reject invalid numeric values',()=>{
  const {snapshot,sidecar}=rustFixture()
  assert.equal(snapshot.template.panels[0].polygon.subdivisions,0)
  assert.equal(plan(snapshot,sidecar,option).ok,true)
  for(const value of [-1,1.25,4294967296,NaN]){
    const changed=structuredClone(snapshot)
    changed.template.panels[0].polygon.subdivisions=value
    const bound=create(changed,{measurements:sidecar.measurements,bindings:sidecar.bindings})
    if(bound.ok)assert.match(plan(changed,bound.sidecar,option).reason,/subdivisions/)
    else assert.equal(bound.ok,false)
  }
})

test('detached Rust primitive recomputes while unrelated other panels are sewn',()=>{
  const {snapshot,sidecar}=rustFixture()
  const extra=structuredClone(snapshot.template.panels[1])
  extra.id='third';extra.name='Third'
  extra.polygon.edges=['j','k','l','m']
  snapshot.template.panels.push(extra)
  snapshot.template.seams=[{id:'other-seam',a:{panel:'back',edge:'e'},b:{panel:'third',edge:'j'}}]
  const bound=create(snapshot,{measurements:sidecar.measurements,bindings:sidecar.bindings})
  assert.equal(bound.ok,true,bound.reason)
  const result=plan(snapshot,bound.sidecar,option)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.proposal.commands.map(x=>x.panel),['front'])
  const after=structuredClone(snapshot)
  after.revision++
  after.template.panels[0].polygon.points[1]=[.42,0]
  after.template.panels[0].polygon.points[2]=[.42,.25]
  after.template.panels[0].pattern.width=.42
  assert.equal(rebase(snapshot,after,bound.sidecar,result.proposal).ok,true)
  const related=structuredClone(snapshot)
  related.template.seams.push({id:'involved',a:{panel:'front',edge:'a'},b:{panel:'back',edge:'e'}})
  const linked=create(related,{measurements:sidecar.measurements,bindings:sidecar.bindings})
  assert.equal(plan(related,linked.sidecar,option).ok,false)
})

test('Rust attachments, sewing, grading, marks and production references reject',()=>{
  const base=rustFixture()
  const mutations=[
    s=>{s.template.panels[0].pins=[0]},
    s=>{s.template.panels[0].polygon.notches=[{edge:'a',depth:.004}]},
    s=>{s.template.panels[0].polygon.vertex_ids={0:'vertex-1'}},
    s=>{s.template.panels[0].polygon.vertex_mirror_groups={0:'mirrored'}},
    s=>{s.template.panels[0].polygon.seam_allowances={a:.01}},
    s=>{s.template.panels[0].polygon.holes=[{points:[[.1,.1],[.2,.1],[.1,.2]]}]},
    s=>{s.template.panels[0].polygon.lines=[{points:[[0,0],[.1,.1]]}]},
    s=>{s.template.panels[0].polygon.target_lengths={a:.3}},
    s=>{s.template.panels[0].polygon.annotations=[{text:'production'}]},
    s=>{s.template.panels[0].polygon.measurements={chest:400}},
    s=>{s.template.panels[0].polygon.free_curve_points={a:[{position:[.1,0]}]}},
    s=>{s.template.panels[0].polygon.curves={a:[[.1,0],[.2,0]]}},
    s=>{s.template.seams=[{a:{panel:'front'},b:{panel:'back'}}]},
    s=>{s.template.grade_rules=[{panel:'front',size:'M'}]},
  ]
  for(const mutate of mutations){
    const snapshot=structuredClone(base.snapshot)
    mutate(snapshot)
    const sidecar=create(snapshot,{measurements:base.sidecar.measurements,bindings:base.sidecar.bindings})
    assert.equal(sidecar.ok,true,sidecar.reason)
    const result=plan(snapshot,sidecar.sidecar,option)
    assert.equal(result.ok,false,'Unsafe native attachment unexpectedly accepted')
  }
})
