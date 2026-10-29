import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import * as THREE from 'three'
import {initializeRustVerletKernel,integrateRustVerletBatch,integrateVerletJs,rustVerletStatus} from '../src/core/rustVerletKernel.js'

const wasm='public/wasm/exo_verlet_kernel.wasm'
if (!existsSync(wasm)) {
  console.log(JSON.stringify({pass:false,blocked:true,reason:'W09 WASM has not been compiled'}))
  process.exitCode=2
} else {
  let state=0x09a11ce
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32)
  const samples=Array.from({length:512},(_,index)=>({
    current:[(random()-.5)*1e5,(random()-.5)*1e5,(random()-.5)*1e5],
    previous:[(random()-.5)*1e5,(random()-.5)*1e5,(random()-.5)*1e5],
    invMass:[0,-1,1,.5,2][index%5]
  }))
  const make=items=>items.map(p=>({invMass:p.invMass,
    position:new THREE.Vector3(...p.current),
    previous:new THREE.Vector3(...p.previous)}))
  assert.equal(await initializeRustVerletKernel({bytes:readFileSync(wasm)}),true)
  let maxAbs=0,maxUlp=0,comparisons=0
  const bits=new DataView(new ArrayBuffer(8))
  const ordered=n=>{bits.setFloat64(0,n);const b=bits.getBigUint64(0);return b>>63n?~b: b|(1n<<63n)}
  const check=(a,b)=>{
    for(let i=0;i<a.length;i++)for(const field of ['position','previous']) {
      for(const axis of ['x','y','z']){
        const expected=a[i][field][axis],actual=b[i][field][axis]
        assert.ok(Number.isFinite(actual))
        maxAbs=Math.max(maxAbs,Math.abs(actual-expected))
        const ulp=ordered(expected)>ordered(actual)?ordered(expected)-ordered(actual):ordered(actual)-ordered(expected)
        maxUlp=Math.max(maxUlp,Number(ulp))
        assert.ok(Math.abs(actual-expected)<=1e-10*Math.max(1,Math.abs(expected)),
          `particle ${i} ${field}.${axis}: ${expected} vs ${actual}`)
        comparisons++
      }
    }
  }
  for(const direction of [samples,[...samples].reverse()]){
    for(const [damping,gravity] of [[0,0],[1,0],[.985,9.81/3600],[.25,-.125]]){
      const reference=make(direction),native=make(direction)
      integrateVerletJs(reference,damping,gravity)
      assert.equal(integrateRustVerletBatch(native,damping,gravity),true)
      check(reference,native)
    }
  }
  for(const malformed of [NaN,Infinity,-Infinity]) {
    const batch=make(samples.slice(0,3))
    batch[1].position.y=malformed
    assert.equal(integrateRustVerletBatch(batch,.985,.001),false)
    assert.equal(batch[0].position.x,samples[0].current[0])
  }
  console.log(JSON.stringify({pass:true,backend:rustVerletStatus().backend,
    batches:rustVerletStatus().batches,comparisons,maxAbs,maxUlp,
    integrationWired:false,chromeProductionParity:false}))
}
