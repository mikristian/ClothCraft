import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {composeSvgMatrices,transformSvgPoints,initializeRustSvgAffineKernel,rustSvgAffineKernelStatus} from './rustSvgAffineKernel.js'
import {parseSvgPattern} from './svgPatternImport.js'

test('synchronous fallback and seeded WASM parity preserve IEEE values',async()=>{
  assert.equal(rustSvgAffineKernelStatus().backend,'javascript-fallback')
  assert.throws(()=>parseSvgPattern('<svg/>'),{message:'SVG pattern import needs the browser editor'})
  let seed=0x190019
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
  const special=[-Infinity,Infinity,NaN,-0,0,-1,1,1e308,1e-308]
  const cases=[]
  for(let i=0;i<3000;i++){
    const value=()=>i<300?special[Math.floor(random()*special.length)]:(random()-.5)*100
    const angle=random()*Math.PI*2
    const matrices=[
      [1,0,0,1,value(),value()], [value(),0,0,value(),0,0],
      [Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0],
      Array.from({length:6},value),
    ]
    let chain=[1,0,0,1,0,0]
    const stages=matrices.map(m=>{chain=composeSvgMatrices(chain,m);return chain})
    const points=Array.from({length:5},()=>({x:value(),y:value()})),scale=value()
    cases.push({matrices,stages,points,scale,expected:transformSvgPoints(chain,points,scale)})
  }
  assert.equal(await initializeRustSvgAffineKernel({bytes:new Uint8Array([0])}),false)
  assert.equal(rustSvgAffineKernelStatus().backend,'javascript-fallback')
  assert.deepEqual(composeSvgMatrices([1,0,0,1,2,3],[2,0,0,-1,0,0]),[2,0,0,-1,2,3])
  assert.equal(await initializeRustSvgAffineKernel({bytes:await readFile('public/wasm/exo_svg_affine_kernel.wasm')}),true,rustSvgAffineKernelStatus().error)
  assert.equal(rustSvgAffineKernelStatus().backend,'rust-wasm')
  for(const c of cases){
    let chain=[1,0,0,1,0,0]
    c.matrices.forEach((m,i)=>{chain=composeSvgMatrices(chain,m);assert.deepEqual(chain,c.stages[i])})
    assert.deepEqual(transformSvgPoints(chain,c.points,c.scale),c.expected)
  }
})
