import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

const folder = path.dirname(fileURLToPath(import.meta.url))

// A single native child handles many API requests. Null means the JavaScript
// compatibility validator should handle the command unchanged.
export function createAgentValidator({ binary = process.env.EXO_AGENT_VALIDATOR_BIN || path.join(folder, 'target/debug/exo-agent-validator') } = {}) {
  let child = null
  let pending = null
  let disabled = false
  const fail = () => {
    disabled = true
    if (pending) { clearTimeout(pending.timer); pending.resolve(null); pending = null }
    const proc = child
    child = null
    proc?.kill()
  }
  const ensure = () => {
    if (disabled || !fs.existsSync(binary)) return false
    if (child) return true
    try {
      child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'ignore'] })
      child.on('error', fail)
      child.on('exit', fail)
      createInterface({ input: child.stdout }).on('line', line => {
        const request = pending
        if (!request) return fail()
        pending = null
        clearTimeout(request.timer)
        try {
          const result = JSON.parse(line)
          if (result?.valid === true || (result?.status === 400 && result.body?.ok === false && typeof result.body.code === 'string')) return request.resolve(result)
          request.resolve(null)
          fail()
        } catch { request.resolve(null); fail() }
      })
      return true
    } catch { fail(); return false }
  }
  return {
    async validate(command) {
      if (!ensure() || pending) return null
      return new Promise(resolve => {
        pending = { resolve, timer: setTimeout(fail, 1500) }
        child.stdin.write(JSON.stringify(command) + '\n', error => { if (error) fail() })
      })
    },
    close: fail,
  }
}
