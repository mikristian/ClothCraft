import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyModarisNativeFabricEnvelopeCommit20261027 as verify} from './modarisNativeFabricEnvelopeWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const offset={XS:-.015,S:-.007,M:0,L:.005,XL:.01,XXL:.014}
const clone=structuredClone
function panel(id,width) {
  return {id,polygon:{points:[[0,0],[width,0],[width,.32],[0,.32]],
    edges:['top','right','bottom','left'],curves:{},free_curve_points:{}}}
}
function template(width) {
  return {panels:[panel('front',width),panel('back',width)],seams:[],fabrics:[{id:'fabric-1'}]}
}
function project(width) {
  const source=template(width)
  const graph={version:1,sourceTemplate:clone(source),
    measurements:{sharedWidth:{valueMm:width*1000}},
    bindings:['front','back'].map((panelId,i)=>({id:`width_${i}`,panelId,
      pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'sharedWidth',dependsOn:[]}))}
  const envelope={schemaVersion:1,provenance:'Lab source: operator-provided 2026-10-27',
    fabricId:'fabric-1',
    sourceTemplate:clone(source),
    measurements:{sharedWidth:Object.fromEntries(sizes.map(size=>[size,{minMm:370,maxMm:450}]))}}
  return {version:1,template:source,grade_run:{schemaVersion:1,sizes,baseSize:'M',
    baseTemplate:clone(source),gradedTemplates:sizes.map(size=>template(width+offset[size])),pomSpecs:[]},
    native_point_bindings:graph,fabric_grade_envelope:envelope,
    state:null,mesh_signature:null,project_label:'untouched'}
}
const fixture=()=>({beforeProject:project(.4),afterProject:project(.42),
  beforeRevision:10,afterRevision:11,measurement:'sharedWidth',expectedValueMm:420})

test('witness verifies real-shaped Rust saved six-size source, bound chart, rules and offsets',()=>{
  const input=fixture(), original=clone(input)
  const result=verify(input)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.checkedSizes,6)
  assert.equal(result.checkedBoundTargets,12)
  assert.equal(result.verifiedPersistedEnvelope,true)
  assert.equal(result.verifiedOriginalGradeOffsets,true)
  assert.equal(result.factoryApproved,false)
  assert.equal(result.independentlyVendorAccepted,false)
  assert.deepEqual(input,original)
})

test('witness refuses missing/forged fabric bounds, source or revisions',()=>{
  const cases=[
    x=>{x.afterRevision=12},
    x=>{x.afterProject.fabric_grade_envelope.measurements.sharedWidth.XS.maxMm=410},
    x=>{delete x.afterProject.fabric_grade_envelope.measurements.sharedWidth.XXL},
    x=>{x.afterProject.fabric_grade_envelope.provenance='changed'},
    x=>{x.afterProject.fabric_grade_envelope.fabricId='unknown-fabric'},
    x=>{x.afterProject.fabric_grade_envelope.sourceTemplate.panels[0].polygon.points[1][0]=.1},
    x=>{x.afterProject.native_point_bindings.sourceTemplate.panels[0].polygon.points[1][0]=.1},
    x=>{x.afterProject.native_point_bindings.measurements.sharedWidth.valueMm=430},
    x=>{x.afterProject.native_point_bindings.bindings[0].distanceFormula='fake'},
    x=>{x.afterProject.grade_run.sizes.reverse()},
    x=>{x.afterProject.grade_run.gradedTemplates[0].panels[0].polygon.points[1][0]+=.002},
    x=>{x.afterProject.template.panels[0].polygon.points[1][0]+=.002},
    x=>{x.afterProject.project_label='modified'},
    x=>{x.afterProject.fabric_grade_envelope.measurements.extra={}},
  ]
  for(const [index,change] of cases.entries()){
    const input=fixture();change(input)
    const result=verify(input)
    assert.equal(result.ok,false,`Unsafe fabric witness case ${index} accepted`)
    assert.equal(result.factoryApproved,false)
  }
})
