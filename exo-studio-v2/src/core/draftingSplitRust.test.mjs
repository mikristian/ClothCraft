import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { draftingSplitFractions, splitParameterAtArcFraction } from './draftingSplit.js'
import { quadraticAtLengthFraction } from './draftingPrecision.js'
import { initializeRustSplitKernel, rustSplitKernelReady, rustSplitKernelStatus } from './rustSplitKernel.js'

const piece={
  points:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
  curves:{0:{cx:18,cy:20}},
}
const straight={...piece,curves:{}}
const close=(actual,expected,tolerance=3e-8)=>{
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=tolerance,
    `Rust split ${actual} != JS ${expected} (tolerance ${tolerance})`)
}

test('live drafting Split Line uses Rust WASM with previous JS behavior preserved',async()=>{
  assert.equal(rustSplitKernelReady(),false)
  assert.equal(rustSplitKernelStatus().backend,'javascript-fallback')
  const methods=[
    {method:'uniform',count:4},
    {method:'uniform',count:12},
    {method:'length',lengthCm:5},
    {method:'ratio',ratioPercent:30},
    {method:'ratio',ratioPercent:'25'},
  ]
  const before=methods.map(opts=>draftingSplitFractions(straight,0,opts))
  const curvedBefore=[0.05,0.1,0.25,0.5,0.75,0.9,0.95].map(f=>splitParameterAtArcFraction(piece,0,f))
  const invalid=[
    [{method:'uniform',count:13},'Use 2 to 12 equal-length segments'],
    [{method:'length',lengthCm:25},'Split position must lie between 5% and 95% of the edge length'],
    [{method:'length',lengthCm:''},'Enter a finite edge distance in centimeters'],
    [{method:'ratio',ratioPercent:'foo'},'Enter a finite edge percentage'],
    [{method:'unknown'},'Unknown split mode'],
  ]
  const expectedErrors=invalid.map(([opts,message])=>{
    assert.throws(()=>draftingSplitFractions(straight,0,opts),{message})
    return message
  })

  const bytes=readFileSync(new URL('../../public/wasm/exo_split_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustSplitKernel({bytes}),true,JSON.stringify(rustSplitKernelStatus()))
  assert.equal(rustSplitKernelStatus().backend,'rust-wasm')
  assert.equal(rustSplitKernelStatus().abiVersion,1)
  methods.forEach((opts,i)=>{
    const after=draftingSplitFractions(straight,0,opts)
    assert.deepEqual(after,before[i],JSON.stringify(opts))
  })
  for(const [index,fraction] of [0.05,0.1,0.25,0.5,0.75,0.9,0.95].entries()) {
    close(splitParameterAtArcFraction(piece,0,fraction),curvedBefore[index])
  }
  assert.equal(splitParameterAtArcFraction(straight,0,0.3),0.3)
  invalid.forEach(([opts],index)=>assert.throws(()=>draftingSplitFractions(straight,0,opts),{message:expectedErrors[index]}))

  // Several asymmetric quadratics ensure Rust arc-length inversion, not a
  // chord length shortcut, is used for the actual curved-edge split.
  for(const control of [{x:-30,y:50},{x:40,y:-65},{x:5,y:0.01},{x:10,y:40}]) {
    const altered={...piece,curves:{0:{cx:control.x,cy:control.y}}}
    for(const fraction of [0.07,0.2,0.37,0.63,0.8,0.94]) {
      const expected=quadraticAtLengthFraction(piece.points[0],control,piece.points[1],fraction).parameter
      close(splitParameterAtArcFraction(altered,0,fraction),expected)
    }
  }
})
