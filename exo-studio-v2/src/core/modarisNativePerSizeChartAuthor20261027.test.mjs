import assert from 'node:assert/strict'
import test from 'node:test'
import {authorNativePerSizeChartEnvelope20261027 as author} from './modarisNativePerSizeChartAuthor20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const shifts={XS:-8,S:-4,M:0,L:5,XL:10,XXL:14}
const clone=structuredClone
function fixture(){
  const template={fabrics:[{id:'fabric_1'}],panels:[{id:'panel_1',polygon:{
    points:[[0,0],[.4,0],[.4,.32],[0,.32]],edges:['top','right','bottom','left']}}]}
  const grade={schemaVersion:1,sizes:[...sizes],baseSize:'M',baseTemplate:clone(template),
    gradedTemplates:sizes.map(size=>{
      const t=clone(template)
      if(shifts[size]!==0)t.panels[0].polygon.points[1][0]+=(shifts[size]*2)/1000
      return t
    }),pomSpecs:[{id:'width_pom',kind:'anchor-distance',panelId:'panel_1',fromPoint:0,toPoint:1}]}
  const project={revision:8,template,native_point_bindings:{sourceTemplate:clone(template),
    measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}}},grade_run:grade}
  const directCells={halfWidth:Object.fromEntries(sizes.map(size=>[size,200+shifts[size]]))}
  const bounds={halfWidth:{},width:{}},physicalPomBounds={width_pom:{}}
  for(const size of sizes){
    const half=directCells.halfWidth[size],width=half*2
    bounds.halfWidth[size]={minMm:half-1,maxMm:half+1}
    bounds.width[size]={minMm:width-2,maxMm:width+2}
    physicalPomBounds.width_pom[size]={minMm:width-2,maxMm:width+2}
  }
  const spec={project,sourceRevision:8,fabricId:'fabric_1',
    provenance:'Operator supplied physical limits',chartProvenance:'Operator supplied six direct values',
    directCells,bounds,physicalPomBounds}
  return spec
}
const rejected=(mutate,match)=>{
  const input=fixture()
  mutate(input)
  const result=author(input)
  assert.equal(result.ok,false,JSON.stringify(result))
  if(match)assert.match(result.reason,match)
}

test('authors Rust-shaped complete six-size computed native chart without mutating saved project',()=>{
  const input=fixture(),before=clone(input)
  const result=author(input)
  assert.equal(result.ok,true,JSON.stringify(result))
  assert.deepEqual(input,before)
  assert.equal(result.envelope.perSizeChart.values.halfWidth.M.directInputMm,200)
  assert.deepEqual(result.envelope.perSizeChart.values.width.XL,{valueMm:420})
  assert.deepEqual(result.envelope.perSizeChart.sourceMeasurements,
    input.project.native_point_bindings.measurements)
  assert.deepEqual(result.envelope.sourceTemplate,input.project.template)
  assert.deepEqual(Object.keys(result.envelope.perSizeChart.values.width),sizes)
  assert.equal(result.summary.requiresNativeStore,true)
  assert.equal(result.summary.manufacturingApproved,false)
  assert.equal(Object.isFrozen(result.envelope),true)
})

test('refuses unknown, forged or missing computed inputs',()=>{
  rejected(s=>{s.directCells.width=Object.fromEntries(sizes.map(z=>[z,400]))},/computed input/i)
  rejected(s=>{delete s.directCells.halfWidth.XS},/six direct/i)
  rejected(s=>{s.directCells.halfWidth.M=205},/M value/i)
  rejected(s=>{s.directCells.halfWidth.XXL=NaN},/six direct/i)
  rejected(s=>{s.directCells.halfWidth.XS='192'},/six direct/i)
})

test('refuses forged saved source, stale revision, grade catalog and omitted data',()=>{
  rejected(s=>{delete s.project.native_point_bindings},/native bindings/i)
  rejected(s=>{delete s.project.grade_run},/grade run/i)
  rejected(s=>{s.project.revision=9},/revision/i)
  rejected(s=>{s.project.grade_run.sizes.pop()},/grade run/i)
  rejected(s=>{s.project.native_point_bindings.sourceTemplate={}},/source/i)
  rejected(s=>{s.project.grade_run.baseTemplate={}},/source/i)
  rejected(s=>{delete s.project.native_point_bindings.measurements},/graph/i)
  rejected(s=>{s.fabricId='fabric_unknown'},/fabric|source/i)
})

