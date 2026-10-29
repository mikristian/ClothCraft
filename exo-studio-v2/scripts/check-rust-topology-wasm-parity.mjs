import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inspectDraftTopology } from '../src/core/draftingTopology.js'
import { initializeRustGeometryKernel, rustTopologyCollision } from '../src/core/rustGeometryKernel.js'

const EPS=1e-7
const cross=(a,b)=>a.x*b.y-a.y*b.x
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y})
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<=1e-5
function reference(a,b,c,d){
  const r=sub(b,a),s=sub(d,c),det=cross(r,s),m=sub(c,a)
  if(Math.abs(det)>=EPS){
    const t=cross(m,s)/det,u=cross(m,r)/det
    return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS
      ? {kind:'point',point:{x:a.x+t*r.x,y:a.y+t*r.y}} : null
  }
  if(Math.abs(cross(m,r))>=EPS)return null
  const rr=r.x*r.x+r.y*r.y
  if(rr<=EPS*EPS)return near(a,c)?{kind:'point',point:a}:null
  const start=(m.x*r.x+m.y*r.y)/rr,delta=sub(d,a)
  const end=(delta.x*r.x+delta.y*r.y)/rr
  const low=Math.max(0,Math.min(start,end)),high=Math.min(1,Math.max(start,end))
  if(high<low-EPS)return null
  if(high-low>EPS)return {kind:'overlap'}
  return {kind:'point',point:{x:a.x+low*r.x,y:a.y+low*r.y}}
}
function bounds(a,b,c,d){
  return Math.min(a.x,b.x)<=Math.max(c.x,d.x)+EPS &&
    Math.max(a.x,b.x)>=Math.min(c.x,d.x)-EPS &&
    Math.min(a.y,b.y)<=Math.max(c.y,d.y)+EPS &&
    Math.max(a.y,b.y)>=Math.min(c.y,d.y)-EPS
}
const samples=[
  [[0,0],[4,4],[0,4],[4,0]],
  [[0,0],[4,0],[2,0],[6,0]],
  [[0,0],[4,0],[4,0],[8,0]],
  [[0,0],[4,0],[5,0],[8,0]],
  [[0,0],[0,0],[0,0],[3,3]],
  [[0,0],[0,0],[3,3],[4,4]],
  [[0,0],[8,0],[5,1e-8],[5,3]],
  [[0,0],[8,0],[5,1e-4],[5,3]],
  [[2,1],[2,8],[0,3],[5,3]],
  [[1,2],[9,2],[3,2],[7,2]],
]
let seed=0x13579bdf
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<1500;i++){
  const offset=(random()-.5)*10,scale=1+random()*10
  samples.push(Array.from({length:4},()=>[
    Math.round(((random()-.5)*scale+offset)*10000)/10000,
    Math.round(((random()-.5)*scale+offset)*10000)/10000]))
}
assert.equal(await initializeRustGeometryKernel({
  bytes:readFileSync(new URL('../public/wasm/exo_geometry_kernel.wasm',import.meta.url))
}),true,'packaged geometry WASM must load')
let compared=0
for(const coords of samples){
  const [a,b,c,d]=coords.map(([x,y])=>({x,y}))
  const expected=bounds(a,b,c,d)?reference(a,b,c,d):null
  const actual=rustTopologyCollision(a,b,c,d)
  assert.ok(actual, 'WASM topology exports must exist')
  assert.equal(actual.kind,expected?.kind??'none',JSON.stringify(coords))
  if(expected?.point){
    assert.ok(Math.abs(actual.point.x-expected.point.x)<=1e-9*Math.max(1,Math.abs(expected.point.x)))
    assert.ok(Math.abs(actual.point.y-expected.point.y)<=1e-9*Math.max(1,Math.abs(expected.point.y)))
  }
  compared++
}
const shapes=[
  {points:[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}]},
  {points:[{x:0,y:0},{x:8,y:8},{x:0,y:8},{x:8,y:0}]},
  {points:[{x:0,y:0},{x:8,y:0},{x:4,y:0},{x:4,y:8},{x:0,y:8}]},
  {points:[{x:0,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}],curves:{0:{cx:4,cy:25}}},
]
for(const shape of shapes){
  const result=inspectDraftTopology(shape)
  assert.equal(typeof result.valid,'boolean')
}
console.log(`Rust loaded-WASM topology differential PASS: ${compared} collision cases and ${shapes.length} sampled contours`)
