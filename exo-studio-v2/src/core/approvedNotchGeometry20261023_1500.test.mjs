import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync, sign, createHash} from 'node:crypto'
import {createApprovedNotchGeometryDraft20261023 as draft,
  verifyApprovedNotchGeometry20261023 as verify} from './approvedNotchGeometry20261023_1500.js'

const project = () => ({grading:{baseSize:'M',sizes:['S','M','L']},
  pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],
    curves:{0:{cx:5,cy:1}}, seamAllowanceCm:1,
    notches:[{id:'shoulder',edgeIndex:0,t:0.25,type:'double',depthCm:0.6},
      {id:'side',edgeIndex:1,t:0.6,type:'single',depthCm:0.45}]}]})

const {privateKey,publicKey} = generateKeyPairSync('ed25519')
const sha = value => createHash('sha256').update(value).digest('hex')
const trusted = {publicKey,pinnedSpkiSha256:sha(publicKey.export({format:'der',type:'spki'}))}
const approved = p => {
  const d = draft(p,'commit-a')
  assert.equal(d.status,'draft_for_external_review')
  return {manifest:d.manifest,sha256:d.sha256,
    signatureBase64:sign(null,Buffer.from(d.payload),privateKey).toString('base64')}
}
const blocked = (p,approval,trust=trusted,revision='commit-a') =>
  assert.equal(verify(p,revision,approval,trust).status,'blocked')

test('Ed25519 matches only pinned source snapshot; does not approve manufacturing', () => {
  const p=project(), approval=approved(p), result=verify(p,'commit-a',approval,trusted)
  assert.equal(result.status,'authenticated_authored_source_snapshot_only')
  assert.equal(result.factoryCertified,false)
  assert.equal(result.gradedGeometryIncluded,false)
  blocked(p,approval,undefined,'commit-b')
  blocked(p,approval,{publicKey,pinnedSpkiSha256:'0'.repeat(64)})
  blocked(p,approval,{publicKey})
  blocked(p,{...approval,signatureBase64:'AAAA'})
  blocked(p,{...approval,sha256:'0'.repeat(64)})
  blocked(p,{...approval,manifest:{...approval.manifest,extra:true}})
})

test('all notch station, edge, type, depth, appearance and piece geometry changes block', () => {
  const baseline=project(), approval=approved(baseline)
  for (const mutate of [
    p=>p.pieces[0].notches[0].t=0.3,
    p=>p.pieces[0].notches[0].edgeIndex=2,
    p=>p.pieces[0].notches[0].type='single',
    p=>p.pieces[0].notches[0].depthCm=0.9,
    p=>p.pieces[0].notches[0].depth=0.7,
    p=>delete p.pieces[0].notches[0].t,
    p=>p.pieces[0].notches.splice(0,1),
    p=>p.pieces[0].notches.push({id:'extra',edgeIndex:0,t:0.2}),
    p=>p.pieces[0].points[0].x=1,
    p=>p.pieces[0].curves[0].cx=6,
    p=>p.pieces[0].seamAllowanceCm=1.2,
    p=>p.grading.sizes.push('XL'),
    p=>p.grading.baseSize='S',
  ]) {
    const p=project(); mutate(p); blocked(p,approval)
  }
})

test('rejects malformed, duplicate, nonfinite, empty, cyclic, accessor and unsafe source', () => {
  for (const mutate of [
    p=>p.pieces[0].notches=[],
    p=>p.pieces[0].notches[1].id='shoulder',
    p=>p.pieces.push({...p.pieces[0]}),
    p=>p.pieces[0].notches[0].t=NaN,
    p=>p.pieces[0].notches[0].t=1.1,
    p=>p.pieces[0].notches[0].edgeIndex=-1,
    p=>p.pieces[0].notches[0].depthCm=Infinity,
    p=>p.pieces[0].points[0].x=Infinity,
    p=>p.pieces[0].curves[0].cy=NaN,
    p=>p.pieces[0].notches[0].type='unknown',
    p=>p.pieces[0].notches[0].other=undefined,
    p=>p.pieces[0].loop=p.pieces[0],
    p=>Object.defineProperty(p.pieces[0].notches[0],'hiddenDepth',{value:2,enumerable:false}),
    p=>Object.defineProperty(p.pieces[0].notches[0],'hiddenGetter',{get(){throw Error('accessed')},enumerable:false}),
    p=>p.pieces[0].notches[0][Symbol('metadata')]='hidden',
    p=>Object.defineProperty(p.pieces[0],'secret',{enumerable:true,get(){throw Error('accessed')}}),
  ]) {
    const p=project(); mutate(p)
    assert.equal(draft(p,'commit-a').status,'blocked')
  }
})

test('degenerate contours sign identity without geometry QA, mutation or approval', () => {
  const contours = [
    [{x:0,y:0},{x:1,y:0},{x:2,y:0}], // collinear/zero area
    [{x:0,y:0},{x:0,y:0},{x:2,y:0},{x:0,y:2}], // duplicate vertex
    [{x:0,y:0},{x:2,y:2},{x:0,y:2},{x:2,y:0}], // bowtie
  ]
  for (const points of contours) {
    const p=project()
    p.pieces[0].points=points
    const before=JSON.stringify(p)
    const d=draft(p,'commit-a')
    assert.equal(d.status,'draft_for_external_review')
    assert.equal(JSON.stringify(p),before)
    assert.equal(d.physicalGeometryValidated,false)
    assert.match(d.limitation,/zero-area.*bowtie/i)
    const approval={manifest:d.manifest,sha256:d.sha256,
      signatureBase64:sign(null,Buffer.from(d.payload),privateKey).toString('base64')}
    const result=verify(p,'commit-a',approval,trusted)
    assert.equal(JSON.stringify(p),before)
    assert.equal(result.status,'authenticated_authored_source_snapshot_only')
    assert.equal(result.physicalGeometryValidated,false)
    assert.equal(result.factoryCertified,false)
    assert.equal(result.factoryCuttingAuthorized,false)
    assert.equal(result.bulkProductionAuthorized,false)
    assert.match(result.limitation,/without validating physical geometry/)
  }
})

test('independent snapshot canonical ordering and raw default presence are bound', () => {
  const a=project(), b=project()
  b.pieces[0].notches.reverse()
  b.pieces[0] = Object.fromEntries(Object.entries(b.pieces[0]).reverse())
  assert.equal(draft(a,'commit-a').sha256,draft(b,'commit-a').sha256)
  const d=approved(a)
  const c=project(); delete c.pieces[0].notches[1].depthCm
  blocked(c,d)
  const e=project(); e.pieces[0].notches[1].depthCm=0.45
  assert.equal(verify(e,'commit-a',d,trusted).status,'authenticated_authored_source_snapshot_only')
})
