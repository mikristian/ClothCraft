import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {curveChordCoordinates,preciseCurveEdit} from '../src/core/draftingPrecision.js'
import {initializeRustPrecisionChordKernel,rustPrecisionChordStatus} from '../src/core/rustPrecisionChordKernel.js'

let seed=0x20c0c0de
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const fixtures=[]
for(let i=0;i<2048;i++){
  const a={x:(random()-.5)*500,y:(random()-.5)*500}
  const b={x:a.x+(random()-.5)*200,y:a.y+(random()-.5)*200}
  const control={x:(random()-.5)*500,y:(random()-.5)*500}
  const along=(random()-.5)*80,depth=(random()-.5)*80
  fixtures.push({a,b,control,along,depth})
}
fixtures.push(
  {a:{x:0,y:0},b:{x:10,y:0},control:{x:7.5,y:6},along:2.5,depth:6},
  {a:{x:0,y:0},b:{x:0,y:10},control:{x:-3,y:7},along:2,depth:3},
  {a:{x:0,y:0},b:{x:0,y:0},control:{x:5,y:1},along:0,depth:0},
  {a:{x:0,y:0},b:{x:.000999999999,y:0},control:{x:0,y:1},along:0,depth:3},
  {a:{x:0,y:0},b:{x:.001000000001,y:0},control:{x:0,y:1},along:0,depth:3},
  {a:{x:0,y:0},b:{x:10,y:0},control:{x:0,y:1},along:Infinity,depth:3},
  {a:{x:0,y:0},b:{x:10,y:0},control:{x:0,y:1},along:'2.5',depth:'6'},
)
const capture=fn=>{try{return{ok:true,value:fn()}}catch(error){return{ok:false,type:error.constructor.name,message:error.message}}}
const inspect=({a,b,control,along,depth})=>{
  const piece={id:'fixture',points:[a,b,{x:a.x-5,y:a.y+5}],curves:{},locked:false}
  return {forward:capture(()=>curveChordCoordinates(a,control,b)),
    inverse:capture(()=>preciseCurveEdit(piece,0,{mode:'chord',alongCm:along,depthCm:depth}))}
}
const before=fixtures.map(inspect)
assert.equal(rustPrecisionChordStatus().backend,'javascript-fallback')
assert.equal(await initializeRustPrecisionChordKernel({bytes:readFileSync('public/wasm/exo_precision_chord_kernel.wasm')}),true)
assert.equal(rustPrecisionChordStatus().backend,'rust-wasm')
const after=fixtures.map(inspect)
let maxDiff=0
for(let i=0;i<fixtures.length;i++)for(const key of ['forward','inverse']){
  const a=before[i][key],b=after[i][key]
  assert.equal(a.ok,b.ok,`case ${i}: ${key} success changed`)
  if(!a.ok){assert.deepEqual(b,a,`case ${i}: ${key} error changed`);continue}
  assert.deepEqual(Object.keys(b.value),Object.keys(a.value))
  for(const name of Object.keys(a.value)){
    const difference=Math.abs(b.value[name]-a.value[name])
    maxDiff=Math.max(maxDiff,difference)
    assert.ok(difference<=1e-12*Math.max(1,Math.abs(a.value[name])),`case ${i} ${key}.${name} ${difference}`)
  }
}
console.log(JSON.stringify({pass:true,backend:rustPrecisionChordStatus().backend,seed:'0x20c0c0de',fixtures:fixtures.length,operations:fixtures.length*2,maxCoordinateDifference:maxDiff,exactErrors:true,sourceMutation:false}))
