import test from 'node:test'
import assert from 'node:assert/strict'
import { planDraftPointDeletion, deletedPointEdgeIndex } from './draftingPointDeletion.js'

const sample = () => ({ id:'front', points:[
  {x:0,y:0,id:'A'}, {x:5,y:0,id:'B'}, {x:10,y:0,id:'C'}, {x:10,y:10,id:'D'}, {x:0,y:10,id:'E'},
], curves:{}, seamAllowance:1, notches:[], zippers:[], bindings:[], topstitches:[] })

test('removes a vertex while retaining surviving IDs and remapping curve indices', () => {
  const piece=sample()
  piece.curves={3:{cx:5,cy:12}}
  const result=planDraftPointDeletion(piece,1)
  assert.deepEqual(result.points.map(p=>p.id),['A','C','D','E'])
  assert.deepEqual(result.curves,{2:{cx:5,cy:12}})
  assert.equal(deletedPointEdgeIndex(3,1,5),2)
  assert.equal(deletedPointEdgeIndex(0,1,5),null)
  assert.equal(piece.points.length,5,'plan must not mutate the authoring source')
})

test('rejects deletion touching hardware and preserves unrelated edge references', () => {
  for (const name of ['zippers','bindings','topstitches']) {
    const piece=sample()
    piece[name]=[{id:'h',edgeIndex:1}]
    assert.throws(()=>planDraftPointDeletion(piece,1),new RegExp(name))
    piece[name]=[{id:'h',edgeIndex:3}]
    assert.doesNotThrow(()=>planDraftPointDeletion(piece,1))
  }
})

test('rejects locked, invalid and degenerate deletions', () => {
  const locked=sample(); locked.locked=true
  assert.throws(()=>planDraftPointDeletion(locked,1),/Unlock/)
  assert.throws(()=>planDraftPointDeletion(sample(),20),/valid pattern point/)
  const piece=sample(); piece.points[3]={x:0,y:0}
  assert.throws(()=>planDraftPointDeletion(piece,1),/invalid or self-intersecting/)
})

test('deleting point zero reindexes edges without changing source', () => {
  const piece=sample()
  piece.curves={2:{cx:12,cy:5}}
  assert.deepEqual(planDraftPointDeletion(piece,0).curves,{1:{cx:12,cy:5}})
  assert.equal(deletedPointEdgeIndex(4,0,5),null)
})
