import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustCurveDraftKernel,rustCurveDraftKernelReady,rustCurveDraftBrackets,rustCurveDraftMeasure,jsCurveDraftBrackets,jsCurveDraftMeasure} from '../src/core/rustCurveDraftKernel.js'
import {sideCurveStation,curveDraftDimensions} from '../src/core/patternCurveDrafting.js'
import {evaluateFreeCurve} from '../src/core/nativeFreeCurvePoints.js'

const bytes=readFileSync('public/wasm/exo_curve_draft_kernel.wasm')
assert.equal(await initializeRustCurveDraftKernel({bytes}),true)
assert.equal(rustCurveDraftKernelReady(),true)
let checks=0
function near(a,b,scale=1e-11){assert(Math.abs(a-b)<=scale*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);checks++}
function compare(points,y){
  assert.deepEqual(rustCurveDraftBrackets(points,y),jsCurveDraftBrackets(points,y));checks++
  const got=rustCurveDraftMeasure(points),expected=jsCurveDraftMeasure(points)
  assert.equal(Boolean(got),Boolean(expected));checks++
  if(got){near(got.length,expected.length);got.midpoint.forEach((v,i)=>near(v,expected.midpoint[i]));
    for(const key of ['minX','maxX','minY','maxY'])near(got.bounds[key],expected.bounds[key])}
}
const cases=[
  [[0,0],[0,0],[0,0]],
  [[0,0],[0,2],[1,0],[2,2],[1,0]],
  [[2,2],[1,0],[0,2],[0,0]],
  [[-10,-20],[3,40]],
  [[0,0],[1e-12,1e-12],[1e-11,1e-11]],
  [[0,0],[Number.NaN,1],[1,2]],
]
let seed=53821
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
for(let n=0;n<200;n++){
  const points=Array.from({length:2+Math.floor(random()*40)},()=>[(random()-.5)*10,(random()-.5)*10])
  cases.push(points)
  cases.push([...points].reverse())
}
for(const points of cases)for(const y of [-3,0,1,10])compare(points,y)

const polygon={edges:['hem','side-left','shoulder','side-right'],points:[[.8,.7],[.2,.7],[.2,.25],[.8,.25]],
  curves:{'side-left':[[.14,.57],[.14,.36]],'side-right':[[.86,.36],[.86,.57]]}}
for(const edge of ['side-left','side-right']){
  const station=sideCurveStation(polygon,edge,.52)
  assert(station)
  near(station.position[1],.52,1e-7)
  assert.deepEqual(station.position,evaluateFreeCurve(polygon,edge,station.t));checks++
}
assert.equal(curveDraftDimensions(polygon,{samples:128}).length,4);checks++
console.log(JSON.stringify({pass:true,cases:cases.length,checks,backend:'rust-wasm'}))
