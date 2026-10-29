import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {horizontalPatternSpans,verticalPatternSpans} from '../src/core/clothcraft2dGeometry.js'
import {initializeRustGeometryKernel,rustGeometryKernelReady,rustPatternSpanIntersection} from '../src/core/rustGeometryKernel.js'
const reference=(boundaries,uv,axis,value)=>{
 const intersections=[]
 for(const indices of Object.values(boundaries))for(let i=1;i<indices.length;i++){
  const a=uv[indices[i-1]],b=uv[indices[i]]
  if(!a||!b||![...a,...b].every(Number.isFinite))continue
  if((a[axis]<=value&&value<b[axis])||(b[axis]<=value&&value<a[axis]))
   intersections.push(a[1-axis]+(value-a[axis])*(b[1-axis]-a[1-axis])/(b[axis]-a[axis]))
 }
 intersections.sort((a,b)=>a-b)
 const spans=[]
 for(let i=0;i+1<intersections.length;i+=2)
  if(intersections[i+1]-intersections[i]>.005)spans.push([intersections[i],intersections[i+1]])
 return spans
}
const boundaries={outer:[0,1,2,3,0],hole:[4,5,6,7,4],bad:[8,9,10]}
const uv=[[0,0],[.8,0],[.8,.7],[0,.7],[.2,.2],[.2,.5],[.55,.5],[.55,.2],[NaN,0],[1,0],[1,1]]
const check=()=>{
 let checks=0
 for(const value of [-.5,0,.1,.2,.35,.5,.7,.9])for(const [fn,axis] of [[horizontalPatternSpans,1],[verticalPatternSpans,0]]){
  assert.deepEqual(fn(boundaries,uv,value),reference(boundaries,uv,axis,value))
  checks++
 }
 return checks
}
assert.equal(rustGeometryKernelReady(),false)
const jsCases=check()
const wasm=readFileSync('public/wasm/exo_geometry_kernel.wasm')
assert.equal(await initializeRustGeometryKernel({bytes:wasm}),true)
assert.equal(rustPatternSpanIntersection([0,0],[1,1],1,true),NaN)
assert.equal(rustPatternSpanIntersection([0,0],[1,1],.5,false),.5)
const rustCases=check()
console.log(JSON.stringify({pass:true,jsCases,rustCases,total:jsCases+rustCases,wasmBytes:wasm.length}))
