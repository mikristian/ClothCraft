import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { runDevelopmentPosixGroup } from './factoryZipProcessGroupContainment20261024_1555.mjs'

const supported = process.platform === 'darwin' || process.platform === 'linux'
const descendantScript = `
  const { spawn } = require('node:child_process');
  const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  process.stdout.write('DESCENDANT:' + descendant.pid + '\\n');
  setInterval(() => {}, 1000);
`

function isGone(pid) {
  try { process.kill(pid, 0); return false }
  catch (error) { if (error.code === 'ESRCH') return true; throw error }
}

async function awaitGone(pid) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (isGone(pid)) return true
    await new Promise(resolve => setTimeout(resolve, 40))
  }
  return isGone(pid)
}

test('timeout kills the owned child process group and descendant', { skip: !supported, timeout: 5000 }, async t => {
  const result = await runDevelopmentPosixGroup({ command: process.execPath, args: ['-e', descendantScript], timeoutMs: 400 })
  assert.equal(result.reason, 'timeout')
  const pid = Number(result.stdout.match(/DESCENDANT:(\d+)/)?.[1])
  assert.ok(Number.isSafeInteger(pid), result.stdout)
  t.after(() => { if (!isGone(pid)) { try { process.kill(pid, 'SIGKILL') } catch {} } })
  assert.equal(await awaitGone(pid), true, `descendant ${pid} remained after timeout`)
})

test('output cap kills the group and descendant', { skip: !supported, timeout: 5000 }, async t => {
  const script = descendantScript.replace('setInterval(() => {}, 1000);', "setTimeout(() => process.stdout.write('X'.repeat(8192)), 120); setInterval(() => {}, 1000);")
  const result = await runDevelopmentPosixGroup({ command: process.execPath, args: ['-e', script], timeoutMs: 1200, maxOutputBytes: 100 })
  assert.equal(result.reason, 'output_limit')
  const pid = Number(result.stdout.match(/DESCENDANT:(\d+)/)?.[1])
  assert.ok(Number.isSafeInteger(pid), result.stdout)
  t.after(() => { if (!isGone(pid)) { try { process.kill(pid, 'SIGKILL') } catch {} } })
  assert.equal(await awaitGone(pid), true, `descendant ${pid} remained after output failure`)
})

test('successful command and invalid options have bounded results', async () => {
  assert.equal((await runDevelopmentPosixGroup({ command: process.execPath, args: ['-e', 'process.stdout.write("ok")'] })).ok, supported)
  assert.equal((await runDevelopmentPosixGroup({ command: process.execPath, timeoutMs: 0 })).ok, false)
})
