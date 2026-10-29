import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisSixSizeDartClosureProof20261027 as create,verifySavedModarisSixSizeDartClosureProof20261027 as verify} from './modarisSixSizeDartClosureProof20261027.js'
const sizes=['XS','S','M','L','XL','XXL']
const project=()=>({revision:7,grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'front',points:
  [[0,0],[4,0],[8,0],[8,8],[0,8]].map(([x,y],i)=>({id:'p'+i,x,y,gradeRule:{enabled:true,dxPerSize:1.25,dyPerSize:-.4}}))}]})
const opts={expectedRevision:7,pieceId:'front',apex:{x:22,y:4},firstLegIndex:2,secondLegIndex:3,rotateFromIndex:1,rotateToIndex:2,targetEdgeIndex:4}
test('six-size candidate that geometrically closes legs but self-contacts is rejected without mutation',()=>{
  const p=project(),before=structuredClone(p)
  assert.throws(()=>create(p,opts),/CLOSURE_XS_/)
  assert.deepEqual(p,before)
})
test('refuses stale proof, changed revision and out-of-band source edits',()=>{
  const p=project(),proof={kind:'SIX_SIZE_DETACHED_DART_CLOSURE_PROOF_V1',rows:[]}
  const altered=structuredClone(p);altered.pieces[0].points[0].x+=.1
  assert.throws(()=>verify(altered,proof),/SIX_SIZE_DART_PROOF/)
  altered.revision++
  assert.throws(()=>verify(altered,proof),/STALE_OR_TAMPERED_PROOF/)
  assert.throws(()=>create(altered,opts),/CONFIG_REVISION/)
})
test('refuses forged closure vertex, area, point mapping and provenance',()=>{
  const p=project(),proof={kind:'SIX_SIZE_DETACHED_DART_CLOSURE_PROOF_V1',rows:Array(6).fill(null).map(()=>({previewVertices:[{x:1}],pointIds:[],previewSignedAreaCm2:1})),rowsDigest:'invalid',sourceDigest:'invalid',manufacturingApproved:false,projectUnchanged:true,sourceRevision:7,sizes:[...sizes]}
  for(const change of [
    s=>{s.rows[0].previewVertices[0].x+=.5},
    s=>{s.rows[2].previewSignedAreaCm2+=1},
    s=>{s.rows[5].pointIds[0]='forged'},
    s=>{s.sourceDigest='fake'},
    s=>{s.rowsDigest='fake'},
    s=>{s.rows[0].apex={x:1,y:2};s.rowsDigest='fake'}
  ]){const modified=structuredClone(proof);change(modified);assert.throws(()=>verify(p,modified),/SIX_SIZE_DART_PROOF/)}
})
test('rejects marked/sewn/curved/project attachments, size/topology mismatch and unsafe physical grade',()=>{
  for(const edit of [
    p=>p.pieces[0].notches=[{edgeIndex:0,t:.2}],
    p=>p.pieces[0].curves={0:{cx:2,cy:1}},
    p=>p.seams=[],
    p=>p.pieces.push({id:'back',points:[]}),
    p=>p.grading.sizes.pop(),
    p=>p.pieces[0].points[1].id='p0',
    p=>p.pieces[0].points[1].gradeRule.dxPerSize=1.4,
    p=>p.pieces[0].points[0].industrialGradeRule={mode:'fake'}
  ]){const p=project();edit(p);const unchanged=structuredClone(p);assert.throws(()=>create(p,opts),/SIX_SIZE_DART_PROOF/);assert.deepEqual(p,unchanged)}
})
test('rejects apex with physically mismatched leg radii and invalid transfer geometry without partial result',()=>{
  assert.throws(()=>create(project(),{...opts,apex:{x:1,y:1}}),/SIX_SIZE_DART_PROOF/)
  assert.throws(()=>create(project(),{...opts,targetEdgeIndex:1}),/SIX_SIZE_DART_PROOF/)
})
test('legacy preview may accept a rotated outline whose intended legs do not meet; independent proof refuses it',()=>{
  const candidate={...opts,firstLegIndex:1,apex:{x:22,y:-4}}
  assert.throws(()=>create(project(),candidate),/CLOSURE_LEGS_XS/)
})
