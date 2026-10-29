import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {authorIndustrialAllowanceGraph,reapplyIndustrialAllowanceGraph} from './industrialAllowanceGraph20261027.js'
import {finalizeIndustrialAllowanceMutation20261027 as finalize} from './industrialAllowanceMutationTransaction20261027.js'
import {writeSavedProject,readSavedProject} from './projectRestore.js'

function authored(){
  const original=createTeeTemplate()
  const [a,b]=original.pieces
  const link={source:{pieceId:a.id,edgeIndex:0,pointCount:a.points.length},
    target:{pieceId:b.id,edgeIndex:0,pointCount:b.points.length}}
  return authorIndustrialAllowanceGraph(original,[link],{expectedRevision:original.revision}).project
}
const store=()=>{const entries=new Map();return{
  getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)
}}

test('a normal linked source seam-value edit automatically regenerates target with one legacy project revision',()=>{
  const before=authored(),pristine=structuredClone(before),next=structuredClone(before)
  next.pieces[0].edgeSeamAllowances={...next.pieces[0].edgeSeamAllowances,0:1.75}
  const out=finalize(before,next)
  assert.equal(out.reactivelyReapplied,true)
  assert.equal(out.changedSources.length,1)
  assert.equal(out.factoryCertified,false)
  assert.equal(out.project.revision,before.revision+1)
  assert.equal(out.project.pieces[0].edgeSeamAllowances[0],1.75)
  assert.equal(out.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(out.project.industrialAllowanceGraph.lastAppliedRevision,out.project.revision)
  assert.deepEqual(before,pristine)
  assert.equal(next.pieces[1].edgeSeamAllowances[0],before.pieces[1].edgeSeamAllowances[0])
  const storage=store()
  writeSavedProject(storage,'garment','backup',out.project)
  const opened=readSavedProject(storage,'garment','backup')
  assert.equal(opened.status,'primary')
  assert.equal(opened.project.pieces[1].edgeSeamAllowances[0],1.75)
})

test('unrelated or unlinked data changes do not spuriously reapply stored links',()=>{
  const before=authored(),draft=structuredClone(before)
  draft.name='Revised sample name'
  const out=finalize(before,draft)
  assert.equal(out.reactivelyReapplied,false)
  assert.equal(out.project.revision,before.revision+1)
  assert.deepEqual(out.project.industrialAllowanceGraph,before.industrialAllowanceGraph)
  assert.equal(out.project.name,'Revised sample name')
})

test('manual linked target edits, linked source topology change and grade inventory change all refuse atomically',()=>{
  const before=authored(),pristine=structuredClone(before)
  const targeted=structuredClone(before)
  targeted.pieces[1].edgeSeamAllowances[0]=42
  assert.throws(()=>finalize(before,targeted),{code:'TARGET_MODIFIED'})
  const geometry=structuredClone(before)
  geometry.pieces[0].points[0].x+=2
  assert.throws(()=>finalize(before,geometry),{code:'STALE_TOPOLOGY'})
  const sizes=structuredClone(before)
  sizes.grading.sizes=[...sizes.grading.sizes,'XXXL']
  assert.throws(()=>finalize(before,sizes),{code:'STALE_GRADING'})
  assert.deepEqual(before,pristine)
})

test('explicit graph reapply must match the exact typed API output; forged changes are rejected',()=>{
  const before=authored()
  const authoritative=reapplyIndustrialAllowanceGraph(before,{expectedRevision:before.revision}).project
  const out=finalize(before,authoritative,{verifiedAllowanceReapply:authoritative})
  assert.equal(out.reactivelyReapplied,false)
  assert.equal(out.project.revision,before.revision+1)
  const forged=structuredClone(authoritative)
  forged.pieces[1].seamAllowance=99
  assert.throws(()=>finalize(before,forged,{verifiedAllowanceReapply:authoritative}),/differs from its verified source/i)
})

test('legacy projects without a linked seam-value graph retain previous ordinary editing behavior',()=>{
  const original=createTeeTemplate(),edited=structuredClone(original)
  edited.name='Unlinked hand-drafted pattern'
  const out=finalize(original,edited)
  assert.equal(out.project.revision,original.revision+1)
  assert.equal(out.project.name,'Unlinked hand-drafted pattern')
  assert.deepEqual(original.pieces,edited.pieces)
  assert.equal(out.reactivelyReapplied,false)
})
