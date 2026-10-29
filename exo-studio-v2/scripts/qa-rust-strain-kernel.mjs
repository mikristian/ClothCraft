import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustStrainKernel,rustStrainKernelStatus,rustStrainKernelReady} from '../src/core/rustStrainKernel.js'
import {triangleExtension,vertexExtensions} from '../src/core/clothcraftStrainView.js'

// Take real legacy output before loading WASM, then run precisely the same
// production API after Rust initialization. No invented reference algorithm.
const seed=[
  {uv:[[0,0],[1,0],[0,1]],positions:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]]},
  {uv:[[0,0],[.5,0],[0,.5]],positions:[[4,5,6],[4,5,6.6],[3.5,5,6]],triangles:[[0,1,2]]},
  {uv:[[0,0],[0,0],[0,1]],positions:[[0,0,0],[0,0,0],[0,1,0]],triangles:[[0,1,2]]},
  {uv:[[0,0],[1,0],[1,1],[0,1]],positions:[[0,0,0],[1.1,0,.1],[1.1,1.2,0],[0,1.2,.1]],triangles:[[0,1,2],[0,2,3]]},
  {uv:[[0,0],[1,0],[0,1],[3,4]],positions:[[0,0,0],[1,0,0],[0,1,0],[100,0,0]],triangles:[[0,1,2]]},
  {uv:[[0,0],[1,0],[0,1]],positions:[[0,0,0],[1.2,0,0],[0,1,0]],triangles:[[0,1,2],[0,1,2]]},
  {uv:[[0,0]],positions:[[0,0,0]],triangles:[]},
]
let state=0x1badb002
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}
for(let k=0;k<128;k++){
  const n=3+(k%31)
  const uv=Array.from({length:n},()=>[(random()-.5)*.8,(random()-.5)*.8])
  const positions=uv.map(([x,y])=>[
    x*(.8+random()*.7)+(.5-random())*.2,
    y*(.8+random()*.7),
    (random()-.5)*.2,
  ])
  const triangles=[]
  for(let t=0;t<n*2;t++){
    const a=Math.floor(random()*n),b=Math.floor(random()*n),c=Math.floor(random()*n)
    triangles.push([a,b,c])
  }
  seed.push({uv,positions,triangles})
}
const expected=seed.map(snapshot=>({
  extensions:vertexExtensions(snapshot),
  triangles:snapshot.triangles.map(tri=>triangleExtension(tri.map(i=>snapshot.uv[i]),tri.map(i=>snapshot.positions[i])))
}))
const loaded=await initializeRustStrainKernel({bytes:readFileSync('public/wasm/exo_strain_kernel.wasm')})
assert.equal(loaded,true,rustStrainKernelStatus().error)
assert.equal(rustStrainKernelReady(),true)
let comparisons=0
const close=(a,b,context)=>{
  assert.ok(Number.isFinite(a)&&Number.isFinite(b),`${context}: must be finite`)
  assert.ok(Math.abs(a-b)<=Math.max(2e-11,Math.abs(b)*1e-11),
    `${context}: Rust ${a} vs JS ${b}`)
  comparisons++
}
seed.forEach((snapshot,j)=>{
  const result=vertexExtensions(snapshot)
  assert.equal(result.length,expected[j].extensions.length,`mesh ${j} size`)
  result.forEach((value,i)=>close(value,expected[j].extensions[i],`mesh ${j} vertex ${i}`))
  snapshot.triangles.forEach((tri,i)=>{
    close(triangleExtension(tri.map(index=>snapshot.uv[index]),tri.map(index=>snapshot.positions[index])),
      expected[j].triangles[i],`mesh ${j} triangle ${i}`)
  })
})
assert.equal(triangleExtension([[0,0],[0,0],[0,0]],[[0,0,0],[0,0,0],[0,0,0]]),0)
assert.deepEqual(vertexExtensions(seed[0]),[0,0,0])
console.log(JSON.stringify({pass:true,backend:rustStrainKernelStatus().backend,
  meshes:seed.length,comparisons,wasmBytes:readFileSync('public/wasm/exo_strain_kernel.wasm').length}))
