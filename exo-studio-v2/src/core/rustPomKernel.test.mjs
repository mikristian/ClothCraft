import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {initializeRustPomKernel,rustPomLabelAnchor,rustPomKernelReady,rustPomKernelStatus} from './rustPomKernel.js'

const wasm=new URL('../../rust/exo_ui_kernel/target/wasm32-unknown-unknown/release/exo_ui_kernel.wasm',import.meta.url)

test('compiled Rust POM WASM exposes the same deterministic geometry to the browser adapter',async()=>{
  assert.equal(rustPomKernelReady(),false)
  assert.equal(rustPomLabelAnchor({x:0,y:0},{x:20,y:0}),null)
  assert.equal(await initializeRustPomKernel({bytes:readFileSync(wasm)}),true)
  assert.equal(rustPomKernelStatus().abiVersion,1)
  assert.deepEqual(rustPomLabelAnchor({x:0,y:10},{x:20,y:10},{normalOffset:2,dx:3,dy:-1}),{x:13,y:7})
  assert.deepEqual(rustPomLabelAnchor({x:4,y:0},{x:4,y:10},{normalOffset:2}),{x:2,y:5})
  assert.equal(rustPomLabelAnchor({x:1,y:1},{x:1,y:1}),null)
  assert.equal(rustPomLabelAnchor({x:NaN,y:1},{x:2,y:1}),null)
})
