import test from 'node:test'
import assert from 'node:assert/strict'
import {smoothNativePatternAnchor} from './vectorcraftSmoothAnchor20261029.js'

const triangle=()=>({points:[[0,0],[.1,0],[.1,.1]],edges:['base','side','diagonal'],curves:{}})

test('90-degree material corner gains true collinear Bézier handles without moving vertices',()=>{
  const input=triangle(),result=smoothNativePatternAnchor(input,1)
  assert(result)
  assert.deepEqual(input.curves,{})
  assert.deepEqual(result.points,input.points)
  const p=result.points[1],inControl=result.curves.base[1],outControl=result.curves.side[0]
  const incoming=[p[0]-inControl[0],p[1]-inControl[1]]
  const outgoing=[outControl[0]-p[0],outControl[1]-p[1]]
  assert(Math.abs(incoming[0]*outgoing[1]-incoming[1]*outgoing[0])<1e-10)
  assert(incoming[0]*outgoing[0]+incoming[1]*outgoing[1]>0)
  assert(outgoing[0]>0&&outgoing[1]>0,'quarter-circle-like corner develops into the quadrant')
})

test('invalid vertices and duplicate adjacent coordinates do not produce infinite controls',()=>{
  const poly=triangle();poly.points[0]=[.1,0]
  assert.equal(smoothNativePatternAnchor(poly,1),null)
  assert.equal(smoothNativePatternAnchor(triangle(),-1),null)
})
