import assert from 'node:assert/strict'

async function runCase({throwSetter=false,throwDealloc=false,unrestorable=false}={}) {
  const memory=new WebAssembly.Memory({initial:1})
  let cursor=64, frees=0
  const exports={
    memory,
    exo_verlet_abi_version:()=>1,
    exo_verlet_alloc:len=>{const ptr=cursor;cursor+=len*8;return ptr},
    exo_verlet_dealloc:()=>{frees++;if(throwDealloc)throw Error('dealloc trap')},
    exo_verlet_integrate:(inputPtr,outputPtr,count)=>{
      const input=new Float64Array(memory.buffer,inputPtr,count*7)
      const output=new Float64Array(memory.buffer,outputPtr,count*6)
      for(let i=0;i<count;i++) {
        const k=i*7,j=i*6
        output.set([input[k]+1,input[k+1]+1,input[k+2]+1,
          input[k],input[k+1],input[k+2]],j)
      }
      return 1
    }
  }
  const instantiate=WebAssembly.instantiate
  WebAssembly.instantiate=async()=>({instance:{exports}})
  try {
    const bridge=await import(`../src/core/rustVerletKernel.js?mock=${Math.random()}`)
    assert.equal(await bridge.initializeRustVerletKernel({bytes:new Uint8Array([0])}),true)
    const vector=(x,y,z,bad=false)=>{
      const v={x,y,z,set(a,b,c) {
        this.x=a
        if(bad && throwSetter) {
          if(unrestorable)Object.defineProperty(this,'x',{value:a,writable:false,configurable:true})
          throw Error('setter trap')
        }
        this.y=b;this.z=c
      }}
      return v
    }
    const particles=[
      {invMass:1,position:vector(1,2,3),previous:vector(0,1,2)},
      {invMass:1,position:vector(5,6,7,true),previous:vector(4,5,6)}
    ]
    const before=particles.map(p=>[p.position.x,p.position.y,p.position.z,
      p.previous.x,p.previous.y,p.previous.z])
    if(unrestorable) assert.throws(()=>bridge.integrateRustVerletBatch(particles,.9,.1),/rollback failed/)
    else assert.equal(bridge.integrateRustVerletBatch(particles,.9,.1),!(throwSetter||throwDealloc))
    if((throwSetter||throwDealloc)&&!unrestorable) {
      assert.deepEqual(particles.map(p=>[p.position.x,p.position.y,p.position.z,
        p.previous.x,p.previous.y,p.previous.z]),before)
      assert.equal(bridge.rustVerletStatus().batches,0)
    }
    if(unrestorable) assert.equal(bridge.rustVerletStatus().batches,0)
    if(throwDealloc) {
      assert.equal(bridge.rustVerletStatus().backend,'javascript-fallback')
      assert.equal(bridge.integrateRustVerletBatch(particles,.9,.1),false)
    }
    assert.equal(frees,2)
  } finally {WebAssembly.instantiate=instantiate}
}

await runCase()
await runCase({throwSetter:true})
await runCase({throwDealloc:true})
await runCase({throwSetter:true,unrestorable:true})
console.log(JSON.stringify({pass:true,cases:4,checks:[
  'successful commit','throwing setter rollback','deallocator trap disables native before commit',
  'unrestorable setter prevents unsafe JS fallback']}))
