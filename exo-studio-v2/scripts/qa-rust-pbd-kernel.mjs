import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRustPbdSweep, initializeRustPbdKernel } from '../src/core/rustPbdKernel.js'
// Independent scalar transcription of the original Three.Vector3 projection.
function old(c) {
  const {a,b,rest,stiffness}=c, wa=a.invMass, wb=b.invMass, total=wa+wb
  if(total<=1e-6)return
  const d=[b.position.x-a.position.x,b.position.y-a.position.y,b.position.z-a.position.z]
  const length=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2])
  if(length<=1e-6)return
  const scale=((length-rest)/length)*stiffness
  const correction=d.map(v=>v*scale)
  for(let j=0;j<3;j++) {
    const key=['x','y','z'][j]
    if(c.type==='fuse') {if(wa>0)a.position[key]+=correction[j]}
    else {
      if(wa>0)a.position[key]+=correction[j]*(wa/total)
      if(wb>0)b.position[key]+=correction[j]*(-wb/total)
    }
  }
}
const vector=(x,y,z)=>({x,y,z,set(x,y,z){this.x=x;this.y=y;this.z=z}})
let seed=32
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const particles=Array.from({length:2048},(_,i)=>({position:vector(random(),random(),random()),invMass:i%7?random()*2:0}))
const constraints=Array.from({length:12000},(_,i)=>({
  a:particles[Math.floor(random()*particles.length)],b:particles[Math.floor(random()*particles.length)],
  rest:i%13?random():0,stiffness:random(),type:i%11?'structural':'fuse',
}))
const clone=()=>{
  const p=particles.map(v=>({...v,position:vector(v.position.x,v.position.y,v.position.z)}))
  const refs=new Map(particles.map((v,i)=>[v,p[i]]))
  return {p,c:constraints.map(c=>({...c,a:refs.get(c.a),b:refs.get(c.b)}))}
}
const pre=clone(); assert.equal(createRustPbdSweep(pre.c)(false,old),false)
assert.equal(await initializeRustPbdKernel({bytes:readFileSync('public/wasm/exo_pbd_kernel.wasm')}),true)
let maxError=0
for(const reverse of [false,true]) {
  const a=clone(),b=clone(), sweep=createRustPbdSweep(b.c)
  for(let pass=0;pass<4;pass++) {
    for(let i=0;i<a.c.length;i++) old(a.c[reverse?a.c.length-1-i:i])
    assert.equal(sweep(reverse,old),true)
  }
  for(let i=0;i<a.p.length;i++)for(const key of ['x','y','z']) {
    const error=Math.abs(a.p[i].position[key]-b.p[i].position[key]); maxError=Math.max(maxError,error)
    assert.ok(error<=2e-13,`parity ${error}`)
  }
}
// Mixed dispatch is observable: mutate shared particles at each JS boundary.
for(const reverse of [false,true]) {
  const a=clone(),b=clone()
  for(const sample of [a,b])for(const i of [1,6000,11998]) sample.c[i]={...sample.c[i],type:i===6000?'surface-stitch':'seam-virtual',targetParticles:[sample.p[0]]}
  const dispatch=c=>{if(c.type==='seam-virtual'||c.type==='surface-stitch') c.a.position.x+=.125; else old(c)}
  for(let i=0;i<a.c.length;i++)dispatch(a.c[reverse?a.c.length-1-i:i])
  createRustPbdSweep(b.c)(reverse,dispatch)
  for(let i=0;i<a.p.length;i++)for(const key of ['x','y','z'])assert.ok(Math.abs(a.p[i].position[key]-b.p[i].position[key])<2e-13)
}
// Rust rejection must leave the run untouched before JS fallback.
const bad=clone();bad.c[500].rest=NaN
let calls=0
createRustPbdSweep(bad.c)(false,()=>calls++)
assert.equal(calls,12000)
assert.deepEqual(bad.p.map(p=>[p.position.x,p.position.y,p.position.z]),particles.map(p=>[p.position.x,p.position.y,p.position.z]))
for(const value of [undefined,Infinity,'0.5',null]) {
  const malformed=clone();malformed.c[100].stiffness=value
  let rejected=0
  createRustPbdSweep(malformed.c)(true,()=>rejected++)
  assert.equal(rejected,12000)
}
const changed=clone(), sweep=createRustPbdSweep(changed.c)
changed.c[0]={...changed.c[0],a:changed.p[1],b:changed.p[2]}
assert.equal(sweep(true,old),true)
assert.equal(sweep(false,old,clone().c),true)
// Finite inputs may overflow inside a native projection. This must not write
// a partially solved run back into authored particle objects.
const extreme=[
  {position:vector(-1e308,0,0),invMass:1},
  {position:vector(1e308,0,0),invMass:1},
]
const overflow=[{a:extreme[0],b:extreme[1],rest:0,stiffness:1,type:'structural'}]
let overflowFallback=0
assert.equal(createRustPbdSweep(overflow)(false,()=>overflowFallback++),true)
assert.equal(overflowFallback,1)
assert.equal(extreme[0].position.x,-1e308)
assert.equal(extreme[1].position.x,1e308)
console.log(JSON.stringify({pass:true,constraints:12000,forwardReversePasses:8,mixedDispatch:true,malformedAtomicFallback:true,overflowAtomicFallback:true,maxError}))
