import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeSixSizeFacingCandidate20261027 as build,
  verifyNativeSixSizeFacingCandidate20261027 as verify} from './modarisNativeFacingCandidate20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
function project(){
  const panel=w=>({id:'front',name:'Front',fabric:'fabric_1',pattern:{width:.4,height:.32},pins:[],pin_points:[],
    polygon:{points:[[0,0],[w,0],[w,.32],[0,.32]],edges:['top','right','bottom','left'],
      curves:{},free_curve_points:{},holes:[],lines:[],annotations:[],measurements:[],
      seam_allowances:{top:.01,right:.01,bottom:.01,left:.01},
      notches:{top:[{t:.25,depth_m:.004},{t:.75,depth_m:.004}]}}})
  const template={panels:[panel(.4)],seams:[],fabrics:[{id:'fabric_1'}]}
  const gradedTemplates=sizes.map((_,i)=>({panels:[panel(.4+(i-2)*.008)],seams:[],fabrics:template.fabrics}))
  gradedTemplates[2]=structuredClone(template)
  return {template,grade_run:{schemaVersion:1,baseSize:'M',baseTemplate:structuredClone(template),gradedTemplates,sizes,pomSpecs:[]}}
}
const args={expectedRevision:12,parentPanelId:'front',parentEdgeId:'top',facingId:'front_neck_facing',depthMm:40,allowanceMm:10}
test('derives 6 native-facing contour panels and full no-ease sewn inventory without mutating source',()=>{
  const source=project(),unchanged=structuredClone(source),proposal=build(source,args)
  assert.equal(proposal.ok,true,proposal.reason)
  assert.equal(proposal.referenceOnly,true)
  assert.equal(proposal.manufacturingApproved,false)
  assert.equal(proposal.cuttingAuthorized,false)
  assert.deepEqual(source,unchanged)
  assert.equal(proposal.sizes.length,6)
  assert.deepEqual(proposal.gradeRun.sizes,sizes)
  assert.equal(proposal.template.panels.length,2)
  assert.equal(proposal.template.seams.length,1)
  assert.equal(proposal.gradeRun.gradedTemplates.length,6)
  for(const [i,size] of sizes.entries()){
    const row=proposal.sizes[i],face=proposal.gradeRun.gradedTemplates[i].panels.at(-1)
    const parent=source.grade_run.gradedTemplates[i].panels[0]
    assert.equal(row.size,size)
    assert.deepEqual(row.points,[[0,0],[parent.polygon.points[1][0],0],
      [parent.polygon.points[1][0],.04],[0,.04]])
    assert.deepEqual(face.polygon.points,row.points)
    assert.deepEqual(face.polygon.notches[`${args.facingId}_sew`],parent.polygon.notches.top)
    assert.deepEqual(Object.values(face.polygon.seam_allowances),[.01,.01,.01,.01])
    assert.equal(proposal.gradeRun.gradedTemplates[i].seams[0].allow_ease,false)
    assert.equal(proposal.gradeRun.gradedTemplates[i].seams[0].reverse_b,true)
  }
  assert.deepEqual(proposal.template,proposal.gradeRun.baseTemplate)
  assert.equal(verify(source,proposal).ok,true)
})
test('facing provenance refuses stale source, forged derived geometry and unauthorized flags',()=>{
  const source=project(),proposal=build(source,args)
  const edits=[
    p=>{p.sizes[0].points[1][0]+=.003},
    p=>{p.gradeRun.gradedTemplates[0].panels.at(-1).polygon.points[1][0]+=.005},
    p=>{p.gradeRun.gradedTemplates[5].seams[0].allow_ease=true},
    p=>{p.template.seams[0].notches[0][1]=.33},
    p=>{p.provenance.sourceRevision=11},
    p=>{p.provenance.licensedModarisAccepted=true},
    p=>{p.manufacturingApproved=true},
  ]
  for(const [index,mutate] of edits.entries()){
    const forged=structuredClone(proposal);mutate(forged)
    assert.equal(verify(source,forged).ok,false,`Forged facing candidate ${index} was accepted`)
  }
  const stale=project();stale.template.panels[0].polygon.points[2][1]+=.002
  assert.equal(verify(stale,proposal).ok,false)
})
test('refuses curved, already-sewn, missing allowance, unsupported marks, false grade and insufficient depth',()=>{
  const cases=[
    p=>{p.template.seams.push({id:'some',a:{panel:'front',edge:'top'},b:{panel:'other',edge:'x'}})},
    p=>{p.template.panels[0].polygon.curves.top=[[.1,-.01],[.2,-.01]]},
    p=>{p.template.panels[0].polygon.seam_allowances.top=0},
    p=>{p.template.panels[0].polygon.holes=[{id:'hole'}]},
    p=>{p.grade_run.gradedTemplates[1].panels[0].polygon.notches.top[1].t=.65},
    p=>{p.grade_run.baseTemplate.panels[0].id='forged'},
    p=>{p.grade_run.gradedTemplates[3].panels[0].polygon.points[2][0]+=.04},
  ]
  for(const [i,mutate] of cases.entries()){
    const p=project();mutate(p)
    assert.equal(build(p,args).ok,false,`Unsupported source ${i} accepted`)
  }
  assert.equal(build(project(),{...args,depthMm:101}).ok,false)
  assert.equal(build(project(),{...args,facingId:'front'}).ok,false)
})
