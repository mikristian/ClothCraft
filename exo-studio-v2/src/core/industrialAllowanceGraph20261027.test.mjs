import test from 'node:test'
import assert from 'node:assert/strict'
import {authorIndustrialAllowanceGraph as author,reapplyIndustrialAllowanceGraph as reapply,ALLOWANCE_GRAPH_SCHEMA} from './industrialAllowanceGraph20261027.js'

const piece = (id,value) => ({id,points:[{x:0,y:0},{x:5,y:0},{x:5,y:5}],seamAllowance:value,edgeSeamAllowances:{1:value},notches:[{edgeIndex:1,t:.5}],metadata:{verified:'original'}})
const fixture=()=>({revision:4,grading:{sizes:['S','M','L'],baseSize:'M'},pieces:[piece('a',1.5),piece('b',.6),piece('c',.7)],notes:{private:'retained'}})
const ref = pieceId => ({pieceId,edgeIndex:1,pointCount:3})
const links = [{source:ref('a'),target:ref('b')},{source:ref('b'),target:ref('c')}]

test('persisted graph is deterministic and source changes safely reapply through dependency chains',()=>{
  const input=fixture(), original=structuredClone(input)
  const first=author(input,links,{expectedRevision:4})
  const reversed=author(input,[...links].reverse(),{expectedRevision:4})
  assert.equal(first.project.industrialAllowanceGraph.schema,ALLOWANCE_GRAPH_SCHEMA)
  assert.deepEqual(first.project,reversed.project)
  assert.equal(first.project.pieces[2].edgeSeamAllowances[1],1.5)
  assert.deepEqual(input,original)
  const edited=structuredClone(first.project)
  edited.revision=5
  edited.pieces[0].edgeSeamAllowances[1]=2.2
  const next=reapply(edited,{expectedRevision:5})
  assert.equal(next.project.pieces[1].edgeSeamAllowances[1],2.2)
  assert.equal(next.project.pieces[2].edgeSeamAllowances[1],2.2)
  assert.equal(next.project.industrialAllowanceGraph.lastAppliedRevision,5)
  assert.deepEqual(next.project.pieces[2].notches,first.project.pieces[2].notches)
  assert.deepEqual(next.project.notes,input.notes)
  assert.equal(edited.pieces[1].edgeSeamAllowances[1],1.5)
})

test('reject stale revision, tampered targets, mismatched grading and stale edge topology',()=>{
  const base=author(fixture(),links,{expectedRevision:4}).project
  const withChange=change=>{const p=structuredClone(base);change(p);return p}
  assert.throws(()=>reapply(base,{expectedRevision:3}),{code:'STALE_REVISION'})
  assert.throws(()=>reapply(withChange(p=>p.pieces[1].edgeSeamAllowances[1]=3),{expectedRevision:4}),{code:'TARGET_MODIFIED'})
  assert.throws(()=>reapply(withChange(p=>p.grading.sizes=['M','L']),{expectedRevision:4}),{code:'STALE_GRADING'})
  assert.throws(()=>reapply(withChange(p=>p.pieces[0].points.push({x:0,y:5})),{expectedRevision:4}),{code:'STALE_TOPOLOGY'})
  assert.throws(()=>reapply(withChange(p=>p.industrialAllowanceGraph.links.reverse()),{expectedRevision:4}),{code:'GRAPH_TAMPERED'})
  assert.throws(()=>reapply(withChange(p=>p.industrialAllowanceGraph.schema='unknown'),{expectedRevision:4}),{code:'UNSUPPORTED_GRAPH'})
})

test('refuses partial sizes, ambiguous cycles and replacing an existing graph; remains backward compatible',()=>{
  const p=fixture()
  assert.throws(()=>author(p,[{...links[0],sizes:['M']}],{expectedRevision:4}),{code:'UNSUPPORTED_SIZE_SCOPE'})
  assert.throws(()=>author(p,[...links,{source:ref('c'),target:ref('a')}],{expectedRevision:4}),{code:'ALLOWANCE_CYCLE'})
  assert.throws(()=>author(p,[links[0],links[0]],{expectedRevision:4}),{code:'DUPLICATE_LINK'})
  const saved=author(p,links,{expectedRevision:4}).project
  assert.throws(()=>author(saved,links,{expectedRevision:4}),{code:'GRAPH_EXISTS'})
  assert.equal(p.industrialAllowanceGraph,undefined)
})
