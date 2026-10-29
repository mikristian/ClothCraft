import test from 'node:test'
import assert from 'node:assert/strict'
import {editPatternBezierHandle} from './vectorPatternBezier.js'

const shape=()=>({points:[[-2,0],[2,0],[2,2],[1,3],[-1,3],[-2,2]],edges:['hem','right','shoulderR','neck','shoulderL','left'],curves:{right:[[2,.6],[2,1.4]],left:[[-2,1.4],[-2,.6]]}})

test('self-symmetric hem reflects only the opposite control, in either direction',()=>{
  const original=shape()
  original.curves.hem=[[-1.3,-.2],[1.1,.4]]
  for(const index of [0,1]){
    const edited=editPatternBezierHandle(original,'hem',index,[.15,.25],{mirrorAcrossPattern:true})
    assert.deepEqual(edited.curves.hem[index],original.curves.hem[index].map((v,i)=>v+[.15,.25][i]))
    assert.deepEqual(edited.curves.hem[1-index],[-edited.curves.hem[index][0],edited.curves.hem[index][1]])
  }
  assert.deepEqual(original.curves.hem,[[-1.3,-.2],[1.1,.4]])
})

test('reflects the right edge onto the reversed left edge, preserving source immutability',()=>{
  const original=shape()
  const edited=editPatternBezierHandle(original,'right',0,[.3,.2],{mirrorAcrossPattern:true})
  assert.deepEqual(edited.curves.left,edited.curves.right.slice().reverse().map(p=>[-p[0],p[1]]))
  assert.deepEqual(original,shape())
})

test('reflects left side onto right and respects polygon wraparound',()=>{
  const edited=editPatternBezierHandle(shape(),'left',1,[-.25,.1],{mirrorAcrossPattern:true})
  assert.deepEqual(edited.curves.right,edited.curves.left.slice().reverse().map(p=>[-p[0],p[1]]))
})

test('unmatched or non-symmetric edges remain independently editable',()=>{
  const original=shape()
  original.curves.shoulderR=[[1.9,2.2],[1.5,2.8]]
  original.points[4]=[-.8,3]
  const edited=editPatternBezierHandle(original,'shoulderR',0,[.1,0],{mirrorAcrossPattern:true})
  assert.deepEqual(edited.curves.shoulderL,undefined)
  assert.deepEqual(edited.curves.left,original.curves.left)
  assert.notDeepEqual(edited.curves.shoulderR,original.curves.shoulderR)
})
