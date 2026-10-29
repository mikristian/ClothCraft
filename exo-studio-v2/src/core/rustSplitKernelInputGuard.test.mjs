import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  initializeRustSplitKernel,rustSplitUniformFractions,
  rustSplitSingleFraction,rustSplitQuadraticParameter,
} from './rustSplitKernel.js'

test('split WASM adapter fails closed on invalid subdivision counts without allocating',async()=>{
  const bytes=readFileSync(new URL('../../public/wasm/exo_split_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustSplitKernel({bytes}),true)
  for(const count of [NaN,Infinity,-Infinity,0,1,1.5,2.5,13,1e9,'4',null]){
    assert.equal(rustSplitUniformFractions(count),null,`invalid count ${String(count)}`)
  }
  assert.deepEqual(rustSplitUniformFractions(4),[.25,.5,.75])
})

test('split WASM adapter rejects invalid ratio, length and curve parameters',async()=>{
  const bytes=readFileSync(new URL('../../public/wasm/exo_split_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustSplitKernel({bytes}),true)
  for(const [method,value,length] of [
    ['length',5,0],['length',5,-2],['length',Infinity,20],
    ['length',-1,20],['length',25,20],['ratio',NaN,20],
    ['ratio',-1,20],['ratio',101,20],['unknown',50,20],
  ])assert.equal(rustSplitSingleFraction(method,value,length),null)
  assert.ok(Math.abs(rustSplitSingleFraction('length',5,20)-.25)<1e-12)
  assert.ok(Math.abs(rustSplitSingleFraction('ratio',25,20)-.25)<1e-12)
  const a={x:0,y:0},control={x:5,y:10},b={x:20,y:0}
  for(const fraction of [NaN,Infinity,-.01,1.01])assert.equal(rustSplitQuadraticParameter(a,control,b,fraction),null)
  assert.equal(rustSplitQuadraticParameter({x:NaN,y:0},control,b,.5),null)
  const t=rustSplitQuadraticParameter(a,control,b,.5)
  assert.ok(Number.isFinite(t)&&t>=0&&t<=1)
})
