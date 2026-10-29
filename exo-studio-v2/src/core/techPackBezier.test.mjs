import test from 'node:test'
import assert from 'node:assert/strict'
import {bezierPath,moveBezierAnchor,moveTechPackAnnotation,newBezierAnchor} from './techPackBezier.js'

test('Bezier pen builds cubic controls from VectorCraft-style anchors',()=>{
  const first=newBezierAnchor([10,20]),second=newBezierAnchor([70,80])
  first.out=[20,20];second.in=[60,80]
  assert.equal(bezierPath([first,second]),'M 10 20 C 20 20 60 80 70 80')
  assert.equal(bezierPath([]),'')
})

test('pointer drags move the selected vector with its handles and preserve the source',()=>{
  const item={id:'curve',type:'bezier',anchors:[{point:[10,10],in:[7,10],out:[14,10]},{point:[25,25],in:[20,25],out:[27,30]}]}
  const dragged=moveTechPackAnnotation(item,5,-2)
  assert.deepEqual(dragged.anchors[0],{point:[15,8],in:[12,8],out:[19,8]})
  assert.deepEqual(item.anchors[0].point,[10,10])
  const edited=moveBezierAnchor(item,1,-3,4,'in')
  assert.deepEqual(edited.anchors[1].in,[17,29])
  assert.deepEqual(edited.anchors[1].point,[25,25])
})

test('arrow selection moves arrow endpoints together',()=>{
  const item={type:'arrow',points:[[10,20],[80,60]],label:'C01'}
  assert.deepEqual(moveTechPackAnnotation(item,3,-5).points,[[13,15],[83,55]])
  assert.deepEqual(item.points,[[10,20],[80,60]])
})
