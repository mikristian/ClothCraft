import test from 'node:test'
import assert from 'node:assert/strict'
import {referenceImageResizeHandles20261029 as handles} from './referenceImageHandleGeometry20261029.js'

test('native metre and standalone centimetre SVG photo handles are 12 screen pixels',()=>{
  const native=handles({x:.1,y:.2,width:.4,height:.25,worldUnitsPerPixel:.001})
  const draft=handles({x:10,y:20,width:40,height:25,worldUnitsPerPixel:.1})
  assert.equal(native.length,8)
  assert.deepEqual(native.map(box=>box.handle),['nw','n','ne','w','e','sw','s','se'])
  assert(Math.abs(native[0].width/.001-12)<1e-9)
  assert(Math.abs(draft[0].width/.1-12)<1e-9)
  assert(Math.abs(native[7].x+native[7].width/2-.5)<1e-9)
  assert(Math.abs(draft[7].y+draft[7].height/2-45)<1e-9)
})
test('zoom changes physical handle dimensions but not their size in pixels',()=>{
  const view=px=>handles({x:0,y:0,width:.5,height:.2,worldUnitsPerPixel:px})[0]
  assert.equal(view(.0005).width/.0005,12)
  assert.equal(view(.005).width/.005,12)
  assert.equal(view(.005).width/view(.0005).width,10)
})
test('invalid or nonphysical photo geometry cannot create interactive handles',()=>{
  assert.deepEqual(handles({x:0,y:0,width:0,height:10,worldUnitsPerPixel:1}),[])
  assert.deepEqual(handles({x:0,y:NaN,width:100,height:10,worldUnitsPerPixel:1}),[])
  assert.deepEqual(handles({x:0,y:0,width:100,height:10,worldUnitsPerPixel:0}),[])
})
