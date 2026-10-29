import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkGradeAxisOperation as apply} from './accumarkGradeAxisOperations20261023.js'
import {evaluateIndustrialGradeTable,INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'
import {gradeProject} from './grading.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=steps=>({mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
  sizes:[...sizes],baseSize:'M',steps:steps.map(([dx,dy])=>({dx,dy}))})
const source=rule([[-.4,.3],[.7,-.2],[1.2,.8],[2.3,1.1],[-.5,.4]])
const target=rule([[.2,.5],[.3,.9],[-.8,.4],[1.2,-.3],[.4,1.6]])
function project() {
  const piece=(id,shift)=>({id,points:[
    {x:shift,y:0,industrialGradeRule:id==='source'?structuredClone(source):structuredClone(target)},
    {x:shift+35,y:0},{x:shift+35,y:60},{x:shift,y:60},
  ]})
  return {grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
    pieces:[piece('source',0),piece('target',50)]}
}
const sourceRef={pieceId:'source',pointIndex:0}
const targetRef={pieceId:'target',pointIndex:0}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)

test('copy X preserves target Y on all nonuniform sizes and does not mutate source project',()=>{
  const p=project(),before=JSON.stringify(p)
  const result=apply(p,{kind:'copy-axis',axis:'x',source:sourceRef,target:targetRef})
  const actual=evaluateIndustrialGradeTable(result.project.pieces[1].points[0].industrialGradeRule)
  const from=evaluateIndustrialGradeTable(source),old=evaluateIndustrialGradeTable(target)
  for(const size of sizes){close(actual[size].dx,from[size].dx);close(actual[size].dy,old[size].dy)}
  assert.equal(JSON.stringify(p),before)
  assert.equal(result.validation.unchangedOppositeAxis,true)
  assert.equal(result.validation.manufacturingApproved,false)
  assert.deepEqual(result.validation.sizes,sizes)
  assert.equal(result.project.pieces[1].points[0].x,p.pieces[1].points[0].x)
  assert.equal(result.project.pieces[1].points[0].y,p.pieces[1].points[0].y)
})

test('copy Y preserves X and actual gradeProject geometry uses the changed movement',()=>{
  const p=project()
  const next=apply(p,{kind:'copy-axis',axis:'y',source:sourceRef,target:targetRef}).project
  const from=evaluateIndustrialGradeTable(source),old=evaluateIndustrialGradeTable(target)
  for(const size of sizes){
    const actual=evaluateIndustrialGradeTable(next.pieces[1].points[0].industrialGradeRule)[size]
    close(actual.dx,old[size].dx)
    close(actual.dy,from[size].dy)
    const graded=gradeProject(next,size).pieces[1].points[0]
    close(graded.x,p.pieces[1].points[0].x+old[size].dx)
    close(graded.y,p.pieces[1].points[0].y+from[size].dy)
  }
})

test('flip one axis is reversible, including negative unequal size increments',()=>{
  const p=project()
  for(const axis of ['x','y']){
    const changed=apply(p,{kind:'flip-axis',axis,target:targetRef}).project
    const moved=evaluateIndustrialGradeTable(changed.pieces[1].points[0].industrialGradeRule)
    const old=evaluateIndustrialGradeTable(target)
    for(const size of sizes) {
      close(moved[size][axis==='x'?'dx':'dy'],-old[size][axis==='x'?'dx':'dy'])
      close(moved[size][axis==='x'?'dy':'dx'],old[size][axis==='x'?'dy':'dx'])
    }
    const restored=apply(changed,{kind:'flip-axis',axis,target:targetRef}).project
    const back=evaluateIndustrialGradeTable(restored.pieces[1].points[0].industrialGradeRule)
    for(const size of sizes) {
      close(back[size].dx,old[size].dx)
      close(back[size].dy,old[size].dy)
    }
  }
})

test('invalid axis, stale rule, missing source rule and named reference block atomically',()=>{
  const p=project(),snapshot=JSON.stringify(p)
  const base={kind:'copy-axis',axis:'x',source:sourceRef,target:targetRef}
  assert.throws(()=>apply(p,{...base,axis:'z'}),/axis/)
  assert.throws(()=>apply(p,{...base,target:{pieceId:'target',pointIndex:44}}),/point/)
  assert.throws(()=>apply(p,{...base,source:{pieceId:'missing',pointIndex:0}}),/piece/)
  const stale=structuredClone(p)
  stale.pieces[0].points[0].industrialGradeRule.sizes[0]='XXS'
  assert.throws(()=>apply(stale,base),/size line/)
  const attached=structuredClone(p)
  attached.pieces[1].points[0].namedGradeRuleRef={id:'locked',version:1}
  assert.throws(()=>apply(attached,base),/detach named rule/)
  const incomplete=structuredClone(p)
  delete incomplete.pieces[0].points[0].industrialGradeRule
  assert.throws(()=>apply(incomplete,base),/authored industrial/)
  assert.equal(JSON.stringify(p),snapshot)
})
