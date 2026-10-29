import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planDraftPointDeletion, deletedPointEdgeIndex } from '../src/core/draftingPointDeletion.js'
import { initializeRustGeometryKernel, rustDeletionTopologyValid } from '../src/core/rustGeometryKernel.js'

let seed=8008
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const fixtures=[]
for(let trial=0;trial<180;trial++) {
  const count=4+trial%8
  const piece={points:Array.from({length:count},(_,i)=>{
    const angle=i/count*Math.PI*2, radius=2+random()*10
    return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,id:`p${i}`,grading:{x:i}}
  }),curves:{},notches:[],topstitches:[],bindings:[],zippers:[]}
  if(trial%2) piece.curves[trial%count]={cx:(random()-.5)*50,cy:(random()-.5)*50,id:'curve'}
  if(trial%7===0) piece.points[2]={...piece.points[0]}
  if(trial%11===0) piece.points[2].x=Infinity
  if(trial%13===0) piece.curves[2]={cx:NaN,cy:0}
  if(trial%17===0) piece.locked=true
  for(const key of ['notches','topstitches','bindings','zippers']) {
    if(random()<.15)piece[key]=[{id:key,edgeIndex:trial%count}]
  }
  for(let point=-1;point<=count;point++) fixtures.push([piece,point])
}
fixtures.push([null,0],[{points:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]},1])
function outcome(piece,index){
  const before=structuredClone(piece)
  let result
  try { result=planDraftPointDeletion(piece,index) }
  catch(error) {
    assert.deepEqual(piece,before)
    return {error:error.message}
  }
  assert.deepEqual(piece,before)
  for(const p of result.points) assert.ok(piece.points.includes(p),'retain point identity')
  for(const curve of Object.values(result.curves)) assert.ok(Object.values(piece.curves).includes(curve),'retain curve identity')
  return {result}
}
const expected=fixtures.map(args=>outcome(...args))
const mappings=[]
for(let n=4;n<16;n++)for(let p=0;p<n;p++)for(const e of [-1,NaN,Infinity,.5,...Array.from({length:n+1},(_,i)=>i)])
  mappings.push([e,p,n,deletedPointEdgeIndex(e,p,n)])
assert.equal(await initializeRustGeometryKernel({bytes:readFileSync(new URL('../public/wasm/exo_geometry_kernel.wasm',import.meta.url))}),true)
assert.equal(rustDeletionTopologyValid({points:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]}),true,'new WASM exports required')
fixtures.forEach((args,i)=>assert.deepEqual(outcome(...args),expected[i],`fixture ${i}`))
for(const [e,p,n,result] of mappings)assert.equal(deletedPointEdgeIndex(e,p,n),result)
console.log(`PASS: ${fixtures.length} fallback/WASM deletion plans, ${mappings.length} edge mappings; exact errors, metadata identity and source immutability`)
