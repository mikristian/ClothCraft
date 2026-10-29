import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {createApprovedGradedNotchGeometryDraft20261023 as draft,
  verifyApprovedGradedNotchGeometry20261023 as verify} from './approvedGradedNotchGeometry20261023_1600.js'

const project = () => ({grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:3,lengthPerSizeCm:1.2},
  pieces:[{id:'front',points:[{x:0,y:0},{x:12,y:0},{x:12,y:20},{x:0,y:20}],
    curves:{0:{cx:6,cy:2}},
    notches:[{id:'n1',edgeIndex:1,t:.35,type:'double',depthCm:.65}]}]})
const {publicKey,privateKey} = generateKeyPairSync('ed25519')
const pin = createHash('sha256').update(publicKey.export({format:'der',type:'spki'})).digest('hex')
const trust = {publicKey,pinnedSpkiSha256:pin}
const signed = p => {
  const d = draft(p,'revision-a')
  assert.equal(d.status,'draft_for_external_review',JSON.stringify(d.issues))
  return {manifest:d.manifest,sha256:d.sha256,
    signatureBase64:sign(null,Buffer.from(d.payload),privateKey).toString('base64')}
}
test('all ordered sizes captured, authenticated, no source mutation and no physical approval',()=>{
  const p=project(),before=JSON.stringify(p),a=signed(p)
  assert.deepEqual(a.manifest.sizes,['S','M','L'])
  assert.deepEqual(a.manifest.sizeRuns.map(r=>r.size),['S','M','L'])
  assert.notDeepEqual(a.manifest.sizeRuns[0].pieces[0].contour,
    a.manifest.sizeRuns[2].pieces[0].contour)
  assert.equal(a.manifest.sizeRuns[0].pieces[0].notches[0].attrs.depthCm,.65)
  const r=verify(p,'revision-a',a,trust)
  assert.equal(r.status,'authenticated_graded_identity_only',JSON.stringify(r.issues))
  assert.equal(r.factoryCertified,false)
  assert.equal(r.factoryCuttingAuthorized,false)
  assert.equal(r.manufacturingApproved,false)
  assert.equal(r.physicalGeometryValidated,false)
  assert.equal(JSON.stringify(p),before)
  assert.match(r.limitation,/bowtie.*does not test physical/i)
})
test('signed baseline fails after one size grading-rule step or grading dimensions change',()=>{
  const base=project(),a=signed(base)
  for(const modify of [
    p=>p.pieces[0].points[0].gradeRule={enabled:true,dxPerSize:2,dyPerSize:0},
    p=>p.grading.widthPerSizeCm=4,
    p=>p.pieces[0].notches[0].depthCm=.9,
    p=>p.grading.sizes=['L','M','S'],
    p=>p.pieces[0].curves[0].cy=3
  ]){
    const p=project();modify(p)
    const r=verify(p,'revision-a',a,trust)
    assert.equal(r.status,'blocked',JSON.stringify(r.issues))
    assert.ok(r.issues.includes('SOURCE_OR_GRADED_SIZE_IDENTITY_CHANGED'))
  }
})
test('refuses no independent pin, wrong pin, modified signature and revision',()=>{
  const p=project(),a=signed(p)
  for(const [approval,key,revision] of [
    [a,undefined,'revision-a'],[a,{publicKey,pinnedSpkiSha256:'0'.repeat(64)},'revision-a'],
    [{...a,signatureBase64:sign(null,Buffer.from('unrelated'),privateKey).toString('base64')},trust,'revision-a'],
    [a,trust,'revision-b']
  ]) assert.equal(verify(p,revision,approval,key).status,'blocked')
})
test('invalid source, hidden fields, accessors, duplicates and nonfinite fail closed',()=>{
  for(const change of [
    p=>p.pieces.push(structuredClone(p.pieces[0])),
    p=>p.pieces[0].notches.push({...p.pieces[0].notches[0]}),
    p=>p.pieces[0].points[0].x=Infinity,
    p=>p.pieces[0].notches[0].depthCm=NaN,
    p=>Object.defineProperty(p.pieces[0].notches[0],'hidden',{value:2,enumerable:false}),
    p=>Object.defineProperty(p.pieces[0].points[0],'getter',{get(){throw Error('must not invoke')}}),
    p=>p.pieces[0].notches[0][Symbol('extra')]=123,
    p=>p.grading.sizes=['S','S','L']
  ]) {const p=project();change(p);assert.equal(draft(p,'revision-a').status,'blocked')}
})
test('degenerate shape remains identity-only and leaves project untouched',()=>{
  const p=project()
  p.pieces[0].points=[{x:0,y:0},{x:1,y:1},{x:2,y:2}]
  const before=JSON.stringify(p),a=signed(p),r=verify(p,'revision-a',a,trust)
  assert.equal(r.status,'authenticated_graded_identity_only')
  assert.equal(r.physicalGeometryValidated,false)
  assert.equal(r.factoryCertified,false)
  assert.equal(JSON.stringify(p),before)
})
test('straight-edge piece with no curves signs and verifies every size without mutation',()=>{
  const p=project()
  delete p.pieces[0].curves
  const before=JSON.stringify(p)
  const a=signed(p)
  assert.deepEqual(a.manifest.sizeRuns.map(r=>r.size),['S','M','L'])
  for (const run of a.manifest.sizeRuns) {
    assert.equal(run.pieces[0].curves,null)
    assert.equal(run.pieces[0].notches[0].attrs.depthCm,.65)
  }
  const r=verify(p,'revision-a',a,trust)
  assert.equal(r.status,'authenticated_graded_identity_only',JSON.stringify(r.issues))
  assert.equal(r.factoryCertified,false)
  assert.equal(r.physicalGeometryValidated,false)
  assert.equal(JSON.stringify(p),before)
  const poisoned=project()
  delete poisoned.pieces[0].curves
  poisoned.pieces[0].other=undefined
  assert.equal(draft(poisoned,'revision-a').status,'blocked')
})
