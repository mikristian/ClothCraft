import test from 'node:test'
import assert from 'node:assert/strict'
import {extractAccuMarkReferencePiece20261024_1341 as extract,regenerateAccuMarkReferencePiece20261027 as regenerate} from './accumarkReferencePieceExtraction20261024_1341.js'
const project=()=>({revision:4,grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:3,lengthPerSizeCm:1.2},pieces:[{
 id:'front',name:'Front sewn',fabricId:'main',points:[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}],notches:[{edgeIndex:0,t:.5}],seamAllowance:1.5,locked:false
}],seams:[{id:'join',a:{pieceId:'front',edgeIndex:0},b:{pieceId:'back',edgeIndex:0}}],customMeasurements:[{pieceId:'front',a:{x:0,y:0},b:{x:10,y:0}}]})
const call=(p,o={})=>extract(p,{sourcePieceId:'front',referenceId:'front-ref',...o})
test('reference-only straight source with sewing retains original and all attachments untouched',()=>{
 const p=project(),before=structuredClone(p),r=call(p)
 assert.deepEqual(p,before)
 assert.deepEqual(r.project.pieces[0],before.pieces[0])
 assert.deepEqual(r.project.seams,before.seams)
 assert.deepEqual(r.project.customMeasurements,before.customMeasurements)
 assert.deepEqual(r.project,before)
 assert.equal(r.project.pieces.length,1)
 assert.equal(r.project.revision,4)
 assert.equal(Object.hasOwn(r.piece,'seamAllowance'),false)
 assert.equal(Object.hasOwn(r.piece,'cutQuantity'),false)
 assert.equal(r.study.kind,'DETACHED_REFERENCE_OUTLINE_STUDY')
 assert.equal(r.piece.locked,true)
 assert.equal(r.piece.patternImportProvenance.referenceOnly,true)
 assert.equal(r.piece.patternImportProvenance.factoryApproved,false)
 assert.equal(r.piece.patternImportProvenance.sewingAndGradingRulesImported,false)
 assert.equal(r.unit,'cm')
})
test('reference provenance stable geometry hash, explicit source and detached points',()=>{
 const p=project(),r=call(p),again=call(p)
 assert.equal(r.provenance.sourceGeometryHash,again.provenance.sourceGeometryHash)
 assert.equal(r.provenance.sourcePieceId,'front')
 assert.match(r.provenance.sourceGeometryHash,/^fnv1a64:[a-f0-9]{16}$/)
 assert.notEqual(r.piece.points,p.pieces[0].points)
 assert.ok(r.piece.points.every(pt=>Object.keys(pt).sort().join(',')==='x,y'))
 const changed=project();changed.pieces[0].points[1].x=11
 assert.notEqual(call(changed).provenance.sourceGeometryHash,r.provenance.sourceGeometryHash)
})
test('reference study is frozen original outline, explicitly excludes production graded sizes and inventory',()=>{
 const r=call(project())
 assert.equal(r.project.pieces.length,1)
 assert.equal(r.study.grading.mode,'FROZEN_SOURCE_CONTOUR')
 assert.equal(r.study.grading.sizeVariantsProductionSafe,false)
 assert.deepEqual(r.piece.points,project().pieces[0].points)
 assert.equal(r.provenance.gradedSizesProductionSafe,false)
 assert.match(r.warnings.join(' '),/unverified/)
})
test('preserves quadratic edge control in detached outline and regenerates after source control edits',()=>{
 const p=project();p.pieces[0].curves={0:{cx:5,cy:-2}}
 const before=structuredClone(p),first=call(p)
 assert.deepEqual(p,before)
 assert.deepEqual(first.piece.curves,{0:{cx:5,cy:-2}})
 assert.equal(regenerate(p,first.study).sourceChanged,false)
 p.pieces[0].curves[0].cy=-4
 const updated=regenerate(p,first.study)
 assert.equal(updated.sourceChanged,true)
 assert.equal(updated.piece.curves[0].cy,-4)
 assert.notEqual(updated.provenance.sourceGeometryHash,first.provenance.sourceGeometryHash)
 assert.equal(updated.project.pieces.length,1)
 assert.equal(updated.piece.locked,true)
 assert.equal(updated.piece.patternImportProvenance.factoryApproved,false)
})
test('fail closed unsupported curved topology, control attributes and grading rules',()=>{
 const a=project();a.pieces[0].curves={0:{cx:5,cy:-2,weight:1}}
 assert.throws(()=>call(a),/CURVE_CONTROL/)
 const self=project();self.pieces[0].curves={0:{cx:5,cy:30}}
 assert.throws(()=>call(self),/CURVED_SELF_INTERSECTION|CURVED_DEGENERATE_AREA/)
 const b=project();b.pieces[0].points[0].industrialGradeRule={sizes:['S','M','L']}
 assert.throws(()=>call(b),/GRADE_RULE_UNSUPPORTED/)
 const c=project();c.pieces[0].points[0].gradeRule={enabled:false}
 assert.throws(()=>call(c),/GRADE_RULE_UNSUPPORTED/)
})
test('regeneration rejects stale source removal and forged link without mutating project',()=>{
 const p=project(),first=call(p),saved=structuredClone(first.study)
 const missing=project();missing.pieces[0].id='renamed'
 assert.throws(()=>regenerate(missing,saved),/SOURCE_NOT_FOUND/)
 const forged=structuredClone(saved);forged.piece.patternImportProvenance={...forged.piece.patternImportProvenance,sourcePieceId:'back'}
 assert.throws(()=>regenerate(p,forged),/INVALID_LINK/)
 assert.deepEqual(first.study,saved)
 assert.deepEqual(p,project())
})
test('invalid intersections, coordinates, unknown point attachments and duplicate IDs rejected',()=>{
 const p=project();p.pieces[0].points=[{x:0,y:0},{x:8,y:8},{x:0,y:8},{x:8,y:0}]
 assert.throws(()=>call(p),/DEGENERATE_AREA|SELF_INTERSECTION/)
 const q=project();q.pieces[0].points[0].x=Infinity
 assert.throws(()=>call(q),/NONFINITE/)
 const r=project();r.pieces[0].points[0].notch=true
 assert.throws(()=>call(r),/POINT_METADATA/)
 assert.throws(()=>call(project(),{referenceId:'front'}),/DUPLICATE_ID/)
 assert.throws(()=>call(project(),{sourcePieceId:'absent'}),/SOURCE_NOT_FOUND/)
})
test('accessors, inherited prototypes, cycles and prototype serialization hooks never execute',()=>{
 const p=project();let called=0
 Object.defineProperty(p.pieces[0],'secret',{get(){called++;throw Error('getter ran')},enumerable:true})
 assert.throws(()=>call(p),/ACCESSOR_OR_HIDDEN/)
 assert.equal(called,0)
 const cy=project();cy.cycle=cy
 assert.throws(()=>call(cy),/CYCLE_OR_ALIAS/)
 const bad=project();bad.pieces[0].points[0]=Object.create({x:1,y:2})
 assert.throws(()=>call(bad),/COMPLEXITY/)
 const original=Object.prototype.toJSON
 Object.prototype.toJSON=function(){called++;throw Error('hook ran')}
 try{assert.ok(call(project()).piece.id==='front-ref');assert.equal(called,0)}finally{if(original===undefined)delete Object.prototype.toJSON;else Object.prototype.toJSON=original}
})
