import test from 'node:test'
import assert from 'node:assert/strict'
import { authorIndustrialAllowanceGraph, reapplyIndustrialAllowanceGraph } from './industrialAllowanceGraph20261027.js'
import { guardIndustrialAllowanceReactiveReapply as guard } from './industrialAllowanceReactiveGuard20261027.js'

const piece = (id, seamAllowance) => ({ id, points:[{x:0,y:0},{x:2,y:0},{x:2,y:2}], seamAllowance, edgeSeamAllowances:{1:seamAllowance} })
const ref = pieceId => ({pieceId,edgeIndex:1,pointCount:3})
const original = () => ({ revision:4, grading:{sizes:['S','M','L'],baseSize:'M'}, pieces:[piece('a',1),piece('b',.5),piece('c',.3),piece('d',.7)] })
const links = [{source:ref('a'),target:ref('b')},{source:ref('b'),target:ref('c')}]
const base = () => authorIndustrialAllowanceGraph(original(),links,{expectedRevision:4}).project
const edit = (project, fn) => {const changed=structuredClone(project);changed.revision++;fn(changed);return changed}

test('only a linked root source allowance edit is eligible; result can safely reapply across chain', () => {
  const before = base(), frozen = structuredClone(before)
  const after = edit(before, p => {p.pieces[0].edgeSeamAllowances[1]=2.5})
  const frozenAfter = structuredClone(after)
  const decision = guard(before,after)
  assert.equal(decision.shouldReapply,true)
  assert.equal(decision.safe,true)
  assert.deepEqual(decision.changedSources,[{...ref('a'),before:1,after:2.5}])
  assert.equal(reapplyIndustrialAllowanceGraph(after,{expectedRevision:after.revision}).project.pieces[2].edgeSeamAllowances[1],2.5)
  assert.deepEqual(before,frozen)
  assert.deepEqual(after,frozenAfter)
})

test('unrelated UI and unlinked allowance edits do not trigger propagation', () => {
  const before = base()
  for (const fn of [p=>{p.ui={selected:'a'}},p=>{p.pieces[3].edgeSeamAllowances[1]=3},p=>{p.pieces[0].edgeSeamAllowances[0]=2}]) {
    const result=guard(before,edit(before,fn))
    assert.equal(result.safe,true)
    assert.equal(result.shouldReapply,false)
    assert.equal(result.code,'NO_SOURCE_CHANGE')
  }
})

test('manual target edits, intermediate chain edits and stale before provenance refuse', () => {
  const before=base()
  assert.equal(guard(before,edit(before,p=>{p.pieces[1].edgeSeamAllowances[1]=5})).code,'TARGET_MODIFIED')
  assert.equal(guard(before,edit(before,p=>{p.pieces[0].edgeSeamAllowances[1]=2;p.pieces[2].edgeSeamAllowances[1]=4})).code,'TARGET_MODIFIED')
  const stale=structuredClone(before)
  stale.pieces[2].edgeSeamAllowances[1]=10
  assert.equal(guard(stale,edit(stale,p=>{p.pieces[0].edgeSeamAllowances[1]=2})).code,'TARGET_MODIFIED')
})

test('graph changes, changed grading and linked geometry cannot auto-propagate', () => {
  const before=base()
  const cases = [
    [p=>{p.industrialAllowanceGraph.links.reverse()},'GRAPH_CHANGED'],
    [p=>{p.grading.sizes=['S','M']},'STALE_GRADING'],
    [p=>{p.grading.otherMetadata=true},'STALE_GRADING'],
    [p=>{p.pieces[0].points.push({x:0,y:2})},'STALE_TOPOLOGY'],
    [p=>{p.pieces[0].points[0].x=50},'STALE_TOPOLOGY'],
    [p=>{p.revision=before.revision},'INVALID_REVISION'],
    [p=>{p.pieces[0].edgeSeamAllowances[1]=-1},'INVALID_ALLOWANCE'],
  ]
  for (const [change,expected] of cases) {
    const after=edit(before,change)
    const decision=guard(before,after)
    assert.equal(decision.code,expected)
    assert.equal(decision.shouldReapply,false)
    assert.equal(decision.safe,false)
  }
})
