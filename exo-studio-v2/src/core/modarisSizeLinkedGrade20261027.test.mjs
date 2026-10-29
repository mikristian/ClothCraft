import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisSizeLinkedGrade,reapplyModarisSizeLinkedGrade,buildModarisSizeLinkedGradeRun} from './modarisSizeLinkedGrade20261027.js'

const rule=(dx=1,dy=2)=>({mode:'small-large-incremental',sizes:['S','M','L'],baseSize:'M',steps:[{dx,dy},{dx,dy}]})
const piece=(id,dx)=>({id,points:[{id:'p0',x:0,y:0,industrialGradeRule:rule(dx)},{id:'p1',x:20,y:0,industrialGradeRule:rule()},{id:'p2',x:20,y:20,industrialGradeRule:rule()},{id:'p3',x:0,y:20,industrialGradeRule:rule()}],curves:{0:{cx:10,cy:-4}},edgeNames:['neck','side','hem','fold'],seamAllowance:1})
const fixture=()=>({units:'cm',grading:{sizes:['S','M','L'],baseSize:'M'},pieces:[piece('front',2),piece('back',1),piece('sleeve',3)]})
const refs=[{source:{pieceId:'front',pointIndex:0},target:{pieceId:'back',pointIndex:0},curves:true},{source:{pieceId:'back',pointIndex:0},target:{pieceId:'sleeve',pointIndex:0}}]

test('multi-piece propagation keeps source unchanged, point and edge identities, named edges, physical breaks and curve controls',()=>{
  const original=fixture(),snapshot=structuredClone(original)
  const created=createModarisSizeLinkedGrade(original,refs)
  assert.deepEqual(original,snapshot)
  const edited=structuredClone(created.project)
  edited.pieces[0].points[0].industrialGradeRule=rule(4,5)
  const updated=reapplyModarisSizeLinkedGrade(edited)
  assert.equal(updated.project.pieces[1].points[0].industrialGradeRule.steps[1].dx,4)
  assert.equal(updated.project.pieces[2].points[0].industrialGradeRule.steps[1].dy,5)
  assert.equal(edited.pieces[1].points[0].industrialGradeRule.steps[1].dx,2)
  const output=buildModarisSizeLinkedGradeRun(updated.project)
  assert.deepEqual(Object.keys(output.run),['S','M','L'])
  assert.equal(output.run.L.pieces[1].points[0].x,4)
  assert.equal(output.run.S.pieces[2].points[0].y,-5)
  assert.deepEqual(output.run.L.pieces[1].edgeNames,['neck','side','hem','fold'])
  const sourceCurve=output.run.L.pieces[0].curves[0]
  const targetCurve=output.run.L.pieces[1].curves[0]
  assert.equal(targetCurve.cx,sourceCurve.cx)
  assert.equal(targetCurve.cy,sourceCurve.cy)
  assert.equal(output.validation.units,'cm')
  assert.equal(output.validation.manufacturingApproved,false)
})

test('refuses cyclic links and duplicate targets without mutating caller',()=>{
  const project=fixture(),snapshot=structuredClone(project)
  assert.throws(()=>createModarisSizeLinkedGrade(project,[...refs,{source:{pieceId:'sleeve',pointIndex:0},target:{pieceId:'front',pointIndex:0}}]),/cycle/)
  assert.throws(()=>createModarisSizeLinkedGrade(project,[refs[0],refs[0]]),/duplicate target/)
  assert.deepEqual(project,snapshot)
})

test('fails closed on stale geometry, named edge topology, target mutation, size changes and invalid source rules',()=>{
  const valid=createModarisSizeLinkedGrade(fixture(),refs).project
  for(const [index,change] of [
    p=>{p.pieces[0].points[0].x+=1},
    p=>{p.pieces[1].edgeNames[0]='different'},
    p=>{p.pieces[1].points[0].industrialGradeRule.steps[0].dx=10},
    p=>{p.grading.sizes=['M','L','XL']},
    p=>{p.pieces[0].points[0].industrialGradeRule.sizes=['M','L','XL']},
    p=>{p.pieces[0].curves[4]={cx:1,cy:2}},
  ].entries()) {
    const p=structuredClone(valid);change(p);const before=structuredClone(p)
    assert.throws(()=>reapplyModarisSizeLinkedGrade(p),undefined,`case ${index}`)
    assert.deepEqual(p,before)
  }
})
