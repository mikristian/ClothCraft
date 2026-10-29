import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectAccuMarkGradeAngleParallel20261023 as inspect} from './accumarkGradeAngleParallelAudit20261023.js'

const sizes=['XS','S','M','L','XL','XXL']
const piece=()=>({id:'p',points:[
  {x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10},{x:2,y:2},{x:8,y:2},
  {x:2,y:7},{x:8,y:7},
]})
const project=()=>({grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[piece()],seams:[]})
const select={pieceId:'p',angle:{a:0,b:1,c:2},parallel:{a:4,b:5,c:6,d:7}}

test('six sizes maintain a 90-degree vertex and parallel lines with no source mutation',()=>{
  const source=project(),before=structuredClone(source)
  const result=inspect(source,select)
  assert.equal(result.ok,true)
  assert.equal(result.baseSize,'M')
  assert.equal(result.rows.length,6)
  for(const row of result.rows){
    assert.ok(Math.abs(row.angleDegrees-90)<1e-9)
    assert.ok(Math.abs(row.angleDeltaDegrees)<1e-9)
    assert.ok(Math.abs(row.parallelDeltaDegrees)<1e-9)
    assert.ok(row.pass)
  }
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual(source,before)
})

test('detects angle drift under nonuniform grading on the actual tee',()=>{
  const source=createTeeTemplate(),selected=source.pieces.find(p=>p.id==='front')
  assert.ok(selected.points.length>=3)
  const query={pieceId:'front',angle:{a:0,b:1,c:2},parallel:{a:0,b:1,c:2,d:3},
    angleToleranceDegrees:0.00000001,parallelToleranceDegrees:180}
  const result=inspect(source,query)
  assert.equal(result.rows.length,6)
  assert.ok(result.rows.some(row=>row.angleDeltaDegrees>1e-7), 'tee anisotropic grading changes its vertex angle')
  assert.ok(result.issues.some(issue=>issue.code==='GRADE_ANGLE_OR_PARALLEL_DRIFT'))
})

test('deliberate point grade drift, collapsed vectors and invalid selection fail closed',()=>{
  const altered=project()
  altered.pieces[0].points[2].gradeRule={enabled:true,dxPerSize:3,dyPerSize:0}
  const out=inspect(altered,select)
  assert.equal(out.ok,false)
  assert.ok(out.rows.some(row=>row.angleDeltaDegrees>1))
  const broken=project();broken.pieces[0].points[1]={...broken.pieces[0].points[0]}
  assert.ok(inspect(broken,select).issues.some(issue=>issue.code==='GRADE_GEOMETRY_ERROR'))
  assert.equal(inspect(project(),{...select,angle:{a:0,b:0,c:1}}).ok,false)
  assert.equal(inspect(project(),{...select,parallel:{a:0,b:1,c:1,d:2}}).ok,false)
  const missing=project();missing.pieces[0].id='absent'
  assert.equal(inspect(missing,select).ok,false)
  const invalid=project();invalid.grading.sizes[5]='M'
  assert.equal(inspect(invalid,select).ok,false)
})

test('parallel orientation reversal is detected even when undirected lines coincide',()=>{
  const p=project()
  p.pieces[0].points[6].gradeRule={enabled:true,dxPerSize:10,dyPerSize:0}
  p.pieces[0].points[7].gradeRule={enabled:true,dxPerSize:-10,dyPerSize:0}
  const result=inspect(p,{...select,angleToleranceDegrees:180,parallelToleranceDegrees:.1})
  assert.equal(result.ok,false)
  assert.ok(result.rows.some(row=>row.parallelDeltaDegrees>1),JSON.stringify({rows:result.rows,issues:result.issues}))
  assert.ok(result.issues.some(issue=>issue.code==='GRADE_ANGLE_OR_PARALLEL_DRIFT'))
})
