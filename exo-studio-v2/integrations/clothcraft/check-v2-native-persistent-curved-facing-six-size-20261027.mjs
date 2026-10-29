// Executable Rust acceptance: physical persistent six-size curved facing dependency.
// All inputs and saved projects live in a disposable temporary workspace.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {verifyNativeCurvedFacingPhysical20261027} from '../../src/core/modarisNativeCurvedFacingWitness20261027.js'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-persistent-curved-facing-'))
const workspace=createWorkspace(root)
const clone=structuredClone
const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
const near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<tol,`Expected ${a} ≈ ${b}`)
const curveForWidth=width=>[[.12+(width-.4)/3,-.0004],[.28+2*(width-.4)/3,-.0004]]
const matchCurve=(actual,expected)=>{assert(actual,'Missing physical cubic');assert.equal(actual.length,2);for(let j=0;j<2;j++)for(let k=0;k<2;k++)near(actual[j][k],expected[j][k])}
let state,stage='open',beforeRevision
const checks=[]
const send=async req=>{
  const result=await workspace.request({revision:state?.revision,...req})
  assert.equal(result.ok,true, `${req.op}: ${result.error??'native Rust refused'}`)
  if(result.data?.template)state=result.data
  return result.data
}
const panel=(template,id)=>{
  const found=template.panels.filter(p=>p.id===id)
  assert.equal(found.length,1,`Expected unique panel ${id}`)
  return found[0]
}
const refuse=async (req,label)=>{
  const saved=(await send({op:'save'})).project
  const revision=state.revision
  const result=await workspace.request({revision,...req})
  assert.equal(result.ok,false,`${label}: native Rust incorrectly accepted invalid mutation`)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,saved)
  return result.error
}
const checkPhysical=async (expectedWidth)=>{
  const saved=(await send({op:'save'})).project
  assert(saved.native_facing_dependency)
  const f=saved.native_facing_dependency
  assert.equal(f.facingId,'facing_curved_persisted_v2')
  assert.deepEqual(saved.grade_run.sizes,sizes)
  const cuts=await send({op:'grade-run-cutlines'})
  const sewing=await send({op:'grade-run-sewing-balance-audit'})
  assert.equal(cuts.cuttingAuthorized,false)
  assert.equal(sewing.factoryApproved,false)
  let notches=0
  for(let i=0;i<6;i++){
    const t=saved.grade_run.gradedTemplates[i]
    const parent=panel(t,f.parentPanelId).polygon
    const facing=panel(t,f.facingId).polygon
    const top=parent.edges[0],sew=facing.edges[0],hem=facing.edges[2]
    // AnchorGroup preserves the source start tangent, transports the end
    // tangent by the width edit, and normalization may shift all source y.
    const cubic=[[.12+offsets[i]/3,parent.points[0][1]-.0004],
      [.28+(expectedWidth-.4)+2*offsets[i]/3,parent.points[0][1]-.0004]]
    const childCubic=cubic.map(p=>[p[0]-parent.points[0][0],p[1]-parent.points[0][1]])
    matchCurve(parent.curves[top],cubic)
    matchCurve(facing.curves[sew],childCubic)
    assert(facing.curves[hem],'Physical inward hem cubic absent')
    assert.equal(Object.keys(facing.curves).length,2)
    for(let j=0;j<2;j++){near(facing.curves[hem][j][0],childCubic[1-j][0]);near(facing.curves[hem][j][1],childCubic[1-j][1]+f.depthM)}
    assert(Math.abs(parent.points[1][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(parent.points[2][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(facing.points[1][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(facing.points[2][0]-(expectedWidth+offsets[i]))<1e-7)
    const sizeCut=cuts.sizes[i]
    const childCut=sizeCut.panels.find(p=>p.panel_id===f.facingId)?.cut
    const parentCut=sizeCut.panels.find(p=>p.panel_id===f.parentPanelId)?.cut
    assert(childCut&&parentCut)
    assert.equal(childCut.notches.length,2)
    assert.equal(parentCut.notches.length,2)
    assert.equal(Object.keys(parent.curves).length,1)
    assert(parentCut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-9))
    assert(childCut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-9))
    const seam=sewing.sizes[i].seams.find(s=>s.seamId===`${f.facingId}_attach`)
    assert(seam)
    assert.equal(seam.allowEase,false)
    assert.equal(seam.requiresEaseReview,false)
    assert(Math.abs(seam.mismatchM)<1e-7)
    assert.equal(seam.notchIntervalLengthsM.length,3)
    assert(seam.notchIntervalLengthsM.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(v=>Number.isFinite(v)&&v>0)&&Math.abs(pair[0]-pair[1])<1e-7))
    notches+=childCut.notches.length+parentCut.notches.length
  }
  assert.equal(notches,24)
  const physicalWitness=verifyNativeCurvedFacingPhysical20261027({
    project:saved,cutlines:cuts,sewing,sourceRevision:state.revision,
  })
  assert.equal(physicalWitness.ok,true,physicalWitness.reason)
  return saved
}

try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originalIds=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++) await send({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  stage='author 10mm allowances, source bindings and 6 physical grades'
  const source=(await send({op:'save'})).project
  const authoredParent=panel(source.template,ids[0]).polygon
  authoredParent.curves={[authoredParent.edges[0]]:curveForWidth(.4)}
  for(const p of source.template.panels)
    p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(edge=>[edge,.01]))
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  const rules=[]
  ids.forEach((panelId,index)=>{
    rules.push({id:`width_upper_${index}`,panelId,pointIndex:1,mode:'polar',
      a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})
    rules.push({id:`width_lower_${index}`,panelId,pointIndex:2,mode:'polar',
      a:3,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[]})
  })
  await send({op:'bindings-store',nativeBindings:{
    measurements:{width:{valueMm:400}},bindings:rules}})
  const base=clone(state.template)
  await send({op:'grade-run-commit',gradeRun:{
    schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),
    gradedTemplates:sizes.map((size,i)=>{
      const t=clone(base)
      for(const id of ids)for(const point of [1,2])
        panel(t,id).polygon.points[point][0]+=offsets[i]
      const gradedParent=panel(t,ids[0]).polygon
      gradedParent.curves[gradedParent.edges[0]]=curveForWidth(.4+offsets[i])
      return t
    }),pomSpecs:[]}})
  checks.push('Two authored 400×320mm panels, one physical cubic top boundary, 10mm edge allowances, four physical bound anchors and XS–XXL grades')

  stage='native install transaction'
  const parentId=ids[0],parentEdgeId=panel(state.template,parentId).polygon.edges[0]
  const invalid=await refuse({op:'facing-dependency-install',parentPanelId:parentId,
    parentEdgeId,facingId:'bad_face',depthMm:1000,allowanceMm:10},'out-of-bounds facing depth')
  const beforeInstall=(await send({op:'save'})).project
  const preRevision=state.revision
  await send({op:'facing-dependency-install',parentPanelId:parentId,parentEdgeId,
    facingId:'facing_curved_persisted_v2',depthMm:40,allowanceMm:10})
  assert.equal(state.revision,preRevision+1)
  assert.equal(state.nativeFacingDependency.facingId,'facing_curved_persisted_v2')
  assert.equal(state.nativePointBindings.active,true)
  const installed=await checkPhysical(.4)
  const inspection=await send({op:'facing-dependency-inspect'})
  assert.equal(inspection.nativeFacingDependency.facingId,'facing_curved_persisted_v2')
  const unqualified=await refuse({op:'edit',command:{kind:'Anchor',panel:parentId,
    anchor:0,position:[.005,0]}},'unqualified source edit')
  assert.match(unqualified,/Native facing dependency requires qualified regeneration/)
  const rejectedGrade=await refuse({op:'grade-run-commit',gradeRun:installed.grade_run},
    'external grade overwrite with active facing dependency')
  assert.match(rejectedGrade,/Native facing dependency requires qualified regeneration/)
  checks.push('One persisted native install adds six sewn curved facing polygons and 24 actual CUT notches')

  stage='preflight invalid provenance, ease and stale revision'
  const tampered=clone(installed)
  panel(tampered.grade_run.gradedTemplates[5],'facing_curved_persisted_v2').polygon.points[1][0]+=.005
  await refuse({op:'open',project:tampered},'tampered grade project')
  const malformed=clone(installed)
  const damaged=panel(malformed.template,parentId).polygon
  damaged.curves[damaged.edges[0]]=[[.2,-.014]]
  await refuse({op:'open',project:malformed},'malformed cubic source')
  const forged=clone(installed)
  const forgedChild=panel(forged.template,'facing_curved_persisted_v2').polygon
  forgedChild.curves[forgedChild.edges[0]][0][1]-=.003
  await refuse({op:'open',project:forged},'forged derived cubic')
  const steep=clone(installed)
  const steepParent=panel(steep.template,parentId).polygon
  steepParent.curves[steepParent.edges[0]]=[[.12,-.014],[.28,-.014]]
  await refuse({op:'open',project:steep},'out of envelope steep cubic')
  const ease=clone(installed)
  ease.grade_run.gradedTemplates[5].seams.find(s=>s.id==='facing_curved_persisted_v2_attach').allow_ease=true
  await refuse({op:'open',project:ease},'eased facing project')
  const stale=await refuse({op:'bindings-grade-regenerate-preview',revision:preRevision,overrides:{width:380}},
    'stale revision')

  stage='real 400 to 380mm preview and one commit'
  beforeRevision=state.revision
  const preview=await send({op:'bindings-grade-regenerate-preview',overrides:{width:380}})
  assert.equal(preview.sourceRevision,beforeRevision)
  assert.deepEqual((await send({op:'save'})).project,installed)
  await send({op:'bindings-grade-regenerate',overrides:{width:380}})
  assert.equal(state.revision,beforeRevision+1)
  assert.equal(state.nativePointBindings.active,true)
  const after=await checkPhysical(.38)
  checks.push('One direct 400→380mm measurement commit propagates source, paired facing, six sewn lengths and 24 physical notches')

  stage='undo redo and persisted re-open'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,installed)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'open',project:after})
  await checkPhysical(.38)
  checks.push('Undo/redo restore graph, six grades, facing relation and source geometry; persisted native project reopens')
  console.log(JSON.stringify({passed:true,nativeRust:true,disposable:true,sourcePanelId:parentId,
    derivedFacingId:'facing_curved_persisted_v2',sizes,physicalFacingNotches:24,
    beforeRevision,afterRevision:beforeRevision+1,checks,invalid,stale,
    factoryApproved:false,licensedModarisParity:false},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,reason:error?.message??String(error),
    checks,factoryApproved:false},null,2))
  process.exitCode=1
}finally{
  await Promise.resolve(workspace.close()).catch(()=>{})
  fs.rmSync(root,{recursive:true,force:true})
}
