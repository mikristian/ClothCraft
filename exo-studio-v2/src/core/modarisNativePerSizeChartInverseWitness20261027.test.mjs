import test from 'node:test'
import assert from 'node:assert/strict'
import {authorNativePerSizeChartEnvelope20261027 as author} from './modarisNativePerSizeChartAuthor20261027.js'
import {verifyNativePerSizeChartInverse20261027 as witness} from './modarisNativePerSizeChartInverseWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-8,S:-4,M:0,L:5,XL:10,XXL:14}
const clone=structuredClone
function fixture(){
  const template={fabrics:[{id:'f'}],panels:[{id:'p',polygon:{
    points:[[0,0],[.4,0],[.4,.32],[0,.32]],edges:['top','right','bottom','left']}}]}
  const grade={schemaVersion:1,sizes:[...sizes],baseSize:'M',baseTemplate:clone(template),
    gradedTemplates:sizes.map(size=>{
      const t=clone(template);t.panels[0].polygon.points[1][0]+=offsets[size]*.002;return t
    }),pomSpecs:[{id:'pom',kind:'anchor-distance',panelId:'p',fromPoint:0,toPoint:1}]}
  const graph={sourceTemplate:clone(template),measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}},
    bindings:[{id:'bound',panelId:'p',pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]}]}
  const directCells={halfWidth:{}},bounds={halfWidth:{},width:{}},physicalPomBounds={pom:{}}
  for(const size of sizes){
    const half=200+offsets[size],width=half*2
    directCells.halfWidth[size]=half
    bounds.halfWidth[size]={minMm:half-2,maxMm:half+2}
    bounds.width[size]={minMm:width-2,maxMm:width+2}
    physicalPomBounds.pom[size]={minMm:width-2,maxMm:width+2}
  }
  const project={revision:10,template,grade_run:grade,native_point_bindings:graph}
  const result=author({project,sourceRevision:10,fabricId:'f',provenance:'Operator',
    chartProvenance:'Six-size chart',directCells,bounds,physicalPomBounds})
  assert.equal(result.ok,true,result.reason)
  project.fabric_grade_envelope=clone(result.envelope)
  return {before:project,after:clone(project),revisionBefore:10,revisionAfter:11,
    command:{kind:'Anchor',panel:'p',anchor:1,position:[.41,0]}}
}
const rejects=(mutator,match)=>{
  const input=fixture(),untouched=clone(input)
  mutator(input)
  const snapshot=clone(input)
  const result=witness(input)
  assert.equal(result.ok,false)
  assert.equal(result.nativeInverseVerified,false)
  assert.match(result.reason,match)
  assert.deepEqual(input,snapshot,'read-only verifier mutated its input')
  assert.ok(untouched.before.fabric_grade_envelope.perSizeChart.values.width.M.valueMm===400)
}

test('legacy read-only witness cannot certify a native computed inverse without physical receipt',()=>{
  rejects(()=>{},/cannot certify computed formula inverse/i)
})
test('forged computed cell and direct cell cannot pass witness',()=>{
  rejects(x=>{x.before.fabric_grade_envelope.perSizeChart.values.width.XL.valueMm=900},/stale computed/i)
  rejects(x=>{x.before.fabric_grade_envelope.perSizeChart.values.width.M.directInputMm=400},/forged computed/i)
  rejects(x=>{x.before.fabric_grade_envelope.perSizeChart.values.halfWidth.XS.directInputMm=500},/forged direct/i)
})
test('reject stale source graph identity, revision and size tampering',()=>{
  rejects(x=>{x.before.native_point_bindings.measurements.halfWidth.valueMm=201},/stale native chart/i)
  rejects(x=>{x.revisionAfter=13},/one-revision/i)
  rejects(x=>{x.before.grade_run.sizes[0]='XXXL'},/six-size native source/i)
  rejects(x=>{delete x.before.fabric_grade_envelope.perSizeChart.values.width.XXL},/six-size chart/i)
})
test('reject forged physical POM and missing native operation',()=>{
  rejects(x=>{x.before.fabric_grade_envelope.physicalPomBounds.pom.XL.maxMm=1},/physical POM/i)
  rejects(x=>{x.command={kind:'MovePoints'}},/native Anchor inverse/i)
})
