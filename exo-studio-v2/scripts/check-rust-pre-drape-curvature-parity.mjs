import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {preDrapeDisplayPositions} from '../src/core/nativePreDrapeCurvature.js'
import {initializeRustPreDrapeCurvatureKernel,rustPreDrapeCurvatureStatus} from '../src/core/rustPreDrapeCurvatureKernel.js'
function snapshot(seed,alongX=true,withAvatar=false) {
  let value=seed>>>0
  const random=()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/2**32)
  const positions=Array.from({length:30},(_,i)=>{
    const w=-.28+(i%6)*.112
    const depth=-.11+((i*11)%3)*.0001
    return alongX?[w,1.2+Math.floor(i/6)*.08,depth]:[depth,1.2+Math.floor(i/6)*.08,w]
  })
  for (const p of positions) p[1]+=(random()-.5)*.002
  const triangles=Array.from({length:28},(_,i)=>[i,i+1,i+2])
  const avatar=withAvatar?{positions:Array.from({length:70},(_,i)=>[(-.08+(i%10)*.016),1.1+Math.floor(i/10)*.08,((i%2)?-.06:.06)])}:undefined
  return {positions,triangles,panels:[{triangles:[0,triangles.length]}],time:0,avatar}
}
const cases=[]
for(let i=0;i<256;i++) cases.push(snapshot(i,i%2===0,i%3===0))
for(const special of [null,{}, {positions:[]}, {positions:[[0,0,0]],time:0}, {...snapshot(4),grabActive:true}, {...snapshot(4),time:.1}]) cases.push(special)
assert.equal(rustPreDrapeCurvatureStatus().backend,'javascript-fallback')
const frozen=cases.map(item=>preDrapeDisplayPositions(item))
assert.equal(await initializeRustPreDrapeCurvatureKernel({bytes:Uint8Array.of(0)}),false)
assert.equal(await initializeRustPreDrapeCurvatureKernel({bytes:readFileSync('public/wasm/exo_pre_drape_curvature_kernel.wasm')}),true)
let vertices=0
for(let i=0;i<cases.length;i++) {
  const actual=preDrapeDisplayPositions(cases[i])
  assert.deepEqual(actual,frozen[i],`full output exact differential ${i}`)
  if(cases[i]?.positions?.length && actual!==cases[i].positions) vertices+=actual.length
  if(frozen[i]===cases[i]?.positions) assert.strictEqual(actual,cases[i].positions,'preserve original array when not shaped')
}
console.log(JSON.stringify({pass:true,cases:cases.length,transformedVertices:vertices,backend:rustPreDrapeCurvatureStatus().backend,failedLoadFallback:true}))
