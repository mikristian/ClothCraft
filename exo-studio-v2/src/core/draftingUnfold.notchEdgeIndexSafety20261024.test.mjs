import assert from 'node:assert/strict'
import {test} from 'node:test'
import {unfoldDraftPiece} from './draftingUnfold.js'

const half=()=>({
  id:'half-notch-edge',name:'Half panel',
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],
  notches:[{id:'authored-notch',edgeIndex:1,t:.25,depthCm:.3}],
})

test('unfold fails closed for malformed authored notch edge indices',()=>{
  for(const edgeIndex of [-1,4,99,1.5,NaN,Infinity,null,undefined,'bad','1.5','0x1',{},[]]){
    const piece=half()
    piece.notches[0].edgeIndex=edgeIndex
    const before=structuredClone(piece)
    assert.throws(()=>unfoldDraftPiece(piece,3),/Notch edge index/,`edge ${String(edgeIndex)}`)
    assert.deepEqual(piece,before,'invalid notch must not mutate the original')
  }
})

test('string-encoded fold edge notch cannot bypass the fold notch prohibition',()=>{
  const piece=half()
  piece.notches[0].edgeIndex='3'
  const before=structuredClone(piece)
  assert.throws(()=>unfoldDraftPiece(piece,3),/Remove notches from the fold edge/)
  assert.deepEqual(piece,before)
})

test('valid numeric and canonical decimal string notch edge references remain mirrored',()=>{
  for(const edgeIndex of [1,'1',0,'0',2,'2']){
    const piece=half()
    piece.notches[0].edgeIndex=edgeIndex
    const before=structuredClone(piece)
    const result=unfoldDraftPiece(piece,3)
    assert.equal(result.piece.notches.length,2)
    assert.equal(result.piece.notches[0].edgeIndex,result.edgeMap[edgeIndex])
    assert.equal(result.piece.notches[1].edgeIndex,result.mirroredEdgeMap[edgeIndex])
    assert.deepEqual(piece,before)
  }
})
