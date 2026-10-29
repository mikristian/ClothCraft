import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativeSixSizePreview20261028 as preview,verifyNativeSixSizeCommit20261028 as commit} from './nativeSixSizeCommandContract20261028.js'

const sizes=['XS','S','M','L','XL','XXL']
const source=()=>({revision:60,gradeRunPersisted:true,activeGradedSize:null,
  template:{panels:[{id:'front'},{id:'back'}]},
  nativePointBindings:{active:true,bindings:[{panelId:'front'},{panelId:'back'}]}})
const overrides={chest:460}
const report=()=>({format:'exo-native-reactive-size-run.v1',sourceRevision:60,
  changedPanels:2,changedBindings:2,panelIds:['front','back'],
  bindingIds:['front-waist','back-waist'],manufacturerApproved:false,
  factoryApproved:false,measurementOverrides:{...overrides},
  sizes:[...sizes],bySize:sizes.map(size=>({size,changes:[
    {panelId:'front',pointIndex:1,beforeMm:[420,0],afterMm:[440,0]},
    {panelId:'back',pointIndex:1,beforeMm:[430,0],afterMm:[450,0]},
  ]}))})
const result=()=>({revision:61,template:{panels:[{id:'front'},{id:'back'}]},
  gradeRunPersisted:true,activeGradedSize:null,gradedSizePreview:false,
  manufacturingApproved:false,nativePointBindings:{active:true},regenerationEvidence:report()})

test('shared native command verifies two panels across every size and one revision',()=>{
  const s=source(),r=report(),unchanged=structuredClone({s,r,overrides})
  const p=preview(s,overrides,r)
  assert.equal(p.ok,true,p.reason)
  assert(Object.isFrozen(p.preview.bySize[0].changes[0]))
  const c=commit(s,p,result())
  assert.equal(c.ok,true,c.reason)
  assert.equal(c.committedRevision,61)
  assert.deepEqual(c.sizes,sizes)
  assert.equal(c.changedPanels,2)
  assert.equal(c.oneUndoRevision,true)
  assert.equal(c.manufacturingApproved,false)
  assert.deepEqual({s,r,overrides},unchanged,'Read-only preflight cannot mutate authored or preview data')
})

test('preview rejects stale source, incomplete size or forged source/measurement evidence',()=>{
  const s=source(),r=report()
  const changed=[
    [s,{...r,sourceRevision:59}],
    [s,{...r,bySize:r.bySize.slice(1)}],
    [s,{...r,changedBindings:3}],
    [s,{...r,measurementOverrides:{chest:470}}],
    [s,{...r,manufacturerApproved:true}],
    [{...s,activeGradedSize:'XL'},r],
    [{...s,gradeRunPersisted:false},r],
    [{...s,nativePointBindings:{active:false}},r],
  ]
  for(const [snap,observation] of changed){
    const failed=preview(snap,overrides,observation)
    assert.equal(failed.ok,false)
    assert.equal(failed.manufacturingApproved,false)
  }
})

test('commit rejects one-sided or forged Rust replies without treating them as industrial acceptance',()=>{
  const s=source(),p=preview(s,overrides,report())
  assert.equal(p.ok,true)
  const candidate=result()
  const cases=[
    {revision:62},
    {gradeRunPersisted:false},
    {nativePointBindings:{active:false}},
    {activeGradedSize:'L'},
    {manufacturingApproved:true},
    {regenerationEvidence:{...candidate.regenerationEvidence,sourceRevision:61}},
    {regenerationEvidence:{...candidate.regenerationEvidence,bySize:candidate.regenerationEvidence.bySize.map((row,i)=>i===3?{...row,changes:row.changes.map((change,j)=>j===1?{...change,afterMm:[451,0]}:change)}:row)}},
    {regenerationEvidence:{...candidate.regenerationEvidence,measurementOverrides:{chest:465}}},
  ]
  for(const change of cases){
    const bad={...candidate,...change}
    const checked=commit(s,p,bad)
    assert.equal(checked.ok,false,`Rust receipt unexpectedly accepted: ${JSON.stringify(change)}`)
    assert.equal(checked.manufacturingApproved,false)
  }
  assert.equal(commit({...s,revision:59},p,candidate).ok,false)
})

test('new Rust post-regeneration CUT, notch and sewing inventory is required to agree across every size when present',()=>{
  const rich=report()
  rich.perSizeIntegrity=sizes.map(size=>({size,panelCount:2,seamCount:1,
    industrialPanelCount:2,namedEdgeCount:8,notchCount:2,nativeCutAndSewValidated:true}))
  const accepted=preview(source(),overrides,rich)
  assert.equal(accepted.ok,true,accepted.reason)
  const valid=result();valid.regenerationEvidence=structuredClone(rich)
  assert.equal(commit(source(),accepted,valid).ok,true)
  for(const alter of [
    rows=>rows.pop(),
    rows=>{rows[3].seamCount=2},
    rows=>{rows[3].notchCount=0},
    rows=>{rows[3].namedEdgeCount=6},
    rows=>{rows[3].industrialPanelCount=1},
    rows=>{rows[3].nativeCutAndSewValidated=false},
    rows=>{rows[3].size='XL'},
  ]){
    const invalid=structuredClone(rich)
    alter(invalid.perSizeIntegrity)
    assert.equal(preview(source(),overrides,invalid).ok,false)
    assert.equal(commit(source(),accepted,{...valid,regenerationEvidence:invalid}).ok,false)
  }
})
