import test from 'node:test'
import assert from 'node:assert/strict'
import {annotationBounds,resizeTechPackAnnotation} from './techPackAnnotationTransform.js'

test('resize arrow maintains opposite corner and doubles width',()=>{
  const item={id:'a',type:'arrow',points:[[100,100],[200,150]]}
  assert.deepEqual(annotationBounds(item),{x:100,y:100,width:100,height:50})
  const result=resizeTechPackAnnotation(item,'se',null,[100,50])
  assert.deepEqual(result.points,[[100,100],[300,200]])
  assert.deepEqual(item.points,[[100,100],[200,150]])
})
test('Bezier bounding resize scales its handles and guards invalid content',()=>{
  const bezier={type:'bezier',anchors:[{point:[0,0],in:[0,0],out:[25,25]},{point:[100,100],in:[75,75],out:[100,100]}]}
  const bigger=resizeTechPackAnnotation(bezier,'se',null,[100,100])
  assert.deepEqual(bigger.anchors[0].out,[50,50])
  assert.deepEqual(bigger.anchors[1].point,[200,200])
  assert.equal(annotationBounds({type:'arrow',points:[[Infinity,0]]}),null)
})
