import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {gradeProject} from './grading.js'
import {buildAccuMarkFullPatternGradeNest} from './accumarkFullPatternGradeNest20261023.js'

test('Foundation Tee six sizes and all blocks have exact quadratic stitchline overlays with real grade-point deltas',()=>{
  const source=createDefaultProject(),before=structuredClone(source)
  const nest=buildAccuMarkFullPatternGradeNest(source)
  assert.deepEqual(nest.sizes,source.grading.sizes)
  assert.equal(nest.pieces.length,source.pieces.length)
  assert.ok(nest.pieces.some(piece=>piece.sizes.some(item=>item.path.includes(' Q '))))
  let moved=0
  for(const piece of nest.pieces){
    assert.equal(piece.sizes.length,6)
    assert.equal(piece.pointCount,source.pieces.find(p=>p.id===piece.pieceId).points.length)
    for(const overlay of piece.sizes){
      const graded=gradeProject(source,overlay.size).pieces.find(p=>p.id===piece.pieceId)
      assert.equal(overlay.points.length,graded.points.length)
      assert.equal((overlay.path.match(/ Q /g)||[]).length,Object.keys(graded.curves||{}).length)
      overlay.points.forEach((point,index)=>{
        assert.equal(point.index,index)
        assert.equal(point.xLocalCm,graded.points[index].x)
        assert.equal(point.yLocalCm,graded.points[index].y)
        assert.equal(point.x,graded.points[index].x+piece.layout2d.x)
        assert.equal(point.y,piece.layout2d.y-graded.points[index].y)
        assert.equal(point.x,point.xLocalCm+piece.layout2d.x)
        assert.equal(point.y,piece.layout2d.y-point.yLocalCm)
        if(Math.abs(point.dxCm)+Math.abs(point.dyCm)>1e-9)moved++
      })
    }
    assert.ok(piece.sizes.find(o=>o.size===nest.baseSize).points.every(p=>p.dxCm===0&&p.dyCm===0))
  }
  assert.ok(moved>20)
  assert.deepEqual(source,before)
})

test('subset and visibility preserve block identity and size order',()=>{
  const source=createDefaultProject()
  const subset=buildAccuMarkFullPatternGradeNest(source,{pieceIds:[source.pieces[1].id],sizes:['XL','XS'],selectedSize:'XL',showPoints:false,showLabels:false,showVectors:true})
  assert.deepEqual(subset.pieces.map(p=>p.pieceId),[source.pieces[1].id])
  assert.deepEqual(subset.pieces[0].sizes.map(s=>s.size),['XL','XS'])
  assert.equal(subset.selectedSize,'XL')
  assert.equal(subset.showVectors,true)
})

test('rejects duplicates, invalid coordinates and mismatched grade topology without mutation',()=>{
  const source=createDefaultProject()
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(source,{sizes:['M','M']}),/duplicate/)
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(source,{pieceIds:['front','front']}),/duplicate/)
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(source,{maxPointsPerPiece:3}),/topology/)
  const duplicate=structuredClone(source)
  duplicate.pieces[1].id=duplicate.pieces[0].id
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(duplicate),/duplicate/)
  const bad=structuredClone(source)
  bad.pieces[0].curves[1].cy=NaN
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(bad),/quadratic/)
  const corrupt=structuredClone(source)
  corrupt.pieces[0].points[0].x=NaN
  assert.throws(()=>buildAccuMarkFullPatternGradeNest(corrupt),/topology/)
})
