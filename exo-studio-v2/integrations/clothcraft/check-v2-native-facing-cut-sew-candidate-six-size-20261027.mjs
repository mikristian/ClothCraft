// Independent real compiled-Rust RECEIVER test of a 6-size physical facing
// candidate. This does NOT persist a source->child native dependency graph or
// approve a factory/cutter. All projects are disposable temporary artifacts.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {buildNativeSixSizeFacingCandidate20261027 as build,
  verifyNativeSixSizeFacingCandidate20261027 as verify} from '../../src/core/modarisNativeFacingCandidate20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-facing-native-candidate-'))
const workspace=createWorkspace(temp)
let state,stage='initialize',sourceRevision=null
const checks=[]
const clone=structuredClone
const send=async value=>{
  const reply=await workspace.request({revision:state?.revision,...value})
  assert.equal(reply.ok,true,`${value.op}: ${reply.error??'Rust receiver rejected candidate'}`)
  if(reply.data?.template)state=reply.data
  return reply.data
}
const panel=(template,id)=>{
  const found=template.panels.filter(p=>p.id===id)
  assert.equal(found.length,1,`Missing/duplicate source or facing ${id}`)
  return found[0]
}
const close=(a,b,label,eps=1e-7)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=eps,
  `${label}: ${a} vs ${b}`)
