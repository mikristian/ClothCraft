import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {assessModarisLicensedReceiver20261027 as assess} from './qa-modaris-licensed-receiver-gate-20261027.mjs'

function fixture(){
  const root=mkdtempSync(join(tmpdir(),'exo-licensed-modaris-test-'))
  const data=[['design-export.dxf','MODEL','EXO test receiver source bytes'],
    ['receiver-observations.txt','RECEIVER_REPORT','Untrusted hypothetical receiver observations'],
    ['scale-measurement.txt','PLOT_MEASUREMENT','Untrusted hypothetical plot measurement']]
  const artifacts=data.map(([file,role,contents])=>{
    const value=Buffer.from(contents)
    writeFileSync(join(root,file),value)
    return {file,role,bytes:value.length,sha256:createHash('sha256').update(value).digest('hex')}
  })
  const sizes=['XS','S','M','L','XL','XXL'],directions=['EXO_TO_MODARIS','MODARIS_TO_EXO']
  const fixtures=directions.flatMap(direction=>sizes.map(size=>({
    size,direction,pieces:4,cutContours:4,stitchContours:4,notches:6,grainlines:4,
    curves:2,maxDeviationMm:.01,plotScaleErrorPct:.02,pieceIdsPreserved:true,layersPreserved:true,
    file:artifacts[0].file,receiverReport:artifacts[1].file,plotReport:artifacts[2].file,
  })))
  const manifest={schema:1,
    project:{id:'test-style',sourceRevision:18,sourceSha256:'b'.repeat(64)},
    receiver:{product:'Lectra Modaris Expert',version:'operator-labelled-reference-only',
      operator:'illustrative test operator',sessionId:'test-session',
      observedAt:'2026-10-27T20:00:00Z',evidenceOrigin:'EXTERNAL_LICENSED_APPLICATION'},
    sizes,directions,fixtures,artifacts}
  return {root,manifest}
}
test('exact six-size two-direction file digests and 12 reported fixture observations are structurally admitted but NEVER certified',()=>{
  const {root,manifest}=fixture()
  try{
    const original=structuredClone(manifest),r=assess(manifest,{root})
    assert.equal(r.status,'EVIDENCE_INTEGRITY_READY_FOR_INDEPENDENT_REVIEW',JSON.stringify(r.issues))
    assert.equal(r.evidenceComplete,true)
    assert.equal(r.observedFixtureCount,12)
    assert.equal(r.verifiedArtifactCount,3)
    assert.equal(r.independentlyVendorAccepted,false)
    assert.equal(r.productionApproved,false)
    assert.equal(r.parity100Achieved,false)
    assert.deepEqual(manifest,original)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('missing physical artifacts, manipulated hashes and link/traversal attempts refuse even claimed passing fixtures',()=>{
  const {root,manifest}=fixture()
  try{
    const cases=[
      x=>{x.artifacts[0].sha256='a'.repeat(64)},
      x=>{x.artifacts[1].bytes+=1},
      x=>{x.artifacts[0].file='../escaping.dxf'},
      x=>{x.artifacts[0].file='missing.dxf'},
      x=>{x.artifacts.push(structuredClone(x.artifacts[0]))},
      x=>{x.fixtures[0].file='undocumented.dxf'},
      x=>{x.fixtures[2].receiverReport='absent.json'},
      x=>{x.artifacts.splice(2,1)},
    ]
    for(const [index,mutate] of cases.entries()){
      const changed=structuredClone(manifest);mutate(changed)
      const result=assess(changed,{root})
      assert.equal(result.status,'BLOCKED',`Unsafe artifact case ${index} passed`)
      assert.equal(result.independentlyVendorAccepted,false)
    }
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('an incomplete direction, invalid size, altered metrics and over-tolerance plot cannot qualify',()=>{
  const {root,manifest}=fixture()
  try{
    const cases=[
      x=>x.fixtures.pop(),
      x=>{x.fixtures[0].size='MISSING'},
      x=>{x.fixtures[0].maxDeviationMm=.2},
      x=>{x.fixtures[0].plotScaleErrorPct=.1},
      x=>{x.fixtures[0].pieceIdsPreserved=false},
      x=>{x.fixtures[0].grainlines=0},
      x=>{x.directions.reverse()},
      x=>{x.sizes[0]='XXXL'},
      x=>{x.receiver.evidenceOrigin='SIMULATED'},
      x=>{x.receiver.product='Fake Modaris'},
      x=>{x.project.sourceRevision=NaN},
      x=>{x.fixtures[0].direction=x.fixtures[1].direction;x.fixtures[0].size=x.fixtures[1].size},
    ]
    for(const [index,mutate] of cases.entries()){
      const changed=structuredClone(manifest);mutate(changed)
      const result=assess(changed,{root})
      assert.equal(result.status,'BLOCKED',`Invalid receipt case ${index} passed`)
      assert.equal(result.parity100Achieved,false)
    }
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('without external signed evidence the tool does not manufacture vendor acceptance',()=>{
  const output=assess(null)
  assert.equal(output.status,'BLOCKED')
  assert.equal(output.parity100Achieved,false)
  assert(output.issues.some(item=>item.code==='MANIFEST_SCHEMA'))
  assert(output.issues.some(item=>item.code==='ROOT'))
})
