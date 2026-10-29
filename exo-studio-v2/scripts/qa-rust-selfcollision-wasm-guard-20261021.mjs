// Low-cost JS fault injection: compiled WASM ABI exists separately in
// qa-rust-self-collision-kernel.mjs. These cases assert safe fallback for
// malformed pointers and traps, plus typed-view refresh after memory growth.
import assert from 'node:assert/strict'
import {test} from 'node:test'

const ARGS = [0.02, 0.0001, 1, 3, 0, 1]
function jsReference() {
  const [minimum, squared, massA, massB, layerA, layerB] = ARGS
  const distance = Math.sqrt(Math.max(squared, 1e-6))
  const penetration = minimum - distance
  const weights = layerA > layerB ? [0.9, 0.1] : [0.1, 0.9]
  return [distance, penetration, ...weights,
    -penetration * weights[0], penetration * weights[1], 1]
}

async function loadedGuard(mode) {
  const memory = new WebAssembly.Memory({initial: 1})
  let calls = 0
  const pair = () => {
    calls += 1
    if (mode === 'trap') throw new Error('deliberate test WASM trap')
    if (mode === 'invalid-pointer') return -8
    if (mode === 'memory-growth' && calls === 2) memory.grow(1)
    new Float64Array(memory.buffer, 64, 7).set(jsReference())
    return 64
  }
  const originalInstantiate = WebAssembly.instantiate
  // Inject a minimal ABI-v1 module in a fresh ESM module instance, without
  // writing/compiling any .wasm binary or touching the production instance.
  WebAssembly.instantiate = async () => ({instance:{exports:{
    exo_self_collision_abi_version: () => 1,
    exo_self_collision_pair: pair,
    memory,
  }}})
  try {
    const kernel = await import(`../src/core/rustSelfCollisionKernel.js?qa_wasm_guard=${mode}`)
    assert.equal(await kernel.initializeRustSelfCollisionKernel({bytes:new Uint8Array([0])}),true)
    return {kernel, getCalls:()=>calls}
  } finally {
    WebAssembly.instantiate = originalInstantiate
  }
}

for (const mode of ['trap', 'invalid-pointer']) {
  test(`self-collision WASM ${mode} atomically falls back before pair writes`, async () => {
    const {kernel,getCalls} = await loadedGuard(mode)
    const out = new Float64Array(7)
    assert.equal(kernel.selfCollisionPairScalarsInto(out, ...ARGS), out)
    assert.deepEqual([...out], jsReference())
    assert.equal(getCalls(), 1)
    assert.equal(kernel.rustSelfCollisionKernelStatus().backend, 'javascript-fallback')
    assert.match(kernel.rustSelfCollisionKernelStatus().error, /fallback/i)
    assert.equal(kernel.selfCollisionPairScalarsInto(out,...ARGS),out)
    assert.deepEqual([...out],jsReference())
    assert.equal(getCalls(), 1, 'disabled faulty module must not be called again')
  })
}

test('WASM result-view cache rebinds correctly after memory growth', async () => {
  const {kernel,getCalls} = await loadedGuard('memory-growth')
  const out = new Float64Array(7)
  for (let i=0;i<3;i+=1) {
    assert.equal(kernel.selfCollisionPairScalarsInto(out, ...ARGS),out)
    assert.deepEqual([...out],jsReference())
  }
  assert.equal(getCalls(),3)
  assert.equal(kernel.rustSelfCollisionKernelStatus().backend, 'rust-wasm')
})
