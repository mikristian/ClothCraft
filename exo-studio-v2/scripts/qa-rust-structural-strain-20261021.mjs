import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustStructuralStrainKernel,accumulateRustStructuralStrain,rustStructuralStrainKernelStatus} from '../src/core/rustStructuralStrainKernel.js'
let seed=321
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const base=Array.from({length:2200},()=>({position:{x:random(),y:random(),z:random()},strain:0,strainSamples:0}))
const edges=Array.from({length:14000},(_,i)=>({a:Math.floor(random()*base.length),b:Math.floor(random()*base.length),rest:i%9===0?0:random()+.00001,type:i%13===0?'seam':'structural'}))
function construct(){const p=base.map(v=>({...v,position:{...v.position}}));return {pieces:new Map([['test',{particles:p}]]),constraints:edges.map(e=>({...e,a:p[e.a],b:p[e.b]})),strain:null}}
function legacy(sim){for(const p of sim.pieces.get('test').particles){p.strain=0;p.strainSamples=0}let total=0,max=0,samples=0
  for(const c of sim.constraints){if(c.type!=='structural'||c.rest<=1e-6)continue
    const dx=c.a.position.x-c.b.position.x,dy=c.a.position.y-c.b.position.y,dz=c.a.position.z-c.b.position.z
    const current=Math.sqrt(dx*dx+dy*dy+dz*dz),strain=Math.abs(current-c.rest)/c.rest
    c.a.strain+=strain;c.b.strain+=strain;c.a.strainSamples++;c.b.strainSamples++;total+=strain;max=Math.max(max,strain);samples++}
  for(const p of sim.pieces.get('test').particles)if(p.strainSamples>0)p.strain/=p.strainSamples
  sim.strain={average:samples?total/samples:0,max}
}
const old=construct(),native=construct()
assert.equal(accumulateRustStructuralStrain(native,1e-6),false)
assert.equal(await initializeRustStructuralStrainKernel({bytes:readFileSync('public/wasm/exo_structural_strain_kernel.wasm')}),true)
legacy(old)
assert.equal(accumulateRustStructuralStrain(native,1e-6),true)
let maxError=0
for(let i=0;i<base.length;i++){const a=old.pieces.get('test').particles[i],b=native.pieces.get('test').particles[i];assert.equal(a.strainSamples,b.strainSamples)
  const error=Math.abs(a.strain-b.strain);maxError=Math.max(maxError,error);assert.ok(error<=2e-13,`particle ${i}: ${error}`)}
for(const field of ['average','max']){const error=Math.abs(old.strain[field]-native.strain[field]);maxError=Math.max(maxError,error);assert.ok(error<=2e-13,`${field}: ${error}`)}
const invalid=construct();invalid.constraints[45].rest=NaN
const before=invalid.pieces.get('test').particles.map(p=>({...p}))
assert.equal(accumulateRustStructuralStrain(invalid,1e-6),false)
assert.deepEqual(invalid.pieces.get('test').particles,before)
assert.equal(invalid.strain,null)
const outsider=construct();outsider.constraints[1].a={position:{x:0,y:0,z:0}}
assert.equal(accumulateRustStructuralStrain(outsider,1e-6),false)
const duplicate=construct();duplicate.pieces.get('test').particles.push(duplicate.pieces.get('test').particles[0])
assert.equal(accumulateRustStructuralStrain(duplicate,1e-6),false)
console.log(JSON.stringify({pass:true,constraints:edges.length,particles:base.length,maxError,status:rustStructuralStrainKernelStatus()}))
