import test from 'node:test'
import assert from 'node:assert/strict'
import {cornerWidgetGeometry,cornerWidgetDragHandle,previewNativeCornerDrag} from './vectorcraftCornerWidget20261029.js'
import {vectorcraftAnchorKind} from './vectorcraftAnchorPort.js'
import {editPatternBezierHandle} from './vectorPatternBezier.js'

const shape=()=>({points:[[0,0],[.1,0],[.1,.1],[0,.1]],edges:['top','right','bottom','left'],curves:{}})
const nearly=(a,b)=>Math.abs(a-b)<1e-10

test('circular widget starts without jumping and freely follows pointer direction at material scale',()=>{
  const original=shape(),geometry=cornerWidgetGeometry(original.points,1,{closed:true,offset:.005})
  const start=geometry.center
  assert.deepEqual(cornerWidgetDragHandle(geometry,start,{start,screenUnit:.0001}),[0,0])
  assert.equal(previewNativeCornerDrag(original,1,start,{start,screenUnit:.0001}),null)
  const movement=[.012,-.019],position=start.map((v,i)=>v+movement[i])
  const updated=previewNativeCornerDrag(original,1,position,{start,screenUnit:.0001})
  assert(updated)
  assert.deepEqual(updated.points,original.points,'the physical anchor stays in place')
  const p=updated.points[1],inward=updated.curves.top[1],outward=updated.curves.right[0]
  assert(nearly(outward[0]-p[0],movement[0]))
  assert(nearly(outward[1]-p[1],movement[1]))
  assert(nearly(inward[0]-p[0],-movement[0]))
  assert(nearly(inward[1]-p[1],-movement[1]))
  assert.equal(vectorcraftAnchorKind(p,inward,outward),'smooth')
  assert.deepEqual(original.curves,{})
})

test('Shift constrains to 45 degrees without changing length and re-drag preserves authored tangent',()=>{
  const original=shape(),geometry=cornerWidgetGeometry(original.points,1,{closed:true})
  const start=geometry.center
  const target=start.map((v,i)=>v+[.012,.018][i])
  const handle=cornerWidgetDragHandle(geometry,target,{start,screenUnit:.0001,shift:true})
  assert(nearly(handle[0],handle[1]))
  assert(nearly(Math.hypot(...handle),Math.hypot(.012,.018)))
  const curved=previewNativeCornerDrag(original,1,target,{start,screenUnit:.0001})
  const initial=curved.curves.right[0].map((v,i)=>v-curved.points[1][i])
  const changed=previewNativeCornerDrag(curved,1,start.map((v,i)=>v+[.004,-.002][i]),
    {start,initial,screenUnit:.0001})
  assert(changed)
  assert(nearly(changed.curves.right[0][0]-curved.points[1][0],initial[0]+.004))
  assert(nearly(changed.curves.right[0][1]-curved.points[1][1],initial[1]-.002))
})

test('dragging the widget back to zero retracts only that vertex handles; opposite corners stay intact',()=>{
  const initial=shape(),geometry=cornerWidgetGeometry(initial.points,1,{closed:true})
  const start=geometry.center
  const curve=previewNativeCornerDrag(initial,1,start.map((v,i)=>v+[.01,.012][i]),
    {start,screenUnit:.0001})
  // Make sure the other end of the same cubic isn't silently reset.
  curve.curves.right[1]=[.09,.08]
  const oldOther=[...curve.curves.right[1]]
  const current=curve.curves.right[0].map((v,i)=>v-curve.points[1][i])
  const retract=previewNativeCornerDrag(curve,1,start.map((v,i)=>v-current[i]),
    {start,initial:current,screenUnit:.0001})
  assert(retract)
  assert.deepEqual(retract.curves.top[1],curve.points[1])
  assert.deepEqual(retract.curves.right[0],curve.points[1])
  assert.deepEqual(retract.curves.right[1],oldOther)
  assert.deepEqual(retract.points,initial.points)
})

test('control handles remain independently editable with Option/Alt after circular conversion',()=>{
  const original=shape(),geometry=cornerWidgetGeometry(original.points,1,{closed:true})
  const start=geometry.center
  const smooth=previewNativeCornerDrag(original,1,start.map((v,i)=>v+[.01,.012][i]),
    {start,screenUnit:.0001})
  const incoming=[...smooth.curves.top[1]]
  const independent=editPatternBezierHandle(smooth,'right',0,[.006,0],{breakTangents:true})
  assert(independent)
  assert.deepEqual(independent.curves.top[1],incoming)
  assert.notDeepEqual(independent.curves.right[0],smooth.curves.right[0])
})
