import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisGradedNotchLink20261027 as create,reapplyModarisGradedNotchLink20261027 as reapply,modarisGradedNotchProvenance20261027 as provenance} from './modarisGradedNotchLink20261027.js'
const panel=(id,x,t)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:8},{x,y:8}],edgeNames:['waist','side','hem','center'],notches:[{id:'waist-notch',edgeIndex:0,t}]})
const project=()=>({revision:2,units:'cm',grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:0.5},pieces:[panel('a',0,0.35),panel('b',30,0.6)]})
const options={source:{pieceId:'a',notchId:'waist-notch'},target:{pieceId:'b',notchId:'waist-notch'}}
test('creates linked notch with physical per-size arc proof and one revision',()=>{
 const p=project(),before=structuredClone(p),r=create(p,{...options,expectedRevision:2})
 assert.deepEqual(p,before)
 assert.equal(r.project.revision,3)
 assert.equal(r.project.modarisGradedNotchLink.version,1)
 assert.equal(r.project.pieces[1].notches[0].t,0.35)
 assert.equal(r.proof.length,3)
 for(const row of r.proof){
  assert.equal(row.fractionResidual,0)
  assert.equal(row.precisionCm,0)
  assert.ok(Math.abs(row.sourceArcCm/row.sourceEdgeCm-0.35)<1e-12)
 }
 assert.deepEqual(r.project.pieces[0],p.pieces[0])
 assert.equal(r.manufacturingApproved,false)
})
test('propagates updated source notch without touching other geometry and protects target',()=>{
 const first=create(project(),{...options,expectedRevision:2}).project
 const edited=structuredClone(first);edited.pieces[0].notches[0].t=0.73
 const result=reapply(edited,{expectedRevision:3})
 assert.equal(result.project.revision,4)
 assert.equal(result.project.pieces[1].notches[0].t,0.73)
 assert.equal(result.project.modarisGradedNotchLink.lastSourceFraction,0.73)
 assert.equal(edited.pieces[1].notches[0].t,0.35)
 const tampered=structuredClone(first);tampered.pieces[1].notches[0].t=0.8
 assert.throws(()=>reapply(tampered,{expectedRevision:3}),/TARGET_EDITED/)
 const reordered=structuredClone(first);reordered.grading.sizes.reverse()
 assert.throws(()=>reapply(reordered,{expectedRevision:3}),/GRAPH_VERSION_OR_SIZE/)
})
test('refuses curve, sewn, cutline, invalid notch and stale revision',()=>{
 const p=project()
 assert.throws(()=>create(p,{...options,expectedRevision:3}),/STALE_REVISION/)
 for(const field of ['cutlines','productionSpec']){
  const bad=project();bad[field]=[]
  assert.throws(()=>create(bad,{...options,expectedRevision:2}),/ATTACHED_PRODUCTION/)
 }
 const empty=project();empty.seams=[]
 assert.equal(create(empty,{...options,expectedRevision:2}).project.seams.length,0)
 const sewn=project();sewn.seams=[{id:'attached'}]
 assert.throws(()=>create(sewn,{...options,expectedRevision:2}),/ATTACHED_PRODUCTION/)
 const curve=project();curve.pieces[1].curves={0:{cx:35,cy:2}}
 assert.throws(()=>create(curve,{...options,expectedRevision:2}),/CURVED_EDGE_UNSUPPORTED/)
 const invalid=project();invalid.pieces[0].notches[0].type='v'
 assert.throws(()=>create(invalid,{...options,expectedRevision:2}),/NOTCH_TYPE/)
})
test('normalized provenance permits exclusively linked source t changes before explicit reapply',()=>{
 const linked=create(project(),{...options,expectedRevision:2}).project
 const snapshot=linked.modarisGradedNotchLink.rootProvenance
 const sourceMove=structuredClone(linked)
 sourceMove.pieces[0].notches[0].t=.68
 assert.equal(provenance(sourceMove,options.source),snapshot)
 assert.equal(sourceMove.modarisGradedNotchLink.rootProvenance,snapshot)
 const result=reapply(sourceMove,{expectedRevision:3})
 assert.equal(result.project.pieces[1].notches[0].t,.68)
 assert.notEqual(result.project.modarisGradedNotchLink.rootProvenance,snapshot)
 assert.equal(result.project.modarisGradedNotchLink.rootProvenance,provenance(result.project,options.source))
 const extraNotch=structuredClone(linked)
 extraNotch.pieces[0].notches.push({id:'other',edgeIndex:1,t:.4})
 assert.throws(()=>reapply(extraNotch,{expectedRevision:3}),/OUT_OF_BAND_ROOT_EDIT/)
 const altered=structuredClone(linked)
 altered.pieces[0].points[2].x+=.25
 altered.pieces[0].notches[0].t=.68
 assert.throws(()=>reapply(altered,{expectedRevision:3}),/OUT_OF_BAND_ROOT_EDIT/)
 const target=structuredClone(linked)
 target.pieces[1].notches[0].t=.68
 assert.throws(()=>reapply(target,{expectedRevision:3}),/TARGET_EDITED/)
})
