import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkLinkedFacing20261027 as create,updateAccuMarkLinkedFacing20261027 as update} from './accumarkLinkedFacing20261027.js'

const project=(curved=false)=>({revision:7,pieces:[{id:'front',name:'Front',fabricId:'main',points:[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}],...(curved?{curves:{0:{cx:6,cy:-2}}}:{})}]})
const opts={sourcePieceId:'front',facingId:'front-facing',facingName:'Front facing study',depthCm:1.5}

test('straight source creates detached locked study; metadata and project preserved',()=>{
 const source=project(),original=structuredClone(source),result=create(source,opts)
 assert.deepEqual(source,original)
 assert.deepEqual(result.project,original)
 assert.equal(result.project.pieces.length,1)
 assert.equal(result.study.factoryApproved,false)
 assert.equal(result.piece.patternImportProvenance.referenceOnly,true)
 assert.equal(result.piece.patternImportProvenance.gradedSizesProductionSafe,false)
 assert.equal(result.piece.fabricId,'main')
 assert.deepEqual(result.piece.points[0],{x:0,y:-1.5})
 assert.equal('seamAllowance' in result.piece,false)
 assert.equal('cutQuantity' in result.piece,false)
 assert.equal(update(source,result.study).sourceChanged,false)
})

test('quadratic controls track revised source and stamp the new revision',()=>{
 const source=project(true),initial=create(source,opts)
 source.revision=8
 source.pieces[0].points[1].x=13
 source.pieces[0].curves[0].cy=-3
 const next=update(source,initial.study,{expectedSourceRevision:8})
 assert.equal(next.sourceChanged,true)
 assert.equal(next.revisionAdvanced,true)
 assert.equal(next.previousSourceRevision,7)
 assert.equal(next.provenance.sourceRevision,8)
 assert.equal(next.piece.curves[0].cy,-4.5)
 assert.deepEqual(next.piece.points[1],{x:13,y:-1.5})
 assert.equal(next.piece.patternImportProvenance.factoryApproved,false)
})

test('revision integrity guards detect hidden edits and conflicting or rolled-back revisions',()=>{
 const original=project(),initial=create(original,opts)
 const silent=project();silent.pieces[0].name='Changed without revision'
 assert.throws(()=>update(silent,initial.study),/SILENT_SOURCE_EDIT/)
 const reverted=project();reverted.revision=6
 assert.throws(()=>update(reverted,initial.study),/REVISION_ROLLBACK/)
 const later=project();later.revision=8
 assert.throws(()=>update(later,initial.study,{expectedSourceRevision:7}),/REVISION_CONFLICT/)
 assert.equal(update(later,initial.study).revisionAdvanced,true)
})

test('sewing, grading, notches, manufacturing and project references fail closed',()=>{
 for(const [key,value] of Object.entries({notches:[],seamAllowance:0,cutQuantity:1,internalLines:[],edgeSeamAllowances:{},grading:{},buttonholes:[],darts:[],interfacingForPieceId:'back'})){
  const p=project();p.pieces[0][key]=value
  assert.throws(()=>create(p,opts),/SOURCE_ATTACHMENTS_UNSUPPORTED/,key)
 }
 for(const [key,value] of Object.entries({seams:[],grading:{},customMeasurements:[],patternSource:{}})){
  const p=project();p[key]=value
  assert.throws(()=>create(p,opts),/PROJECT_LINKS_UNSUPPORTED|PROJECT_METADATA_UNSUPPORTED/,key)
 }
 const first=create(project(),opts),withAttachment=project();withAttachment.revision=8;withAttachment.pieces[0].notches=[{edgeIndex:0,t:.5}]
 assert.throws(()=>update(withAttachment,first.study),/SOURCE_ATTACHMENTS_UNSUPPORTED/)
})

test('forged child metadata, edited provenance, and removed source are rejected',()=>{
 const initial=create(project(),opts)
 const tampered=structuredClone(initial.study)
 tampered.piece.patternImportProvenance.sourcePieceId='other'
 assert.throws(()=>update(project(),tampered),/INVALID_LINK/)
 const extra=structuredClone(initial.study);extra.piece.cutQuantity=2
 assert.throws(()=>update(project(),extra),/INVALID_LINK/)
 const missing=project();missing.pieces[0].id='other';missing.revision=8
 assert.throws(()=>update(missing,initial.study),/SOURCE_GONE/)
})

test('malformed quadratic controls, unsafe properties and invalid geometry are rejected',()=>{
 const invalid=project(true);invalid.pieces[0].curves[0]={cx:6,cy:3,weight:2}
 assert.throws(()=>create(invalid,opts),/CURVE_CONTROL/)
 const crossing=project(true);crossing.pieces[0].curves[0].cy=35
 assert.throws(()=>create(crossing,opts),/CURVED_SELF_INTERSECTION|CURVED_DEGENERATE_AREA/)
 const p=project();let calls=0
 Object.defineProperty(p.pieces[0],'hidden',{get(){calls++;throw Error('run getter')},enumerable:true})
 assert.throws(()=>create(p,opts),/ACCESSOR_OR_ARRAY/)
 assert.equal(calls,0)
 assert.throws(()=>create(project(),{...opts,depthCm:-1}),/OPTIONS/)
})

test('convex straight contour gets bounded inset while legacy detached translation stays identical',()=>{
 const result=create(project(),opts)
 assert.equal(result.offsetRefusal,null)
 assert.deepEqual(result.offsetPreview.points,[{x:1.5,y:1.5},{x:10.5,y:1.5},{x:10.5,y:6.5},{x:1.5,y:6.5}])
 assert.equal(result.offsetPreview.sourceGeometryHash,result.provenance.sourceGeometryHash)
 assert.equal(result.offsetPreview.approximate,true)
 assert.equal(result.offsetPreview.referenceOnly,true)
 assert.deepEqual(result.piece.points[0],{x:0,y:-1.5})
})

test('quadratic inset preview samples, refreshes source signature, and refuses collapsing depths',()=>{
 const p=project(true)
 const inset=create(p,{...opts,depthCm:.2})
 assert.equal(inset.offsetRefusal,null)
 assert.ok(inset.offsetPreview.sourceSampleCount>p.pieces[0].points.length)
 assert.ok(inset.offsetPreview.points.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)))
 p.revision++
 p.pieces[0].curves[0].cy=-2.5
 const refreshed=update(p,inset.study)
 assert.equal(refreshed.sourceChanged,true)
 assert.notEqual(refreshed.offsetPreview.sourceGeometryHash,inset.offsetPreview.sourceGeometryHash)
 const tooDeep=create(project(true),opts)
 assert.equal(tooDeep.offsetPreview,null)
 assert.match(tooDeep.offsetRefusal,/LINKED_FACING_OFFSET_SELF_INTERSECTION/)
})

test('concave and collapsed geometry never receives a normal-offset preview',()=>{
 const concave=project()
 concave.pieces[0].points=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:6,y:4},{x:0,y:8}]
 const result=create(concave,opts)
 assert.equal(result.offsetPreview,null)
 assert.match(result.offsetRefusal,/OFFSET_CONCAVE_OR_CUSP/)
 const collapsed=create(project(),{...opts,depthCm:6})
 assert.equal(collapsed.offsetPreview,null)
 assert.match(collapsed.offsetRefusal,/OFFSET_COLLAPSED|OFFSET_SELF_INTERSECTION/)
})
