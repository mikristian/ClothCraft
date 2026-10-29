import test from 'node:test'
import assert from 'node:assert/strict'
import {cubicAt,reshapePatternBezierSegment} from './vectorPatternBezier.js'

const rectangle=()=>({
  points:[[0,0],[.3,0],[.3,.3],[0,.3]],
  edges:['top','right','bottom','left'],curves:{}
})
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])

test('VectorCraft drag line up or down curves it at grabbed t; anchors and edge identity remain fixed',()=>{
  const original=rectangle(),t=.42,delta=[0,-.048],before=[.3*t,0]
  const edited=reshapePatternBezierSegment(original,'top',t,delta)
  assert.ok(edited)
  assert.deepEqual(edited.points,original.points)
  assert.deepEqual(edited.edges,original.edges)
  assert.deepEqual(original.curves,{})
  assert.ok(distance(cubicAt(original.points[0],...edited.curves.top,original.points[1],t),
    before.map((v,i)=>v+delta[i]))<1e-10)
  assert.equal(Object.keys(edited.curves).length,1)
  const down=reshapePatternBezierSegment(original,'top',t,[0,.048])
  assert.ok(cubicAt(original.points[0],...down.curves.top,original.points[1],t)[1]>0)
})

test('Shift-drag creates perpendicular matched handles from both endpoints',()=>{
  const polygon=rectangle(),t=.5
  const edited=reshapePatternBezierSegment(polygon,'top',t,[.05,.06],{perpendicular:true})
  assert.ok(edited)
  const [c1,c2]=edited.curves.top
  assert.ok(Math.abs(c1[0]-polygon.points[0][0])<1e-12)
  assert.ok(Math.abs(c2[0]-polygon.points[1][0])<1e-12)
  assert.ok(Math.abs(c1[1]-c2[1])<1e-12)
  assert.ok(Math.abs(cubicAt(polygon.points[0],c1,c2,polygon.points[1],t)[1]-.06)<1e-10)
})

test('smooth neighbors rotate the other tangent; sharp neighbors and material vertices stay unchanged',()=>{
  const polygon=rectangle()
  polygon.curves.top=[[.07,0],[.23,0]]
  polygon.curves.left=[[0,.22],[-.07,.02]]
  const edited=reshapePatternBezierSegment(polygon,'top',.5,[0,-.03])
  assert.ok(edited)
  assert.deepEqual(edited.points,polygon.points)
  assert.deepEqual(edited.curves.right,undefined)
  assert.deepEqual(edited.curves.left,polygon.curves.left)
  assert.notDeepEqual(edited.curves.top,polygon.curves.top)
  // A deliberately smooth join on the left should rotate its incoming arm.
  polygon.curves.left=[[0,.22],[-.07,0]]
  polygon.curves.top=[[.07,0],[.23,0]]
  const smooth=reshapePatternBezierSegment(polygon,'top',.5,[0,-.02])
  assert.ok(smooth)
  // Previous and outgoing vectors at the first anchor remain opposed.
  const armIn=smooth.curves.left[1],armOut=smooth.curves.top[0]
  assert.ok(Math.abs(armIn[0]*armOut[1]-armIn[1]*armOut[0])<1e-10)
})

test('malformed or unsupported commands fail closed and never mutate',()=>{
  const polygon=rectangle(),snapshot=structuredClone(polygon)
  assert.equal(reshapePatternBezierSegment(polygon,'missing',.5,[0,.01]),null)
  assert.equal(reshapePatternBezierSegment(polygon,'top',NaN,[0,.01]),null)
  assert.equal(reshapePatternBezierSegment(polygon,'top',.5,[0,Infinity]),null)
  assert.equal(reshapePatternBezierSegment(polygon,'top',.5,[0,0]),null)
  polygon.free_curve_points={top:[{id:'k',t:.5,position:[.15,0]}]}
  assert.equal(reshapePatternBezierSegment(polygon,'top',.5,[0,.01]),null)
  delete polygon.free_curve_points
  assert.deepEqual(polygon,snapshot)
})
