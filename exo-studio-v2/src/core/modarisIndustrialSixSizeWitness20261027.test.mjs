import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {auditModarisIndustrialSixSizeWitness20261027 as audit,
  verifyModarisIndustrialSixSizeWitness20261027 as verify} from './modarisIndustrialSixSizeWitness20261027.js'

test('every graded tee size has 4 physical CUT and STITCH contours with independent DXF receipt and deterministic witness',()=>{
  const source=createTeeTemplate(),snapshot=structuredClone(source)
  const result=audit(source,{expectedRevision:source.revision})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.rows.length,6)
  assert.equal(result.physicalContourCount,24)
  assert(result.rows.every(row=>row.pieceIds.length===4&&row.cutContourCount===4&&row.stitchContourCount===4&&
    row.receiverChecks===4&&row.receiverOk&&row.dxfByteCount>1000&&row.dxfSha256.startsWith('sha256:')&&
    row.physicalCutAreaCm2>row.stitchAreaCm2))
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.externalModarisReceiverChecked,false)
  assert.deepEqual(source,snapshot)
  assert.equal(verify(JSON.parse(JSON.stringify(source)),JSON.parse(JSON.stringify(result))).ok,true)
})
test('six-size receiver rejects altered physical CUT and wrong metadata before admitting any witness',()=>{
  const source=createTeeTemplate()
  const corrupted=audit(source,{expectedRevision:source.revision,wireForSize:(size,graded)=>{
    const raw=projectToDxf(graded,size,{cutlineMode:'manufacturing'})
    return size==='XL'?raw.replace('8\nSTITCH_FRONT','8\nSTITCH_GHOST'):raw
  }})
  assert.equal(corrupted.ok,false)
  assert.match(corrupted.reason,/receiver refused/)
  const malformed=structuredClone(source)
  malformed.pieces[0].seamAllowance=-1
  assert.equal(audit(malformed,{expectedRevision:malformed.revision}).ok,false)
  assert.equal(audit(source,{expectedRevision:source.revision+1}).ok,false)
  const fewer=structuredClone(source);fewer.grading.sizes.pop()
  assert.equal(audit(fewer,{expectedRevision:fewer.revision}).ok,false)
})
test('saved industrial witness is source-fingerprint and per-size DXF tamper-sensitive',()=>{
  const source=createTeeTemplate(),proof=audit(source,{expectedRevision:source.revision})
  assert.equal(proof.ok,true,proof.reason)
  const forged=structuredClone(proof);forged.rows[3].dxfSha256='sha256:'+'a'.repeat(64)
  assert.equal(verify(source,forged).ok,false)
  const changed=structuredClone(source);changed.pieces[0].points[1].x+=1;changed.revision++
  assert.equal(verify(changed,proof).ok,false)
  const changedNotch=structuredClone(source)
  changedNotch.pieces[0].notches=[{id:'test-notched',edgeIndex:0,t:.5,type:'single',depthCm:.3}]
  changedNotch.revision++
  assert.equal(verify(changedNotch,proof).ok,false)
})