test('refuses cycles, unknown references, division by zero and malicious expressions',()=>{
  rejected(s=>{s.project.native_point_bindings.measurements.halfWidth={formula:'width'};
    s.directCells={}},/Circular|graph/i)
  rejected(s=>{s.project.native_point_bindings.measurements.width={formula:'missing * 2'}},/Missing measurement|graph/i)
  rejected(s=>{s.project.native_point_bindings.measurements.width={formula:'halfWidth / (2 - 2)'}},/Division by zero|graph/i)
  rejected(s=>{s.project.native_point_bindings.measurements.width={formula:'process.exit(1)'}},/Forbidden|trailing|formula|graph/i)
})

test('refuses fabricated, incomplete or breached measurement and physical limits',()=>{
  rejected(s=>{delete s.bounds.width.XS},/sizes|source/i)
  rejected(s=>{delete s.bounds.width},/coverage|source/i)
  rejected(s=>{s.bounds.width.M.minMm=401},/bounds/i)
  rejected(s=>{s.bounds.width.M.maxMm=399},/bounds/i)
  rejected(s=>{s.bounds.width.M.minMm=NaN},/limits/i)
  rejected(s=>{delete s.physicalPomBounds.width_pom.XL},/sizes/i)
  rejected(s=>{s.physicalPomBounds.width_pom.XL.maxMm=1},/limits/i)
  rejected(s=>{delete s.physicalPomBounds},/Physical POM/i)
  rejected(s=>{s.physicalPomBounds.width_pom.M.maxMm=399},/Physical graded POM/i)
})

test('refuses absent provenance and unsupported physical POMs',()=>{
  rejected(s=>{s.provenance=' '},/provenance|source/i)
  rejected(s=>{s.chartProvenance=''},/provenance|source/i)
  rejected(s=>{s.project.grade_run.pomSpecs[0].kind='unsupported'},/Unsupported physical/i)
})
test('authors Rust-native six-size sampled seam-edge and directed wrap-path physical limits',()=>{
  const input=fixture(),pom=input.project.grade_run.pomSpecs[0]
  for(const kind of ['sewline-edge','sewline-path']){
    pom.kind=kind
    if(kind==='sewline-edge'){
      delete pom.fromPoint;delete pom.toPoint;pom.edge='top'
    }else{
      delete pom.edge;pom.fromPoint=3;pom.toPoint=1
    }
    for(const size of sizes){
      const w=400+shifts[size]*2,mm=w+(kind==='sewline-path'?320:0)
      input.physicalPomBounds.width_pom[size]={minMm:mm-1,maxMm:mm+1}
    }
    const before=clone(input),result=author(input)
    assert.equal(result.ok,true,JSON.stringify(result))
    assert.deepEqual(input,before,'Author must not change the saved native project')
    assert.deepEqual(result.envelope.physicalPomBounds.width_pom,input.physicalPomBounds.width_pom)
  }
})
test('sampled cubic physical seam limits reject endpoint-only length assumptions',()=>{
  const input=fixture(),pom=input.project.grade_run.pomSpecs[0]
  pom.kind='sewline-edge';delete pom.fromPoint;delete pom.toPoint;pom.edge='top'
  for(const graded of input.project.grade_run.gradedTemplates){
    graded.panels[0].polygon.curves={top:[[.12,.04],[.28,.04]]}
  }
  for(const size of sizes){
    const w=400+shifts[size]*2
    input.physicalPomBounds.width_pom[size]={minMm:w,maxMm:w+50}
  }
  assert.equal(author(input).ok,true)
  for(const size of sizes)input.physicalPomBounds.width_pom[size].maxMm=400+shifts[size]*2
  const rejected=author(input)
  assert.equal(rejected.ok,false)
  assert.match(rejected.reason,/Physical graded POM outside explicit bounds/i)
})
