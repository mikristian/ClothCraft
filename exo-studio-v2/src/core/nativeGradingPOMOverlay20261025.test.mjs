import test from 'node:test'
import assert from 'node:assert/strict'
import {projectNativeGradedPOMOverlay20261025 as project} from './nativeGradingPOMOverlay20261025.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'
import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'

const polygon={points:[[0,0],[.2,0],[.2,.3],[0,.3]],
  edges:['top','right','bottom','left'],curves:{top:[[.06,-.03],[.14,-.03]]}}
const panel={layout_rotation_degrees:90}
const range={layout:[1,2]}
test('draft anchor POM projects physical graded positions with rotated panel layout',()=>{
  const geometry=project({kind:'anchor-distance',fromPoint:0,toPoint:1},polygon,panel,range)
  assert.equal(geometry.ok,true,geometry.reason)
  assert(Math.abs(geometry.actualMm-200)<1e-9)
  assert.deepEqual(geometry.points.map(p=>p.map(n=>Math.round(n*100000)/100000)),[[1,2],[1,2.2]])
  assert.equal(geometry.manufacturingApproved,false)
})
test('curved sewn-edge overlay traces curve but reports physical arclength, not chord',()=>{
  const geometry=project({kind:'sewline-edge',edge:'top'},polygon,panel,range)
  assert.equal(geometry.ok,true,geometry.reason)
  assert(geometry.points.length>2)
  assert(geometry.actualMm>200)
  assert(Math.abs(geometry.actualMm-nativeRustEdgeLength20261023(polygon,'top').totalLengthM*1000)<1e-8)
})
test('consecutive sewn path wraps boundary and invalid station blocks rendering',()=>{
  const geometry=project({kind:'sewline-path',fromPoint:3,toPoint:1},polygon,panel,range)
  assert.equal(geometry.ok,true,geometry.reason)
  assert(geometry.points.length>3)
  const physicalMm=['left','top'].reduce((length,edge)=>
    length+nativeRustEdgeLength20261023(polygon,edge).totalLengthM*1000,0)
  assert(Math.abs(geometry.actualMm-physicalMm)<1e-8)
  assert.equal(project({kind:'anchor-distance',fromPoint:1,toPoint:1},polygon,panel,range).ok,false)
  assert.equal(project({kind:'sewline-edge',edge:'unknown'},polygon,panel,range).ok,false)
})

test('signed POM variance follows the current size target and acceptance tolerance',()=>{
  const definition={kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:2,
    targetsMm:{M:199,XL:205}}
  const middle=project(definition,polygon,panel,range,'M')
  const xl=project(definition,polygon,panel,range,'XL')
  assert.equal(middle.status,'pass')
  assert.equal(middle.targetMm,199)
  assert.equal(middle.deltaMm,1)
  assert.equal(xl.status,'review')
  assert.equal(xl.deltaMm,-5)
  assert.equal(project({...definition,targetsMm:{}},polygon,panel,range,'XL').status,'unset')
  assert.equal(project({...definition,targetsMm:{XL:Infinity}},polygon,panel,range,'XL').ok,false)
  assert.equal(project({...definition,toleranceMm:-1},polygon,panel,range,'M').ok,false)
  assert.equal(project(definition,polygon,panel,range,'3XL').ok,false)
  assert.equal(middle.manufacturingApproved,false)
})

test('adaptive physical trace follows strong S curves missed by midpoint-only tessellation',()=>{
  const sCurve={...polygon,curves:{top:[[.06,.14],[.14,-.14]]}}
  const trace=project({kind:'sewline-edge',edge:'top'},sCurve,{layout_rotation_degrees:0},
    {layout:[0,0]})
  assert.equal(trace.ok,true,trace.reason)
  assert(trace.points.length>2)
  const shortestDistance=(q,a,b)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],squared=dx*dx+dy*dy
    const t=squared>0?Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/squared)):0
    return Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t)
  }
  const maxDeviation=Math.max(...Array.from({length:1001},(_,i)=>{
    const p=evaluateFreeCurve(sCurve,'top',i/1000)
    return Math.min(...trace.points.slice(1).map((b,index)=>shortestDistance(p,trace.points[index],b)))
  }))
  assert(maxDeviation<.00035,`SVG contour deviates ${(maxDeviation*1000).toFixed(4)} mm`)
})
