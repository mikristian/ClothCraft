import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {seamAllowancePreviewPoints} from '../src/core/patternAllowancePreview.js'
import {
  initializeRustAllowancePreviewKernel,
  rustAllowancePreviewKernelStatus,
} from '../src/core/rustAllowancePreviewKernel.js'

let seed=0xace011
const random=()=>{ seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2**32 }
const samples=[]
for(let k=0;k<700;k++){
  let x=0,y=0
  const path=[[x,y]]
  for(let j=0;j<2+Math.floor(random()*18);j++){
    if(random()<.11){path.push([...path.at(-1)]);continue}
    x+=(random()-.5)*.2;y+=(random()-.5)*.2
    path.push([x,y])
  }
  samples.push({path,width:.0005+random()*.04,limit:1+random()*6})
}
samples.push(
  {path:[[0,0],[.2,0],[.2,.2]],width:.01,limit:4},
  {path:[[0,0],[.2,0],[.001,.002]],width:.01,limit:4},
  {path:[[0,0],[0,0],[.1,0]],width:.015,limit:4},
  {path:[[0,0],[0,0]],width:.01,limit:4},
  {path:[[0,0],[NaN,1],[.1,.1]],width:.01,limit:4},
  {path:[[0,0],[.1,0]],width:-.01,limit:4},
)
const expected=samples.map(({path,width,limit})=>seamAllowancePreviewPoints(path,width,{miterLimit:limit}))
assert.equal(await initializeRustAllowancePreviewKernel({bytes:readFileSync('public/wasm/exo_allowance_preview_kernel.wasm')}),true)
assert.equal(rustAllowancePreviewKernelStatus().backend,'rust-wasm')
let vertices=0
for(let k=0;k<samples.length;k++){
  const {path,width,limit}=samples[k]
  const got=seamAllowancePreviewPoints(path,width,{miterLimit:limit})
  assert.equal(got.length,expected[k].length,`case ${k}: output count`)
  vertices+=got.length
  for(let j=0;j<got.length;j++)for(let d=0;d<2;d++){
    assert.ok(Math.abs(got[j][d]-expected[k][j][d])<=1e-9,
      `case ${k} vertex ${j}, coordinate ${d}: Rust ${got[j][d]} vs JS ${expected[k][j][d]}`)
  }
}
console.log(JSON.stringify({pass:true,backend:'rust-wasm',cases:samples.length,comparedCoordinates:2*vertices}))
