import test from 'node:test'
import assert from 'node:assert/strict'
import {authorModarisFabricBoundChart20261027 as author} from './modarisFabricBoundChartAuthor20261027.js'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {planModarisFabricBoundNativeChart20261027 as plan} from './modarisFabricBoundChart20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const chartValues=[380,400,420,440,460,480]
const snapshot=()=>({revision:9,template:{id:'author-fixture',panels:[{id:'front',polygon:{points:[[0,0],[.42,0],[.42,.3],[0,.3]],edges:['a','b','c','d']}}]}})
function fixture(){
  const source=snapshot()
  const saved=create(source,{measurements:{width:{valueMm:420},half:{formula:'width / 2'}},bindings:[{
    id:'front-width',panelId:'front',pointIndex:1,mode:'polar',a:0,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[],
  }]})
  assert.equal(saved.ok,true,saved.reason)
  const spec={fabricId:'supplier-twill-17',provenance:'Supplier fabric-limits document TS17, entered by technical patternmaker',
    sizes:[...sizes],baseSize:'M',measurements:{
      width:{kind:'direct',values:Object.fromEntries(sizes.map((size,i)=>[size,{value:chartValues[i]/10,unit:'cm'}]))},
      half:{kind:'formula',expression:'width / 2'},
    },bounds:sizes.flatMap((size,i)=>[
      {size,measurement:'width',minMm:chartValues[i]-5,maxMm:chartValues[i]+5},
      {size,measurement:'half',minMm:chartValues[i]/2-3,maxMm:chartValues[i]/2+3},
    ])}
  return {source,sidecar:saved.sidecar,spec}
}
test('fully authored six-size chart and physical bounds preserve native identities and units',()=>{
  const {source,sidecar,spec}=fixture(),before=structuredClone({source,sidecar,spec})
  const result=author(source,sidecar,spec)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.chart.measurements.width.values.L.value,440)
  assert.equal(result.chart.measurements.width.values.L.unit,'mm')
  assert.equal(result.perSize[2].valuesMm.half,210)
  assert.equal(result.geometryAligned,true)
  assert.equal(result.pendingNativePointEdits,0)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.calibratedFabricPhysics,false)
  assert(Object.isFrozen(result.envelope.bounds[0]))
  assert.deepEqual({source,sidecar,spec},before)
  const preview=plan(source,sidecar,result.chart,result.envelope,{size:'L'})
  assert.equal(preview.ok,true,preview.reason)
  assert(Math.abs(preview.nativePlan.steps[0].command.position[0]-.44)<1e-8)
})
test('explicit authored multi-unit measurements remain physically identical',()=>{
  const {source,sidecar,spec}=fixture()
  spec.measurements.width.values.M={value:420/25.4,unit:'in'}
  spec.measurements.width.values.XL={value:460,unit:'mm'}
  const result=author(source,sidecar,spec)
  assert.equal(result.ok,true,result.reason)
  assert(Math.abs(result.chart.measurements.width.values.M.value-420)<1e-8)
  assert.equal(result.chart.measurements.width.values.XL.value,460)
})
test('missing fabric provenance, missing size or bounds and fabricated base value fail closed',()=>{
  const {source,sidecar,spec}=fixture()
  const cases=[
    s=>{s.provenance=''},
    s=>{delete s.measurements.width.values.XS},
    s=>{s.measurements.width.values.M={value:430,unit:'mm'}},
    s=>{s.bounds.pop()},
    s=>{s.bounds[0].minMm=1000},
    s=>{s.bounds[0].size='UNLISTED'},
    s=>{s.measurements.half.expression='width / 3'},
    s=>{s.measurements.half.kind='direct'},
    s=>{s.extra='silently allowed'},
  ]
  for(const [i,edit] of cases.entries()){
    const changed=structuredClone(spec);edit(changed)
    const before=structuredClone(changed)
    const result=author(source,sidecar,changed)
    assert.equal(result.ok,false,`unsafe case ${i} unexpectedly passed`)
    assert.deepEqual(changed,before)
  }
})
test('stale native revision, geometry and malformed workbook refuse without mutation',()=>{
  const {source,sidecar,spec}=fixture()
  const changed=structuredClone(source);changed.template.panels[0].polygon.points[2][0]+=.01
  assert.match(author(changed,sidecar,spec).reason,/stale native binding/)
  changed.revision++
  assert.equal(author(changed,sidecar,spec).ok,false)
  const unknown=structuredClone(spec);unknown.measurements.unknown={kind:'formula',expression:'width'}
  assert.equal(author(source,sidecar,unknown).ok,false)
  const broken=structuredClone(spec);broken.measurements.width.values.M.value=Infinity
  assert.equal(author(source,sidecar,broken).ok,false)
})
