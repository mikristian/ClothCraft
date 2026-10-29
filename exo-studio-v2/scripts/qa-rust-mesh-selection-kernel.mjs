import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustMeshSelectionKernel,rustMeshSelectionKernelReady} from '../src/core/rustMeshSelectionKernel.js'
import {mergeMeshFaceSelection as select} from '../src/core/meshSelection.js'
const wasm=readFileSync('public/wasm/exo_mesh_selection_kernel.wasm')
const fixtures=[
  [null,'front',3,{a:0,b:1,c:2},false],
  [null,'front',7,{a:1,b:2,c:4},true],
  [null,'back',2,{a:5,b:6,c:7},true],
  [null,'front',4,{a:6,b:2,c:6},false],
]
let state=null
for(let i=0;i<300;i++){
  const faceIndex=(i*13)%29
  const face={a:(i*3)%17,b:(i+7)%17,c:(i+3)%17}
  fixtures.push([null,i%7===0?'back':'front',faceIndex,face,i%11!==0])
}
function run(){
  let s=state
  const results=[]
  for(const [,piece,index,face,add] of fixtures){s=select(s,piece,index,face,add);results.push(s)}
  // Includes removal to empty, duplicate vertices, piece switch and invalid selection.
  let a=select(null,'x',8,{a:9,b:9,c:3})
  results.push(a)
  a=select(a,'x',8,{a:9,b:9,c:3},true)
  results.push(a)
  results.push(select(null,'x',-1,{a:0,b:1,c:2}))
  results.push(select(null,'x',2,{a:0.5,b:1,c:2}))
  return results
}
const baseline=run()
assert.equal(await initializeRustMeshSelectionKernel({bytes:wasm}),true)
assert.equal(rustMeshSelectionKernelReady(),true)
assert.deepEqual(run(),baseline)
console.log(`compiled WASM mesh selection differential: PASS (${baseline.length} transitions)`)
