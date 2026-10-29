import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pointFromPolar,polarFromPoints,precisePointEdit} from '../src/core/draftingPrecision.js'
import {initializeRustPrecisionPolarKernel,rustPrecisionPolarStatus} from '../src/core/rustPrecisionPolarKernel.js'
const capture=f=>{try{return {value:f()}}catch(e){return {error:e.message}}}
let seed=0x0242026
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const cases=[]
for(const angle of [-100000,-360,-270,-180,-90,-0,0,30,45,90,180,270,360,100000])for(const length of [0,-0,1e-12,.001,12.34,100000,-1])cases.push({anchor:{x:2.5,y:-1.25},length,angle})
for(let i=0;i<2500;i++)cases.push({anchor:{x:(random()-.5)*1e5,y:(random()-.5)*1e5},length:random()*1e5,angle:(random()-.5)*2e5})
for(const [length,angle,anchor] of [[-2,30,{x:0,y:0}],['',30,{x:0,y:0}],['nan',30,{x:0,y:0}],[20,Infinity,{x:0,y:0}],[20,30,{x:Infinity,y:0}],[20,30,{x:0,y:Infinity}],['15','-45',{x:'1',y:'2'}]])cases.push({anchor,length,angle})
const deltas=[]
for(const x of [-Infinity,-100000,-1e-308,-0,0,1e-308,100000,Infinity,NaN])for(const y of [-Infinity,-0,0,1e-308,100000,NaN])deltas.push({anchor:{x:0,y:0},point:{x,y}})
for(let i=0;i<2500;i++)deltas.push({anchor:{x:(random()-.5)*1e6,y:(random()-.5)*1e6},point:{x:(random()-.5)*1e6,y:(random()-.5)*1e6}})
const piece={points:[{x:0,y:0,id:'a',gradeRule:{x:1}},{x:10,y:0,id:'b'},{x:10,y:20},{x:0,y:20}],curves:{}}
const edits=cases.slice(0,150).map(c=>({...c,value:capture(()=>precisePointEdit(piece,1,{mode:'polar',lengthCm:c.length,angleDeg:c.angle}))}))
const expectedPoints=cases.map(c=>capture(()=>pointFromPolar(c.anchor,c.length,c.angle)))
const expectedDeltas=deltas.map(c=>capture(()=>polarFromPoints(c.anchor,c.point)))
assert.equal(rustPrecisionPolarStatus().backend,'javascript-fallback')
assert.equal(await initializeRustPrecisionPolarKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustPrecisionPolarKernel({bytes:readFileSync('public/wasm/exo_precision_polar_kernel.wasm')}),true)
assert.equal(rustPrecisionPolarStatus().backend,'rust-wasm')
const same=(a,b,label)=>{
  assert.deepEqual(Object.keys(a),Object.keys(b),label)
  if('error'in a)return assert.equal(b.error,a.error,label)
  for(const key of Object.keys(a.value))assert.ok(Object.is(a.value[key],b.value[key]),`${label}.${key} ${String(a.value[key])} / ${String(b.value[key])}`)
}
cases.forEach((c,i)=>same(expectedPoints[i],capture(()=>pointFromPolar(c.anchor,c.length,c.angle)),`point ${i}`))
deltas.forEach((c,i)=>same(expectedDeltas[i],capture(()=>polarFromPoints(c.anchor,c.point)),`inverse ${i}`))
edits.forEach((c,i)=>same(c.value,capture(()=>precisePointEdit(piece,1,{mode:'polar',lengthCm:c.length,angleDeg:c.angle})),`edit ${i}`))
console.log(JSON.stringify({pass:true,pointCases:cases.length,inverseCases:deltas.length,editCases:edits.length,exact:true}))
