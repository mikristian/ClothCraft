import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {placePatternLabel} from './patternLabelPlacement.js'
import {initializeRustLabelLayoutKernel} from './rustLabelLayoutKernel.js'

const midpoint=[50,50],normal=[1,0],bounds=[0,0,200,150]
const place=points=>placePatternLabel(midpoint,normal,'side seam',1,points,bounds)

test('missing obstacle vertices do not crash the 2D readout layout',()=>{
  const valid=[[51,51],[90,70]]
  const malformed=[null,valid[0],undefined,valid[1]]
  const before=malformed.slice()
  assert.deepEqual(place(malformed),place(valid))
  assert.deepEqual(malformed,before,'view-only layout must not edit source obstacle arrays')
})

test('nonfinite and malformed obstacle coordinates are excluded consistently',()=>{
  const valid=[[51,51],[90,70]]
  const malformed=[[NaN,0],[Infinity,0],[1,-Infinity],[1],{},valid[0],valid[1]]
  assert.deepEqual(place(malformed),place(valid))
})

test('valid obstacle collision and empty-obstacle behavior remain unchanged',()=>{
  const valid=[[70,50],[70,50],[90,70]]
  const result=place(valid)
  assert.ok(Number.isFinite(result.x)&&Number.isFinite(result.y))
  assert.ok(Number.isInteger(result.collisions)&&result.collisions>=0)
  assert.deepEqual(place([null,undefined]),place([]))
})

test('compiled Rust label layout receives the same filtered obstacle set',async()=>{
  const valid=[[51,51],[90,70]]
  const fallback=place(valid)
  const bytes=readFileSync(new URL('../../public/wasm/exo_label_layout_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustLabelLayoutKernel({bytes}),true)
  const malformed=[null,valid[0],[NaN,2],undefined,valid[1],[Infinity,0]]
  assert.deepEqual(place(malformed),place(valid))
  const placed=place(valid)
  assert.deepEqual(placed,fallback,'compiled Rust and JS fallback must agree on valid layout')
  assert.ok(Number.isFinite(placed.x)&&Number.isFinite(placed.y))
  assert.ok(Number.isInteger(placed.collisions)&&placed.collisions>=0)
})
