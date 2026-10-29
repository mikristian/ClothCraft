import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolveSolverTimestep} from '../src/core/physics/timestep.js'
import {initializeRustTimestepKernel,rustTimestepStatus} from '../src/core/rustTimestepKernel.js'
const capture=f=>{try{return {value:f()}}catch(e){return {name:e.name,message:e.message}}}
let seed=27027;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const values=[undefined,null,0,-0,-1,-1.5,-.5,.5,1.5,2.5,3.5,4.5,6,14,NaN,Infinity,-Infinity,'','2.5','bad',true,false,1n,Symbol('step')]
const cases=[]
for(const substeps of values)for(const iterations of values)cases.push({settings:{substeps,iterations},dt:1/60,maxThickness:.002})
for(let i=0;i<3000;i++){const val=()=>random()<.15?values[Math.floor(random()*values.length)]:(random()-.5)*30;cases.push({settings:{gravity:random()<.08?NaN:random()*20,substeps:val(),iterations:val(),selfCollisionMargin:random()<.04?-1:random()*.03},dt:random()<.03?0:random()*.09,maxThickness:random()<.02?NaN:random()*.01})}
for(const dt of [0,-.1,NaN,Infinity,-Infinity,'0',null])for(const maxThickness of [NaN,-1,.002])cases.push({settings:{gravity:NaN,substeps:Symbol('unused')},dt,maxThickness})
const expected=cases.map(c=>capture(()=>resolveSolverTimestep(c.settings,c.dt,c.maxThickness)))
assert.equal(rustTimestepStatus().backend,'javascript-fallback')
assert.equal(await initializeRustTimestepKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustTimestepKernel({bytes:readFileSync('public/wasm/exo_timestep_kernel.wasm')}),true)
assert.equal(rustTimestepStatus().backend,'rust-wasm')
const equivalent=(a,b,label)=>{assert.deepEqual(Object.keys(a),Object.keys(b),label);if('message'in a){assert.equal(a.name,b.name,label);assert.equal(a.message,b.message,label);return}if(a.value===null){assert.equal(b.value,null,label);return}for(const key of Object.keys(a.value))assert.ok(Object.is(a.value[key],b.value[key]),`${label}.${key} ${String(a.value[key])} vs ${String(b.value[key])}`)}
cases.forEach((c,i)=>equivalent(expected[i],capture(()=>resolveSolverTimestep(c.settings,c.dt,c.maxThickness)),`case ${i}`))
console.log(JSON.stringify({pass:true,cases:cases.length,exact:true}))
