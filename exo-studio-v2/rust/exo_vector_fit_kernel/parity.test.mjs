import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustVectorFitKernel,rustVectorFitKernelReady,rustSegmentErrorSquared} from '../../src/core/rustVectorFitKernel.js'
import {fitPencilStroke} from '../../src/core/vectorFreehandFit.js'

const bytes=readFileSync(new URL('./target/wasm32-unknown-unknown/release/exo_vector_fit_kernel.wasm',import.meta.url))
const segmentJs=(p,a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy
  if(length2===0)return(p.x-a.x)**2+(p.y-a.y)**2
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length2))
  return(p.x-a.x-dx*t)**2+(p.y-a.y-dy*t)**2
}

test('WASM numeric kernel matches JavaScript segment projection',async()=>{
  assert.equal(rustVectorFitKernelReady(),false)
  assert.equal(await initializeRustVectorFitKernel({bytes}),true)
  const seed=123456
  let state=seed
  const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296-.5)*8
  for(let i=0;i<500;i++){
    const a={x:rng(),y:rng()},b=i%17===0?a:{x:rng(),y:rng()},p={x:rng(),y:rng()}
    const actual=rustSegmentErrorSquared(p,a,b),expected=segmentJs(p,a,b)
    assert.ok(Math.abs(actual-expected)<=Math.max(1e-12,Math.abs(expected)*1e-13),`${i}: ${actual} != ${expected}`)
  }
})

test('WASM-backed production pencil stroke preserves existing output',()=>{
  const points=Array.from({length:1000},(_,i)=>({x:i/1000,y:.05*Math.sin(i)}))
  const output=fitPencilStroke(points,{toleranceM:0})
  assert.ok(output.length<=64)
  assert.deepEqual(output[0],points[0])
  assert.deepEqual(output.at(-1),points.at(-1))
  assert.deepEqual(fitPencilStroke([{x:0,y:0},{x:0.05,y:0.0005},{x:0.1,y:0}]),[{x:0,y:0},{x:0.1,y:0}])
  assert.deepEqual(fitPencilStroke([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:0}],{closed:true}),[{x:0,y:0},{x:1,y:0},{x:1,y:1}])
})
