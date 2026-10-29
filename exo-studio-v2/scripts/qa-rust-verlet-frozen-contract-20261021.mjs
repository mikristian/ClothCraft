// Frozen, deterministic bridge-contract QA. This exercises a simulated WASM ABI,
// NOT compiled Rust; the separate seeded parity suite requires the real artifact.
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import * as THREE from 'three'

let seed=0x09a11ce
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const samples=Array.from({length:512},(_,index)=>({
  position:[(random()-.5)*1e5,(random()-.5)*1e5,(random()-.5)*1e5],
  previous:[(random()-.5)*1e5,(random()-.5)*1e5,(random()-.5)*1e5],
  invMass:[0,-1,1,.5,2][index%5]
}))
const make=items=>items.map(p=>({
  invMass:p.invMass,position:new THREE.Vector3(...p.position),
  previous:new THREE.Vector3(...p.previous)
}))
const snapshot=items=>items.map(p=>[...p.position.toArray(),...p.previous.toArray()])

function mockWasm({abi=1,missingExport=false,throwDealloc=false}={}) {
  const memory=new WebAssembly.Memory({initial:2})
  let cursor=64,allocations=0,deallocations=0,integrations=0
  const exports={
    memory,exo_verlet_abi_version:()=>abi,
    exo_verlet_alloc:len=>{
      allocations++;const ptr=cursor;cursor+=len*8
      if(cursor>memory.buffer.byteLength)
        memory.grow(Math.ceil((cursor-memory.buffer.byteLength)/65536))
      return ptr
    },
    exo_verlet_dealloc:()=>{deallocations++;if(throwDealloc)throw Error('frozen dealloc trap')},
    exo_verlet_integrate:(inputPtr,outputPtr,count,damping,gravity)=>{
      integrations++
      const input=new Float64Array(memory.buffer,inputPtr,count*7)
      const output=new Float64Array(memory.buffer,outputPtr,count*6)
      const staged=[]
      for(let i=0;i<count;i++){
        const k=i*7
        const row=Array.from(input.subarray(k,k+6))
        if(input[k+6]>0){
          row[0]=input[k]+(input[k]-input[k+3])*damping
          row[1]=(input[k+1]+(input[k+1]-input[k+4])*damping)-gravity
          row[2]=input[k+2]+(input[k+2]-input[k+5])*damping
          row[3]=input[k];row[4]=input[k+1];row[5]=input[k+2]
        }
        if(!row.every(Number.isFinite))return 0
        staged.push(...row)
      }
      output.set(staged)
      return 1
    }
  }
  if(missingExport)delete exports.exo_verlet_integrate
  return {exports,counts:()=>({allocations,deallocations,integrations})}
}

const originalInstantiate=WebAssembly.instantiate
let imports=0,comparisons=0,maxAbsoluteDifference=0,invalidChecks=0
async function withMock(mock,run){
  WebAssembly.instantiate=async()=>({instance:{exports:mock.exports}})
  try{
    const bridge=await import(`../src/core/rustVerletKernel.js?frozenContract=${++imports}`)
    await run(bridge)
  }finally{WebAssembly.instantiate=originalInstantiate}
}

try{
  const mock=mockWasm()
  await withMock(mock,async bridge=>{
    assert.equal(await bridge.initializeRustVerletKernel({bytes:new Uint8Array([0])}),true)
    for(const order of [samples,[...samples].reverse()]){
      for(const [damping,gravity] of [[0,0],[1,0],[.985,9.81/3600],[.25,-.125]]){
        const expected=make(order),actual=make(order)
        bridge.integrateVerletJs(expected,damping,gravity)
        const committed=bridge.integrateRustVerletBatch(actual,damping,gravity)
        assert.equal(committed,true,JSON.stringify({damping,gravity,status:bridge.rustVerletStatus(),counts:mock.counts()}))
        const left=snapshot(expected),right=snapshot(actual)
        for(let i=0;i<left.length;i++)for(let axis=0;axis<6;axis++){
          const delta=Math.abs(left[i][axis]-right[i][axis])
          maxAbsoluteDifference=Math.max(maxAbsoluteDifference,delta)
          assert.ok(delta<=1e-10*Math.max(1,Math.abs(left[i][axis])),
            `frozen fixture ${i}, coordinate ${axis}: ${left[i][axis]} vs ${right[i][axis]}`)
          comparisons++
        }
      }
    }
    for(const malformed of [NaN,Infinity,-Infinity]){
      const particles=make(samples.slice(0,3)),before=snapshot(particles)
      particles[1].position.y=malformed
      const invalidBefore=snapshot(particles)
      assert.equal(bridge.integrateRustVerletBatch(particles,.985,.001),false)
      assert.deepEqual(snapshot(particles),invalidBefore)
      assert.deepEqual(snapshot(particles)[0],before[0])
      invalidChecks++
    }
    for(const damping of [NaN,Infinity,-Infinity]){
      const particles=make(samples.slice(0,3)),before=snapshot(particles)
      assert.equal(bridge.integrateRustVerletBatch(particles,damping,.001),false)
      assert.deepEqual(snapshot(particles),before)
      invalidChecks++
    }
    assert.equal(bridge.rustVerletStatus().batches,8)
    assert.equal(bridge.rustVerletStatus().particlesCommitted,4096)
    assert.deepEqual(mock.counts(),{allocations:16,deallocations:16,integrations:8})
  })
  for(const bad of [{abi:2},{missingExport:true}]){
    const mock=mockWasm(bad)
    await withMock(mock,async bridge=>{
      assert.equal(await bridge.initializeRustVerletKernel({bytes:new Uint8Array([0])}),false)
      assert.equal(bridge.rustVerletStatus().backend,'javascript-fallback')
      const particles=make(samples.slice(0,3)),before=snapshot(particles)
      assert.equal(bridge.integrateRustVerletBatch(particles,.985,.001),false)
      assert.deepEqual(snapshot(particles),before)
      invalidChecks++
    })
  }
  const broken=mockWasm({throwDealloc:true})
  await withMock(broken,async bridge=>{
    assert.equal(await bridge.initializeRustVerletKernel({bytes:new Uint8Array([0])}),true)
    const particles=make(samples.slice(0,3)),before=snapshot(particles)
    assert.equal(bridge.integrateRustVerletBatch(particles,.985,.001),false)
    assert.deepEqual(snapshot(particles),before)
    assert.equal(bridge.rustVerletStatus().backend,'javascript-fallback')
    assert.equal(bridge.rustVerletStatus().batches,0)
    invalidChecks++
  })
  const physics=readFileSync('src/core/physics.js','utf8')
  console.log(JSON.stringify({pass:true,kind:'mock-ABI-and-JS-reference-only',
    fixtureParticles:512,successfulBatches:8,comparisons,maxAbsoluteDifference,
    invalidChecks,compiledRustExecuted:false,
    compiledArtifactPresent:existsSync('public/wasm/exo_verlet_kernel.wasm'),
    productionPhysicsImportPresent:/rustVerletKernel/.test(physics)}))
}finally{WebAssembly.instantiate=originalInstantiate}
