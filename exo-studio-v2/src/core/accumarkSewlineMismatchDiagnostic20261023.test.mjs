import test from 'node:test'
import assert from 'node:assert/strict'
import {edgeRangeLength} from './project.js'
import {gradeProject} from './grading.js'
import {createTeeTemplate} from '../data/templates.js'
import {inspectAccuMarkSewlineMismatch20261023 as inspect} from './accumarkSewlineMismatchDiagnostic20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const block=(id,x=0,controlY=10)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}],curves:{0:{cx:x+2,cy:controlY}}})
const fixture=()=>({id:'diagnostic',grading:{sizes:SIZES,baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[block('left'),block('right',20)],seams:[{id:'join',a:{pieceId:'left',edgeIndex:0,startT:.15,endT:.8},
    b:{pieceId:'right',edgeIndex:0,startT:.15,endT:.8},reverseB:true}]})

test('physical partial quadratic stitch arclength in all six grades and source unchanged',()=>{
  const source=fixture(),before=structuredClone(source),result=inspect(source,{toleranceCm:1e-8})
  assert.equal(result.ok,true)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.seamRows.length,1)
  const seam=result.seamRows[0]
  assert.equal(seam.rows.length,6)
  for(const row of seam.rows){
    const graded=gradeProject(source,row.size)
    const piece=graded.pieces[0]
    const expected=edgeRangeLength(piece,0,.15,.8)
    assert.ok(expected>10*.65,'curve exceeds chord length')
    assert.ok(Math.abs(row.lengthAcm-expected)<1e-9)
    assert.ok(Math.abs(row.lengthBcm-expected)<1e-9)
    assert.equal(row.orientationB,'reverse')
    assert.equal(row.deltaFromBaseCm,0)
  }
  assert.deepEqual(source,before)
})

test('reports all-size mismatch and base drift; explicit ease explains but does not true geometry',()=>{
  const source=fixture()
  source.pieces[1].curves[0].cy=17
  source.grading.widthPerSizeCm=1
  source.grading.lengthPerSizeCm=.3
  const raw=inspect(source,{toleranceCm:.001})
  assert.equal(raw.ok,false)
  assert.equal(raw.seamRows[0].rows.length,6)
  assert.ok(raw.issues.some(issue=>issue.code==='SEWLINE_MISMATCH'))
  const base=raw.seamRows[0].rows.find(row=>row.size==='M')
  const size=raw.seamRows[0].rows.find(row=>row.size==='XXL')
  assert.ok(Math.abs(size.deltaFromBaseCm-(size.signedDeltaCm-base.signedDeltaCm))<1e-10)
  const signed=base.signedDeltaCm
  const policy={join:{easeSide:signed>=0?'A':'B',easeCm:Math.abs(signed),toleranceCm:.000001}}
  const disposed=inspect(source,{easeBySeamId:policy,toleranceCm:.000001})
  const middle=disposed.seamRows[0].rows.find(row=>row.size==='M')
  assert.equal(middle.pass,true)
  assert.ok(Math.abs(middle.residualCm)<1e-8)
  assert.equal(disposed.manufacturingApproved,false)
  assert.equal(disposed.ok,false,'base-only authored ease must not conceal size drift')
})

test('rejects ambiguous identity, invalid arcs, endpoints, ranges, direction and policies',()=>{
  for(const mutate of [
    source=>source.pieces[1].id='left',
    source=>source.seams.push(structuredClone(source.seams[0])),
    source=>source.seams[0].a.pieceId='missing',
    source=>source.seams[0].b.edgeIndex=999,
    source=>source.seams[0].a.startT=.95,
    source=>source.pieces[0].points[0].x=NaN,
    source=>source.pieces[0].curves[0].cy=Infinity,
    source=>source.seams[0].reverseB='yes',
    source=>source.grading.sizes[0]='M',
  ]){
    const source=fixture();mutate(source)
    const result=inspect(source)
    assert.equal(result.ok,false)
    assert.equal(result.manufacturingApproved,false)
  }
  assert.equal(inspect(fixture(),{easeBySeamId:{ghost:{easeSide:'A',easeCm:1}}}).ok,false)
  assert.equal(inspect(fixture(),{easeBySeamId:{join:{easeSide:'A',easeCm:-1}}}).ok,false)
  assert.equal(inspect(fixture(),{toleranceCm:-1}).ok,false)
})

test('real tee baseline covers every authored seam at all six graded sizes',()=>{
  const tee=createTeeTemplate(),before=structuredClone(tee)
  const result=inspect(tee)
  assert.equal(result.seamRows.length,tee.seams.length)
  assert.equal(result.sizeSummary.length,6)
  assert.ok(result.seamRows.every(row=>row.rows.length===6))
  assert.ok(result.seamRows.every(row=>row.rows.every(seam=>Number.isFinite(seam.lengthAcm)&&Number.isFinite(seam.lengthBcm))))
  assert.deepEqual(tee,before)
})
