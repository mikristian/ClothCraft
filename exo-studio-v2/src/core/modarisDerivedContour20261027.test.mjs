import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisDerivedContour20261027 as create,regenerateModarisDerivedContour20261027 as renew} from './modarisDerivedContour20261027.js'
const rect=()=>({revision:1,pieces:[{id:'front',name:'Front',points:[{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10}]}]})
const opts={sourcePieceId:'front',derivedId:'frontFacing',derivedName:'Front facing',depthCm:1}
test('inward geometric offset keeps detached project intact and shrinks rectangle',()=>{
  const p=rect(),before=JSON.stringify(p),r=create(p,opts)
  assert.equal(JSON.stringify(p),before)
  assert.deepEqual(r.piece.points,[{x:1,y:1},{x:11,y:1},{x:11,y:9},{x:1,y:9}])
  assert.equal(r.project.pieces.length,1)
  assert.equal(r.piece.locked,true)
  assert.equal(r.provenance.factoryApproved,false)
})
test('revision-controlled source edit regenerates and detects source change',()=>{
  const p=rect(),old=create(p,opts).study
  const q=structuredClone(p);q.revision=2;q.pieces[0].points[1].x=14;q.pieces[0].points[2].x=14
  const r=renew(q,old,{expectedRevision:2})
  assert.equal(r.sourceChanged,true)
  assert.equal(r.piece.points[1].x,13)
  assert.throws(()=>renew(q,old,{expectedRevision:1}),/REVISION_CONFLICT/)
  assert.throws(()=>renew({...q,revision:1},old),/SILENT_SOURCE_EDIT/)
})
test('quadratic and cubic controls are transformed, remain finite and revalidate',()=>{
  for(const c of [{cx:6,cy:-2},{c1x:4,c1y:-2,c2x:8,c2y:-2}]){
    const p=rect();p.pieces[0].curves={'0':c}
    const r=create(p,{...opts,depthCm:.25})
    assert.notDeepEqual(r.piece.curves['0'],c)
    assert.deepEqual(Object.keys(r.piece.curves['0']).sort(),Object.keys(c).sort())
    assert.equal(renew({...p,revision:2},r.study).sourceChanged,false)
  }
})
test('unsupported topology, attachments and tampered links fail atomically',()=>{
  const p=rect(),r=create(p,opts)
  const withGrade=structuredClone(p);withGrade.pieces[0].grading={}
  assert.throws(()=>create(withGrade,opts),/SOURCE_ATTACHMENTS/)
  const withSeams=structuredClone(p);withSeams.seams=[]
  assert.throws(()=>create(withSeams,opts),/PROJECT_LINKS/)
  const changed=structuredClone(p);changed.revision=2;changed.pieces[0].points.push({x:0,y:5})
  assert.throws(()=>renew(changed,r.study),/TOPOLOGY_CHANGED|SELF_INTERSECTION/)
  const forged=structuredClone(r.study);forged.provenance.depthCm=3
  assert.throws(()=>renew(p,forged),/INVALID_LINK/)
  const modified=structuredClone(r.study);modified.piece.points[0].x+=.2
  assert.throws(()=>renew(p,modified),/INVALID_LINK/)
  const hole=structuredClone(p);hole.pieces[0].holes=[]
  assert.throws(()=>create(hole,opts),/SOURCE_ATTACHMENTS/)
})
