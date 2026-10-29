import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {authorIndustrialAllowanceGraph} from './industrialAllowanceGraph20261027.js'
import {createModarisSizeLinkedGrade} from './modarisSizeLinkedGrade20261027.js'
import {applyModarisSizeLinkedGradeMutation} from './modarisSizeLinkedGradeMutation20261027.js'
import {finalizeIndustrialAllowanceMutation20261027} from './industrialAllowanceMutationTransaction20261027.js'
import {writeSavedProject,readSavedProject} from './projectRestore.js'

const rule = (grading, value) => ({mode:'small-large-incremental',sizes:[...grading.sizes],baseSize:grading.baseSize,
  steps:grading.sizes.slice(1).map(()=>({dx:value,dy:.1}))})
function dualGraph() {
  const original=createTeeTemplate()
  const [front,back]=original.pieces
  front.points[0].industrialGradeRule=rule(original.grading,.5)
  back.points[0].industrialGradeRule=rule(original.grading,.25)
  const allowanceLink={source:{pieceId:front.id,edgeIndex:0,pointCount:front.points.length},target:{pieceId:back.id,edgeIndex:0,pointCount:back.points.length}}
  const allowance=authorIndustrialAllowanceGraph(original,[allowanceLink],{expectedRevision:original.revision}).project
  return createModarisSizeLinkedGrade(allowance,[{source:{pieceId:front.id,pointIndex:0},target:{pieceId:back.id,pointIndex:0}}]).project
}
const compose=(before,draft)=>{
  const grade=applyModarisSizeLinkedGradeMutation(before,draft)
  return {grade,allowance:finalizeIndustrialAllowanceMutation20261027(before,grade.project,{verifiedGradeDraft:draft})}
}

test('exact App composition applies simultaneous allowance and root grade edits in one revision with save/reopen',()=>{
  const before=dualGraph(),snapshot=structuredClone(before),draft=structuredClone(before)
  const front=draft.pieces[0]
  front.edgeSeamAllowances={...front.edgeSeamAllowances,0:1.75}
  front.points[0].industrialGradeRule=rule(draft.grading,1.3)
  const draftSnapshot=structuredClone(draft)
  const {grade,allowance}=compose(before,draft)
  assert.equal(grade.validation.propagated,1)
  assert.equal(grade.project.revision,before.revision)
  assert.equal(grade.project.pieces[1].points[0].industrialGradeRule.steps[0].dx,1.3)
  assert.equal(allowance.project.revision,before.revision+1)
  assert.equal(allowance.reactivelyReapplied,true)
  assert.equal(allowance.project.pieces[0].edgeSeamAllowances[0],1.75)
  assert.equal(allowance.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(allowance.project.pieces[1].points[0].industrialGradeRule.steps[0].dx,1.3)
  assert.equal(allowance.project.industrialAllowanceGraph.lastAppliedRevision,allowance.project.revision)
  assert.deepEqual(before,snapshot)
  assert.deepEqual(draft,draftSnapshot)
  const records=new Map(),storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)}
  writeSavedProject(storage,'dual-combined','backup',allowance.project)
  const reopened=readSavedProject(storage,'dual-combined','backup')
  assert.equal(reopened.status,'primary')
  assert.equal(reopened.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(reopened.project.pieces[1].points[0].industrialGradeRule.steps[0].dx,1.3)
})

test('allowance-only transaction with both graphs persists one revision and reopens',()=>{
  const before=dualGraph(),snapshot=structuredClone(before),draft=structuredClone(before)
  draft.pieces[0].edgeSeamAllowances={...draft.pieces[0].edgeSeamAllowances,0:1.75}
  const {grade,allowance}=compose(before,draft)
  assert.equal(grade.project.revision,before.revision)
  assert.equal(allowance.project.revision,before.revision+1)
  assert.equal(allowance.reactivelyReapplied,true)
  assert.equal(allowance.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.deepEqual(before,snapshot)
  const records=new Map(),storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)}
  writeSavedProject(storage,'dual-linked-project','backup',allowance.project)
  const restored=readSavedProject(storage,'dual-linked-project','backup')
  assert.equal(restored.status,'primary')
  assert.equal(restored.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(restored.project.pieces[1].points[0].industrialGradeRule.steps[0].dx,.5)
  assert.deepEqual(restored.project.modarisSizeLinkedGrade,allowance.project.modarisSizeLinkedGrade)
})

test('unauthorized grade target mutation refuses before allowance commit and keeps before untouched',()=>{
  const before=dualGraph(),snapshot=structuredClone(before),draft=structuredClone(before)
  draft.pieces[0].edgeSeamAllowances={...draft.pieces[0].edgeSeamAllowances,0:1.9}
  draft.pieces[1].points[0].industrialGradeRule.steps[0].dx=99
  assert.throws(()=>compose(before,draft),/derived target rule edited without authorization/)
  assert.deepEqual(before,snapshot)
})

test('unauthorized allowance target edit refuses in second stage with no committed revision',()=>{
  const before=dualGraph(),snapshot=structuredClone(before),draft=structuredClone(before)
  draft.pieces[0].points[0].industrialGradeRule=rule(draft.grading,2)
  draft.pieces[1].edgeSeamAllowances={...draft.pieces[1].edgeSeamAllowances,0:99}
  const staged=applyModarisSizeLinkedGradeMutation(before,draft)
  assert.equal(staged.project.revision,before.revision)
  assert.throws(()=>finalizeIndustrialAllowanceMutation20261027(before,staged.project,{verifiedGradeDraft:draft}),{code:'TARGET_MODIFIED'})
  assert.deepEqual(before,snapshot)
})

test('forged grade evidence, unverified rule changes and authored coordinate edits refuse',()=>{
  const before=dualGraph(),snapshot=structuredClone(before),draft=structuredClone(before)
  draft.pieces[0].points[0].industrialGradeRule=rule(draft.grading,1.9)
  draft.pieces[0].edgeSeamAllowances={...draft.pieces[0].edgeSeamAllowances,0:1.6}
  const grade=applyModarisSizeLinkedGradeMutation(before,draft)
  const forged=structuredClone(draft)
  forged.pieces[0].points[0].industrialGradeRule=rule(forged.grading,8)
  assert.throws(()=>finalizeIndustrialAllowanceMutation20261027(before,grade.project,{verifiedGradeDraft:forged}),/verified|grade|refus|differ|mismatch/i)
  assert.throws(()=>finalizeIndustrialAllowanceMutation20261027(before,grade.project),{code:'STALE_TOPOLOGY'})
  const coordinates=structuredClone(draft)
  coordinates.pieces[0].points[0].x+=.5
  assert.throws(()=>compose(before,coordinates),/geometry|authored|refused/i)
  assert.deepEqual(before,snapshot)
})
