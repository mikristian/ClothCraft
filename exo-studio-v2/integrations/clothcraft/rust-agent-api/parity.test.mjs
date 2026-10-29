import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAgentValidator } from './client.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAgentApi } from '../agent-api.mjs'

const cases = [
  [{ action: 'unknown' }, 'UNSUPPORTED_ACTION'],
  [{ action: 'workspace.summary', extra: true }, 'INVALID_ACTION'],
  [{ action: 'workspace.summary', steps: 2 }, 'INVALID_ARGUMENTS'],
  [{ action: 'simulation.step', expectedRevision: 3, steps: 0 }, 'INVALID_ARGUMENTS'],
  [{ action: 'simulation.step', expectedRevision: -1, steps: 1 }, 'REVISION_REQUIRED'],
  [{ action: 'line.inspect', panel: 'body', edge: '' }, 'INVALID_ARGUMENTS'],
  [{ action: 'line.setTargetSpecification', panel: 'body', edge: 'hem', expectedRevision: 1, targetCm: 0 }, 'INVALID_ARGUMENTS'],
  [{ action: 'workspace.undo', expectedRevision: 1, steps: 1 }, 'INVALID_ARGUMENTS'],
]

test('Rust JSONL responses match real agent dispatch errors and HTTP status', async () => {
  const binary = path.join(path.dirname(fileURLToPath(import.meta.url)), 'target/debug/exo-agent-validator')
  const validator = createAgentValidator({binary})
  const api = createAgentApi({ status: () => ({loaded:false}), request: async () => ({ok:false}) }, { keyStorePath: '/tmp/exo-agent-validator-parity-keys.json' })
  try {
    for (const [command, code] of cases) {
      const native = await validator.validate(command)
      assert.ok(native, `Rust validator did not process ${JSON.stringify(command)}`)
      assert.equal(native.body?.code, code)
      const dispatch = await api.dispatch(command)
      assert.deepEqual(dispatch, native)
    }
    assert.equal((await validator.validate({action:'workspace.snapshot'})).valid, true)
    assert.equal((await validator.validate({action:'workspace.save',expectedRevision:0})).valid, true)
  } finally { validator.close(); api.close() }
})
