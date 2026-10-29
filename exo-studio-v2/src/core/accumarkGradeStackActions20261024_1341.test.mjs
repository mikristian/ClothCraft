import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectAccuMarkGradedStack20261024_1341 as inspect} from './accumarkGradeStackActions20261024_1341.js'
import {createDefaultProject} from '../data/defaultProject.js'
const base=()=>{
 const project=createDefaultProject()
 const piece=project.pieces[0]
 return {project,piece}
}
test('real XS-XXL EXO graded geometry is aligned per-size without mutating grade source',()=>{
 const {project,piece}=base(),before=structuredClone(project)
 const o=inspect(project,{pieceId:piece.id,pointIndex:0})
 assert.equal(o.rows.length,project.grading.sizes.length)
 assert.equal(o.sourceGradeRulesUnchanged,true)
 assert.equal(o.cuttingAuthorized,false)
 for(const row of o.rows){
  assert(Math.abs(row.alignedAnchor.xCm-o.rows.find(x=>x.size===project.grading.baseSize).alignedAnchor.xCm)<1e-7)
  assert(Math.abs(row.alignedAnchor.yCm-o.rows.find(x=>x.size===project.grading.baseSize).alignedAnchor.yCm)<1e-7)
 }
 assert.deepEqual(project,before)
})
test('actual graded selected straight or curved boundary exposes arclength and explicit render translations',()=>{
 const {project,piece}=base()
 const o=inspect(project,{pieceId:piece.id,edgeIndex:0,edgeFraction:.3,sizes:['S','M','L']})
 assert.equal(o.rows.length,3)
 assert(o.rows.every(row=>row.selectedEdgeLengthCm>0))
 const raw=inspect(project,{pieceId:piece.id,edgeIndex:0,edgeFraction:.3,
  sizes:['S','M','L'],align:'source'})
 assert(raw.rows.every(row=>row.translation.xCm===0&&row.translation.yCm===0))
 assert(raw.rows.some(row=>Math.abs(row.sourceGradeAnchorDeltaCm.xCm)+Math.abs(row.sourceGradeAnchorDeltaCm.yCm)>1e-5))
})
test('refuses unknown/malformed sizes, topology IDs, invalid station and excessive requests',()=>{
 const {project,piece}=base()
 assert.throws(()=>inspect(project,{pieceId:'unknown'}),/UNKNOWN_PIECE/)
 assert.throws(()=>inspect(project,{pieceId:piece.id,sizes:['M','m']}),/INVALID_SIZE_SET|UNKNOWN_GRADED_SIZE/)
 assert.throws(()=>inspect(project,{pieceId:piece.id,sizes:['Q']}),/UNKNOWN_GRADED_SIZE/)
 assert.throws(()=>inspect(project,{pieceId:piece.id,edgeIndex:0,edgeFraction:1}),/INVALID_EDGE_STATION/)
 assert.throws(()=>inspect(project,{pieceId:piece.id,pointIndex:-1}),/INVALID_POINT_INDEX/)
})
test('rejects physically degenerate/crossing source rather than falsely passing a tidy grade stack',()=>{
 const {project,piece}=base()
 const bad=structuredClone(project),chosen=bad.pieces.find(p=>p.id===piece.id)
 chosen.points[1]={...chosen.points[0]}
 assert.throws(()=>inspect(bad,{pieceId:piece.id}),/DEGENERATE|SELF_INTERSECTION/)
})
