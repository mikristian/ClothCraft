import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustConstructionKernel,rustConstructionKernelReady} from '../src/core/rustConstructionKernel.js'
import {lineIntersection,projectOntoLine,pointAlongLine,mirrorPointAcrossLine,preciseConstructionEdit} from '../src/core/draftingConstructions.js'

const a={x:-7.5,y:2.25},b={x:19.125,y:-3.5},c={x:3.125,y:-20},d={x:12.5,y:18}
const fixtures=[]
for(const p of [{x:3,y:4},{x:-11,y:2.5},{x:0,y:0},{x:120,y:-90}]){
 fixtures.push({label:'intersection',run:()=>lineIntersection(a,b,c,d)})
 fixtures.push({label:'projection',run:()=>projectOntoLine(p,a,b)})
 fixtures.push({label:'mirror',run:()=>mirrorPointAcrossLine(p,a,b)})
 for(const distance of [-40,-0.5,0,0.5,17]){
  fixtures.push({label:'along',run:()=>pointAlongLine(a,b,distance)})
  fixtures.push({label:'normal',run:()=>pointAlongLine(a,b,distance,{perpendicular:true})})
 }
}
const expected=fixtures.map(f=>f.run())
const bytes=readFileSync(new URL('../public/wasm/exo_construction_kernel.wasm',import.meta.url))
assert.equal(await initializeRustConstructionKernel({bytes}),true)
assert.equal(rustConstructionKernelReady(),true)
fixtures.forEach((f,i)=>{
 const actual=f.run()
 for(const axis of ['x','y'])assert.ok(Math.abs(actual[axis]-expected[i][axis])<=1e-10*Math.max(1,Math.abs(expected[i][axis])),`${f.label} #${i} ${axis}: ${actual[axis]} != ${expected[i][axis]}`)
})
const zero={x:0,y:0}
assert.throws(()=>lineIntersection(zero,{x:10,y:0},{x:0,y:1},{x:10,y:1}),/parallel or coincident/)
assert.throws(()=>projectOntoLine(zero,zero,zero),/zero length/)
assert.throws(()=>mirrorPointAcrossLine(zero,zero,zero),/zero length/)
assert.throws(()=>pointAlongLine(zero,zero,1),/zero length/)
const piece={id:'fixture',points:[zero,{x:10,y:0},{x:10,y:10},{x:0,y:10},{x:3,y:4,id:'target'}],curves:{}}
const before=JSON.stringify(piece)
const result=preciseConstructionEdit(piece,4,{construction:'mirror',a:1,b:2})
assert.equal(result.id,'target')
assert.ok(Math.abs(result.y+4)<1e-10)
assert.equal(JSON.stringify(piece),before)
console.log(`Rust construction WASM parity passed: ${fixtures.length} geometry cases, validation and production edit`)
