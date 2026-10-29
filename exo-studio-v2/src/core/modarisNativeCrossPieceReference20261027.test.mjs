import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {planModarisNativeCrossPieceReference20261027 as plan,verifyModarisNativeCrossPieceReferenceCommit20261027 as verify} from './modarisNativeCrossPieceReference20261027.js'

function fixture(rotation=0){
  const make=(id,origin,size,angle=0)=>({
    id,name:id,layout_2d:origin,layout_rotation_degrees:angle,fabric:'fabric_1',grain_degrees:90,
    pattern:{width:size[0],height:size[1],nx:1,ny:1},
    placement:{translation:[.25,1.5,.38],rotation_degrees:[0,0,30]},
    pins:[],polygon:{points:[[0,0],[size[0],0],[size[0],size[1]],[0,size[1]]],
      edges:[id+'0',id+'1',id+'2',id+'3'],subdivisions:0,meshing:{target_edge_m:.025},
      curves:{},free_curve_points:{},vertex_ids:{},vertex_mirror_groups:{},holes:[],lines:[],
      target_lengths:{},notches:[],seam_allowances:{},annotations:[],measurements:{}},
  })
  const snapshot={revision:8,template:{panels:[make('front',[.2,.3],[.4,.3],rotation),make('back',[.8,.2],[.3,.2],0),make('spare',[2,0],[.2,.2]) ]}}
  snapshot.template.panels[2].polygon.points[2]=[.2,.25]
  snapshot.template.panels[2].pattern.height=.25
  const bound=create(snapshot,{measurements:{reach:{valueMm:250}},bindings:[{id:'spare-link',panelId:'spare',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'}]})
  assert.equal(bound.ok,true,bound.reason)
  const source=snapshot.template.panels[0],target=snapshot.template.panels[1]
  const sourceBoard=[source.layout_2d[0]+.4*Math.cos(rotation*Math.PI/180),source.layout_2d[1]+.4*Math.sin(rotation*Math.PI/180)]
  const relativeBoardVector=[target.layout_2d[0]+.3-sourceBoard[0],target.layout_2d[1]-sourceBoard[1]]
  return {snapshot,sidecar:bound.sidecar,options:{sourcePanelId:'front',sourcePointIndex:1,sourceOriginalPosition:[.4,0],sourcePosition:[.42,0],targetPanelId:'back',targetPointIndex:1,targetOriginalPosition:[.3,0],relativeBoardVector}}
}
function rustAfter(before,proposal){
  const after=structuredClone(before);after.revision++
  for(const command of proposal.commands){
    const panel=after.template.panels.find(p=>p.id===command.panel)
    for(const [index,point] of command.edits)panel.polygon.points[index]=[...point]
    const pts=panel.polygon.points,lo=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))]
    const hi=[Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]
    panel.polygon.points=pts.map(p=>[p[0]-lo[0],p[1]-lo[1]])
    const angle=panel.layout_rotation_degrees*Math.PI/180
    panel.layout_2d=[panel.layout_2d[0]+lo[0]*Math.cos(angle)-lo[1]*Math.sin(angle),panel.layout_2d[1]+lo[0]*Math.sin(angle)+lo[1]*Math.cos(angle)]
    panel.pattern.width=hi[0]-lo[0];panel.pattern.height=hi[1]-lo[1]
    const [rx,ry,rz]=panel.placement.rotation_degrees.map(a=>a*Math.PI/180)
    const xz=Math.cos(rz)*lo[0]+Math.sin(rz)*lo[1],yz=Math.sin(rz)*lo[0]-Math.cos(rz)*lo[1]
    panel.placement.translation[0]+=Math.cos(ry)*xz
    panel.placement.translation[1]+=Math.cos(rx)*yz+Math.sin(rx)*Math.sin(ry)*xz
    panel.placement.translation[2]+=Math.sin(rx)*yz-Math.cos(rx)*Math.sin(ry)*xz
  }
  return after
}
test('two detached panels generate two ordered native AnchorGroups and verified one-revision commit',()=>{
  const {snapshot,sidecar,options}=fixture(),original=structuredClone(snapshot)
  const planned=plan(snapshot,sidecar,options)
  assert.equal(planned.ok,true,planned.reason)
  assert.equal(planned.proposal.op,'edit-batch')
  assert.deepEqual(planned.proposal.commands.map(c=>c.panel),['front','back'])
  assert.deepEqual(planned.proposal.commands[0].edits,[[1,[.42,0]]])
  assert.equal(planned.proposal.commands[1].edits[0][0],1)
  assert(Math.abs(planned.proposal.commands[1].edits[0][1][0]-.32)<1e-12)
  assert(Math.abs(planned.proposal.commands[1].edits[0][1][1])<1e-12)
  const after=rustAfter(snapshot,planned.proposal)
  const result=verify(snapshot,after,sidecar,planned)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(after.template.panels[2],snapshot.template.panels[2])
  assert.deepEqual(snapshot,original)
  assert(Object.isFrozen(planned.proposal.commands))
  assert.match(result.caveat,/explicit verified rebase/)
  const tampered=structuredClone(after);tampered.template.panels[1].placement.translation[0]+=.01
  assert.match(verify(snapshot,tampered,sidecar,planned).reason,/differs/)
})
test('rotated board frame transforms source delta into material coordinates; Rust layout shift is witnessed',()=>{
  const {snapshot,sidecar,options}=fixture(90)
  options.sourcePosition=[.42,0]
  // Movement along front material X is along board Y; target material Y moves.
  // Offset the target vertex downward originally at 0 by using the upper vertex.
  options.targetPointIndex=2;options.targetOriginalPosition=[.3,.2]
  options.relativeBoardVector=[options.relativeBoardVector[0],options.relativeBoardVector[1]+.2]
  const planned=plan(snapshot,sidecar,options)
  assert.equal(planned.ok,true,planned.reason)
  assert(Math.abs(planned.targetMaterialPosition[0]-.3)<1e-12)
  assert(Math.abs(planned.targetMaterialPosition[1]-.22)<1e-12)
  assert.equal(verify(snapshot,rustAfter(snapshot,planned.proposal),sidecar,planned).ok,true)
})
test('stale, forged vector, marks, sewn, grading, cycle/conflicting binding and unsafe target refuse',()=>{
  const {snapshot,sidecar,options}=fixture()
  assert.match(plan(snapshot,sidecar,{...options,relativeBoardVector:[0,0]}).reason,/vector differs/)
  assert.match(plan(snapshot,sidecar,{...options,targetOriginalPosition:[.25,0]}).reason,/Original/)
  const stale=structuredClone(snapshot);stale.revision++
  assert.match(plan(stale,sidecar,options).reason,/Stale/)
  const marked=structuredClone(snapshot);marked.template.panels[1].polygon.notches.push({edge:'back0'})
  const markedSidecar=create(marked,{measurements:sidecar.measurements,bindings:sidecar.bindings}).sidecar
  assert.match(plan(marked,markedSidecar,options).reason,/Attached/)
  const sewn=structuredClone(snapshot);sewn.template.seams=[{a:{panel:'front'},b:{panel:'back'}}]
  const sewnSidecar=create(sewn,{measurements:sidecar.measurements,bindings:sidecar.bindings}).sidecar
  assert.match(plan(sewn,sewnSidecar,options).reason,/Sewn/)
  const graded=structuredClone(snapshot);graded.template.grade_rules=[{size:'M'}]
  const gradedSidecar=create(graded,{measurements:sidecar.measurements,bindings:sidecar.bindings}).sidecar
  assert.match(plan(graded,gradedSidecar,options).reason,/Graded/)
  const cycle=create(snapshot,{measurements:sidecar.measurements,bindings:[...sidecar.bindings,{id:'target',panelId:'back',pointIndex:1,mode:'polar',a:0,b:2,distanceFormula:'reach'}]}).sidecar
  assert.match(plan(snapshot,cycle,options).reason,/binding touches an edited panel/)
  assert.equal(plan(snapshot,sidecar,{...options,sourcePosition:[-.9,1.4]}).ok,false)
})
test('saved point links anywhere on either edited panel reject; unsatisfied unrelated links reject before commit',()=>{
  const {snapshot,sidecar,options}=fixture()
  for(const [panelId,pointIndex] of [['front',3],['back',3]]){
    const extra=create(snapshot,{measurements:sidecar.measurements,bindings:[...sidecar.bindings,
      {id:'unsafe-'+panelId,panelId,pointIndex,mode:'polar',a:0,b:1,angleDeg:90,distanceFormula:'reach'}]})
    assert.equal(extra.ok,true,extra.reason)
    assert.match(plan(snapshot,extra.sidecar,options).reason,/binding touches an edited panel/)
  }
  const broken=structuredClone(snapshot)
  broken.template.panels[2].polygon.points[2][1]=.24
  const rebound=create(broken,{measurements:sidecar.measurements,bindings:sidecar.bindings})
  assert.equal(rebound.ok,true)
  assert.match(plan(broken,rebound.sidecar,options).reason,/not satisfied/)
})
test('real callback after includes Rust persistent point bindings; geometry witness ignores metadata only after validating it',()=>{
  const {snapshot,sidecar,options}=fixture()
  const planned=plan(snapshot,sidecar,options)
  assert.equal(planned.ok,true,planned.reason)
  const before={revision:snapshot.revision,template:structuredClone(snapshot.template)}
  const after=rustAfter(before,planned.proposal)
  after.nativePointBindings={version:1,active:true,automaticRegeneration:false,
    manufacturingApproved:false,measurements:structuredClone(sidecar.measurements),
    bindings:structuredClone(sidecar.bindings).map(({dependsOn,...binding})=>binding)}
  assert.equal(verify(before,after,sidecar,planned).ok,true)
  const mutate=change=>{const value=structuredClone(after);change(value);return verify(before,value,sidecar,planned)}
  assert.match(mutate(v=>{v.nativePointBindings.active=false}).reason,/active/)
  assert.match(mutate(v=>{v.nativePointBindings.measurements.reach.valueMm++}).reason,/formulas/)
  assert.match(mutate(v=>{v.nativePointBindings.bindings[0].id='forged'}).reason,/identities/)
  assert.match(mutate(v=>{v.nativePointBindings.automaticRegeneration=true}).reason,/nonautomatic/)
  assert.match(mutate(v=>{v.nativePointBindings.manufacturingApproved=true}).reason,/nonmanufacturing/)
  assert.match(mutate(v=>{v.nativePointBindings.version=2}).reason,/versioned/)
  assert.match(mutate(v=>{v.template.panels[2].polygon.points[2][1]=.24}).reason,/differs/)
})
