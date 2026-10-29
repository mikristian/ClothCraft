import test from 'node:test'
import assert from 'node:assert/strict'
import {authorModarisNativePhysicalPomEnvelope20261027 as author} from './modarisNativePhysicalPomEnvelopeAuthor20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
const clone=structuredClone
function fixture(){
  const template={fabrics:[{id:'cotton'}],panels:[{id:'front',polygon:{
    points:[[0,0],[.4,0],[.4,.32],[0,.32]],edges:['top','right','bottom','left']}}]}
  const gradedTemplates=sizes.map((size,i)=>{
    const result=clone(template)
    result.panels[0].polygon.points[1][0]+=offsets[i]
    return result
  })
  const project={template,grade_run:{sizes,baseTemplate:clone(template),gradedTemplates,
    pomSpecs:[{id:'width_pom',panelId:'front',kind:'anchor-distance',fromPoint:0,toPoint:1}]},
    native_point_bindings:{sourceTemplate:clone(template),measurements:{sharedWidth:{valueMm:400}}}}
  const physical=Object.fromEntries(sizes.map((size,i)=>[size,{
    minMm:399+1000*offsets[i],maxMm:416+1000*offsets[i]}]))
  const spec={fabricId:'cotton',provenance:'Explicit physical QA sample, not factory approved',
    measurements:{sharedWidth:Object.fromEntries(sizes.map(size=>[size,{minMm:390,maxMm:430}]))},
    physicalPomBounds:{width_pom:physical}}
  return {project,spec}
}

test('authors complete saved Rust envelope from six actual physical graded anchor distances',()=>{
  const {project,spec}=fixture()
  const result=author(project,spec)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.measured.length,6)
  for(let i=0;i<6;i++){
    assert.equal(result.measured[i].size,sizes[i])
    assert(Math.abs(result.measured[i].measuredMm-(400+1000*offsets[i]))<1e-8)
  }
  assert.deepEqual(result.envelope.physicalPomBounds,spec.physicalPomBounds)
  assert.deepEqual(result.envelope.sourceTemplate,project.template)
  assert.equal(result.requiresNativeStore,true)
  assert.equal(result.authoritative,false)
  assert.equal(result.factoryApproved,false)
  assert(Object.isFrozen(result.envelope.physicalPomBounds.width_pom.XL))
  assert.equal(project.fabric_grade_envelope,undefined,'Author must not mutate source project')
})

test('rejects missing cells, forged physical geometry and provenance, stale source, unknown fabric',()=>{
  const mutations=[
    ({spec})=>{delete spec.measurements.sharedWidth.XL},
    ({spec})=>{spec.measurements.sharedWidth.XL.minMm=450},
    ({spec})=>{delete spec.physicalPomBounds.width_pom.XS},
    ({spec})=>{spec.physicalPomBounds.width_pom.XXL.maxMm=410},
    ({project})=>{project.grade_run.gradedTemplates[4].panels[0].polygon.points[1][0]+=.08},
    ({project})=>{project.native_point_bindings.sourceTemplate.panels[0].polygon.points[1][0]+=.01},
    ({project})=>{project.grade_run.baseTemplate.panels[0].polygon.points[1][0]+=.01},
    ({project})=>{project.grade_run.gradedTemplates[1].panels[0].polygon.points[1][0]=NaN},
    ({project})=>{project.grade_run.pomSpecs[0].kind='sewline-path'},
    ({project})=>{project.grade_run.pomSpecs[0].id='forged'},
    ({project})=>{project.grade_run.pomSpecs[0].id='__proto__'},
    ({project})=>{project.native_point_bindings.measurements.sharedWidth={formula:'chest/2'}},
    ({spec})=>{spec.fabricId='unknown'},
    ({spec})=>{spec.provenance=''},
    ({spec})=>{spec.extra='unreviewed'},
  ]
  for(const mutate of mutations){
    const input=fixture()
    mutate(input)
    const before=clone(input)
    const result=author(input.project,input.spec)
    assert.equal(result.ok,false,mutate.toString())
    assert.deepEqual(input,before,'Rejected authoring must never mutate project or input')
  }
})