const reject=async (request,label)=>{
  const before=(await send({op:'save'})).project,revision=state.revision
  const reply=await workspace.request({revision,...request})
  assert.equal(reply.ok,false,`${label}: Rust accepted invalid grade or sewing metadata`)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,before)
  return reply.error
}
try{
  stage='construct disposable Rust material source'
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const known=new Set(state.template.panels.map(p=>p.id))
  await send({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const id=state.template.panels.find(p=>!known.has(p.id))?.id
  assert(id,'Native authored facing source panel missing')
  const source=(await send({op:'save'})).project
  for(const p of source.template.panels){
    const poly=p.polygon
    assert(poly,'Dart-free native reference requires cuttable polygon panels')
    poly.seam_allowances=Object.fromEntries(poly.edges.map(edge=>[edge,.01]))
  }
  const top=panel(source.template,id).polygon
  top.notches={[top.edges[0]]:[{t:.25,depth_m:.004},{t:.75,depth_m:.004}]}
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  sourceRevision=state.revision
  const base=clone(state.template),offs=[-.015,-.007,0,.005,.010,.014]
  const catalog={schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),
    gradedTemplates:sizes.map((size,i)=>{
      const next=clone(base)
      panel(next,id).polygon.points[1][0]+=offs[i]
      panel(next,id).polygon.points[2][0]+=offs[i]
      return next
    }),pomSpecs:[]}
  await send({op:'grade-run-commit',gradeRun:catalog})
  const before=(await send({op:'save'})).project
  const original=clone(before)
  const options={expectedRevision:state.revision,parentPanelId:id,parentEdgeId:top.edges[0],
    facingId:'facing_reactive_e2e',depthMm:40,allowanceMm:10}
  const candidate=build(before,options)
  assert.equal(candidate.ok,true,candidate.reason)
  assert.equal(verify(before,candidate).ok,true)
  assert.deepEqual(before,original)
  assert.equal(candidate.manufacturingApproved,false)
  assert.equal(candidate.cuttingAuthorized,false)
  checks.push('Rust authored source and six independent XS–XXL material sizes; derived paired facing from a real native named seam edge with unchanged source')

  stage='load disposable connected physical facing receiver'
  const receiver=clone(before)
  receiver.template=candidate.template
  receiver.grade_run=candidate.gradeRun
  receiver.state=null;receiver.mesh_signature=null
  await send({op:'open',project:receiver})
  assert.equal(state.template.panels.some(p=>p.id===options.facingId),true)
  assert.equal(state.template.seams.some(s=>s.id===candidate.pairedSeamId),true)
  const native=(await send({op:'save'})).project
  assert.equal(native.grade_run.sizes.length,6)
  const cut=await send({op:'grade-run-cutlines'})
  assert.equal(cut.format,'exo-native-graded-cutlines.v1')
  assert.equal(cut.cuttingAuthorized,false)
  assert.equal(cut.manufacturerReady,false)
  assert.deepEqual(cut.sizes.map(s=>s.size),sizes)
  const sewing=await send({op:'grade-run-sewing-balance-audit'})
  assert.equal(sewing.format,'exo-native-six-size-sewn-balance-audit.v1')
  assert.equal(sewing.factoryApproved,false)
  assert.equal(sewing.easeReviewRequired,false)
  assert.deepEqual(sewing.sizes.map(s=>s.size),sizes)
  let physicalNotches=0
  for(let i=0;i<6;i++){
    const size=sizes[i],shape=panel(native.grade_run.gradedTemplates[i],options.facingId).polygon
    const sourcePoly=panel(native.grade_run.gradedTemplates[i],id).polygon
    assert.deepEqual(shape.points,candidate.sizes[i].points)
    const src=cut.sizes[i].panels.find(x=>x.panel_id===id)
    const child=cut.sizes[i].panels.find(x=>x.panel_id===options.facingId)
    assert(src?.cut&&child?.cut,`${size} missing source or facing CUT`)
    assert.equal(child.cut.notches.length,2)
    assert.deepEqual(child.cut.edges.map(e=>e.name),shape.edges)
    assert(child.cut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-10))
    assert(child.cut.area_m2>0&&child.cut.perimeter_m>0)
    const topName=sourcePoly.edges[0],faceName=shape.edges[0]
    close(child.sewline_edge_lengths_m[faceName],src.sewline_edge_lengths_m[topName],`${size} parent/facing sewn length`)
    const nativeSeam=sewing.sizes[i].seams.find(s=>s.seamId===candidate.pairedSeamId)
    assert(nativeSeam,`${size} native paired facing sewn audit missing`)
    assert.equal(nativeSeam.allowEase,false)
    assert.equal(nativeSeam.requiresEaseReview,false)
    close(nativeSeam.mismatchM,0,`${size} seam mismatch`,1e-6)
    assert.equal(nativeSeam.notchIntervalLengthsM.length,3)
    for(const pair of nativeSeam.notchIntervalLengthsM)close(pair[0],pair[1],`${size} matching physical notch intervals`,1e-6)
    for(const mark of child.cut.notches){
      assert.equal(mark.edge_id,faceName)
      close(mark.depth_m,.004,`${size} physical notch depth`)
      close(Math.hypot(mark.cut_start[0]-mark.inner_end[0],mark.cut_start[1]-mark.inner_end[1]),
        .004,`${size} physical CUT notch depth`)
      physicalNotches++
    }
  }
  assert.equal(physicalNotches,12)
  checks.push('Actual native six-size Rust CUT/STITCH and paired sewn audits: 12 facing notches, exact named allowances, zero ease, 6 balanced material lengths')

  stage='forged six-size facing provenance rollback'
  const bad=clone(native.grade_run)
  panel(bad.gradedTemplates[5],options.facingId).polygon.points[1][0]+=.003
  const wrongGrade=await reject({op:'grade-run-commit',gradeRun:bad},'forged child width')
  const easing=clone(native.grade_run)
  easing.gradedTemplates[5].seams.find(s=>s.id===candidate.pairedSeamId).allow_ease=true
  const easingError=await reject({op:'grade-run-commit',gradeRun:easing},'unauthorized physical facing ease')
  checks.push('Forged graded facing geometry and unauthorized facing ease rejected without revising the real native document')
  console.log(JSON.stringify({passed:true,nativeRust:true,disposable:true,
    physicalFacingCandidateAccepted:true,sourceRevision,sourcePanelId:id,
    derivedPanelId:options.facingId,pairedSeamId:candidate.pairedSeamId,
    sixSizes:sizes,physicalFacingNotches:physicalNotches,
    cuttingAuthorized:false,manufacturingApproved:false,persistentNativeFacingGraph:false,
    licenseModarisAccepted:false,checks,wrongGrade,easingError},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,nativeRust:true,disposable:true,
    physicalFacingCandidateAccepted:false,stage,reason:error?.message??String(error),checks,
    manufacturingApproved:false,cuttingAuthorized:false},null,2))
  process.exitCode=1
}finally{await Promise.resolve(workspace.close()).catch(()=>{});fs.rmSync(temp,{recursive:true,force:true})}
