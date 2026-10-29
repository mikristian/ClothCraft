import test from 'node:test'
import assert from 'node:assert/strict'
import { propagateIndustrialAllowanceLinks as propagate } from './industrialAllowanceLinks20261027.js'

const piece = (id, value) => ({ id, seamAllowance: value, points: [{x:0,y:0},{x:10,y:0},{x:10,y:10}], edgeSeamAllowances:{1:value}, notches:[{edgeIndex:1,t:0.4,depthCm:0.3}], productionSpec:{origin:'authored'} })
const fixture = () => ({ revision:8, grading:{sizes:['S','M','L'],baseSize:'M'}, pieces:[piece('front',1.2),piece('back',0.5),piece('sleeve',0.8)], custom:{memo:'preserve'} })
const ref = (pieceId,edgeIndex=1) => ({pieceId,edgeIndex,pointCount:3})
const link = (source,target,sizes) => ({source,target,...(sizes ? {sizes} : {})})

test('linked values propagate across pieces and sizes without losing attachments or metadata', () => {
  const source = fixture(), before = structuredClone(source)
  const result = propagate(source,[link(ref('front'),ref('back')),link(ref('back'),ref('sleeve'))],{expectedRevision:8})
  assert.equal(result.applied,6)
  for(const size of ['S','M','L']) {
    assert.equal(result.sizeEdgeAllowances[size].back[1],1.2)
    assert.equal(result.sizeEdgeAllowances[size].sleeve[1],1.2)
    assert.equal(result.sizeEdgeAllowances[size].back[0],0.5)
  }
  assert.equal(result.project.pieces[1].edgeSeamAllowances[1],1.2)
  assert.deepEqual(result.project.pieces[1].notches,source.pieces[1].notches)
  assert.deepEqual(result.project.pieces[1].productionSpec,source.pieces[1].productionSpec)
  assert.deepEqual(result.project.custom,source.custom)
  assert.deepEqual(source,before)
  result.project.pieces[1].notches[0].depthCm=7
  assert.equal(source.pieces[1].notches[0].depthCm,0.3)
})

test('scoped links affect only selected sizes and base project stays untouched', () => {
  const r=propagate(fixture(),[link(ref('front'),ref('back'),['L'])],{expectedRevision:8})
  assert.equal(r.sizeEdgeAllowances.L.back[1],1.2)
  assert.equal(r.sizeEdgeAllowances.M.back[1],0.5)
  assert.equal(r.project.pieces[1].edgeSeamAllowances[1],0.5)
})

test('cycles, conflicting targets, stale revisions and changed edge counts reject atomically', () => {
  const source=fixture(), before=structuredClone(source)
  const examples = [
    [[link(ref('front'),ref('back')),link(ref('back'),ref('front'))],'ALLOWANCE_CYCLE'],
    [[link(ref('front'),ref('back')),link(ref('sleeve'),ref('back'))],'CONFLICTING_LINK'],
    [[link(ref('front'),{...ref('back'),pointCount:4})],'STALE_TOPOLOGY'],
    [[link(ref('front'),ref('front'))],'ALLOWANCE_CYCLE'],
  ]
  for(const [links,code] of examples) assert.throws(()=>propagate(source,links,{expectedRevision:8}),{code})
  assert.throws(()=>propagate(source,[],{expectedRevision:7}),{code:'STALE_REVISION'})
  assert.deepEqual(source,before)
})

test('malformed values, unsafe metadata and invalid scopes are rejected', () => {
  const bad=fixture(); bad.pieces[0].edgeSeamAllowances[1]=NaN
  assert.throws(()=>propagate(bad,[],{expectedRevision:8}),{code:'INVALID_ALLOWANCE'})
  const cyclic=fixture(); cyclic.self=cyclic
  assert.throws(()=>propagate(cyclic,[],{expectedRevision:8}),{code:'UNSAFE_INPUT'})
  const getter=fixture(); Object.defineProperty(getter,'hidden',{get(){throw Error('executed')},enumerable:true})
  assert.throws(()=>propagate(getter,[],{expectedRevision:8}),{code:'UNSAFE_INPUT'})
  assert.throws(()=>propagate(fixture(),[link(ref('front'),ref('back'),['XL'])],{expectedRevision:8}),{code:'INVALID_SIZE_SCOPE'})
})
