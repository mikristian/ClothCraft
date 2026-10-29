#!/usr/bin/env node
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const wasmPath = resolve('public/wasm/exo_collaboration_sse_kernel.wasm')
const wasm = readFileSync(wasmPath)
const bridge = await import(pathToFileURL(resolve('src/core/rustCollaborationSseKernel.js')).href + '?w18-real-wasm=20261021')
assert.equal(await bridge.initializeRustCollaborationSseKernel({bytes: wasm}), true, JSON.stringify(bridge.rustCollaborationSseKernelStatus()))
assert.equal(bridge.rustCollaborationSseKernelStatus().backend, 'rust-wasm')

const cases = [
  '', ': comment', 'event: update', 'data: ', 'data: a\ndata: b',
  'event: \nevent: later\ndata: x', 'event: first\nevent: second\ndata: third',
  'event: change\r\ndata: {"n":1}', 'event: change\ndata:  你好🚀\ndata: é',
  ' event: ignored\ndata: x', 'data:\u0085x\u0085',
  'event:\ufeffupdated\ndata:\u00a0data\u2003',
  'event:\u2028hi\u2029\ndata: \u200b hi \u200b',
  'event: \n data: ignored\ndata: valid',
]
let seed = 0x18c011ab
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000)
const parts = ['', 'event:', 'data:', 'id:', ':', ' hello ', '\n', '\r', '🚀', 'é', '漢', '\ufeff', '\u0085', '\u2003', 'abc', '0', '{"ok":true}']
for (let i = 0; i < 512; i++) {
  let block = ''
  for (let j = 0, n = 1 + Math.floor(random() * 32); j < n; j++) block += parts[Math.floor(random() * parts.length)]
  cases.push(block)
}
for (let i = 0; i < cases.length; i++) {
  const block = cases[i]
  assert.deepEqual(bridge.parseCollaborationSseBlock(block), bridge.parseCollaborationSseBlockJs(block), `Rust/JS SSE parity case ${i}: ${JSON.stringify(block)}`)
  assert.equal(bridge.rustCollaborationSseKernelStatus().backend, 'rust-wasm', `Rust backend lost at case ${i}`)
}
console.log(JSON.stringify({status:'PASS',cases:cases.length,deterministicRandomCases:512,backend:bridge.rustCollaborationSseKernelStatus().backend,wasm:wasmPath,bytes:wasm.length},null,2))
