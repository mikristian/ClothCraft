import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisSizeLinkedGrade} from './modarisSizeLinkedGrade20261027.js'
import {applyModarisSizeLinkedGradeMutation as transact} from './modarisSizeLinkedGradeMutation20261027.js'

const rule=n=>({mode:'small-large-incremental',sizes:['S','M','L'],baseSize:'M',steps:[{dx:n,dy:1},{dx:n,dy:1}]})
const sample=()=>({units:'cm',grading:{sizes:['S','M','L'],baseSize:'M'},pieces:['front','back','sleeve'].map(id=>({id,name:id,points:[[0,0],[20,0],[20,20],[0,20]].map(([x,y],i)=>({id:`v${i}`,x,y,industrialGradeRule:rule(1)})),curves:{0:{cx:10,cy:-3}},edgeNames:['neck','side','hem','fold']}))})
const refs=[{source:{pieceId:'front',pointIndex:0},target:{pieceId:'back',pointIndex:0}},{source:{pieceId:'back',pointIndex:0},target:{pieceId:'sleeve',pointIndex:0}}]
const linked=()=>createModarisSizeLinkedGrade(sample(),refs).project

test('unchanged ordinary edits pass as isolated draft, including metadata on linked piece',()=>{
  const before=linked(),draft=structuredClone(before)
  draft.pieces[0].name='Front updated'
  draft.notes='designer review'
  const snapshot=structuredClone(draft)
  const result=transact(before,draft)
  assert.equal(result.project.pieces[0].name,'Front updated')
  assert.equal(result.project.notes,'designer review')
  assert.deepEqual(draft,snapshot)
  assert.equal(result.validation.manufacturingApproved,false)
})

test('root source grade rule edit propagates through multiple target pieces atomically',()=>{
  const before=linked(),draft=structuredClone(before)
  draft.pieces[0].points[0].industrialGradeRule=rule(4)
  const result=transact(before,draft)
  assert.equal(result.project.pieces[1].points[0].industrialGradeRule.steps[1].dx,4)
  assert.equal(result.project.pieces[2].points[0].industrialGradeRule.steps[0].dx,4)
  assert.equal(before.pieces[1].points[0].industrialGradeRule.steps[0].dx,1)
  assert.equal(draft.pieces[1].points[0].industrialGradeRule.steps[1].dx,1)
})

test('target tamper, graph mutation, cycles, invalid sizes and base geometry drift fail closed',()=>{
  const before=linked()
  const changes=[
    p=>{p.pieces[1].points[0].industrialGradeRule.steps[1].dx=77},
    p=>{p.modarisSizeLinkedGrade.links[0].axis='y'},
    p=>{p.modarisSizeLinkedGrade.links[0].source={pieceId:'sleeve',pointIndex:0}},
    p=>{p.grading.sizes=['XS','M','L']},
    p=>{p.grading.baseSize='S'},
    p=>{p.pieces[0].points[0].x+=1},
    p=>{p.pieces[1].edgeNames[0]='replaced'},
    p=>{p.pieces[0].curves[0].cx+=1},
  ]
  changes.forEach((change,index)=>{
    const draft=structuredClone(before);change(draft);const snapshot=structuredClone(draft)
    assert.throws(()=>transact(before,draft),/refused/,`case ${index}`)
    assert.deepEqual(draft,snapshot)
  })
  const staleBefore=structuredClone(before)
  staleBefore.modarisSizeLinkedGrade.links[0].appliedRule.steps[0].dx=32
  assert.throws(()=>transact(staleBefore,structuredClone(staleBefore)),/invalid prior graph/)
})

test('first graph creation accepts exactly reproduced explicit API result; unlinked normal drafts remain supported',()=>{
  const before=sample(),draft=structuredClone(before)
  draft.notes='ordinary edit'
  assert.equal(transact(before,draft).project.notes,'ordinary edit')
  assert.equal(transact(before,draft).validation.linkCreated,false)
  const created=createModarisSizeLinkedGrade(before,refs).project
  const snapshot=structuredClone(created)
  const accepted=transact(before,created)
  assert.deepEqual(accepted.project,created)
  assert.deepEqual(created,snapshot)
  assert.equal(accepted.validation.linkCreated,true)
  assert.equal(accepted.validation.manufacturingApproved,false)
})

test('first graph creation rejects forged links, unrelated draft changes and modified source rules',()=>{
  const before=sample(),created=createModarisSizeLinkedGrade(before,refs).project
  const attacks=[
    p=>{p.notes='extra unrelated mutation'},
    p=>{p.pieces[0].points[0].industrialGradeRule.steps[1].dx=8},
    p=>{p.pieces[1].points[0].industrialGradeRule.steps[0].dx=9},
    p=>{p.modarisSizeLinkedGrade.links[0].appliedRule.steps[0].dy=99},
    p=>{p.modarisSizeLinkedGrade.links[0].sourceBase.x=30},
    p=>{p.modarisSizeLinkedGrade.links.push(structuredClone(p.modarisSizeLinkedGrade.links[0]))},
    p=>{p.modarisSizeLinkedGrade.version=2},
    p=>{p.grading.sizes=['XS','M','L']},
    p=>{p.pieces[0].points[0].x+=1},
  ]
  attacks.forEach((attack,index)=>{
    const candidate=structuredClone(created);attack(candidate)
    const snapshot=structuredClone(candidate)
    assert.throws(()=>transact(before,candidate),/refused/,`forged create ${index}`)
    assert.deepEqual(candidate,snapshot)
  })
  assert.deepEqual(before,sample())
})
