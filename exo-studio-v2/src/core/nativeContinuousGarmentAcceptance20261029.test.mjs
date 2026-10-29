import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativeContinuousGarment20261029 as verify} from './nativeContinuousGarmentAcceptance20261029.mjs'

const sizes=['XS','S','M','L','XL','XXL']
const fixture=()=>{
  const ids=['front','back','panel_1','panel_2','facing']
  const seams=[
    {id:'front-back',a:{panel:'front'},b:{panel:'back'}},
    {id:'bridge',a:{panel:'back'},b:{panel:'panel_1'}},
    {id:'new-panels',a:{panel:'panel_1'},b:{panel:'panel_2'}},
    {id:'facing-attach',a:{panel:'panel_1'},b:{panel:'facing'}},
  ]
  const project={template:{panels:ids.map(id=>({id})),seams},
    grade_run:{sizes,gradedTemplates:sizes.map(()=>({panels:ids.map(id=>({id})),seams:structuredClone(seams)}))}}
  const sewing={factoryApproved:false,easeReviewRequired:false,
    sizes:sizes.map(size=>({size,seams:seams.map(s=>({seamId:s.id,mismatchM:0,requiresEaseReview:false}))}))}
  const cutlines={format:'exo-native-graded-cutlines.v1',cuttingAuthorized:false,
    sizes:sizes.map(size=>({size,panels:ids.map(panel_id=>({panel_id,cut:{points:[[0,0],[1,0],[0,1]]}}))}))}
  return {project,sewing,cutlines,expectedPanels:5,requiredSeamIds:['front-back']}
}
test('one truly sewn 5-panel source, all sizes, per-size seams and CUT passes without factory certification',()=>{
  const proof=verify(fixture())
  assert.equal(proof.componentCount,1)
  assert.equal(proof.gradedSeamChecks,24)
  assert.equal(proof.physicalCutpieces,30)
  assert.equal(proof.factoryApproved,false)
})
for(const [name,mutate,reason] of [
  ['delete the only bridge to original body',x=>{x.project.template.seams[1].b.panel='back'},/disconnected sewn graph/],
  ['missing original seam',x=>{x.project.template.seams[0].id='forged-original'},/original saved garment seam missing/],
  ['seam references a forged panel',x=>{x.project.template.seams[1].b.panel='forged'},/nonexistent garment panel/],
  ['sewn topological grade loss',x=>{x.project.grade_run.gradedTemplates[3].seams.pop()},/grade silently dropped/],
  ['graded size reroutes sewing endpoint',x=>{x.project.grade_run.gradedTemplates[3].seams[1].b.panel='front'},/graded seam provenance/],
  ['graded size silently enables easing',x=>{x.project.grade_run.gradedTemplates[2].seams[1].allow_ease=true},/graded seam provenance/],
  ['per-size seam loss',x=>{x.sewing.sizes[3].seams.pop()},/per-size native seam auditing/],
  ['unequal physical seam',x=>{x.sewing.sizes[3].seams[0].mismatchM=.002},/graded sewn length/],
  ['unreviewed sewn ease',x=>{x.sewing.sizes[2].seams[0].requiresEaseReview=true},/graded sewn length/],
  ['invalid derived size CUT count',x=>{x.cutlines.sizes[2].panels.pop()},/physical CUT dropped/],
  ['invalid CUT polygon',x=>{x.cutlines.sizes[1].panels[0].cut.points[0][0]=Infinity},/invalid or nonfinite/],
  ['degenerate CUT polygon',x=>{x.cutlines.sizes[1].panels[0].cut.points=[[0,0],[.5,0],[1,0]]},/degenerate physical native CUT/],
  ['factory authorized asserted by forged audit',x=>{x.sewing.factoryApproved=true},/native sewn audit/],
  ['factory authorized asserted by forged CUT',x=>{x.cutlines.cuttingAuthorized=true},/native CUT evidence/],
]){
  test('fail closed: '+name,()=>{const x=fixture();mutate(x);assert.throws(()=>verify(x),reason)})
}
