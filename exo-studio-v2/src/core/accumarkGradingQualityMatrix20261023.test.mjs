import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {edgeLength, edgeRangeLength, samplePieceBoundary} from './project.js'
import {inspectAccuMarkGradingQualityMatrix as inspect} from './accumarkGradingQualityMatrix20261023.js'

const square = (id, x = 0) => ({
  id, name: id, points: [{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}],
})
const source = () => ({
  grading:{sizes:['XS','S','M','L','XL','XXL'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[square('a'),square('b',20)],
  seams:[{id:'one',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0}}],
})

test('full six-size tee diagnoses every block, follows curved stitchlines and preserves source',()=>{
  const tee=createTeeTemplate(), before=structuredClone(tee)
  const matrix=inspect(tee)
  assert.deepEqual(matrix.sizes,['XS','S','M','L','XL','XXL'])
  assert.equal(matrix.baseSize,'M')
  assert.equal(matrix.manufacturingApproved,false)
  assert.equal(matrix.blocks.length,tee.pieces.length)
  assert.equal(matrix.seamPairs.length,tee.seams.length)
  for(const block of matrix.blocks){
    assert.equal(block.rows.length,6)
    for(const row of block.rows){
      const graded=gradeProject(tee,row.size).pieces.find(p=>p.id===block.pieceId)
      const sampled=samplePieceBoundary(graded,32).points
      const perimeter=graded.points.reduce((total,_,i)=>total+edgeLength(graded,i),0)
      assert.ok(Math.abs(row.perimeterCm-perimeter)<1e-7)
      assert.equal(row.pointCount,graded.points.length)
      assert.equal(row.curveCount,Object.keys(graded.curves||{}).length)
      assert.ok(Math.abs(row.widthCm-(Math.max(...sampled.map(p=>p.x))-Math.min(...sampled.map(p=>p.x))))<1e-9)
      assert.ok(row.areaCm>0)
    }
  }
  assert.deepEqual(tee,before)
})

test('curved phantom chord: sampled extrema, area and true stitch length',()=>{
  const p=source()
  p.grading.sizes=['M']
  p.pieces=[{id:'curve',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],curves:{0:{cx:5,cy:-14}}}]
  p.seams=[]
  const before=structuredClone(p)
  const result=inspect(p)
  assert.equal(result.ok,true)
  const row=result.blocks[0].rows[0]
  assert.ok(row.heightCm>15,'quadratic dips below the vertex bounding box')
  assert.ok(row.perimeterCm>40,'curved seam is longer than its straight chord')
  assert.ok(row.areaCm>100,'curved area includes bulging boundary')
  assert.deepEqual(p,before)
})

test('full and partial curved seam intervals compare actual arclength',()=>{
  const p=source()
  p.grading.sizes=['M']
  p.pieces[0].curves={0:{cx:5,cy:20}}
  p.pieces[1].curves={0:{cx:25,cy:20}}
  p.seams[0].a.startT=.1
  p.seams[0].a.endT=.6
  p.seams[0].b.startT=.1
  p.seams[0].b.endT=.6
  const pass=inspect(p,{maxSeamMismatchCm:.000001})
  assert.equal(pass.ok,true)
  assert.equal(pass.seamPairs[0].rows[0].pass,true)
  const actual=edgeRangeLength(p.pieces[0],0,.1,.6)
  assert.ok(Math.abs(pass.seamPairs[0].rows[0].lenACm-actual)<1e-8)
  p.seams[0].b.endT=.9
  const fail=inspect(p,{maxSeamMismatchCm:.01})
  assert.equal(fail.ok,false)
  assert.equal(fail.seamPairs[0].rows[0].pass,false)
  assert.ok(fail.issues.some(issue=>issue.code==='SEAM_MISMATCH'&&issue.size==='M'))
})

test('invalid ID, orphan seam, missing or duplicate size all fail closed',()=>{
  for(const modify of [
    p=>p.pieces[1].id='a',
    p=>p.seams[0].id='',
    p=>p.seams[0].b.pieceId='deleted',
    p=>p.seams[0].b.edgeIndex=42,
    p=>p.seams[0].a.startT=.8,
    p=>p.grading.sizes.push('S'),
    p=>p.pieces[0].points[0].x=Infinity,
    p=>p.pieces[0].curves={0:{cx:Infinity,cy:1}},
  ]){
    const p=source();modify(p)
    assert.equal(inspect(p).ok,false)
    assert.equal(inspect(p).manufacturingApproved,false)
  }
  assert.equal(inspect(source(),{sizeRun:['XS','bogus','M']}).ok,false)
  assert.equal(inspect(source(),{sizeRun:['M','M']}).ok,false)
  assert.equal(inspect(source(),{pieceIds:['a','a']}).ok,false)
  assert.equal(inspect(source(),{pieceIds:['missing']}).ok,false)
  assert.equal(inspect(source(),{maxSeamMismatchCm:NaN}).ok,false)
})

test('selected blocks retain cross-piece seam validation and do not mutate input',()=>{
  const p=source(), before=structuredClone(p)
  const matrix=inspect(p,{pieceIds:['a'],sizeRun:['S','M','L']})
  assert.deepEqual(matrix.blocks.map(b=>b.pieceId),['a'])
  assert.equal(matrix.seamPairs.length,1)
  assert.equal(matrix.seamPairs[0].rows.length,3)
  assert.equal(matrix.ok,true)
  assert.deepEqual(p,before)
  const broken=structuredClone(p)
  broken.seams[0].b={pieceId:'missing',edgeIndex:0}
  const report=inspect(broken,{pieceIds:['a'],sizeRun:['M']})
  assert.equal(report.ok,false)
  assert.ok(report.issues.some(issue=>issue.code==='INCOMPLETE_SEAM'))
})
