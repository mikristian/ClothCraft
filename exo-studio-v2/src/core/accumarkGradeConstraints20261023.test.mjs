import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {applyAccuMarkGradeConstraint,inspectAccuMarkGradeConstraint} from './accumarkGradeConstraints20261023.js'

function fixture(){
  return {grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},
    pieces:[{id:'body',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],internalLines:[{a:{x:5,y:5},b:{x:10,y:5}}]},
      {id:'ref',points:[{x:30,y:0},{x:40,y:0},{x:40,y:10},{x:30,y:10}]}]}
}
test('project match-length rule maintains reference seam at every named size without source mutation',()=>{
  const source=fixture(),before=structuredClone(source)
  const options={kind:'match-length',pieceId:'body',pointIndex:1,anchorIndex:0,referencePieceId:'ref',referenceStartIndex:0,referenceEndIndex:1,mode:'x'}
  const result=applyAccuMarkGradeConstraint(source,options)
  assert.deepEqual(source,before)
  assert.notStrictEqual(result,source)
  assert.deepEqual(result.pieces[0].points[1].x,10)
  assert.equal(result.pieces[0].points[1].industrialGradeRule.steps.length,2)
  assert(inspectAccuMarkGradeConstraint(result,options).every(x=>x.passes&&x.residualCm<1e-6))
  for(const size of source.grading.sizes){
    const graded=gradeProject(result,size)
    const [a,b]=graded.pieces[0].points, [c,d]=graded.pieces[1].points
    assert(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-d.x,c.y-d.y))<1e-6)
  }
})
test('projected extension matches reference projected length at every size',()=>{
  const source=fixture()
  const o={kind:'match-length',pieceId:'body',pointIndex:1,anchorIndex:0,referencePieceId:'ref',referenceStartIndex:0,referenceEndIndex:1,mode:'projected'}
  const result=applyAccuMarkGradeConstraint(source,o)
  assert(inspectAccuMarkGradeConstraint(result,o).every(r=>r.passes))
})
test('angle and parallel constraints create verifiable size tables',()=>{
  for(const kind of ['parallel','keep-angle']){
    const source=fixture()
    const o={kind,pieceId:'body',pointIndex:1,anchorIndex:0,referenceStartIndex:3,referenceEndIndex:2,mode:'xy'}
    const result=applyAccuMarkGradeConstraint(source,o)
    assert(inspectAccuMarkGradeConstraint(result,o).every(p=>p.passes))
  }
})
test('intersection of horizontal line with graded perimeter on x axis',()=>{
  const source=fixture()
  const o={kind:'intersect',pieceId:'body',pointIndex:1,edgeStartIndex:1,edgeEndIndex:2,mode:'x'}
  assert.throws(()=>applyAccuMarkGradeConstraint(source,o),/depends on moving vertex/)
  const valid={...o,pointIndex:0,edgeStartIndex:1,edgeEndIndex:2}
  assert.throws(()=>applyAccuMarkGradeConstraint(source,valid),/base geometry violates/)
  const coincident=fixture()
  coincident.pieces[0].points[0]={x:10,y:5}
  const resolved=applyAccuMarkGradeConstraint(coincident,valid)
  assert(inspectAccuMarkGradeConstraint(resolved,valid).every(r=>r.passes))
})
test('rejects invalid indices, zero reference length, stale rules and self dependency',()=>{
  const p=fixture()
  const common={kind:'match-length',pieceId:'body',pointIndex:1,anchorIndex:0,referencePieceId:'ref',referenceStartIndex:0,referenceEndIndex:1}
  assert.throws(()=>applyAccuMarkGradeConstraint(p,{...common,pointIndex:55}),/invalid/)
  assert.throws(()=>applyAccuMarkGradeConstraint(p,{...common,referenceEndIndex:0}),/zero-length/)
  assert.throws(()=>applyAccuMarkGradeConstraint(p,{...common,referencePieceId:'body',referenceStartIndex:1,referenceEndIndex:2}),/depends on moving vertex/)
  p.pieces[0].points[1].gradeRule={enabled:true,dxPerSize:1,dyPerSize:0}
  assert.throws(()=>applyAccuMarkGradeConstraint(p,common),/conflicting legacy/)
})
