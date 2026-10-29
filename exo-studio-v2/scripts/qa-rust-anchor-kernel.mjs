import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustAnchorKernel,projectRustAnchor,rustAnchorKernelStatus} from '../src/core/rustAnchorKernel.js'
let seed=34
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const vector=(x,y,z)=>({x,y,z,set(x,y,z){this.x=x;this.y=y;this.z=z},copy(p){return this.set(p.x,p.y,p.z)}})
const make=(axes,i)=>({axes,stiffness:rand(),particle:{invMass:1,position:vector(rand(),rand(),rand()),previous:vector(rand(),rand(),rand())},target:vector(rand(),rand(),rand())})
const clone=c=>({...c,particle:{...c.particle,position:vector(c.particle.position.x,c.particle.position.y,c.particle.position.z),previous:vector(c.particle.previous.x,c.particle.previous.y,c.particle.previous.z)}})
function old(c){const p=c.particle.position,v=c.particle.previous,t=c.target,s=c.stiffness
  const move=(k)=>{p[k]=(1-s)*p[k]+s*t[k];v[k]=p[k]}
  if(c.axes==='y')move('y');else if(c.axes==='x')move('x');else if(c.axes==='xz'){move('x');move('z')}else{for(const k of ['x','y','z'])p[k]+=(t[k]-p[k])*s;v.copy(p)}
}
assert.equal(projectRustAnchor(make('x')),false)
assert.equal(await initializeRustAnchorKernel({bytes:readFileSync('public/wasm/exo_anchor_kernel.wasm')}),true)
let maximum=0
for(let i=0;i<14000;i++){
  const c=make(['x','y','xz',null][i%4],i),a=clone(c),b=clone(c)
  old(a);assert.equal(projectRustAnchor(b),true)
  for(const k of ['x','y','z'])for(const key of ['position','previous']){
    const error=Math.abs(a.particle[key][k]-b.particle[key][k]);maximum=Math.max(maximum,error);assert.ok(error<=2e-15,`${i}:${key}.${k}: ${error}`)
  }
}
const invalid=make('xz');invalid.stiffness=NaN;const before=clone(invalid)
assert.equal(projectRustAnchor(invalid),false)
for(const field of ['position','previous'])for(const axis of ['x','y','z'])assert.equal(invalid.particle[field][axis],before.particle[field][axis])
console.log(JSON.stringify({pass:true,cases:14000,maxError:maximum,status:rustAnchorKernelStatus()}))
