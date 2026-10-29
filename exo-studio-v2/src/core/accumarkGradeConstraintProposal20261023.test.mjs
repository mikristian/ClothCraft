import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {proposeAccuMarkGradeConstraint20261023 as propose} from './accumarkGradeConstraintProposal20261023.js'

const sizes=['XS','S','M','L','XL','XXL']
function fixture(){return {grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{
  id:'panel',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10},{x:2,y:2},{x:8,y:2},{x:2,y:7},{x:8,y:7}]
}],seams:[]}}
const angleSpec={pieceId:'panel',size:'L',operation:'keep-angle',angle:{a:0,b:1,c:2},movingPointIndex:2,fixedPoints:[0,1]}
const parallelSpec={pieceId:'panel',size:'L',operation:'parallel',parallel:{a:4,b:5,c:6,d:7},movingPointIndex:7,fixedPoints:[4,5,6]}

test('keep-angle corrects nonuniform drift using a six-size project, preserving source and other coordinates',()=>{
  const p=fixture();p.pieces[0].points[2].gradeRule={enabled:true,dxPerSize:2,dyPerSize:0}
  // An explicit existing legacy grade rule is protected from replacement.
  assert.equal(propose(p,angleSpec).issues[0].code,'PROTECTED_POINT')
  delete p.pieces[0].points[2].gradeRule
  p.pieces[0].points[0].gradeRule={enabled:true,dxPerSize:-2,dyPerSize:1}
  const original=structuredClone(p)
  const before=Object.fromEntries(sizes.map(s=>[s,gradeProject(p,s).pieces[0].points]))
  const result=propose(p,angleSpec)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.preview.afterResidualDegrees<1e-7,true)
  assert.equal(result.diagnostics.length,6)
  for(const s of sizes){
    const after=gradeProject(result.project,s).pieces[0].points
    after.forEach((point,i)=>{
      if(s!=='L'||i!==2)assert(Math.hypot(point.x-before[s][i].x,point.y-before[s][i].y)<1e-8)
    })
  }
  assert.deepEqual(p,original)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.proposalOnly,true)
})

test('parallel correction preserves graded segment length while matching base-directed heading',()=>{
  const p=fixture()
  p.pieces[0].points[7].gradeRule={enabled:true,dxPerSize:1,dyPerSize:2}
  assert.equal(propose(p,parallelSpec).issues[0].code,'PROTECTED_POINT')
  delete p.pieces[0].points[7].gradeRule
  p.pieces[0].points[4].gradeRule={enabled:true,dxPerSize:0,dyPerSize:1}
  p.pieces[0].points[6].gradeRule={enabled:true,dxPerSize:0,dyPerSize:-.5}
  const before=gradeProject(p,'L').pieces[0].points
  const lenBefore=Math.hypot(before[7].x-before[6].x,before[7].y-before[6].y)
  const result=propose(p,parallelSpec)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  const after=gradeProject(result.project,'L').pieces[0].points
  assert(Math.abs(Math.hypot(after[7].x-after[6].x,after[7].y-after[6].y)-lenBefore)<1e-8)
  assert(result.preview.afterResidualDegrees<1e-7)
  assert.deepEqual(result.changedSizes,['L'])
})

test('rejects degenerate, protected, malformed or base-size moves without changing input',()=>{
  const p=fixture(),old=structuredClone(p)
  assert.equal(propose(p,{...angleSpec,size:'M'}).ok,false)
  assert.equal(propose(p,{...angleSpec,fixedPoints:[0,2]}).ok,false)
  assert.equal(propose(p,{...angleSpec,movingPointIndex:1}).ok,false)
  assert.equal(propose(p,{...angleSpec,angle:{a:0,b:0,c:2}}).ok,false)
  p.pieces[0].points[2].namedGradeRuleRef={id:'locked'}
  assert.equal(propose(p,angleSpec).issues[0].code,'PROTECTED_POINT')
  delete p.pieces[0].points[2].namedGradeRuleRef
  p.pieces[0].points[2]={x:10,y:0}
  assert.equal(propose(p,angleSpec).issues[0].code,'COLLAPSED_VECTOR')
  assert.deepEqual(old.pieces[0].points[0],p.pieces[0].points[0])
  assert.equal(propose(old,{...parallelSpec,parallel:{a:0,b:1,c:1,d:2}}).ok,false)
})
