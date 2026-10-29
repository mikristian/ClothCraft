import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativePerSizeChartStore20261027 as verify} from './modarisNativePerSizeChartStoreWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const clone=structuredClone
function fixture(){
  const template={fabrics:[{id:'cotton'}],panels:[{id:'front',polygon:{
    points:[[0,0],[.4,0],[.4,.32],[0,.32]],edges:['top','right','bottom','left']}}],seams:[]}
  const graph={measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}},sourceTemplate:clone(template)}
  const grade={schemaVersion:1,baseSize:'M',sizes,baseTemplate:clone(template),
    gradedTemplates:sizes.map(()=>clone(template)),pomSpecs:[{id:'width_pom',kind:'anchor-distance',panelId:'front',fromPoint:0,toPoint:1}]}
  const beforeProject={template,native_point_bindings:graph,grade_run:grade,state:null,mesh_signature:null}
  const values={halfWidth:{},width:{}},measurements={halfWidth:{},width:{}},physicalPomBounds={width_pom:{}}
  for(const size of sizes){
    values.halfWidth[size]={directInputMm:200,valueMm:200}
    values.width[size]={valueMm:400}
    measurements.halfWidth[size]={minMm:190,maxMm:220}
    measurements.width[size]={minMm:380,maxMm:440}
    physicalPomBounds.width_pom[size]={minMm:380,maxMm:440}
  }
  const authoredEnvelope={schemaVersion:1,fabricId:'cotton',provenance:'Operator supplied',
    sourceTemplate:clone(template),measurements,physicalPomBounds,
    perSizeChart:{provenance:'Operator six-size chart',sourceMeasurements:clone(graph.measurements),values}}
  const afterProject={...clone(beforeProject),fabric_grade_envelope:clone(authoredEnvelope)}
  const inspected={nativeAuthoritative:true,sourceRevision:9,envelope:clone(authoredEnvelope)}
  return {beforeProject,afterProject,authoredEnvelope,inspected,beforeRevision:8,afterRevision:9}
}
test('native one-revision chart-only save/inspect witness accepts exact complete XS–XXL persistence',()=>{
  const data=fixture(),prior=clone(data)
  const result=verify(data)
  assert.equal(result.ok,true,JSON.stringify(result))
  assert.equal(result.nativeChartPersisted,true)
  assert.equal(result.sizeCount,6)
  assert.equal(result.measurementCount,2)
  assert.equal(result.pomCount,1)
  assert.equal(result.factoryApproved,false)
  assert.deepEqual(data,prior,'Read-only witness must never mutate caller data')
})
test('native chart-only store rejects forged receipt, size and physical limits without factory approval',()=>{
  const attacks=[
    d=>d.afterRevision=11,
    d=>d.inspected.nativeAuthoritative=false,
    d=>d.inspected.sourceRevision=8,
    d=>d.inspected.factoryApproved=true,
    d=>d.inspected.envelope.perSizeChart.values.width.XL.valueMm=900,
    d=>d.afterProject.fabric_grade_envelope.perSizeChart.values.width.M.valueMm=900,
    d=>d.afterProject.template.panels[0].polygon.points[1][0]=.5,
    d=>d.afterProject.grade_run.gradedTemplates[2].panels[0].polygon.points[1][0]=.5,
    d=>d.afterProject.native_point_bindings.measurements.halfWidth.valueMm=210,
    d=>d.afterProject.grade_run.sizes[3]='XXXL',
    d=>d.authoredEnvelope.perSizeChart.sourceMeasurements.width.formula='halfWidth * 3',
    d=>delete d.afterProject.fabric_grade_envelope.perSizeChart.values.width.XS,
    d=>delete d.afterProject.fabric_grade_envelope.physicalPomBounds.width_pom.M,
    d=>d.afterProject.fabric_grade_envelope.measurements.width.XS.maxMm=390,
    d=>d.authoredEnvelope.fabricId='forged',
    d=>delete d.afterProject.fabric_grade_envelope,
    d=>{
      for(const envelope of [d.authoredEnvelope,d.inspected.envelope,d.afterProject.fabric_grade_envelope])
        envelope.perSizeChart.values.width.XL.valueMm=401
    },
    d=>{
      for(const envelope of [d.authoredEnvelope,d.inspected.envelope,d.afterProject.fabric_grade_envelope])
        envelope.physicalPomBounds.width_pom.XXL.maxMm=390
    },
  ]
  for(const [i,attack] of attacks.entries()){
    const data=fixture();attack(data)
    const result=verify(data)
    assert.equal(result.ok,false,`Forged chart receipt ${i} was accepted: ${JSON.stringify(result)}`)
    assert.equal(result.factoryApproved,false)
    assert.equal(result.licensedModarisAccepted,false)
  }
})
test('native chart witness independently measures all six named sewline edges and wrapped directed paths',()=>{
  for(const kind of ['sewline-edge','sewline-path']){
    const data=fixture(),pom=data.afterProject.grade_run.pomSpecs[0]
    pom.kind=kind
    if(kind==='sewline-edge'){
      delete pom.fromPoint;delete pom.toPoint;pom.edge='top'
    }else{
      pom.fromPoint=3;pom.toPoint=1
    }
    data.beforeProject.grade_run.pomSpecs=clone(data.afterProject.grade_run.pomSpecs)
    const measured=kind==='sewline-edge'?400:720
    for(const size of sizes){
      const bound=data.authoredEnvelope.physicalPomBounds.width_pom[size]
      bound.minMm=measured-1;bound.maxMm=measured+1
    }
    data.inspected.envelope=clone(data.authoredEnvelope)
    data.afterProject.fabric_grade_envelope=clone(data.authoredEnvelope)
    assert.equal(verify(data).ok,true,`${kind}: ${JSON.stringify(verify(data))}`)
    const attack=clone(data)
    if(kind==='sewline-edge')attack.afterProject.grade_run.pomSpecs[0].edge='missing'
    else attack.afterProject.grade_run.pomSpecs[0].toPoint=2
    assert.equal(verify(attack).ok,false,`${kind} changed physical reference accepted`)
  }
})
test('native chart witness measures physical cubic seam arclength, not just endpoint distance',()=>{
  const data=fixture(),pom=data.afterProject.grade_run.pomSpecs[0]
  pom.kind='sewline-edge';delete pom.fromPoint;delete pom.toPoint;pom.edge='top'
  for(const graded of data.afterProject.grade_run.gradedTemplates){
    graded.panels[0].polygon.curves={top:[[.12,.04],[.28,.04]]}
  }
  data.beforeProject.grade_run=clone(data.afterProject.grade_run)
  for(const size of sizes){
    const bound=data.authoredEnvelope.physicalPomBounds.width_pom[size]
    bound.minMm=400;bound.maxMm=450
  }
  data.inspected.envelope=clone(data.authoredEnvelope)
  data.afterProject.fabric_grade_envelope=clone(data.authoredEnvelope)
  assert.equal(verify(data).ok,true,JSON.stringify(verify(data)))
  const attack=clone(data)
  for(const source of [attack.authoredEnvelope,attack.inspected.envelope,attack.afterProject.fabric_grade_envelope]){
    for(const size of sizes)source.physicalPomBounds.width_pom[size].maxMm=400
  }
  const result=verify(attack)
  assert.equal(result.ok,false,'Curved seam with endpoints 400 mm must exceed 400 mm physical limit')
  assert.match(result.reason,/physical POM violates persisted fabric limits/i)
})
