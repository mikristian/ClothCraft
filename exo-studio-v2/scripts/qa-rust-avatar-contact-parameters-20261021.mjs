import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {avatarContactParameters} from '../src/core/physics/avatarContactPass.js'
import {initializeRustAvatarContactParametersKernel,rustAvatarContactParametersStatus} from '../src/core/rustAvatarContactParametersKernel.js'
const capture=f=>{try{return {value:f()}}catch(e){return {name:e.name,message:e.message}}}
const values=[undefined,null,-1,0,-0,.002,.003,.1,NaN,Infinity,-Infinity,'0.003','foo','',true,false,1n]
const cases=[];let seed=2828;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
for(const thickness of values)for(const layerIndex of values)cases.push({project:{simulation:{collisionMargin:.012}},piece:{fabric:{thickness},layerIndex}})
for(let i=0;i<3000;i++)cases.push({project:{simulation:{collisionMargin:rnd()<.2?values[Math.floor(rnd()*values.length)]:(rnd()-.5)*.2}},piece:{fabric:{thickness:rnd()<.2?values[Math.floor(rnd()*values.length)]:rnd()*.05,friction:rnd()},layerIndex:rnd()<.2?values[Math.floor(rnd()*values.length)]:Math.floor(rnd()*8)}})
const expected=cases.map(c=>capture(()=>avatarContactParameters(c.project,c.piece)))
assert.equal(rustAvatarContactParametersStatus().backend,'javascript-fallback')
assert.equal(await initializeRustAvatarContactParametersKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustAvatarContactParametersKernel({bytes:readFileSync('public/wasm/exo_avatar_contact_parameters_kernel.wasm')}),true)
assert.equal(rustAvatarContactParametersStatus().backend,'rust-wasm')
cases.forEach((c,i)=>assert.deepEqual(capture(()=>avatarContactParameters(c.project,c.piece)),expected[i],`case ${i}`))
console.log(JSON.stringify({pass:true,cases:cases.length,exact:true}))
