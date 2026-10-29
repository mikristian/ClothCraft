#!/usr/bin/env node
// ABI hardening regression tests without compiling or loading Rust/WASM.
// These mocks cannot establish actual Rust execution or numerical parity.
import assert from 'node:assert/strict'

const originalInstantiate = WebAssembly.instantiate
const block = 'event: change\ndata: {"x":1}'
const expected = {type:'change',wire:'{"x":1}'}
let checks = 0
const fresh = label => import(`../src/core/rustCollaborationSseKernel.js?abi-mock=${label}`)
const makeExports = (overrides={}) => {
  const memory = new WebAssembly.Memory({initial:1})
  let next = 32
  return {
    memory,
    exo_collaboration_sse_abi_version:()=>1,
    exo_collaboration_sse_alloc:()=>{const pointer=next;next+=256;return pointer},
    exo_collaboration_sse_dealloc:()=>{},
    exo_collaboration_sse_parse:(_input,_len,output)=>{
      new Uint8Array(memory.buffer,output,13).set(new TextEncoder().encode('change{"x":1}'))
      return 6
    },
    exo_collaboration_sse_data_length:()=>7,
    ...overrides,
  }
}
const mock = exports => {WebAssembly.instantiate=async()=>({instance:{exports}})}
try {
  const missing=makeExports()
  delete missing.exo_collaboration_sse_data_length
  mock(missing)
  const rejected=await fresh('missing-data-length')
  assert.equal(await rejected.initializeRustCollaborationSseKernel({bytes:new Uint8Array([0])}),false)
  assert.deepEqual(rejected.parseCollaborationSseBlock(block),expected)
  checks+=2

  mock(makeExports({exo_collaboration_sse_dealloc:()=>{throw Error('simulated trap')}}))
  const trapped=await fresh('dealloc-trap')
  assert.equal(await trapped.initializeRustCollaborationSseKernel({bytes:new Uint8Array([0])}),true)
  assert.deepEqual(trapped.parseCollaborationSseBlock(block),expected)
  assert.equal(trapped.rustCollaborationSseKernelStatus().backend,'javascript-fallback')
  checks+=3

  mock(makeExports({exo_collaboration_sse_parse:()=>Number.NaN}))
  const invalid=await fresh('nan-length')
  assert.equal(await invalid.initializeRustCollaborationSseKernel({bytes:new Uint8Array([0])}),true)
  assert.deepEqual(invalid.parseCollaborationSseBlock(block),expected)
  checks+=2

  console.log(JSON.stringify({status:'PASS',checks,
    note:'Mock ABI tests only; compiled Rust/WASM, browser and packaging not tested'}))
}finally {
  WebAssembly.instantiate=originalInstantiate
}
