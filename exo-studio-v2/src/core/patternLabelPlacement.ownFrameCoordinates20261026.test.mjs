import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {placePatternLabel} from './patternLabelPlacement.js'
import {initializeRustLabelLayoutKernel} from './rustLabelLayoutKernel.js'

const args=()=>[[50,50],[1,0],'side seam',1,[[51,51]],[0,0,200,150]]

for(const [label,index,coordinate] of [['midpoint',0,0],['normal',1,1],['bounds',5,2]]){
  test(`annotation frame rejects inherited ${label} coordinate`,()=>{
    const input=args()
    const inherited=input[index].slice()
    delete inherited[coordinate]
    const previous=Object.getOwnPropertyDescriptor(Array.prototype,String(coordinate))
    try {
      Object.defineProperty(Array.prototype,String(coordinate),{value:50,configurable:true,writable:true})
      input[index]=inherited
      assert.throws(()=>placePatternLabel(...input),RangeError)
    } finally {
      if(previous)Object.defineProperty(Array.prototype,String(coordinate),previous)
      else delete Array.prototype[coordinate]
    }
  })
}

for(const [label,index,coordinate] of [['midpoint',0,0],['normal',1,1],['bounds',5,2]]){
  test(`annotation frame rejects ${label} accessor without invoking getter`,()=>{
    const input=args()
    let getterCalls=0
    Object.defineProperty(input[index],coordinate,{configurable:true,get(){getterCalls++;return 50}})
    assert.throws(()=>placePatternLabel(...input),RangeError)
    assert.equal(getterCalls,0)
  })
}

test('ordinary and frozen data-coordinate frames preserve finite layout and inputs',()=>{
  const input=args()
  const expected=placePatternLabel(...input)
  Object.freeze(input[0]);Object.freeze(input[1]);Object.freeze(input[5])
  const result=placePatternLabel(...input)
  assert.deepEqual(result,expected)
  assert.ok([result.x,result.y,...Object.values(result.box)].every(Number.isFinite))
  assert.deepEqual(input[0],[50,50]);assert.deepEqual(input[1],[1,0]);assert.deepEqual(input[5],[0,0,200,150])
})

test('compiled Rust path also rejects accessor-backed frame without getter execution',async()=>{
  const bytes=readFileSync(new URL('../../public/wasm/exo_label_layout_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustLabelLayoutKernel({bytes}),true)
  const input=args()
  let getterCalls=0
  Object.defineProperty(input[5],0,{get(){getterCalls++;return 0}})
  assert.throws(()=>placePatternLabel(...input),RangeError)
  assert.equal(getterCalls,0)
  const valid=placePatternLabel(...args())
  assert.ok([valid.x,valid.y,...Object.values(valid.box)].every(Number.isFinite))
})
