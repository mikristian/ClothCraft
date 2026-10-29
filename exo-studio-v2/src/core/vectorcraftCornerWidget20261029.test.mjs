import test from 'node:test'
import assert from 'node:assert/strict'
import {cornerWidgetGeometry,cornerDragTangent,previewNativeCornerDrag} from './vectorcraftCornerWidget20261029.js'

const shape=()=>({points:[[0,0],[.1,0],[.1,.1],[0,.1]],edges:['top','right','bottom','left'],curves:{}})
test('on-canvas knob sits inside the 90-degree corner and its drag keeps material vertices fixed',()=>{
  const original=shape(),corner=cornerWidgetGeometry(original.points,1,{closed:true,offset:.01})
  assert(corner)
  assert(corner.center[0]<.1&&corner.center[1]>0)
  const cursor=[.07,.03],result=previewNativeCornerDrag(original,1,cursor,{screenUnit:.0005})
  assert(result)
  assert.deepEqual(result.points,original.points)
  assert.deepEqual(original.curves,{})
  const prev=result.curves.top[1],next=result.curves.right[0],at=result.points[1]
  const a=[at[0]-prev[0],at[1]-prev[1]],b=[next[0]-at[0],next[1]-at[1]]
  assert(Math.abs(a[0]*b[1]-a[1]*b[0])<1e-10,'guideline handles are aligned')
  assert(a[0]*b[0]+a[1]*b[1]>0,'incoming/outgoing tangent is smooth')
})
test('degenerate geometry fails closed, open endpoints offer a draggable circle',()=>{
  assert.deepEqual(cornerWidgetGeometry([[0,0],[.1,0]],0)?.center,[0,.018])
  assert(cornerWidgetGeometry([[0,0],[.1,0]],1)?.center[1]>0)
  const broken=shape();broken.points[0]=[.1,0]
  assert.equal(cornerWidgetGeometry(broken.points,1,{closed:true}),null)
  const geo=cornerWidgetGeometry(shape().points,1,{closed:true})
  assert.equal(cornerDragTangent(geo,[.1,0])?.[0],0)
  assert(Math.hypot(...cornerDragTangent(geo,[-5,5]))<=geo.minEdge*.32+1e-10)
  assert.equal(previewNativeCornerDrag(shape(),1,[.1,0]),null)
})
