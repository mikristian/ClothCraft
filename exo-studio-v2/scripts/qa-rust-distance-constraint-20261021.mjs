import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {initializeRustDistanceConstraintKernel,projectRustDistanceConstraint,rustDistanceConstraintStatus} from '../src/core/rustDistanceConstraintKernel.js'

let seed=0x31d157a
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const scalar=()=>random()<.05?[0,1e-8,1e-6,-1,NaN,Infinity,-Infinity][Math.floor(random()*7)]:(random()-.5)*10
const samples=Array.from({length:4500},(_,i)=>({
  a:{x:scalar(),y:scalar(),z:scalar(),mass:[0,1,2,3,.0000001,-1][i%6]},
  b:{x:scalar(),y:scalar(),z:scalar(),mass:[1,0,1,2,.0000001,3][i%6]},
  rest:scalar(),stiffness:scalar(),type:['structural','seam','fuse'][i%3]}))
samples.push({a:{x:0,y:0,z:0,mass:1},b:{x:2,y:0,z:0,mass:1},rest:1,stiffness:1,type:'structural'})
samples.push({a:{x:0,y:0,z:0,mass:1},b:{x:2,y:0,z:0,mass:1},rest:1,stiffness:1,type:'fuse'})
samples.push({a:{x:0,y:0,z:0,mass:1},b:{x:1e-10,y:0,z:0,mass:1},rest:1,stiffness:1,type:'seam'})

const make=(sample)=>({type:sample.type,rest:sample.rest,stiffness:sample.stiffness,
  a:{invMass:sample.a.mass,position:new THREE.Vector3(sample.a.x,sample.a.y,sample.a.z)},
  b:{invMass:sample.b.mass,position:new THREE.Vector3(sample.b.x,sample.b.y,sample.b.z)}})
const original=(c)=>{
  const {a,b,rest,stiffness}=c,wa=a.invMass,wb=b.invMass,total=wa+wb
  if(total<=1e-6)return
  const delta=b.position.clone().sub(a.position)
  const length=delta.length()
  if(length<=1e-6)return
  const error=(length-rest)/length
  const correction=delta.multiplyScalar(error*stiffness)
  if(c.type==='fuse'){if(wa>0)a.position.add(correction);return}
  if(wa>0)a.position.addScaledVector(correction,wa/total)
  if(wb>0)b.position.addScaledVector(correction,-wb/total)
}
const reference=samples.map(s=>{const c=make(s);original(c);return [...c.a.position.toArray(),...c.b.position.toArray()]})
assert.equal(rustDistanceConstraintStatus().backend,'javascript-fallback')
assert.equal(await initializeRustDistanceConstraintKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustDistanceConstraintKernel({bytes:readFileSync('public/wasm/exo_distance_constraint_kernel.wasm')}),true)
assert.equal(rustDistanceConstraintStatus().backend,'rust-wasm')
let maxDifference=0,exact=0,fallback=0
for(let i=0;i<samples.length;i++){
  const constraint=make(samples[i])
  if(!projectRustDistanceConstraint(constraint)) {original(constraint);fallback++}
  const actual=[...constraint.a.position.toArray(),...constraint.b.position.toArray()]
  for(let j=0;j<6;j++){
    const expected=reference[i][j],received=actual[j]
    if(Number.isNaN(expected)){assert.ok(Number.isNaN(received),`case ${i} axis ${j} NaN`);continue}
    if(!Number.isFinite(expected)){assert.equal(received,expected,`case ${i} axis ${j}`);continue}
    const diff=Math.abs(expected-received)
    maxDifference=Math.max(maxDifference,diff)
    if(Object.is(expected,received))exact++
    assert.ok(diff<=1e-12*Math.max(1,Math.abs(expected)),`case ${i} axis ${j}: ${diff}`)
  }
}
console.log(JSON.stringify({pass:true,backend:rustDistanceConstraintStatus().backend,
  cases:samples.length,scalarComparisons:samples.length*6,maxDifference,exactScalars:exact,
  fallbackCases:fallback,wasmCalls:rustDistanceConstraintStatus().calls,solverCertified:false}))
