import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {hasCrossingSampled,inspectProduction} from '../src/core/productionPreflight.js'
import {initializeRustPreflightCrossingKernel,rustHasCrossing} from '../src/core/rustPreflightCrossingKernel.js'
import {samplePieceBoundary} from '../src/core/project.js'

function orientation(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function baseline(points){
  const count=points.length
  for(let i=0;i<count;i++)for(let j=i+2;j<count;j++){
    if(i===0&&j===count-1)continue
    const [a,b,c,d]=[points[i],points[(i+1)%count],points[j],points[(j+1)%count]]
    if(orientation(a,b,c)*orientation(a,b,d)<-1e-9&&orientation(c,d,a)*orientation(c,d,b)<-1e-9)return true
  }
  return false
}
let seed=7272
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const examples=[
  [[0,0],[4,4],[0,4],[4,0]],
  [[0,0],[4,0],[4,4],[0,4]],
  [[0,0],[4,0],[2,0],[0,4]],
  [[0,0],[0,0],[0,0]],
  [[0,0],[3,3],[3,3],[0,3],[3,0]],
  [[0,0],[2,0],[2,2],[0,2],[1,0]],
]
for(let k=0;k<800;k++){
  const count=3+Math.floor(random()*35)
  examples.push(Array.from({length:count},()=>{
    if(k%7===0)return [Math.floor(random()*5),Math.floor(random()*5)]
    if(k%7===1)return [Math.floor(random()*20),0]
    if(k%7===2)return [random()*1e-6,random()*1e-6]
    return [(random()-.5)*100,(random()-.5)*100]
  }))
}
const cases=examples.map(arr=>arr.map(([x,y])=>({x,y})))
// Prior to initializing WASM, the synchronous JS path is the reference.
for(const points of cases)assert.equal(hasCrossingSampled(points),baseline(points))
assert.equal(await initializeRustPreflightCrossingKernel({bytes:readFileSync('public/wasm/exo_preflight_crossing_kernel.wasm')}),true)
for(let i=0;i<cases.length;i++){
  const points=cases[i]
  assert.equal(rustHasCrossing(points),baseline(points),`native case ${i}`)
  assert.equal(hasCrossingSampled(points),baseline(points),`bridge case ${i}`)
}
const pieces=[
  {id:'bow',name:'bow',points:cases[0]},
  {id:'sq',name:'sq',points:cases[1]},
]
for(const piece of pieces){
  const sampled=samplePieceBoundary(piece,6).points
  assert.equal(rustHasCrossing(sampled),baseline(sampled))
  const report=inspectProduction({pieces:[piece],fabrics:{main:{id:'main'}},seams:[],grading:{sizes:['M']}})
  const issue=report.issues.find(i=>i.code==='SELF_INTERSECTION')
  assert.equal(Boolean(issue),baseline(sampled))
  if(issue)assert.equal(issue.message,'Cut outline crosses itself. Repair the drafting topology before production.')
}
console.log(`PASS preflight crossing parity: ${cases.length} polygon inputs, JS fallback + Rust direct + public bridge; production report cases 2`)
