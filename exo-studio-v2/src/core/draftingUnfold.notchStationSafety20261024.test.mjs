import assert from 'node:assert/strict'
import {test} from 'node:test'
import {unfoldDraftPiece} from './draftingUnfold.js'

const half=()=>({
  id:'half-notch-station',name:'Half bodice',
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],
  notches:[{id:'side-notch',edgeIndex:1,t:.25,depthCm:.3}],
})

test('unfold rejects invalid authored notch stations instead of emitting invalid mirrored factory marks',()=>{
  for(const t of ['bad',' ',NaN,Infinity,-Infinity,-.01,1.01,true,[],{}]){
    const piece=half()
    piece.notches[0].t=t
    const before=structuredClone(piece)
    assert.throws(()=>unfoldDraftPiece(piece,3),/Notch station/,`station ${String(t)}`)
    assert.deepEqual(piece,before,'invalid notch must not mutate source')
  }
})

test('valid endpoint and interior stations retain source and reflected positions',()=>{
  for(const [t,mirrored] of [[0,1],[1,0],[.25,.75],['0.25',.75],[null,.5]]){
    const piece=half()
    piece.notches[0].t=t
    const before=structuredClone(piece)
    const result=unfoldDraftPiece(piece,3)
    assert.equal(result.piece.notches.length,2)
    assert.equal(result.piece.notches[0].t,t)
    assert.equal(result.piece.notches[1].t,mirrored)
    assert.equal(result.piece.notches[1].edgeIndex,4)
    assert.equal(result.piece.notches[1].depthCm,.3)
    assert.deepEqual(piece,before)
  }
})

test('unfold remains geometry-only and grants no factory release approval',()=>{
  const result=unfoldDraftPiece(half(),3)
  assert.equal(result.areaCm2,400)
  assert.equal(result.piece.factoryApproved,undefined)
  assert.equal(result.factoryApproved,undefined)
})
