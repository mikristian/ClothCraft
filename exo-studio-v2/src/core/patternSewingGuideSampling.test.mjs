import test from 'node:test'
import assert from 'node:assert/strict'
import {samplePatternSewingGuideIndices as sample} from './patternSewingGuideSampling.js'
import {readFile} from 'node:fs/promises'
import {
  initializeRustSewingGuideKernel,rustSewingGuideKernelReady,
  rustSewingGuideKernelStatus,
} from './rustSewingGuideKernel.js'

const originalSample=(count,emphasized=false)=>{
  if(!Number.isSafeInteger(count)||count<=0)return []
  const size=Math.min(count,emphasized?48:12)
  if(size===1)return [0]
  return Array.from({length:size},(_,i)=>Math.round(i*(count-1)/(size-1)))
}

test('short and incomplete sewing guide collections preserve true endpoints',()=>{
  assert.deepEqual(sample(0),[])
  assert.deepEqual(sample(1),[0])
  assert.deepEqual(sample(2),[0,1])
  assert.deepEqual(sample(3),[0,1,2])
  assert.deepEqual(sample(10),Array.from({length:10},(_,i)=>i))
  for(const value of [-1,NaN,1.5,Infinity])assert.deepEqual(sample(value),[])
})

test('ambient guides are bounded, evenly spread and preserve terminal pairing',()=>{
  for(const count of [13,17,35,120,250]){
    const indices=sample(count)
    assert.equal(indices.length,12)
    assert.equal(indices[0],0)
    assert.equal(indices.at(-1),count-1)
    assert.equal(new Set(indices).size,indices.length)
    const gaps=indices.slice(1).map((n,i)=>n-indices[i])
    assert.ok(Math.max(...gaps)-Math.min(...gaps)<=1)
  }
})

test('highlighted guides retain more correspondence detail without repainting full dense seam',()=>{
  for(const count of [2,16,48,49,100,1000]){
    const indices=sample(count,{emphasized:true})
    assert.equal(indices.length,Math.min(count,48))
    assert.equal(indices[0],0)
    assert.equal(indices.at(-1),count-1)
    assert.ok(indices.every((index,i)=>Number.isInteger(index)&&index<count&&
      (i===0||index>indices[i-1])))
    assert.deepEqual(indices,sample(count,{emphasized:true}))
    assert.ok(indices.length>=sample(count).length)
  }
})

test('compiled Rust WASM matches original JS sampling including dense and extreme counts',async()=>{
  assert.equal(rustSewingGuideKernelReady(),false)
  const wasm=await readFile('public/wasm/exo_sewing_guide_kernel.wasm')
  assert.equal(await initializeRustSewingGuideKernel({bytes:wasm}),true,rustSewingGuideKernelStatus().error)
  assert.equal(rustSewingGuideKernelStatus().backend,'rust-wasm')
  let seed=0x5eadab1e
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const counts=[-1,0,NaN,Infinity,-Infinity,1.5,1,2,3,10,11,12,13,17,35,47,48,49,100,
    1000,1000000,2**31-1,2**32,2**40,Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER]
  for(let i=0;i<2500;i++)counts.push(Math.floor(random()*10000000)+1)
  for(const count of counts){
    for(const emphasized of [false,true]){
      const expected=originalSample(count,emphasized)
      const actual=sample(count,{emphasized})
      assert.deepEqual(actual,expected,`count=${count} emphasized=${emphasized}`)
    }
  }
})
